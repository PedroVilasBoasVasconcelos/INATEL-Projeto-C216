from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FavoriteRoundInput(BaseModel):
    attempts: int = Field(ge=1, le=5)
    won: bool


class FavoriteCreateRequest(BaseModel):
    rounds: list[FavoriteRoundInput] = Field(min_length=1)


class FavoritePositionRequest(BaseModel):
    position: int = Field(ge=1)


class FavoriteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    score: int
    total_guesses: int
    rounds_reached: int
    position: int
