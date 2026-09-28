"""add previous complaint reference and preferred contact channel

Revision ID: 3b900ee9d0bd
Revises: ba77e6de7eab
Create Date: 2026-09-28 11:14:18.447861

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3b900ee9d0bd'
down_revision: Union[str, Sequence[str], None] = 'ba77e6de7eab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


contact_channel_enum = sa.Enum('EMAIL', 'PHONE', 'SMS', name='preferred_contact_channel')


def upgrade() -> None:
    """Upgrade schema."""
    contact_channel_enum.create(op.get_bind())
    op.add_column('complaints', sa.Column('previous_complaint_id', sa.Uuid(), nullable=True))
    op.add_column('complaints', sa.Column('preferred_contact_channel', contact_channel_enum, nullable=True))
    op.create_foreign_key('fk_complaints_previous_complaint_id', 'complaints', 'complaints', ['previous_complaint_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_complaints_previous_complaint_id', 'complaints', type_='foreignkey')
    op.drop_column('complaints', 'preferred_contact_channel')
    op.drop_column('complaints', 'previous_complaint_id')
    contact_channel_enum.drop(op.get_bind())
