from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.clues import CluesRepository
from app.schemas.clues import (
    ClueGameResponse,
    ClueGuessResponse,
    ClueHintResponse,
    GuessRequest,
)
from app.services.clues.logic import CLUE_CATALOG, ClueGameService

router = APIRouter()
clue_game_service = ClueGameService(CLUE_CATALOG, CluesRepository())


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/api/clue-games", response_model=ClueGameResponse, status_code=201)
def start_clue_game(
    session: Annotated[Session, Depends(get_db)],
) -> ClueGameResponse:
    game_id = clue_game_service.start_game(session)
    return ClueGameResponse(id=game_id, status="active", guesses=[])


@router.get("/api/clue-games/search", response_model=list[str])
def search_clue_games(q: str = "") -> list[str]:
    return clue_game_service.search_titles(q)


@router.post("/api/clue-games/{game_id}/guesses", response_model=ClueGuessResponse)
def submit_clue_guess(
    game_id: UUID,
    request: GuessRequest,
    session: Annotated[Session, Depends(get_db)],
) -> ClueGuessResponse:
    try:
        result = clue_game_service.guess(session, game_id, request.answer)
    except ValueError as error:
        details = {
            "game_not_found": (404, "Game not found"),
            "game_finished": (409, "Game has already finished"),
            "title_not_found": (404, "Game title not found"),
        }
        code, message = details[str(error)]
        raise HTTPException(status_code=code, detail=message) from error

    return ClueGuessResponse(
        title=result.title,
        complete=result.complete,
        comparisons=[
            {
                "field": comparison.field,
                "value": comparison.value,
                "result": comparison.result,
                "direction": comparison.direction,
            }
            for comparison in result.comparisons
        ],
    )


@router.post("/api/clue-games/{game_id}/hints", response_model=ClueHintResponse)
def request_clue_hint(
    game_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> ClueHintResponse:
    try:
        hint = clue_game_service.hint(session, game_id)
    except ValueError as error:
        details = {
            "game_not_found": (404, "Game not found"),
            "game_finished": (409, "Game has already finished"),
            "no_hints_left": (409, "No hints left"),
        }
        code, message = details[str(error)]
        raise HTTPException(status_code=code, detail=message) from error
    return ClueHintResponse(field=hint.field, value=hint.value)
