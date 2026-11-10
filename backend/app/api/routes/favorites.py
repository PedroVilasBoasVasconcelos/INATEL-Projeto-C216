from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.favorites import FavoritesRepository
from app.schemas.favorites import (
    FavoriteCreateRequest,
    FavoritePositionRequest,
    FavoriteResponse,
)
from app.services.favorites.logic import FavoritesService, RoundResult

router = APIRouter()
favorites_service = FavoritesService(FavoritesRepository())


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/api/favorites", response_model=list[FavoriteResponse])
def get_favorites(
    session: Annotated[Session, Depends(get_db)],
) -> list[FavoriteResponse]:
    return favorites_service.get_all(session)


@router.put("/api/favorites/{sequence_id}", response_model=FavoriteResponse)
def save_favorite(
    sequence_id: UUID,
    request: FavoriteCreateRequest,
    session: Annotated[Session, Depends(get_db)],
) -> FavoriteResponse:
    favorite = favorites_service.put(
        session,
        sequence_id,
        [
            RoundResult(attempts=round_result.attempts, won=round_result.won)
            for round_result in request.rounds
        ],
    )
    return favorite


@router.patch(
    "/api/favorites/{sequence_id}",
    response_model=list[FavoriteResponse],
)
def move_favorite(
    sequence_id: UUID,
    request: FavoritePositionRequest,
    session: Annotated[Session, Depends(get_db)],
) -> list[FavoriteResponse]:
    try:
        favorites = favorites_service.move(session, sequence_id, request.position)
    except ValueError as error:
        code = 404 if str(error) == "favorite_not_found" else 422
        raise HTTPException(status_code=code, detail=str(error)) from error
    return favorites


@router.delete("/api/favorites/{sequence_id}", status_code=204)
def delete_favorite(
    sequence_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> Response:
    try:
        favorites_service.delete(session, sequence_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail="Favorite not found") from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)
