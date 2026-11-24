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
    assert fetched.json() == deadline


@pytest.mark.anyio
async def test_list_deadlines_filters_course_and_status(client: AsyncClient) -> None:
    await client.post(
        "/api/deadlines",
        json=deadline_payload(title="Trabalho pendente", course="C216"),
    )
    await client.post(
        "/api/deadlines",
        json=deadline_payload(
            title="Prova de redes",
            course="C207",
            due_date=(date.today() - timedelta(days=1)).isoformat(),
        ),
    )
    await client.post(
        "/api/deadlines",
        json=deadline_payload(
            title="Trabalho concluído",
            course="C216",
            status="completed",
        ),
    )

    response = await client.get("/api/deadlines", params={"course": "c216"})
    pending = await client.get("/api/deadlines", params={"status": "pending"})
    overdue = await client.get("/api/deadlines", params={"status": "overdue"})
    completed = await client.get("/api/deadlines", params={"status": "completed"})

    assert response.status_code == 200
    assert {item["title"] for item in response.json()} == {
        "Trabalho pendente",
        "Trabalho concluído",
    }
    assert [item["title"] for item in pending.json()] == ["Trabalho pendente"]
    assert [item["title"] for item in overdue.json()] == ["Prova de redes"]
    assert [item["title"] for item in completed.json()] == ["Trabalho concluído"]


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
async def test_mutations_for_missing_deadline_return_not_found(
    client: AsyncClient,
) -> None:
    updated = await client.put("/api/deadlines/999", json=deadline_payload(status="pending"))
    status_update = await client.patch("/api/deadlines/999/status", json={"status": "completed"})
    deleted = await client.delete("/api/deadlines/999")

    assert updated.status_code == 404
    assert status_update.status_code == 404
    assert deleted.status_code == 404


@pytest.mark.anyio
async def test_deadline_rejects_blank_title(client: AsyncClient) -> None:
    response = await client.post("/api/deadlines", json=deadline_payload(title="   "))

    assert response.status_code == 422


@pytest.mark.anyio
@pytest.mark.parametrize(
    "overrides",
    [
        {"course": "   "},
        {"priority": "urgent"},
        {"due_date": "not-a-date"},
    ],
)
async def test_deadline_rejects_invalid_fields(
    client: AsyncClient, overrides: dict[str, object]
) -> None:
    response = await client.post("/api/deadlines", json=deadline_payload(**overrides))

    assert response.status_code == 422


@pytest.mark.anyio
async def test_deadline_trims_text_and_normalizes_empty_description(
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/api/deadlines",
        json=deadline_payload(title="  Prova final  ", course="  C216  ", description="  "),
    )

    assert response.status_code == 201
    assert response.json()["title"] == "Prova final"
    assert response.json()["course"] == "C216"
    assert response.json()["description"] is None


@pytest.mark.anyio
async def test_deadline_status_cannot_be_set_to_overdue(client: AsyncClient) -> None:
    response = await client.post("/api/deadlines", json=deadline_payload(status="overdue"))

    assert response.status_code == 422


@pytest.mark.anyio
async def test_past_due_deadline_is_overdue_until_completed(client: AsyncClient) -> None:
    created = await client.post(
        "/api/deadlines",
        json=deadline_payload(due_date=(date.today() - timedelta(days=1)).isoformat()),
    )

    assert created.status_code == 201
    deadline_id = created.json()["id"]
    assert created.json()["status"] == "overdue"

    completed = await client.patch(
        f"/api/deadlines/{deadline_id}/status", json={"status": "completed"}
    )

    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"


@pytest.mark.anyio
async def test_invalid_update_does_not_change_existing_deadline(client: AsyncClient) -> None:
    created = await client.post("/api/deadlines", json=deadline_payload())
    deadline_id = created.json()["id"]
    invalid_payload = deadline_payload(title="   ", course="MUDAR")

    response = await client.put(f"/api/deadlines/{deadline_id}", json=invalid_payload)
    unchanged = await client.get(f"/api/deadlines/{deadline_id}")

    assert response.status_code == 422
    assert unchanged.status_code == 200
    assert unchanged.json()["title"] == "Entrega do projeto"
    assert unchanged.json()["course"] == "C216"


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


@pytest.mark.anyio
async def test_deadline_list_applies_offset(client: AsyncClient) -> None:
    for title, days in [("Primeiro", 1), ("Segundo", 2), ("Terceiro", 3)]:
        await client.post(
            "/api/deadlines",
            json=deadline_payload(
                title=title,
                due_date=(date.today() + timedelta(days=days)).isoformat(),
            ),
        )

    response = await client.get("/api/deadlines", params={"limit": 1, "offset": 1})

    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == ["Segundo"]


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("params", "expected_status"),
    [
        ({"limit": 0}, 422),
        ({"limit": 101}, 422),
        ({"offset": -1}, 422),
    ],
)
async def test_deadline_list_rejects_invalid_pagination(
    client: AsyncClient, params: dict[str, int], expected_status: int
) -> None:
    response = await client.get("/api/deadlines", params=params)

    assert response.status_code == expected_status
