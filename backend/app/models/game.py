from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class GameSessionModel(Base):
    __tablename__ = "game_sessions"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    image_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    blur_percentage: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    guesses: Mapped[list["GameGuessModel"]] = relationship(
        back_populates="game",
        cascade="all, delete-orphan",
        order_by="GameGuessModel.position",
    )


class GameGuessModel(Base):
    __tablename__ = "game_guesses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[UUID] = mapped_column(
        ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    answer: Mapped[str] = mapped_column(String(100), nullable=False)
    correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    game: Mapped[GameSessionModel] = relationship(back_populates="guesses")
