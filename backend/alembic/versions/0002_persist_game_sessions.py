"""Persist game and clue sessions."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_game_sessions"
down_revision: str | None = "0001_favorite_sequences"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "game_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("image_url", sa.String(length=2048), nullable=False),
        sa.Column("mode", sa.String(length=20), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("blur_percentage", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "game_guesses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("game_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("answer", sa.String(length=100), nullable=False),
        sa.Column("correct", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["game_id"], ["game_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_game_guesses_game_id", "game_guesses", ["game_id"])
    op.create_table(
        "clue_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("console", sa.String(length=100), nullable=False),
        sa.Column("release_year", sa.Integer(), nullable=False),
        sa.Column("publisher", sa.String(length=300), nullable=False),
        sa.Column("developer", sa.String(length=300), nullable=False),
        sa.Column("total_sales", sa.Float(), nullable=False),
        sa.Column("guesses", sa.JSON(), nullable=False),
        sa.Column("used_hints", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("clue_sessions")
    op.drop_index("ix_game_guesses_game_id", table_name="game_guesses")
    op.drop_table("game_guesses")
    op.drop_table("game_sessions")
