import pytest
from fastapi.testclient import TestClient

from app.game import CATALOG, GameMode
from app.main import app, game_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_games() -> None:
    game_service.games.clear()


def test_catalog_loads_unique_games_with_cover_urls() -> None:
    assert len(CATALOG) > 100
    assert all(game.title and game.image_url for game in CATALOG)
    assert len({game.title for game in CATALOG}) == len(CATALOG)


def test_root_returns_api_links() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["docs"] == "/docs"


def test_start_game_hides_answer_and_starts_fully_blurred() -> None:
    response = client.post("/api/games")

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "active"
    assert body["blur_percentage"] == 100
    assert body["answer"] is None
    assert body["mode"] == GameMode.DAILY
    assert body["guesses"] == []


def test_search_games_returns_matching_titles() -> None:
    response = client.get("/api/games/search", params={"q": "007"})

    assert response.status_code == 200
    assert "007 First Light" in response.json()


def test_wrong_guess_reduces_blur() -> None:
    game = client.post("/api/games").json()

    response = client.post(
        f"/api/games/{game['id']}/guesses", json={"answer": "not this game"}
    )

    assert response.status_code == 200
    assert response.json()["correct"] is False
    assert response.json()["blur_percentage"] == 80
    assert response.json()["attempts"] == 1
    assert response.json()["guesses"] == [
        {"answer": "not this game", "correct": False}
    ]


def test_daily_game_is_stable_for_the_same_day() -> None:
    first = client.post("/api/games", params={"mode": "daily"}).json()
    second = client.post("/api/games", params={"mode": "daily"}).json()

    assert first["mode"] == "daily"
    assert first["image_url"] == second["image_url"]


def test_streak_ends_on_the_first_wrong_guess() -> None:
    game = client.post("/api/games", params={"mode": "streak"}).json()

    response = client.post(
        f"/api/games/{game['id']}/guesses", json={"answer": "wrong"}
    )

    assert response.json()["status"] == "lost"
    assert response.json()["attempts"] == 1


def test_correct_guess_ignores_case_and_ends_game() -> None:
    game = client.post("/api/games", params={"mode": "streak"}).json()
    expected_title = CATALOG[0].title

    response = client.post(
        f"/api/games/{game['id']}/guesses",
        json={"answer": f"  {expected_title.upper()} "},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "won"
    assert response.json()["correct"] is True
    assert response.json()["blur_percentage"] == 0
    assert response.json()["answer"] == expected_title


def test_fifth_wrong_guess_loses_and_reveals_answer() -> None:
    game = client.post("/api/games").json()

    for _ in range(5):
        response = client.post(
            f"/api/games/{game['id']}/guesses", json={"answer": "wrong"}
        )

    assert response.json()["status"] == "lost"
    assert response.json()["answer"] is not None
    assert response.json()["attempts"] == 5


def test_guess_after_game_finished_is_rejected() -> None:
    game = client.post("/api/games", params={"mode": "streak"}).json()
    client.post(
        f"/api/games/{game['id']}/guesses",
        json={"answer": CATALOG[0].title},
    )

    response = client.post(f"/api/games/{game['id']}/guesses", json={"answer": "wrong"})

    assert response.status_code == 409
