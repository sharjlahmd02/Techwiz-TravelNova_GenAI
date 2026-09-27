import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_role
from app.database import get_db
from app.models.enums import UserRole
from app.schemas.admin import (
    AdminAnalytics,
    AdminUserCreate,
    AdminUserResponse,
    AdminUserUpdate,
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
    EscalationRuleCreate,
    EscalationRuleResponse,
    EscalationRuleUpdate,
    ImportComplaintsRequest,
    ImportComplaintsResponse,
    KnowledgeBaseDocResponse,
    KnowledgeBaseDocUpdate,
    PaginatedAuditLog,
    AuditLogEntry,
    ResolutionRuleCreate,
    ResolutionRuleResponse,
    ResolutionRuleUpdate,
    SubcategoryCreate,
    SubcategoryResponse,
)
from app.services.admin_service import AdminService
from app.services.export_service import (
    export_comparison_report_csv,
    export_comparison_report_json,
    export_comparison_report_pdf,
    export_csv,
    export_intelligence_report_csv,
    export_intelligence_report_json,
    export_intelligence_report_pdf,
    export_json,
    export_pdf,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])
_require_admin = require_role("admin")


# ---- Resolution rules ----
@router.get("/rules", response_model=list[ResolutionRuleResponse])
async def list_rules(db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).list_resolution_rules()


@router.post("/rules", response_model=ResolutionRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(data: ResolutionRuleCreate, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).create_resolution_rule(data)


@router.patch("/rules/{rule_id}", response_model=ResolutionRuleResponse)
async def update_rule(rule_id: uuid.UUID, data: ResolutionRuleUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).update_resolution_rule(rule_id, data)


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(rule_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    await AdminService(db).delete_resolution_rule(rule_id)


# ---- Escalation rules ----
@router.get("/escalation-rules", response_model=list[EscalationRuleResponse])
async def list_escalation_rules(db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).list_escalation_rules()


@router.post("/escalation-rules", response_model=EscalationRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_escalation_rule(data: EscalationRuleCreate, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).create_escalation_rule(data)


@router.patch("/escalation-rules/{rule_id}", response_model=EscalationRuleResponse)
async def update_escalation_rule(rule_id: uuid.UUID, data: EscalationRuleUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).update_escalation_rule(rule_id, data)


@router.delete("/escalation-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_escalation_rule(rule_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    await AdminService(db).delete_escalation_rule(rule_id)


# ---- Categories ----
@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).list_categories()


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).create_category(data)


@router.patch("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: uuid.UUID, data: CategoryUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).update_category(category_id, data)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    await AdminService(db).delete_category(category_id)


@router.post("/categories/{category_id}/subcategories", response_model=SubcategoryResponse, status_code=status.HTTP_201_CREATED)
async def add_subcategory(category_id: uuid.UUID, data: SubcategoryCreate, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).add_subcategory(category_id, data)


# ---- Departments ----
# Read access is shared with managers (needed for agent assignment); writes stay admin-only.
@router.get("/departments", response_model=list[DepartmentResponse])
async def list_departments(
    db: AsyncSession = Depends(get_db), current_user=Depends(require_role("manager", "admin"))
):
    return await AdminService(db).list_departments()


@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(data: DepartmentCreate, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).create_department(data)


@router.patch("/departments/{department_id}", response_model=DepartmentResponse)
async def update_department(department_id: uuid.UUID, data: DepartmentUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).update_department(department_id, data)


# ---- Knowledge base ----
@router.get("/knowledge-base", response_model=list[KnowledgeBaseDocResponse])
async def list_knowledge_base(db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).list_knowledge_base()


@router.post("/knowledge-base", response_model=KnowledgeBaseDocResponse, status_code=status.HTTP_201_CREATED)
async def upload_policy(
    document_id: str = Form(...),
    title: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(_require_admin),
):
    return await AdminService(db).upload_policy(document_id, title, file)


@router.patch("/knowledge-base/{doc_id}", response_model=KnowledgeBaseDocResponse)
async def update_knowledge_base_doc(doc_id: uuid.UUID, data: KnowledgeBaseDocUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).update_knowledge_base_doc(doc_id, data)


@router.delete("/knowledge-base/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_knowledge_base_doc(doc_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    await AdminService(db).deactivate_knowledge_base_doc(doc_id)


# ---- Users ----
@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(role: UserRole | None = None, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).list_users(role)


@router.post("/users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(data: AdminUserCreate, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).create_user(data)


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(user_id: uuid.UUID, data: AdminUserUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).update_user(user_id, data)


# ---- Audit log ----
@router.get("/audit-log", response_model=PaginatedAuditLog)
async def audit_log(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    complaint_id: uuid.UUID | None = None,
    performed_by: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(_require_admin),
):
    items, total = await AdminService(db).audit_log(page, page_size, complaint_id, performed_by)
    entries = [
        AuditLogEntry(
            id=h.id, complaint_id=h.complaint_id, action=h.action.value, performed_by=h.performed_by,
            old_value=h.old_value, new_value=h.new_value, notes=h.notes, created_at=h.created_at,
        )
        for h in items
    ]
    return PaginatedAuditLog(items=entries, total=total, page=page, page_size=page_size, has_next=page * page_size < total)


# ---- Analytics ----
@router.get("/analytics", response_model=AdminAnalytics)
async def analytics(db: AsyncSession = Depends(get_db), current_user=Depends(_require_admin)):
    return await AdminService(db).analytics()


# ---- Export ----
@router.get("/export")
async def export_data(
    format: str = Query(pattern="^(csv|json|pdf)$"),
    department_id: uuid.UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(_require_admin),
):
    if format == "csv":
        content = await export_csv(db, department_id, date_from, date_to)
        media_type, filename = "text/csv", "complaints.csv"
    elif format == "json":
        content = await export_json(db, department_id, date_from, date_to)
        media_type, filename = "application/json", "complaints.json"
    else:
        content = await export_pdf(db, department_id, date_from, date_to)
        media_type, filename = "application/pdf", "complaints.pdf"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# SRS deliverable #8: GenAI vs ground-truth values side by side, per complaint, with match/mismatch.
@router.get("/export/comparison-report")
async def export_comparison_report(
    format: str = Query(pattern="^(csv|json|pdf)$"),
    department_id: uuid.UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(_require_admin),
):
    if format == "csv":
        content = await export_comparison_report_csv(db, department_id, date_from, date_to)
        media_type, filename = "text/csv", "comparison_report.csv"
    elif format == "json":
        content = await export_comparison_report_json(db, department_id, date_from, date_to)
        media_type, filename = "application/json", "comparison_report.json"
    else:
        content = await export_comparison_report_pdf(db, department_id, date_from, date_to)
        media_type, filename = "application/pdf", "comparison_report.pdf"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# SRS deliverable #9: aggregate intelligence stats -- category/priority/sentiment
# distribution, escalations, repeat complaints, SLA risk, policy usage, disagreement
# rate, manual-review count.
@router.get("/export/intelligence-report")
async def export_intelligence_report(
    format: str = Query(pattern="^(csv|json|pdf)$"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(_require_admin),
):
    if format == "csv":
        content = await export_intelligence_report_csv(db)
        media_type, filename = "text/csv", "intelligence_report.csv"
    elif format == "json":
        content = await export_intelligence_report_json(db)
        media_type, filename = "application/json", "intelligence_report.json"
    else:
        content = await export_intelligence_report_pdf(db)
        media_type, filename = "application/pdf", "intelligence_report.pdf"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---- Bulk import (hidden evaluation dataset) ----
@router.post("/import-complaints", response_model=ImportComplaintsResponse)
async def import_complaints(
    data: ImportComplaintsRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(_require_admin),
):
    imported, failed, results = await AdminService(db).import_complaints(data.complaints, background_tasks)
    return ImportComplaintsResponse(imported=imported, failed=failed, results=results)
