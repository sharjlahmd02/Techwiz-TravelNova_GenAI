from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def next_complaint_id(db: AsyncSession) -> str:
    result = await db.execute(text("SELECT nextval('complaint_number_seq')"))
    number = result.scalar_one()
    return f"CMP-{number:05d}"
