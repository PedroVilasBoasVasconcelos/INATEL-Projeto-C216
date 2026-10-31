from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.games import GamesRepository
from app.schemas.games import GameResponse, GuessRequest
from app.services.games.logic import CATALOG, Game, GameMode, GameService, GameStatus

router = APIRouter()
game_service = GameService(CATALOG, GamesRepository())


def to_response(game: Game, correct: bool | None = None) -> GameResponse:
    finished = game.status != GameStatus.ACTIVE
    return GameResponse(
        id=game.id,
        mode=game.mode,
        image_url=game.definition.image_url,
        blur_percentage=game.blur_percentage,
        attempts=game.attempts,
        max_attempts=game.max_attempts,
        status=game.status,
        correct=correct,
        answer=game.definition.title if finished else None,
        guesses=[
            {"answer": guess.answer, "correct": guess.correct} for guess in game.guesses
        ],
    )


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post(
    "/api/games", response_model=GameResponse, status_code=status.HTTP_201_CREATED
)
def start_game(
    session: Annotated[Session, Depends(get_db)],
    mode: GameMode = GameMode.DAILY,
) -> GameResponse:
    return to_response(game_service.start_game(session, mode))


@router.get("/api/games/search", response_model=list[str])
def search_games(q: str = "") -> list[str]:
    return game_service.search_titles(q)


@router.get("/api/games/{game_id}", response_model=GameResponse)
def get_game(
    game_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> GameResponse:
    game = game_service.get_game(session, game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")
    return to_response(game)


@router.post("/api/games/{game_id}/guesses", response_model=GameResponse)
def submit_guess(
    game_id: UUID,
    request: GuessRequest,
    session: Annotated[Session, Depends(get_db)],
) -> GameResponse:
    try:
        game, correct = game_service.guess(session, game_id, request.answer)
    except ValueError as error:
        if str(error) == "game_not_found":
            raise HTTPException(status_code=404, detail="Game not found") from error
        if str(error) == "game_finished":
            raise HTTPException(
                status_code=409, detail="Game has already finished"
            ) from error
        raise

    return to_response(game, correct=correct)
