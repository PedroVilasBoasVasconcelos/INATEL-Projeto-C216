from uuid import UUID

from sqlalchemy import Integer, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class FavoriteSequenceModel(Base):
    __tablename__ = "favorite_sequences"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    total_guesses: Mapped[int] = mapped_column(Integer, nullable=False)
    rounds_reached: Mapped[int] = mapped_column(Integer, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
