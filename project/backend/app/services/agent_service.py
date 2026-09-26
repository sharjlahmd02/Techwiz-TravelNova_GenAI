import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.complaint import Complaint
from app.models.enums import ComplaintStatus, HistoryAction, MessageSender, Priority
from app.models.customer_message import CustomerMessage
from app.models.user import User
from app.schemas.agent import AgentMetrics
from app.services.staff_service import log_history

ALLOWED_AGENT_STATUSES = {ComplaintStatus.IN_PROGRESS, ComplaintStatus.AWAITING_CUSTOMER, ComplaintStatus.RESOLVED}


class AgentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_department_complaints(
        self,
        agent: User,
        page: int,
        page_size: int,
        status_filter: ComplaintStatus | None = None,
        priority_filter: Priority | None = None,
    ) -> tuple[list[Complaint], int]:
        conditions = [Complaint.department_id == agent.department_id]
        if status_filter:
            conditions.append(Complaint.status == status_filter)
        if priority_filter:
            conditions.append(Complaint.priority == priority_filter)

        base = select(Complaint).where(*conditions).order_by(Complaint.created_at.desc())
        total = len((await self.db.scalars(base)).all())
        items = (await self.db.scalars(base.offset((page - 1) * page_size).limit(page_size))).all()
        return list(items), total

    async def get_department_complaint(self, complaint_id: uuid.UUID, agent: User) -> Complaint:
        complaint = await self.db.get(Complaint, complaint_id)
        if complaint is None or complaint.department_id != agent.department_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
        return complaint

    async def update_status(self, complaint: Complaint, agent: User, new_status: ComplaintStatus) -> Complaint:
        if new_status not in ALLOWED_AGENT_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Agents may only set status to one of {[s.value for s in ALLOWED_AGENT_STATUSES]}",
            )
        old_status = complaint.status.value
        complaint.status = new_status
        if complaint.assigned_agent_id is None:
            complaint.assigned_agent_id = agent.id

        await log_history(
            self.db, complaint.id, HistoryAction.STATUS_CHANGED, agent.id,
            old_value={"status": old_status}, new_value={"status": new_status.value},
        )
        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    async def add_note(self, complaint: Complaint, agent: User, note: str) -> None:
        await log_history(self.db, complaint.id, HistoryAction.NOTE_ADDED, agent.id, notes=note)
        await self.db.commit()

    async def request_info(self, complaint: Complaint, agent: User, message: str) -> CustomerMessage:
        complaint.status = ComplaintStatus.AWAITING_CUSTOMER

        msg = CustomerMessage(complaint_id=complaint.id, sender=MessageSender.AGENT, message=message)
        self.db.add(msg)
        await log_history(
            self.db, complaint.id, HistoryAction.RESPONSE_SENT, agent.id,
            notes="Agent requested more information from customer",
        )
        await self.db.commit()
        await self.db.refresh(msg)
        return msg

    async def my_metrics(self, agent: User) -> AgentMetrics:
        resolved_count = await self.db.scalar(
            select(func.count()).select_from(Complaint).where(
                Complaint.assigned_agent_id == agent.id,
                Complaint.status.in_((ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED)),
            )
        )
        open_count = await self.db.scalar(
            select(func.count()).select_from(Complaint).where(
                Complaint.assigned_agent_id == agent.id,
                Complaint.status.notin_((ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED)),
            )
        )

        resolved = (
            await self.db.scalars(
                select(Complaint).where(
                    Complaint.assigned_agent_id == agent.id,
                    Complaint.status.in_((ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED)),
                )
            )
        ).all()
        durations = [
            (c.updated_at - c.created_at).total_seconds() / 3600 for c in resolved if c.updated_at and c.created_at
        ]
        avg_hours = sum(durations) / len(durations) if durations else None

        met = [c for c in resolved if c.sla_resolution_met is True]
        sla_rate = len(met) / len(resolved) if resolved else None

        return AgentMetrics(
            resolved_count=resolved_count or 0,
            open_count=open_count or 0,
            avg_resolution_hours=round(avg_hours, 2) if avg_hours is not None else None,
            sla_compliance_rate=round(sla_rate, 3) if sla_rate is not None else None,
        )
