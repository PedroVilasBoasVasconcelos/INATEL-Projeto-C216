from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DeadlineStatus
from app.schemas.deadlines import DeadlineCreate, DeadlineRead, DeadlineStatusUpdate, DeadlineUpdate
from app.services import deadlines as deadline_service

router = APIRouter(prefix="/api/deadlines", tags=["deadlines"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=DeadlineRead, status_code=status.HTTP_201_CREATED)
def create_deadline(payload: DeadlineCreate, session: DatabaseSession) -> DeadlineRead:
    return deadline_service.create_deadline(session, payload)


@router.get("", response_model=list[DeadlineRead])
def list_deadlines(
    session: DatabaseSession,
    course: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    status_filter: Annotated[DeadlineStatus | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[DeadlineRead]:
    if course is not None:
        course = course.strip()
        if not course:
            raise HTTPException(status_code=422, detail="A disciplina não pode ficar vazia.")
    return deadline_service.list_deadlines(
        session, course=course, status=status_filter, limit=limit, offset=offset
    )


@router.get("/{deadline_id}", response_model=DeadlineRead)
def get_deadline(deadline_id: int, session: DatabaseSession) -> DeadlineRead:
    deadline = deadline_service.get_deadline(session, deadline_id)
    if deadline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prazo não encontrado.")
    return deadline


@router.put("/{deadline_id}", response_model=DeadlineRead)
def update_deadline(
    deadline_id: int, payload: DeadlineUpdate, session: DatabaseSession
) -> DeadlineRead:
    deadline = deadline_service.update_deadline(session, deadline_id, payload)
    if deadline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prazo não encontrado.")
    return deadline


@router.patch("/{deadline_id}/status", response_model=DeadlineRead)
def update_deadline_status(
    deadline_id: int, payload: DeadlineStatusUpdate, session: DatabaseSession
) -> DeadlineRead:
    deadline = deadline_service.update_deadline_status(session, deadline_id, payload.status)
    if deadline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prazo não encontrado.")
    return deadline


@router.delete("/{deadline_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deadline(deadline_id: int, session: DatabaseSession) -> Response:
    if not deadline_service.delete_deadline(session, deadline_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prazo não encontrado.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
