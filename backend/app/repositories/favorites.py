from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.favorite import FavoriteSequenceModel


class FavoritesRepository:
    def get_all(self, session: Session) -> list[FavoriteSequenceModel]:
        statement = select(FavoriteSequenceModel).order_by(
            FavoriteSequenceModel.position
        )
        return list(session.scalars(statement))

    def get(self, session: Session, sequence_id: UUID) -> FavoriteSequenceModel | None:
        return session.get(FavoriteSequenceModel, sequence_id)

    def save(
        self,
        session: Session,
        sequence_id: UUID,
        score: int,
        total_guesses: int,
        rounds_reached: int,
    ) -> FavoriteSequenceModel:
        favorite = self.get(session, sequence_id)
        if favorite is None:
            favorite = FavoriteSequenceModel(
                id=sequence_id,
                score=score,
                total_guesses=total_guesses,
                rounds_reached=rounds_reached,
                position=len(self.get_all(session)) + 1,
            )
            session.add(favorite)
        else:
            favorite.score = score
            favorite.total_guesses = total_guesses
            favorite.rounds_reached = rounds_reached

        session.commit()
        session.refresh(favorite)
        return favorite

    def move(
        self,
        session: Session,
        sequence_id: UUID,
        position: int,
    ) -> list[FavoriteSequenceModel]:
        favorites = self.get_all(session)
        current_index = next(
            (
                index
                for index, favorite in enumerate(favorites)
                if favorite.id == sequence_id
            ),
            None,
        )
        if current_index is None:
            raise ValueError("favorite_not_found")
        if position < 1 or position > len(favorites):
            raise ValueError("invalid_position")

        favorite = favorites.pop(current_index)
        favorites.insert(position - 1, favorite)
        for index, item in enumerate(favorites, start=1):
            item.position = index

        session.commit()
        return self.get_all(session)

    def delete(self, session: Session, sequence_id: UUID) -> None:
        favorite = self.get(session, sequence_id)
        if favorite is None:
            raise ValueError("favorite_not_found")

        session.delete(favorite)
        remaining = self.get_all(session)
        for index, item in enumerate(remaining, start=1):
            item.position = index
        session.commit()
