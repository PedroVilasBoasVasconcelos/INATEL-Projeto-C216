from collections.abc import Iterator
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.repositories.favorites import FavoritesRepository
from app.services.favorites.logic import FavoritesService, RoundResult


@pytest.fixture
def database_session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_put_calculates_score_and_guess_total(database_session: Session) -> None:
    service = FavoritesService(FavoritesRepository())
    sequence_id = uuid4()

    favorite = service.put(
        database_session,
        sequence_id,
        [
            RoundResult(attempts=1, won=True),
            RoundResult(attempts=2, won=True),
            RoundResult(attempts=5, won=False),
        ],
    )

    assert favorite.score == 9
    assert favorite.total_guesses == 8
    assert favorite.rounds_reached == 3
    assert favorite.position == 1


def test_put_updates_the_existing_sequence(database_session: Session) -> None:
    service = FavoritesService(FavoritesRepository())
    sequence_id = uuid4()

    first = service.put(
        database_session,
        sequence_id,
        [RoundResult(attempts=1, won=True)],
    )
    second = service.put(
        database_session,
        sequence_id,
        [RoundResult(attempts=3, won=True)],
    )

    assert first.id == second.id
    assert second.score == 3
    assert len(service.get_all(database_session)) == 1


def test_move_changes_favorite_order(database_session: Session) -> None:
    service = FavoritesService(FavoritesRepository())
    first_id, second_id = uuid4(), uuid4()
    round_result = [RoundResult(attempts=1, won=True)]
    service.put(database_session, first_id, round_result)
    service.put(database_session, second_id, round_result)

    favorites = service.move(database_session, second_id, 1)

    assert [favorite.id for favorite in favorites] == [second_id, first_id]
    assert [favorite.position for favorite in favorites] == [1, 2]


def test_delete_removes_favorite_and_compacts_positions(
    database_session: Session,
) -> None:
    service = FavoritesService(FavoritesRepository())
    first_id, second_id = uuid4(), uuid4()
    round_result = [RoundResult(attempts=1, won=True)]
    service.put(database_session, first_id, round_result)
    service.put(database_session, second_id, round_result)

    service.delete(database_session, first_id)

    assert [
        (favorite.id, favorite.position)
        for favorite in service.get_all(database_session)
    ] == [(second_id, 1)]
