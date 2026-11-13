from datetime import date

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models import Deadline
from app.schemas.deadlines import DeadlineStatus


def get_deadline(session: Session, deadline_id: int) -> Deadline | None:
    return session.get(Deadline, deadline_id)


def list_deadlines(
    session: Session,
    *,
    course: str | None,
    status: DeadlineStatus | None,
    limit: int,
    offset: int,
) -> list[Deadline]:
    statement: Select[tuple[Deadline]] = select(Deadline)

    if course:
        statement = statement.where(Deadline.course.ilike(f"%{course.strip()}%"))
    if status == DeadlineStatus.PENDING:
        statement = statement.where(
            Deadline.completed.is_(False), Deadline.due_date >= date.today()
        )
    elif status == DeadlineStatus.COMPLETED:
        statement = statement.where(Deadline.completed.is_(True))
    elif status == DeadlineStatus.OVERDUE:
        statement = statement.where(Deadline.completed.is_(False), Deadline.due_date < date.today())

    statement = statement.order_by(Deadline.due_date.asc(), Deadline.id.asc())
    return list(session.scalars(statement.offset(offset).limit(limit)))


def create_deadline(session: Session, deadline: Deadline) -> Deadline:
    session.add(deadline)
    session.commit()
    session.refresh(deadline)
    return deadline


def save_deadline(session: Session, deadline: Deadline) -> Deadline:
    session.commit()
    session.refresh(deadline)
    return deadline


def delete_deadline(session: Session, deadline: Deadline) -> None:
    session.delete(deadline)
    session.commit()
