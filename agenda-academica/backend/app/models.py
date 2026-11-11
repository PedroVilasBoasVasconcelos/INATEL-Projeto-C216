from datetime import date, datetime, timezone
from enum import StrEnum

from sqlalchemy import Boolean, Date, DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DeadlinePriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class DeadlineStatus(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    OVERDUE = "overdue"


class DeadlineInputStatus(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"


class Deadline(Base):
    __tablename__ = "deadlines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    course: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    priority: Mapped[DeadlinePriority] = mapped_column(
        Enum(
            DeadlinePriority,
            name="deadline_priority",
            native_enum=False,
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
        default=DeadlinePriority.MEDIUM,
    )
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    @property
    def status(self) -> DeadlineStatus:
        if self.completed:
            return DeadlineStatus.COMPLETED
        if self.due_date < date.today():
            return DeadlineStatus.OVERDUE
        return DeadlineStatus.PENDING
