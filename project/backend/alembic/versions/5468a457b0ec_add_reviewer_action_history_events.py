"""add reviewer action history events

Revision ID: 5468a457b0ec
Revises: 5bd7221b005b
Create Date: 2026-09-27 23:01:48.493126

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5468a457b0ec'
down_revision: Union[str, Sequence[str], None] = '5bd7221b005b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TYPE history_action ADD VALUE IF NOT EXISTS 'REVIEWER_COMMENT'")
    op.execute("ALTER TYPE history_action ADD VALUE IF NOT EXISTS 'REJECTED'")
    op.execute("ALTER TYPE history_action ADD VALUE IF NOT EXISTS 'RESPONSE_REGENERATED'")


def downgrade() -> None:
    """Downgrade schema."""
    # Postgres does not support removing enum values; downgrading this
    # migration would require recreating the enum type from scratch.
    pass
