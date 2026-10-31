from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.clue import ClueSessionModel
from app.services.clues.logic import ClueGameDefinition


class CluesRepository:
    def create(
        self, session: Session, game_id: UUID, target: ClueGameDefinition
    ) -> None:
        session.add(
            ClueSessionModel(
                id=game_id,
                title=target.title,
                console=target.console,
                release_year=target.release_year,
                publisher=target.publisher,
                developer=target.developer,
                total_sales=target.total_sales,
                guesses=[],
                used_hints=[],
            )
        )
        session.commit()

    def get(self, session: Session, game_id: UUID) -> ClueSessionModel | None:
        return session.scalar(
            select(ClueSessionModel).where(ClueSessionModel.id == game_id)
        )

    def save_state(
        self,
        session: Session,
        game_id: UUID,
        guesses: list[dict[str, object]],
        used_hints: list[str],
    ) -> None:
        game = self.get(session, game_id)
        if game is None:
            raise ValueError("game_not_found")
        game.guesses = guesses
        game.used_hints = used_hints
        session.commit()
