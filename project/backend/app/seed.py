"""Idempotent data loader. Run with: python -m app.seed

Reads the pre-built TravelNova data assets from DATA_DIR (see data/README.md
for the exact file layout and schemas) and loads them into the database.
Safe to re-run -- existing rows are matched by their natural key and skipped.
"""

import asyncio
import json
import os
import re
from datetime import date, datetime, timezone
from pathlib import Path

from docx import Document as DocxDocument
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.database import AsyncSessionLocal, engine
from app.models.category import Category, Subcategory
from app.models.complaint import Complaint
from app.models.department import Department
from app.models.enums import ComplaintChannel, ComplaintStatus, LoyaltyTier, UserRole
from app.models.escalation_rule import EscalationRule
from app.models.knowledge_base import KnowledgeBaseDocument
from app.models.resolution_rule import ResolutionRule
from app.models.user import User
from app.services.ground_truth.data_loader import load_escalation_rules as parse_escalation_rules
from app.services.ground_truth.data_loader import load_resolution_rules as parse_resolution_rules

DATA_DIR = Path(os.environ.get("SUPPORTNOVA_DATA_DIR", Path(__file__).resolve().parent.parent / "data"))

DEMO_USERS = [
    # (full_name, email, password, role, department_name)
    ("Admin User", "admin@travelnova.com", "admin123", UserRole.ADMIN, None),
    ("Manager User", "manager@travelnova.com", "manager123", UserRole.MANAGER, None),
    ("Reviewer User", "reviewer@travelnova.com", "reviewer123", UserRole.REVIEWER, None),
    ("Flights Agent", "agent.flights@travelnova.com", "agent123", UserRole.AGENT, "Flight Operations"),
    ("Hotels Agent", "agent.hotels@travelnova.com", "agent123", UserRole.AGENT, "Hotel Services"),
    ("Billing Agent", "agent.billing@travelnova.com", "agent123", UserRole.AGENT, "Billing & Finance"),
    ("Demo Customer", "customer@example.com", "customer123", UserRole.CUSTOMER, None),
]

LOYALTY_TIER_MAP = {
    "silver": LoyaltyTier.SILVER,
    "gold": LoyaltyTier.GOLD,
    "platinum": LoyaltyTier.PLATINUM,
    "diamond": LoyaltyTier.DIAMOND,
}

CHANNEL_MAP = {
    "web form": ComplaintChannel.WEB_FORM,
    "live chat": ComplaintChannel.CHAT,
    "email": ComplaintChannel.EMAIL,
    "phone": ComplaintChannel.PHONE,
    "social media": ComplaintChannel.SOCIAL_MEDIA,
    "mobile app": ComplaintChannel.MOBILE_APP,
}

POLICY_ID_PATTERN = re.compile(r"^[A-Z]{3}-(?:POL|SOP|RUL|DOC)-\d+")


def _load_json(path: Path) -> dict | list | None:
    if not path.exists():
        print(f"  skip (not found): {path}")
        return None
    with path.open(encoding="utf-8") as f:
        return json.load(f)


async def seed_categories(db: AsyncSession, org: dict) -> int:
    print("Loading categories...")
    count = 0
    for i, cat_data in enumerate(org.get("complaint_categories", []), start=1):
        code = f"CAT-{i:02d}"
        category = await db.scalar(select(Category).where(Category.name == cat_data["name"]))
        if category is None:
            category = Category(code=code, name=cat_data["name"])
            db.add(category)
            await db.flush()
            count += 1

        for j, sub_name in enumerate(cat_data.get("subcategories", []), start=1):
            sub_code = f"{code}-SUB-{j:02d}"
            existing = await db.scalar(
                select(Subcategory).where(Subcategory.category_id == category.id, Subcategory.name == sub_name)
            )
            if existing is None:
                db.add(Subcategory(category_id=category.id, code=sub_code, name=sub_name))
                count += 1

    await db.commit()
    return count


async def seed_departments(db: AsyncSession, org: dict) -> int:
    print("Loading departments...")
    count = 0
    for dept_data in org.get("departments", []):
        existing = await db.scalar(select(Department).where(Department.code == dept_data["id"]))
        if existing is None:
            description = f"{dept_data.get('head', '')} · {dept_data.get('agents', 0)} agents".strip(" ·")
            db.add(Department(code=dept_data["id"], name=dept_data["name"], description=description))
            count += 1

    await db.commit()
    return count


async def seed_resolution_rules(db: AsyncSession, level_name_to_int: dict[str, int]) -> int:
    print("Loading resolution rules...")
    rules = parse_resolution_rules(DATA_DIR, level_name_to_int)

    count = 0
    for rule_data in rules:
        existing = await db.scalar(select(ResolutionRule).where(ResolutionRule.rule_id == rule_data["rule_id"]))
        if existing is not None:
            continue
        db.add(ResolutionRule(**rule_data))
        count += 1

    await db.commit()
    return count


async def seed_escalation_rules(db: AsyncSession) -> tuple[int, dict[str, int]]:
    print("Loading escalation rules...")
    rules, level_name_to_int = parse_escalation_rules(DATA_DIR)

    count = 0
    for rule_data in rules:
        existing = await db.scalar(select(EscalationRule).where(EscalationRule.rule_id == rule_data["rule_id"]))
        if existing is not None:
            continue
        db.add(EscalationRule(**rule_data))
        count += 1

    await db.commit()
    return count, level_name_to_int


def _extract_title(paragraphs: list[str], company_name: str, fallback: str) -> str:
    if paragraphs and paragraphs[0].strip() == company_name and len(paragraphs) > 1:
        return paragraphs[1]
    return paragraphs[0] if paragraphs else fallback


async def seed_knowledge_base(db: AsyncSession, company_name: str) -> int:
    print("Indexing knowledge base documents...")
    policies_dir = DATA_DIR / "policies"
    if not policies_dir.exists():
        print(f"  skip (not found): {policies_dir}")
        return 0

    count = 0
    for docx_path in sorted(policies_dir.glob("*.docx")):
        match = POLICY_ID_PATTERN.match(docx_path.stem)
        document_id = match.group(0) if match else docx_path.stem

        existing = await db.scalar(
            select(KnowledgeBaseDocument).where(KnowledgeBaseDocument.document_id == document_id)
        )
        if existing is not None:
            continue

        doc = DocxDocument(str(docx_path))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        title = _extract_title(paragraphs, company_name, document_id)
        content_text = "\n".join(paragraphs)

        db.add(
            KnowledgeBaseDocument(
                document_id=document_id,
                title=title,
                file_path=str(docx_path),
                content_text=content_text,
            )
        )
        count += 1

    await db.commit()
    return count


async def seed_users(db: AsyncSession) -> int:
    print("Creating demo users...")
    count = 0
    for full_name, email, password, role, department_name in DEMO_USERS:
        department_id = None
        if department_name:
            department = await db.scalar(select(Department).where(Department.name == department_name))
            department_id = department.id if department else None

        existing = await db.scalar(select(User).where(User.email == email))
        if existing is not None:
            # Idempotent re-run should still fix drift: e.g. an agent seeded
            # before departments.json/organization.json was loaded would
            # otherwise be permanently stuck with department_id=None.
            if department_id is not None and existing.department_id != department_id:
                existing.department_id = department_id
                count += 1
            continue

        db.add(
            User(
                email=email,
                password_hash=hash_password(password),
                full_name=full_name,
                role=role,
                department_id=department_id,
                loyalty_tier=LoyaltyTier.SILVER if role == UserRole.CUSTOMER else None,
            )
        )
        count += 1

    await db.commit()
    return count


async def _get_or_create_synthetic_customer(db: AsyncSession, complaint_id: str, loyalty_tier: LoyaltyTier | None) -> User:
    """The dataset carries no customer name/email, so we synthesize one deterministically per complaint."""
    email = f"customer.{complaint_id.lower()}@travelnova-demo.example"
    customer = await db.scalar(select(User).where(User.email == email))
    if customer is None:
        customer = User(
            email=email,
            password_hash=hash_password("customer123"),
            full_name=f"Demo Customer {complaint_id.split('-')[-1]}",
            role=UserRole.CUSTOMER,
            loyalty_tier=loyalty_tier,
        )
        db.add(customer)
        await db.flush()
    return customer


def _parse_date_utc(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.combine(date.fromisoformat(value), datetime.min.time(), tzinfo=timezone.utc)


async def seed_complaints(db: AsyncSession) -> int:
    print("Loading complaints...")
    data = _load_json(DATA_DIR / "complaints" / "complaints_dataset.json")
    if not data:
        return 0

    items = data["complaints"] if isinstance(data, dict) else data

    count = 0
    max_number = 0
    for item in items:
        complaint_id = item["complaint_id"]
        match = re.search(r"(\d+)$", complaint_id)
        if match:
            max_number = max(max_number, int(match.group(1)))

        existing = await db.scalar(select(Complaint).where(Complaint.complaint_id == complaint_id))
        if existing is not None:
            continue

        loyalty_tier = LOYALTY_TIER_MAP.get((item.get("customer_type") or "").lower())
        customer = await _get_or_create_synthetic_customer(db, complaint_id, loyalty_tier)

        channel = CHANNEL_MAP.get((item.get("channel") or "").lower(), ComplaintChannel.WEB_FORM)
        category = item.get("category")
        subcategory = item.get("subcategory")
        customer_selected_category = f"{category} / {subcategory}" if category and subcategory else category

        submitted_at = _parse_date_utc(item.get("date"))

        complaint = Complaint(
            complaint_id=complaint_id,
            customer_id=customer.id,
            title=item["title"],
            description=item["description"],
            channel=channel,
            product_type=item.get("product_service") or "Other",
            booking_reference=item.get("order_reference"),
            customer_selected_category=customer_selected_category,
            status=ComplaintStatus.SUBMITTED,
        )
        if submitted_at is not None:
            complaint.created_at = submitted_at
            complaint.updated_at = submitted_at

        db.add(complaint)
        count += 1

        if count % 50 == 0:
            await db.commit()

    await db.commit()

    if max_number > 0:
        await db.execute(
            text("SELECT setval('complaint_number_seq', GREATEST(:n, (SELECT last_value FROM complaint_number_seq)))"),
            {"n": max_number},
        )
        await db.commit()

    return count


async def print_summary(db: AsyncSession) -> None:
    counts = {
        "categories": len((await db.scalars(select(Category))).all()),
        "subcategories": len((await db.scalars(select(Subcategory))).all()),
        "departments": len((await db.scalars(select(Department))).all()),
        "resolution_rules": len((await db.scalars(select(ResolutionRule))).all()),
        "escalation_rules": len((await db.scalars(select(EscalationRule))).all()),
        "knowledge_base_documents": len((await db.scalars(select(KnowledgeBaseDocument))).all()),
        "users": len((await db.scalars(select(User))).all()),
        "complaints": len((await db.scalars(select(Complaint))).all()),
    }
    print("\n=== Seed summary ===")
    for key, value in counts.items():
        print(f"  {key}: {value}")


async def main() -> None:
    engine.echo = False

    org = _load_json(DATA_DIR / "organization.json") or {}
    company_name = org.get("company", {}).get("name", "")

    async with AsyncSessionLocal() as db:
        new_categories = await seed_categories(db, org)
        new_departments = await seed_departments(db, org)
        new_escalation_rules, level_name_to_int = await seed_escalation_rules(db)
        new_rules = await seed_resolution_rules(db, level_name_to_int)
        new_docs = await seed_knowledge_base(db, company_name)
        new_users = await seed_users(db)
        new_complaints = await seed_complaints(db)

        print(
            f"\nInserted: {new_categories} categories/subcategories rows, {new_departments} departments, "
            f"{new_rules} resolution rules, {new_escalation_rules} escalation rules, {new_docs} kb docs, "
            f"{new_users} users, {new_complaints} complaints."
        )

        await print_summary(db)


if __name__ == "__main__":
    asyncio.run(main())
