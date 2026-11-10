import pytest
from httpx import ASGITransport, AsyncClient

from main import app


@pytest.fixture
def client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
