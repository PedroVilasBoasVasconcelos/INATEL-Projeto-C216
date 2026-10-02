from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, Field

from app.favorites import FavoritesService, RoundResult
from app.game import (
    CATALOG,
    CLUE_CATALOG,
    ClueGameService,
    Game,
    GameMode,
    GameService,
    GameStatus,
)

router = APIRouter()
game_service = GameService(CATALOG)
clue_game_service = ClueGameService(CLUE_CATALOG)
favorites_service = FavoritesService()


class GuessRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=100)


class ClueGameResponse(BaseModel):
    id: UUID
    status: str
    guesses: list[dict[str, object]]


class ClueGuessResponse(BaseModel):
    title: str
    complete: bool
    comparisons: list[dict[str, object]]


class ClueHintResponse(BaseModel):
    field: str
    value: str | int | float


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


class FavoriteRoundInput(BaseModel):
    attempts: int = Field(ge=1, le=5)
    won: bool


class FavoriteCreateRequest(BaseModel):
    rounds: list[FavoriteRoundInput] = Field(min_length=1)


class FavoritePositionRequest(BaseModel):
    position: int = Field(ge=1)


class FavoriteResponse(BaseModel):
    id: UUID
    score: int
    total_guesses: int
    rounds_reached: int
    position: int


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


@router.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Termo de Jogos API",
        "docs": "/docs",
        "health": "/health",
    }


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post(
    "/api/games",
    response_model=GameResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_game(mode: GameMode = GameMode.DAILY) -> GameResponse:
    return to_response(game_service.start_game(mode))


@router.get("/api/games/search", response_model=list[str])
def search_games(q: str = "") -> list[str]:
    return game_service.search_titles(q)


@router.post("/api/clue-games", response_model=ClueGameResponse, status_code=201)
def start_clue_game() -> ClueGameResponse:
    game_id = clue_game_service.start_game()
    return ClueGameResponse(id=game_id, status="active", guesses=[])


@router.get("/api/clue-games/search", response_model=list[str])
def search_clue_games(q: str = "") -> list[str]:
    return clue_game_service.search_titles(q)


@router.post("/api/clue-games/{game_id}/guesses", response_model=ClueGuessResponse)
def submit_clue_guess(game_id: UUID, request: GuessRequest) -> ClueGuessResponse:
    try:
        result = clue_game_service.guess(game_id, request.answer)
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
def request_clue_hint(game_id: UUID) -> ClueHintResponse:
    try:
        hint = clue_game_service.hint(game_id)
    except ValueError as error:
        details = {
            "game_not_found": (404, "Game not found"),
            "game_finished": (409, "Game has already finished"),
            "no_hints_left": (409, "No hints left"),
        }
        code, message = details[str(error)]
        raise HTTPException(status_code=code, detail=message) from error
    return ClueHintResponse(field=hint.field, value=hint.value)


@router.get("/api/games/{game_id}", response_model=GameResponse)
def get_game(game_id: UUID) -> GameResponse:
    game = game_service.get_game(game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")
    return to_response(game)


@router.post("/api/games/{game_id}/guesses", response_model=GameResponse)
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


@router.get("/api/favorites", response_model=list[FavoriteResponse])
def get_favorites() -> list[FavoriteResponse]:
    return [
        FavoriteResponse(**favorite.__dict__)
        for favorite in favorites_service.get_all()
    ]


@router.put(
    "/api/favorites/{sequence_id}",
    response_model=FavoriteResponse,
)
def save_favorite(
    sequence_id: UUID,
    request: FavoriteCreateRequest,
) -> FavoriteResponse:
    favorite = favorites_service.put(
        sequence_id,
        [
            RoundResult(attempts=round_result.attempts, won=round_result.won)
            for round_result in request.rounds
        ],
    )
    return FavoriteResponse(**favorite.__dict__)


@router.patch(
    "/api/favorites/{sequence_id}",
    response_model=list[FavoriteResponse],
)
def move_favorite(
    sequence_id: UUID,
    request: FavoritePositionRequest,
) -> list[FavoriteResponse]:
    try:
        favorites = favorites_service.move(sequence_id, request.position)
    except ValueError as error:
        code = 404 if str(error) == "favorite_not_found" else 422
        raise HTTPException(status_code=code, detail=str(error)) from error
    return [FavoriteResponse(**favorite.__dict__) for favorite in favorites]


@router.delete("/api/favorites/{sequence_id}", status_code=204)
def delete_favorite(sequence_id: UUID) -> Response:
    try:
        favorites_service.delete(sequence_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail="Favorite not found") from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)
