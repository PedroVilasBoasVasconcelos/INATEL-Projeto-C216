from uuid import UUID

from pydantic import BaseModel, Field


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
