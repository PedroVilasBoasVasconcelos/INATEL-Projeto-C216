from collections.abc import AsyncIterator, Callable
from uuid import UUID

import httpx2
import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import delete

from alembic import command
from app.api.routes.gateway import (
    get_clues_client,
    get_favorites_client,
    get_games_client,
)
from app.database import SessionLocal
from app.main import app
from app.models.clue import ClueSessionModel
from app.models.favorite import FavoriteSequenceModel
from app.models.game import GameGuessModel, GameSessionModel
from app.repositories.clues import CluesRepository
from app.repositories.favorites import FavoritesRepository
from app.repositories.games import GamesRepository
from app.services.clues.logic import CLUE_CATALOG, ClueGameService
from app.services.clues.main import app as clues_app
from app.services.favorites.logic import FavoritesService
from app.services.favorites.main import app as favorites_app
from app.services.games.logic import CATALOG, GameMode, GameService
from app.services.games.main import app as games_app

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def apply_database_migrations() -> None:
    command.upgrade(Config("alembic.ini"), "head")


@pytest.fixture(autouse=True)
def configure_services() -> AsyncIterator[None]:
    with SessionLocal() as session:
        session.execute(delete(GameGuessModel))
        session.execute(delete(GameSessionModel))
        session.execute(delete(ClueSessionModel))
        session.execute(delete(FavoriteSequenceModel))
        session.commit()

    def provide_client(
        service_app: object,
    ) -> Callable[[], AsyncIterator[httpx2.AsyncClient]]:
        async def client_provider() -> AsyncIterator[httpx2.AsyncClient]:
            async with httpx2.AsyncClient(
                transport=httpx2.ASGITransport(app=service_app),
                base_url="http://service.test",
            ) as service_client:
                yield service_client

        return client_provider

    app.dependency_overrides[get_games_client] = provide_client(games_app)
    app.dependency_overrides[get_clues_client] = provide_client(clues_app)
    app.dependency_overrides[get_favorites_client] = provide_client(favorites_app)
    yield
    app.dependency_overrides.clear()


def test_root_and_health_endpoints() -> None:
    assert client.get("/").json()["docs"] == "/docs"
    assert client.get("/health").json() == {"status": "ok"}


def test_gateway_allows_configured_frontend_origin() -> None:
    response = client.options(
        "/api/games",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "POST" in response.headers["access-control-allow-methods"]


def test_gateway_rejects_unconfigured_frontend_origin() -> None:
    response = client.options(
        "/api/games",
        headers={
            "Origin": "http://untrusted.example",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


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
    with SessionLocal() as session:
        restored = GameService(CATALOG, GamesRepository()).get_game(
            session, UUID(game["id"])
        )
    assert restored is not None
    assert restored.attempts == 1
    assert restored.guesses[0].answer == "not this game"


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

    with SessionLocal() as session:
        restored = ClueGameService(CLUE_CATALOG, CluesRepository()).get_game(
            session, UUID(game["id"])
        )
    assert restored is not None
    target = restored[0]
    guess = client.post(
        f"/api/clue-games/{game['id']}/guesses", json={"answer": target.title}
    )
    assert guess.status_code == 200
    assert guess.json()["complete"] is True
    with SessionLocal() as session:
        restored_after_guess = ClueGameService(
            CLUE_CATALOG, CluesRepository()
        ).get_game(session, UUID(game["id"]))
    assert restored_after_guess is not None
    assert restored_after_guess[1][-1].complete is True
    assert restored_after_guess[2] == {"console"}


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
    with SessionLocal() as session:
        persisted = FavoritesService(FavoritesRepository()).get_all(session)
    assert [favorite.id for favorite in persisted] == [UUID(first_id), UUID(second_id)]

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
