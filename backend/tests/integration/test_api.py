from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.game import CATALOG, GameMode
from app.main import app
from app.routes import clue_game_service, favorites_service, game_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_services() -> None:
    game_service.games.clear()
    clue_game_service.games.clear()
    favorites_service._favorites.clear()


def test_root_and_health_endpoints() -> None:
    assert client.get("/").json()["docs"] == "/docs"
    assert client.get("/health").json() == {"status": "ok"}


def test_start_get_and_search_game_endpoints() -> None:
    response = client.post("/api/games", params={"mode": "streak"})

    assert response.status_code == 201
    game = response.json()
    assert game["mode"] == GameMode.STREAK
    assert game["status"] == "active"
    assert client.get(f"/api/games/{game['id']}").status_code == 200
    assert (
        "007 First Light" in client.get("/api/games/search", params={"q": "007"}).json()
    )


def test_submit_wrong_guess_reduces_blur() -> None:
    game = client.post("/api/games").json()

    response = client.post(
        f"/api/games/{game['id']}/guesses", json={"answer": "not this game"}
    )

    assert response.status_code == 200
    assert response.json()["blur_percentage"] == 80
    assert response.json()["attempts"] == 1


@pytest.mark.parametrize("answer", ["  0 A.D. ", "0 a.d."])
def test_correct_guess_ends_game(answer: str) -> None:
    game = client.post("/api/games", params={"mode": "streak"}).json()

    response = client.post(f"/api/games/{game['id']}/guesses", json={"answer": answer})

    assert response.status_code == 200
    assert response.json()["status"] == "won"
    assert response.json()["answer"] == CATALOG[0].title


def test_daily_game_is_stable_for_the_same_day() -> None:
    first = client.post("/api/games", params={"mode": "daily"}).json()
    second = client.post("/api/games", params={"mode": "daily"}).json()

    assert first["image_url"] == second["image_url"]


def test_game_guess_validation_and_finished_game_conflict() -> None:
    game = client.post("/api/games", params={"mode": "streak"}).json()
    invalid = client.post(f"/api/games/{game['id']}/guesses", json={"answer": ""})
    assert invalid.status_code == 422

    client.post(f"/api/games/{game['id']}/guesses", json={"answer": CATALOG[0].title})
    response = client.post(f"/api/games/{game['id']}/guesses", json={"answer": "wrong"})

    assert response.status_code == 409


def test_clue_game_routes_start_search_guess_and_hint() -> None:
    game = client.post("/api/clue-games").json()
    assert game["status"] == "active"
    assert client.get("/api/clue-games/search", params={"q": "007"}).status_code == 200

    hint = client.post(f"/api/clue-games/{game['id']}/hints")
    assert hint.status_code == 200
    assert hint.json()["field"]

    target = clue_game_service.get_game(UUID(game["id"]))[0]
    guess = client.post(
        f"/api/clue-games/{game['id']}/guesses", json={"answer": target.title}
    )
    assert guess.status_code == 200
    assert guess.json()["complete"] is True


def test_favorites_put_patch_get_and_delete() -> None:
    first_id, second_id = (
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000002",
    )
    rounds = [
        {"attempts": 1, "won": True},
        {"attempts": 2, "won": True},
        {"attempts": 5, "won": False},
    ]
    first = client.put(f"/api/favorites/{first_id}", json={"rounds": rounds})
    second = client.put(
        f"/api/favorites/{second_id}",
        json={"rounds": [{"attempts": 1, "won": True}]},
    )

    assert first.status_code == 200
    assert first.json()["score"] == 9
    assert first.json()["total_guesses"] == 8
    assert first.json()["rounds_reached"] == 3
    assert second.json()["position"] == 2
    assert len(client.get("/api/favorites").json()) == 2

    moved = client.patch(f"/api/favorites/{second_id}", json={"position": 1})
    assert moved.status_code == 200
    assert moved.json()[0]["id"] == second_id

    deleted = client.delete(f"/api/favorites/{first_id}")
    assert deleted.status_code == 204
    assert client.get("/api/favorites").json()[0]["position"] == 1


def test_favorites_reject_invalid_data_and_unknown_ids() -> None:
    invalid = client.put(
        "/api/favorites/00000000-0000-0000-0000-000000000001",
        json={"rounds": [{"attempts": 6, "won": True}]},
    )
    assert invalid.status_code == 422

    missing = client.delete("/api/favorites/00000000-0000-0000-0000-000000000001")
    assert missing.status_code == 404

    invalid_position = client.patch(
        "/api/favorites/00000000-0000-0000-0000-000000000001",
        json={"position": 1},
    )
    assert invalid_position.status_code == 404
