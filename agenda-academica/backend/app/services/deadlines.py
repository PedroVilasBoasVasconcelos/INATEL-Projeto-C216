from sqlalchemy.orm import Session

from app.models import Deadline, DeadlineInputStatus, DeadlineStatus
from app.repositories import deadlines as deadline_repository
from app.schemas.deadlines import DeadlineCreate, DeadlineUpdate


def create_deadline(session: Session, payload: DeadlineCreate) -> Deadline:
    deadline = Deadline(
        title=payload.title,
        description=payload.description,
        course=payload.course,
        due_date=payload.due_date,
        priority=payload.priority,
        completed=payload.status == DeadlineInputStatus.COMPLETED,
    )
    return deadline_repository.create_deadline(session, deadline)


def update_deadline(session: Session, deadline_id: int, payload: DeadlineUpdate) -> Deadline | None:
    deadline = deadline_repository.get_deadline(session, deadline_id)
    if deadline is None:
        return None

    deadline.title = payload.title
    deadline.description = payload.description
    deadline.course = payload.course
    deadline.due_date = payload.due_date
    deadline.priority = payload.priority
    deadline.completed = payload.status == DeadlineInputStatus.COMPLETED
    return deadline_repository.save_deadline(session, deadline)


def update_deadline_status(
    session: Session, deadline_id: int, new_status: DeadlineInputStatus
) -> Deadline | None:
    deadline = deadline_repository.get_deadline(session, deadline_id)
    if deadline is None:
        return None
    deadline.completed = new_status == DeadlineInputStatus.COMPLETED
    return deadline_repository.save_deadline(session, deadline)


def delete_deadline(session: Session, deadline_id: int) -> bool:
    deadline = deadline_repository.get_deadline(session, deadline_id)
    if deadline is None:
        return False
    deadline_repository.delete_deadline(session, deadline)
    return True


def get_deadline(session: Session, deadline_id: int) -> Deadline | None:
    return deadline_repository.get_deadline(session, deadline_id)


def list_deadlines(
    session: Session,
    *,
    course: str | None,
    status: DeadlineStatus | None,
    limit: int,
    offset: int,
) -> list[Deadline]:
    return deadline_repository.list_deadlines(
        session,
        course=course,
        status=status,
        limit=limit,
        offset=offset,
    )
