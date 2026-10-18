from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.favorite import FavoriteSequenceModel
from app.repositories.favorites import FavoritesRepository


@dataclass(frozen=True)
class RoundResult:
    attempts: int
    won: bool


class FavoritesService:
    def __init__(self, repository: FavoritesRepository) -> None:
        self.repository = repository

    def get_all(self, session: Session) -> list[FavoriteSequenceModel]:
        return self.repository.get_all(session)

    def put(
        self,
        session: Session,
        sequence_id: UUID,
        rounds: list[RoundResult],
    ) -> FavoriteSequenceModel:
        if not rounds:
            raise ValueError("sequence_has_no_rounds")

        score = sum(
            6 - round_result.attempts for round_result in rounds if round_result.won
        )
        total_guesses = sum(round_result.attempts for round_result in rounds)
        return self.repository.save(
            session,
            sequence_id,
            score,
            total_guesses,
            len(rounds),
        )

    def move(
        self,
        session: Session,
        sequence_id: UUID,
        position: int,
    ) -> list[FavoriteSequenceModel]:
        return self.repository.move(session, sequence_id, position)

    def delete(self, session: Session, sequence_id: UUID) -> None:
        self.repository.delete(session, sequence_id)
