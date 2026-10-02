from uuid import uuid4

import pytest

from app.game import CATALOG, CLUE_CATALOG, ClueGameService, Game, GameDefinition


def test_catalog_loads_unique_games_with_cover_urls() -> None:
    assert len(CATALOG) > 100
    assert all(game.title and game.image_url for game in CATALOG)
    assert len({game.title for game in CATALOG}) == len(CATALOG)


def test_clue_catalog_loads_sales_metadata() -> None:
    assert len(CLUE_CATALOG) > 100
    assert CLUE_CATALOG[0].release_year > 0
    assert CLUE_CATALOG[0].total_sales >= 0


def test_game_guess_normalizes_case_and_whitespace() -> None:
    game = Game(id=uuid4(), definition=GameDefinition("0 A.D.", "cover"))

    assert game.guess("  0 a.d. ") is True
    assert game.attempts == 1


def test_clue_guess_returns_comparison_statuses() -> None:
    clue_service = ClueGameService(CLUE_CATALOG)
    game_id = clue_service.start_game()
    target = clue_service.get_game(game_id)[0]

    result = clue_service.guess(game_id, target.title)

    assert result.complete is True
    assert all(
        comparison.result.value == "correct" for comparison in result.comparisons
    )


def test_clue_unknown_title_is_rejected() -> None:
    clue_service = ClueGameService(CLUE_CATALOG)
    game_id = clue_service.start_game()

    with pytest.raises(ValueError, match="title_not_found"):
        clue_service.guess(game_id, "jogo que não existe")


def test_clue_hint_reveals_each_field_only_once() -> None:
    clue_service = ClueGameService(CLUE_CATALOG)
    game_id = clue_service.start_game()

    first_hint = clue_service.hint(game_id)
    second_hint = clue_service.hint(game_id)

    assert first_hint.field != second_hint.field
