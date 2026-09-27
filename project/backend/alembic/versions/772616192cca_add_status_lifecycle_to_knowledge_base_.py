"""add status lifecycle to knowledge base documents

Revision ID: 772616192cca
Revises: 43464ca90094
Create Date: 2026-09-27 18:08:36.907245

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '772616192cca'
down_revision: Union[str, Sequence[str], None] = '43464ca90094'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


kb_status_enum = sa.Enum('ACTIVE', 'PREVIOUS', 'SUPERSEDED', 'DRAFT', name='knowledge_base_status')


def upgrade() -> None:
    """Upgrade schema."""
    kb_status_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        'knowledge_base_documents',
        sa.Column('status', kb_status_enum, nullable=False, server_default='ACTIVE'),
    )
    # Backfill: any doc already soft-deactivated via is_active=False is treated as
    # superseded (closest existing meaning to "no longer current"), not draft.
    op.execute("UPDATE knowledge_base_documents SET status = 'SUPERSEDED' WHERE is_active = false")
    op.alter_column('knowledge_base_documents', 'status', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('knowledge_base_documents', 'status')
    kb_status_enum.drop(op.get_bind(), checkfirst=True)
