import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.complaint import Complaint
from app.models.department import Department
from app.models.enums import ComplaintStatus, HistoryAction, Priority, UserRole, Urgency
from app.models.user import User
from app.schemas.manager import AgentCreate, AgentUpdate, ComplaintOverride, DepartmentMetrics, ManagerAnalytics
from app.services.staff_service import log_history

OVERRIDABLE_FIELDS = {"priority", "urgency", "department_id", "status", "escalation_level"}
CLOSED_STATUSES = (ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED)


class ManagerService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_complaints(
        self,
        page: int,
        page_size: int,
        department_id: uuid.UUID | None = None,
        status_filter: ComplaintStatus | None = None,
        priority_filter: Priority | None = None,
    ) -> tuple[list[Complaint], int]:
        conditions = []
        if department_id:
            conditions.append(Complaint.department_id == department_id)
        if status_filter:
            conditions.append(Complaint.status == status_filter)
        if priority_filter:
            conditions.append(Complaint.priority == priority_filter)

        base = select(Complaint).where(*conditions).order_by(Complaint.created_at.desc())
        total = len((await self.db.scalars(base)).all())
        items = (await self.db.scalars(base.offset((page - 1) * page_size).limit(page_size))).all()
        return list(items), total

    async def get_complaint(self, complaint_id: uuid.UUID) -> Complaint:
        complaint = await self.db.get(Complaint, complaint_id)
        if complaint is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
        return complaint

    async def override_field(self, complaint: Complaint, manager: User, data: ComplaintOverride) -> Complaint:
        if data.field not in OVERRIDABLE_FIELDS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"field must be one of {sorted(OVERRIDABLE_FIELDS)}",
            )

        old_value = getattr(complaint, data.field)
        old_value = old_value.value if hasattr(old_value, "value") else old_value

        if data.field == "priority":
            new_value = Priority(data.value)
        elif data.field == "urgency":
            new_value = Urgency(data.value)
        elif data.field == "status":
            new_value = ComplaintStatus(data.value)
        elif data.field == "escalation_level":
            new_value = int(data.value)
        elif data.field == "department_id":
            department = await self.db.scalar(select(Department).where(Department.code == data.value))
            if department is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown department code {data.value!r}")
            new_value = department.id
        else:
            new_value = data.value

        setattr(complaint, data.field, new_value)

        await log_history(
            self.db, complaint.id, HistoryAction.STATUS_CHANGED if data.field == "status" else HistoryAction.PRIORITY_CHANGED,
            manager.id,
            old_value={data.field: old_value},
            new_value={data.field: data.value},
            notes=f"Manager override: {data.reason}",
        )
        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    async def escalate(self, complaint: Complaint, manager: User, reason: str, level: int) -> Complaint:
        old_level = complaint.escalation_level
        complaint.escalation_level = level
        complaint.escalation_reason = reason
        complaint.status = ComplaintStatus.ESCALATED

        await log_history(
            self.db, complaint.id, HistoryAction.ESCALATED, manager.id,
            old_value={"escalation_level": old_level}, new_value={"escalation_level": level},
            notes=reason,
        )
        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    async def list_agents(self) -> list[User]:
        return list((await self.db.scalars(select(User).where(User.role == UserRole.AGENT))).all())

    async def create_agent(self, data: AgentCreate) -> User:
        existing = await self.db.scalar(select(User).where(User.email == data.email))
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        agent = User(
            email=data.email,
            password_hash=hash_password(data.password),
            full_name=data.full_name,
            role=UserRole.AGENT,
            department_id=data.department_id,
        )
        self.db.add(agent)
        await self.db.commit()
        await self.db.refresh(agent)
        return agent

    async def update_agent(self, agent_id: uuid.UUID, data: AgentUpdate) -> User:
        agent = await self.db.get(User, agent_id)
        if agent is None or agent.role != UserRole.AGENT:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
        if data.full_name is not None:
            agent.full_name = data.full_name
        if data.department_id is not None:
            agent.department_id = data.department_id
        if data.is_active is not None:
            agent.is_active = data.is_active
        await self.db.commit()
        await self.db.refresh(agent)
        return agent

    async def deactivate_agent(self, agent_id: uuid.UUID) -> None:
        agent = await self.db.get(User, agent_id)
        if agent is None or agent.role != UserRole.AGENT:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
        agent.is_active = False
        await self.db.commit()

    async def analytics(self) -> ManagerAnalytics:
        total_open = await self.db.scalar(
            select(func.count()).select_from(Complaint).where(Complaint.status.notin_(CLOSED_STATUSES))
        )

        by_priority: dict[str, int] = {}
        for p in Priority:
            count = await self.db.scalar(
                select(func.count()).select_from(Complaint).where(
                    Complaint.priority == p, Complaint.status.notin_(CLOSED_STATUSES)
                )
            )
            by_priority[p.value] = count or 0

        resolved = (await self.db.scalars(select(Complaint).where(Complaint.status.in_(CLOSED_STATUSES)))).all()
        met = [c for c in resolved if c.sla_resolution_met is True]
        sla_rate = len(met) / len(resolved) if resolved else None

        total_complaints = await self.db.scalar(select(func.count()).select_from(Complaint))
        conflicted = await self.db.scalar(
            select(func.count()).select_from(Complaint).where(Complaint.has_conflict.is_(True))
        )
        conflict_rate = (conflicted / total_complaints) if total_complaints else None

        departments = (await self.db.scalars(select(Department))).all()
        dept_metrics = []
        for dept in departments:
            open_count = await self.db.scalar(
                select(func.count()).select_from(Complaint).where(
                    Complaint.department_id == dept.id, Complaint.status.notin_(CLOSED_STATUSES)
                )
            )
            dept_resolved = (
                await self.db.scalars(
                    select(Complaint).where(Complaint.department_id == dept.id, Complaint.status.in_(CLOSED_STATUSES))
                )
            ).all()
            durations = [
                (c.updated_at - c.created_at).total_seconds() / 3600
                for c in dept_resolved
                if c.updated_at and c.created_at
            ]
            dept_met = [c for c in dept_resolved if c.sla_resolution_met is True]
            dept_metrics.append(
                DepartmentMetrics(
                    department_id=dept.id,
                    department_name=dept.name,
                    open_complaints=open_count or 0,
                    resolved_complaints=len(dept_resolved),
                    avg_resolution_hours=round(sum(durations) / len(durations), 2) if durations else None,
                    sla_compliance_rate=round(len(dept_met) / len(dept_resolved), 3) if dept_resolved else None,
                )
            )

        return ManagerAnalytics(
            total_open=total_open or 0,
            by_priority=by_priority,
            sla_compliance_rate=round(sla_rate, 3) if sla_rate is not None else None,
            conflict_rate=round(conflict_rate, 3) if conflict_rate is not None else None,
            departments=dept_metrics,
        )
