from uuid import uuid4

from app.favorites import FavoritesService, RoundResult


def test_put_calculates_score_and_guess_total() -> None:
    service = FavoritesService()
    sequence_id = uuid4()

    favorite = service.put(
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


def test_put_is_idempotent_for_the_same_sequence() -> None:
    service = FavoritesService()
    sequence_id = uuid4()
    rounds = [RoundResult(attempts=1, won=True)]

    first = service.put(sequence_id, rounds)
    second = service.put(sequence_id, [RoundResult(attempts=3, won=True)])

    assert first.id == second.id
    assert second.score == 3
    assert len(service.get_all()) == 1


def test_move_changes_favorite_order() -> None:
    service = FavoritesService()
    first_id, second_id = uuid4(), uuid4()
    round_result = [RoundResult(attempts=1, won=True)]
    service.put(first_id, round_result)
    service.put(second_id, round_result)

    favorites = service.move(second_id, 1)

    assert [favorite.id for favorite in favorites] == [second_id, first_id]
    assert [favorite.position for favorite in favorites] == [1, 2]


def test_delete_removes_favorite_and_compacts_positions() -> None:
    service = FavoritesService()
    first_id, second_id = uuid4(), uuid4()
    round_result = [RoundResult(attempts=1, won=True)]
    service.put(first_id, round_result)
    service.put(second_id, round_result)

    service.delete(first_id)

    assert [(favorite.id, favorite.position) for favorite in service.get_all()] == [
        (second_id, 1)
    ]
