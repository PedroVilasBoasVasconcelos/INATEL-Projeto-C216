import pytest
from fastapi.testclient import TestClient

from app.main import app, game_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_games() -> None:
    game_service.games.clear()


def test_start_game_hides_answer_and_starts_fully_blurred() -> None:
    response = client.post("/api/games")

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "active"
    assert body["blur_percentage"] == 100
    assert body["answer"] is None


def test_wrong_guess_reduces_blur() -> None:
    game = client.post("/api/games").json()

    response = client.post(
        f"/api/games/{game['id']}/guesses", json={"answer": "not this game"}
    )

    assert response.status_code == 200
    assert response.json()["correct"] is False
    assert response.json()["blur_percentage"] == 80
    assert response.json()["attempts"] == 1


def test_correct_guess_ignores_case_and_ends_game() -> None:
    game = client.post("/api/games").json()

    response = client.post(
        f"/api/games/{game['id']}/guesses", json={"answer": "  HOLLOW KNIGHT "}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "won"
    assert response.json()["correct"] is True
    assert response.json()["blur_percentage"] == 0
    assert response.json()["answer"] == "Hollow Knight"


def test_fifth_wrong_guess_loses_and_reveals_answer() -> None:
    game = client.post("/api/games").json()

    for _ in range(5):
        response = client.post(
            f"/api/games/{game['id']}/guesses", json={"answer": "wrong"}
        )

    assert response.json()["status"] == "lost"
    assert response.json()["answer"] == "Hollow Knight"
    assert response.json()["attempts"] == 5


def test_guess_after_game_finished_is_rejected() -> None:
    game = client.post("/api/games").json()
    client.post(f"/api/games/{game['id']}/guesses", json={"answer": "Hollow Knight"})

    response = client.post(f"/api/games/{game['id']}/guesses", json={"answer": "wrong"})

    assert response.status_code == 409
