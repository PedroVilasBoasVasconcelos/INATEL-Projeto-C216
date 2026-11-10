import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_health_check_returns_ok(client: AsyncClient) -> None:
    async with client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
