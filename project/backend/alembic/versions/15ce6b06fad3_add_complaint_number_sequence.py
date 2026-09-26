"""add complaint number sequence

Revision ID: 15ce6b06fad3
Revises: 6d08d9286fa7
Create Date: 2026-09-26 15:23:01.781219

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '15ce6b06fad3'
down_revision: Union[str, Sequence[str], None] = '6d08d9286fa7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE SEQUENCE IF NOT EXISTS complaint_number_seq START WITH 1 INCREMENT BY 1")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP SEQUENCE IF EXISTS complaint_number_seq")
