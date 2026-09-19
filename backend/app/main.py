from uuid import UUID

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from app.game import CATALOG, Game, GameMode, GameService, GameStatus

app = FastAPI(title="Termo de Jogos API", version="0.1.0")
game_service = GameService(CATALOG)


class GuessRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=100)


class GameResponse(BaseModel):
    id: UUID
    mode: GameMode
    image_url: str
    blur_percentage: int
    attempts: int
    max_attempts: int
    status: GameStatus
    correct: bool | None = None
    answer: str | None = None
    guesses: list[dict[str, bool | str]]


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Termo de Jogos API",
        "docs": "/docs",
        "health": "/health",
    }


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
            {"answer": guess.answer, "correct": guess.correct}
            for guess in game.guesses
        ],
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/api/games",
    response_model=GameResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_game(mode: GameMode = GameMode.DAILY) -> GameResponse:
    return to_response(game_service.start_game(mode))


@app.get("/api/games/search", response_model=list[str])
def search_games(q: str = "") -> list[str]:
    return game_service.search_titles(q)


@app.get("/api/games/{game_id}", response_model=GameResponse)
def get_game(game_id: UUID) -> GameResponse:
    game = game_service.get_game(game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")
    return to_response(game)


@app.post("/api/games/{game_id}/guesses", response_model=GameResponse)
def submit_guess(game_id: UUID, request: GuessRequest) -> GameResponse:
    game = game_service.get_game(game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")

    try:
        correct = game.guess(request.answer)
    except ValueError as error:
        if str(error) == "game_finished":
            raise HTTPException(
                status_code=409, detail="Game has already finished"
            ) from error
        raise

    return to_response(game, correct=correct)
