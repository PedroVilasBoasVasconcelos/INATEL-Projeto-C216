from datetime import date, timedelta

import pytest
from httpx import AsyncClient


def deadline_payload(**overrides: object) -> dict[str, object]:
    return {
        "title": "Entrega do projeto",
        "description": "Finalizar a primeira etapa",
        "course": "C216",
        "due_date": (date.today() + timedelta(days=3)).isoformat(),
        "priority": "high",
        **overrides,
    }


@pytest.mark.anyio
async def test_create_and_get_deadline(client: AsyncClient) -> None:
    created = await client.post("/api/deadlines", json=deadline_payload())

    assert created.status_code == 201
    deadline = created.json()
    assert deadline["title"] == "Entrega do projeto"
    assert deadline["course"] == "C216"
    assert deadline["priority"] == "high"
    assert deadline["status"] == "pending"

    fetched = await client.get(f"/api/deadlines/{deadline['id']}")

    assert fetched.status_code == 200
    assert fetched.json()["id"] == deadline["id"]


@pytest.mark.anyio
async def test_list_deadlines_filters_course_and_status(client: AsyncClient) -> None:
    await client.post("/api/deadlines", json=deadline_payload(course="C216"))
    await client.post(
        "/api/deadlines",
        json=deadline_payload(
            title="Prova de redes",
            course="C207",
            due_date=(date.today() - timedelta(days=1)).isoformat(),
        ),
    )

    response = await client.get("/api/deadlines", params={"course": "c216"})
    overdue = await client.get("/api/deadlines", params={"status": "overdue"})

    assert response.status_code == 200
    assert [item["course"] for item in response.json()] == ["C216"]
    assert [item["title"] for item in overdue.json()] == ["Prova de redes"]


@pytest.mark.anyio
async def test_update_and_complete_deadline(client: AsyncClient) -> None:
    created = await client.post("/api/deadlines", json=deadline_payload())
    deadline_id = created.json()["id"]
    updated_payload = deadline_payload(
        title="Entrega revisada",
        description=None,
        priority="medium",
        status="completed",
    )

    updated = await client.put(f"/api/deadlines/{deadline_id}", json=updated_payload)

    assert updated.status_code == 200
    assert updated.json()["title"] == "Entrega revisada"
    assert updated.json()["status"] == "completed"

    reopened = await client.patch(
        f"/api/deadlines/{deadline_id}/status", json={"status": "pending"}
    )

    assert reopened.status_code == 200
    assert reopened.json()["status"] == "pending"


@pytest.mark.anyio
async def test_delete_deadline(client: AsyncClient) -> None:
    created = await client.post("/api/deadlines", json=deadline_payload())
    deadline_id = created.json()["id"]

    deleted = await client.delete(f"/api/deadlines/{deadline_id}")
    fetched = await client.get(f"/api/deadlines/{deadline_id}")

    assert deleted.status_code == 204
    assert fetched.status_code == 404


@pytest.mark.anyio
async def test_missing_deadline_returns_not_found(client: AsyncClient) -> None:
    response = await client.get("/api/deadlines/999")

    assert response.status_code == 404


@pytest.mark.anyio
async def test_deadline_rejects_blank_title(client: AsyncClient) -> None:
    response = await client.post("/api/deadlines", json=deadline_payload(title="   "))

    assert response.status_code == 422


@pytest.mark.anyio
async def test_deadline_status_cannot_be_set_to_overdue(client: AsyncClient) -> None:
    response = await client.post("/api/deadlines", json=deadline_payload(status="overdue"))

    assert response.status_code == 422


@pytest.mark.anyio
async def test_deadline_list_is_sorted_and_paginated(client: AsyncClient) -> None:
    await client.post(
        "/api/deadlines",
        json=deadline_payload(
            title="Mais tarde", due_date=(date.today() + timedelta(days=5)).isoformat()
        ),
    )
    await client.post(
        "/api/deadlines",
        json=deadline_payload(
            title="Mais cedo", due_date=(date.today() + timedelta(days=1)).isoformat()
        ),
    )

    response = await client.get("/api/deadlines", params={"limit": 1})

    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == ["Mais cedo"]
