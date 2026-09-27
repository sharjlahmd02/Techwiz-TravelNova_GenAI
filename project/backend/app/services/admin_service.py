import uuid
from datetime import datetime, timedelta, timezone

from fastapi import BackgroundTasks, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.category import Category, Subcategory
from app.models.complaint import Complaint
from app.models.complaint_history import ComplaintHistory
from app.models.department import Department
from app.models.enums import ComplaintChannel, ComplaintStatus, KnowledgeBaseStatus, LoyaltyTier, Priority, UserRole
from app.models.escalation_rule import EscalationRule
from app.models.knowledge_base import KnowledgeBaseDocument
from app.models.knowledge_base_chunk import KnowledgeBaseChunk
from app.services.chunking import chunk_document
from app.services.document_extractor import extract_pages_from_upload
from app.models.pipeline_comparison import PipelineComparison
from app.models.resolution_rule import ResolutionRule
from app.models.user import User
from app.schemas.admin import (
    AdminAnalytics,
    AdminUserCreate,
    AdminUserUpdate,
    CategoryCreate,
    CategoryTrendPoint,
    CategoryUpdate,
    DepartmentCreate,
    DepartmentUpdate,
    EscalationRuleCreate,
    EscalationRuleUpdate,
    ImportComplaintRecord,
    KnowledgeBaseDocUpdate,
    ResolutionRuleCreate,
    ResolutionRuleUpdate,
    SubcategoryCreate,
    WeekOverWeek,
)
from app.services import pipeline_cache
from app.services.complaint_service import process_complaint
from app.services.genai.injection_detector import detect as detect_injection
from app.utils.complaint_id import next_complaint_id

POLICY_DOC_ROOT = "data/policies"


class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ---- Resolution rules ----
    async def list_resolution_rules(self) -> list[ResolutionRule]:
        return list((await self.db.scalars(select(ResolutionRule))).all())

    async def create_resolution_rule(self, data: ResolutionRuleCreate) -> ResolutionRule:
        existing = await self.db.scalar(select(ResolutionRule).where(ResolutionRule.rule_id == data.rule_id))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="rule_id already exists")
        rule = ResolutionRule(**data.model_dump())
        self.db.add(rule)
        await self.db.commit()
        await self.db.refresh(rule)
        pipeline_cache.refresh()
        return rule

    async def update_resolution_rule(self, rule_id: uuid.UUID, data: ResolutionRuleUpdate) -> ResolutionRule:
        rule = await self.db.get(ResolutionRule, rule_id)
        if rule is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(rule, field, value)
        await self.db.commit()
        await self.db.refresh(rule)
        pipeline_cache.refresh()
        return rule

    async def delete_resolution_rule(self, rule_id: uuid.UUID) -> None:
        rule = await self.db.get(ResolutionRule, rule_id)
        if rule is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
        await self.db.delete(rule)
        await self.db.commit()
        pipeline_cache.refresh()

    # ---- Escalation rules ----
    async def list_escalation_rules(self) -> list[EscalationRule]:
        return list((await self.db.scalars(select(EscalationRule))).all())

    async def create_escalation_rule(self, data: EscalationRuleCreate) -> EscalationRule:
        existing = await self.db.scalar(select(EscalationRule).where(EscalationRule.rule_id == data.rule_id))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="rule_id already exists")
        rule = EscalationRule(**data.model_dump())
        self.db.add(rule)
        await self.db.commit()
        await self.db.refresh(rule)
        pipeline_cache.refresh()
        return rule

    async def update_escalation_rule(self, rule_id: uuid.UUID, data: EscalationRuleUpdate) -> EscalationRule:
        rule = await self.db.get(EscalationRule, rule_id)
        if rule is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(rule, field, value)
        await self.db.commit()
        await self.db.refresh(rule)
        pipeline_cache.refresh()
        return rule

    async def delete_escalation_rule(self, rule_id: uuid.UUID) -> None:
        rule = await self.db.get(EscalationRule, rule_id)
        if rule is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
        await self.db.delete(rule)
        await self.db.commit()
        pipeline_cache.refresh()

    # ---- Categories ----
    async def list_categories(self) -> list[Category]:
        return list((await self.db.scalars(select(Category))).all())

    async def create_category(self, data: CategoryCreate) -> Category:
        category = Category(**data.model_dump())
        self.db.add(category)
        await self.db.commit()
        await self.db.refresh(category)
        pipeline_cache.refresh()
        return category

    async def update_category(self, category_id: uuid.UUID, data: CategoryUpdate) -> Category:
        category = await self.db.get(Category, category_id)
        if category is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(category, field, value)
        await self.db.commit()
        await self.db.refresh(category)
        pipeline_cache.refresh()
        return category

    async def delete_category(self, category_id: uuid.UUID) -> None:
        category = await self.db.get(Category, category_id)
        if category is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        await self.db.delete(category)
        await self.db.commit()
        pipeline_cache.refresh()

    async def add_subcategory(self, category_id: uuid.UUID, data: SubcategoryCreate) -> Subcategory:
        category = await self.db.get(Category, category_id)
        if category is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        subcategory = Subcategory(category_id=category_id, **data.model_dump())
        self.db.add(subcategory)
        await self.db.commit()
        await self.db.refresh(subcategory)
        pipeline_cache.refresh()
        return subcategory

    # ---- Departments ----
    async def list_departments(self) -> list[Department]:
        return list((await self.db.scalars(select(Department))).all())

    async def create_department(self, data: DepartmentCreate) -> Department:
        department = Department(**data.model_dump())
        self.db.add(department)
        await self.db.commit()
        await self.db.refresh(department)
        pipeline_cache.refresh()
        return department

    async def update_department(self, department_id: uuid.UUID, data: DepartmentUpdate) -> Department:
        department = await self.db.get(Department, department_id)
        if department is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(department, field, value)
        await self.db.commit()
        await self.db.refresh(department)
        pipeline_cache.refresh()
        return department

    # ---- Knowledge base ----
    async def list_knowledge_base(self) -> list[KnowledgeBaseDocument]:
        return list((await self.db.scalars(select(KnowledgeBaseDocument))).all())

    async def upload_policy(self, document_id: str, title_hint: str | None, file: UploadFile) -> KnowledgeBaseDocument:
        existing = await self.db.scalar(
            select(KnowledgeBaseDocument).where(KnowledgeBaseDocument.document_id == document_id)
        )
        contents = await file.read()

        pages = extract_pages_from_upload(file.filename or document_id, contents)
        content_text = "\n".join(pages)
        title = title_hint or (content_text.splitlines()[0].strip() if content_text else document_id)

        file_path = f"{POLICY_DOC_ROOT}/{file.filename}"
        with open(file_path, "wb") as f:
            f.write(contents)

        if existing:
            existing.title = title
            existing.content_text = content_text
            existing.file_path = file_path
            kb_doc = existing
        else:
            kb_doc = KnowledgeBaseDocument(
                document_id=document_id, title=title, file_path=file_path, content_text=content_text
            )
            self.db.add(kb_doc)

        # Re-chunk every upload (including a re-upload of an existing document_id) --
        # reassigning the relationship drops the old chunk rows via the delete-orphan
        # cascade and inserts the fresh set in one go.
        kb_doc.chunks = [
            KnowledgeBaseChunk(
                chunk_index=i,
                section=c.section,
                heading=c.heading,
                page_reference=c.page_reference,
                version=kb_doc.version,
                content_text=c.content_text,
            )
            for i, c in enumerate(chunk_document(pages))
        ]

        await self.db.commit()
        await self.db.refresh(kb_doc)
        pipeline_cache.refresh()
        return kb_doc

    async def update_knowledge_base_doc(self, doc_id: uuid.UUID, data: KnowledgeBaseDocUpdate) -> KnowledgeBaseDocument:
        doc = await self.db.get(KnowledgeBaseDocument, doc_id)
        if doc is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        updates = data.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(doc, field, value)
        if "status" in updates:
            doc.is_active = doc.status == KnowledgeBaseStatus.ACTIVE
        await self.db.commit()
        await self.db.refresh(doc)
        pipeline_cache.refresh()
        return doc

    async def deactivate_knowledge_base_doc(self, doc_id: uuid.UUID) -> None:
        doc = await self.db.get(KnowledgeBaseDocument, doc_id)
        if doc is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        doc.is_active = False
        doc.status = KnowledgeBaseStatus.SUPERSEDED
        await self.db.commit()
        pipeline_cache.refresh()

    # ---- Users ----
    async def list_users(self, role: UserRole | None = None) -> list[User]:
        stmt = select(User)
        if role:
            stmt = stmt.where(User.role == role)
        return list((await self.db.scalars(stmt)).all())

    async def create_user(self, data: AdminUserCreate) -> User:
        existing = await self.db.scalar(select(User).where(User.email == data.email))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        user = User(
            email=data.email,
            password_hash=hash_password(data.password),
            full_name=data.full_name,
            role=data.role,
            department_id=data.department_id,
            loyalty_tier=data.loyalty_tier,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_user(self, user_id: uuid.UUID, data: AdminUserUpdate) -> User:
        user = await self.db.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(user, field, value)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    # ---- Audit log ----
    async def audit_log(
        self,
        page: int,
        page_size: int,
        complaint_id: uuid.UUID | None = None,
        performed_by: uuid.UUID | None = None,
    ) -> tuple[list[ComplaintHistory], int]:
        conditions = []
        if complaint_id:
            conditions.append(ComplaintHistory.complaint_id == complaint_id)
        if performed_by:
            conditions.append(ComplaintHistory.performed_by == performed_by)

        base = select(ComplaintHistory).where(*conditions).order_by(ComplaintHistory.created_at.desc())
        total = len((await self.db.scalars(base)).all())
        items = (await self.db.scalars(base.offset((page - 1) * page_size).limit(page_size))).all()
        return list(items), total

    # ---- Analytics ----
    async def analytics(self) -> AdminAnalytics:
        total_complaints = await self.db.scalar(select(func.count()).select_from(Complaint))

        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        resolved_today = await self.db.scalar(
            select(func.count()).select_from(Complaint).where(
                Complaint.status.in_((ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED)),
                Complaint.updated_at >= today_start,
            )
        )

        pipeline_conflicts = await self.db.scalar(
            select(func.count()).select_from(Complaint).where(Complaint.has_conflict.is_(True))
        )
        agreement_rate = 1 - (pipeline_conflicts / total_complaints) if total_complaints else None

        data_assets = {
            "categories": await self.db.scalar(select(func.count()).select_from(Category)) or 0,
            "subcategories": await self.db.scalar(select(func.count()).select_from(Subcategory)) or 0,
            "departments": await self.db.scalar(select(func.count()).select_from(Department)) or 0,
            "resolution_rules": await self.db.scalar(select(func.count()).select_from(ResolutionRule)) or 0,
            "escalation_rules": await self.db.scalar(select(func.count()).select_from(EscalationRule)) or 0,
            "policy_documents": await self.db.scalar(select(func.count()).select_from(KnowledgeBaseDocument)) or 0,
            "complaints": total_complaints or 0,
        }

        category_distribution: dict[str, int] = {}
        for row in (await self.db.execute(select(Category.name))).all():
            (name,) = row
            count = await self.db.scalar(
                select(func.count())
                .select_from(Complaint)
                .join(Category, Complaint.category_id == Category.id)
                .where(Category.name == name)
            )
            if count:
                category_distribution[name] = count

        priority_distribution: dict[str, int] = {}
        for p in Priority:
            count = await self.db.scalar(select(func.count()).select_from(Complaint).where(Complaint.priority == p))
            if count:
                priority_distribution[p.value] = count

        # SRS Step 65 wants trend detection ("rising delivery complaints," "escalation
        # spikes"), not just point-in-time snapshots -- a simple week-over-week delta
        # per category, plus overall volume and escalation trends.
        now = datetime.now(timezone.utc)
        week_start = now - timedelta(days=7)
        prev_week_start = now - timedelta(days=14)

        category_trend: list[CategoryTrendPoint] = []
        for row in (await self.db.execute(select(Category.name))).all():
            (name,) = row
            this_week = await self.db.scalar(
                select(func.count())
                .select_from(Complaint)
                .join(Category, Complaint.category_id == Category.id)
                .where(Category.name == name, Complaint.created_at >= week_start)
            ) or 0
            last_week = await self.db.scalar(
                select(func.count())
                .select_from(Complaint)
                .join(Category, Complaint.category_id == Category.id)
                .where(
                    Category.name == name,
                    Complaint.created_at >= prev_week_start,
                    Complaint.created_at < week_start,
                )
            ) or 0
            if this_week or last_week:
                category_trend.append(
                    CategoryTrendPoint(category=name, this_week=this_week, last_week=last_week, delta=this_week - last_week)
                )
        category_trend.sort(key=lambda t: t.delta, reverse=True)

        async def _week_over_week(*extra_conditions) -> WeekOverWeek:
            this_week = await self.db.scalar(
                select(func.count()).select_from(Complaint).where(Complaint.created_at >= week_start, *extra_conditions)
            ) or 0
            last_week = await self.db.scalar(
                select(func.count())
                .select_from(Complaint)
                .where(Complaint.created_at >= prev_week_start, Complaint.created_at < week_start, *extra_conditions)
            ) or 0
            return WeekOverWeek(this_week=this_week, last_week=last_week, delta=this_week - last_week)

        volume_trend = await _week_over_week()
        escalation_trend = await _week_over_week(Complaint.escalation_level > 0)

        return AdminAnalytics(
            total_complaints=total_complaints or 0,
            resolved_today=resolved_today or 0,
            pipeline_conflicts=pipeline_conflicts or 0,
            pipeline_agreement_rate=round(agreement_rate, 3) if agreement_rate is not None else None,
            data_assets=data_assets,
            category_distribution=category_distribution,
            priority_distribution=priority_distribution,
            category_trend=category_trend,
            escalation_trend=escalation_trend,
            volume_trend=volume_trend,
        )

    # ---- Bulk import (hidden evaluation dataset) ----
    async def import_complaints(
        self, records: list[ImportComplaintRecord], background_tasks: BackgroundTasks
    ) -> tuple[int, int, list[dict]]:
        imported = 0
        failed = 0
        results = []
        new_complaint_ids: list[uuid.UUID] = []

        for record in records:
            try:
                if "@" not in record.email or not record.title.strip() or not record.description.strip():
                    raise ValueError("invalid record: missing/malformed title, description, or email")

                customer = await self.db.scalar(select(User).where(User.email == record.email))
                if customer is None:
                    customer = User(
                        email=record.email,
                        password_hash=hash_password("imported123"),
                        full_name=record.customer_name,
                        role=UserRole.CUSTOMER,
                        loyalty_tier=LoyaltyTier(record.loyalty_tier.lower())
                        if record.loyalty_tier and record.loyalty_tier.lower() in LoyaltyTier._value2member_map_
                        else None,
                    )
                    self.db.add(customer)
                    await self.db.flush()

                injection = detect_injection(record.description)
                complaint = Complaint(
                    complaint_id=await next_complaint_id(self.db),
                    customer_id=customer.id,
                    title=record.title,
                    description=record.description,
                    channel=ComplaintChannel.WEB_FORM,
                    product_type=record.product_type,
                    booking_reference=record.booking_reference,
                    customer_selected_category=record.customer_selected_category,
                    status=ComplaintStatus.SUBMITTED,
                    is_prompt_injection=injection.is_injection,
                )
                self.db.add(complaint)
                await self.db.flush()
                new_complaint_ids.append(complaint.id)

                imported += 1
                results.append({"complaint_id": complaint.complaint_id, "status": "imported"})
            except Exception as exc:  # noqa: BLE001 -- one bad record must not abort the whole batch
                failed += 1
                results.append({"title": record.title, "status": "failed", "error": str(exc)})

        await self.db.commit()

        for complaint_id in new_complaint_ids:
            background_tasks.add_task(process_complaint, complaint_id)

        return imported, failed, results
