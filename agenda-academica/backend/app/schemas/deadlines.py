from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import DeadlineInputStatus, DeadlinePriority, DeadlineStatus


class DeadlineBase(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    course: str = Field(min_length=1, max_length=100)
    due_date: date
    priority: DeadlinePriority = DeadlinePriority.MEDIUM

    @field_validator("title", "course")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Este campo não pode ficar vazio.")
        return value

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class DeadlineCreate(DeadlineBase):
    status: DeadlineInputStatus = DeadlineInputStatus.PENDING


class DeadlineUpdate(DeadlineBase):
    status: DeadlineInputStatus


class DeadlineStatusUpdate(BaseModel):
    status: DeadlineInputStatus


class DeadlineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    course: str
    due_date: date
    priority: DeadlinePriority
    status: DeadlineStatus
    created_at: datetime
    updated_at: datetime
