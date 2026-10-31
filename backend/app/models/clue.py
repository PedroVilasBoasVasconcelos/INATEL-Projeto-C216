from uuid import UUID

from sqlalchemy import JSON, Float, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ClueSessionModel(Base):
    __tablename__ = "clue_sessions"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    console: Mapped[str] = mapped_column(String(100), nullable=False)
    release_year: Mapped[int] = mapped_column(Integer, nullable=False)
    publisher: Mapped[str] = mapped_column(String(300), nullable=False)
    developer: Mapped[str] = mapped_column(String(300), nullable=False)
    total_sales: Mapped[float] = mapped_column(Float, nullable=False)
    guesses: Mapped[list[dict[str, object]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    used_hints: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
