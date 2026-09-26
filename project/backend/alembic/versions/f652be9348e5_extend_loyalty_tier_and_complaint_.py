"""extend loyalty tier and complaint channel enums

Revision ID: f652be9348e5
Revises: 15ce6b06fad3
Create Date: 2026-09-26 15:39:28.698262

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f652be9348e5'
down_revision: Union[str, Sequence[str], None] = '15ce6b06fad3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TYPE loyalty_tier ADD VALUE IF NOT EXISTS 'DIAMOND'")
    op.execute("ALTER TYPE complaint_channel ADD VALUE IF NOT EXISTS 'PHONE'")
    op.execute("ALTER TYPE complaint_channel ADD VALUE IF NOT EXISTS 'SOCIAL_MEDIA'")
    op.execute("ALTER TYPE complaint_channel ADD VALUE IF NOT EXISTS 'MOBILE_APP'")


def downgrade() -> None:
    """Downgrade schema."""
    # Postgres does not support removing enum values; downgrading this
    # migration would require recreating the enum types from scratch.
    pass
