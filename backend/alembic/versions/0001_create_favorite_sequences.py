"""Create favorite sequences table."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_favorite_sequences"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "favorite_sequences",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("total_guesses", sa.Integer(), nullable=False),
        sa.Column("rounds_reached", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_favorite_sequences_position",
        "favorite_sequences",
        ["position"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_favorite_sequences_position",
        table_name="favorite_sequences",
    )
    op.drop_table("favorite_sequences")
