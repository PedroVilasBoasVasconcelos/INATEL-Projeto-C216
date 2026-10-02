from dataclasses import dataclass, replace
from uuid import UUID


@dataclass(frozen=True)
class RoundResult:
    attempts: int
    won: bool


@dataclass(frozen=True)
class FavoriteSequence:
    id: UUID
    score: int
    total_guesses: int
    rounds_reached: int
    position: int


class FavoritesService:
    def __init__(self) -> None:
        self._favorites: list[FavoriteSequence] = []

    def get_all(self) -> list[FavoriteSequence]:
        return list(self._favorites)

    def put(self, sequence_id: UUID, rounds: list[RoundResult]) -> FavoriteSequence:
        if not rounds:
            raise ValueError("sequence_has_no_rounds")

        score = sum(
            6 - round_result.attempts for round_result in rounds if round_result.won
        )
        total_guesses = sum(round_result.attempts for round_result in rounds)
        existing_index = next(
            (
                index
                for index, favorite in enumerate(self._favorites)
                if favorite.id == sequence_id
            ),
            None,
        )
        position = (
            existing_index + 1
            if existing_index is not None
            else len(self._favorites) + 1
        )
        favorite = FavoriteSequence(
            id=sequence_id,
            score=score,
            total_guesses=total_guesses,
            rounds_reached=len(rounds),
            position=position,
        )

        if existing_index is None:
            self._favorites.append(favorite)
        else:
            self._favorites[existing_index] = favorite
        return favorite

    def move(self, sequence_id: UUID, position: int) -> list[FavoriteSequence]:
        current_index = next(
            (
                index
                for index, favorite in enumerate(self._favorites)
                if favorite.id == sequence_id
            ),
            None,
        )
        if current_index is None:
            raise ValueError("favorite_not_found")
        if position < 1 or position > len(self._favorites):
            raise ValueError("invalid_position")

        favorite = self._favorites.pop(current_index)
        self._favorites.insert(position - 1, favorite)
        self._favorites = [
            replace(item, position=index)
            for index, item in enumerate(self._favorites, start=1)
        ]
        return self.get_all()

    def delete(self, sequence_id: UUID) -> None:
        favorite_index = next(
            (
                index
                for index, favorite in enumerate(self._favorites)
                if favorite.id == sequence_id
            ),
            None,
        )
        if favorite_index is None:
            raise ValueError("favorite_not_found")

        self._favorites.pop(favorite_index)
        self._favorites = [
            replace(item, position=index)
            for index, item in enumerate(self._favorites, start=1)
        ]
