from uuid import UUID

from pydantic import BaseModel, Field

from app.services.games.logic import GameMode, GameStatus


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
