import os
from collections.abc import AsyncIterator
from typing import Annotated

import httpx2
from fastapi import APIRouter, Depends, HTTPException, Request
from starlette.responses import Response

router = APIRouter()
HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]
REQUEST_TIMEOUT = 10.0


async def get_games_client() -> AsyncIterator[httpx2.AsyncClient]:
    async with httpx2.AsyncClient(
        base_url=os.getenv("GAMES_SERVICE_URL", "http://127.0.0.1:8001"),
        timeout=REQUEST_TIMEOUT,
    ) as client:
        yield client


async def get_clues_client() -> AsyncIterator[httpx2.AsyncClient]:
    async with httpx2.AsyncClient(
        base_url=os.getenv("CLUES_SERVICE_URL", "http://127.0.0.1:8002"),
        timeout=REQUEST_TIMEOUT,
    ) as client:
        yield client


async def get_favorites_client() -> AsyncIterator[httpx2.AsyncClient]:
    async with httpx2.AsyncClient(
        base_url=os.getenv("FAVORITES_SERVICE_URL", "http://127.0.0.1:8003"),
        timeout=REQUEST_TIMEOUT,
    ) as client:
        yield client


async def forward_request(
    request: Request,
    client: httpx2.AsyncClient,
    service_path: str,
) -> Response:
    try:
        upstream = await client.request(
            request.method,
            service_path,
            params=request.query_params,
            content=await request.body(),
            headers={
                "content-type": request.headers.get("content-type", "application/json")
            },
        )
    except httpx2.RequestError as error:
        raise HTTPException(status_code=503, detail="Service unavailable") from error

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers={
            "content-type": upstream.headers.get("content-type", "application/json")
        },
    )


@router.get("/")
async def root() -> dict[str, str]:
    return {
        "message": "Termo de Jogos API Gateway",
        "docs": "/docs",
        "health": "/health",
    }


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.api_route("/api/games", methods=HTTP_METHODS)
async def proxy_games(
    request: Request,
    client: Annotated[httpx2.AsyncClient, Depends(get_games_client)],
) -> Response:
    return await forward_request(request, client, "/api/games")


@router.api_route("/api/games/{path:path}", methods=HTTP_METHODS)
async def proxy_game_path(
    path: str,
    request: Request,
    client: Annotated[httpx2.AsyncClient, Depends(get_games_client)],
) -> Response:
    return await forward_request(request, client, f"/api/games/{path}")


@router.api_route("/api/clue-games", methods=HTTP_METHODS)
async def proxy_clue_games(
    request: Request,
    client: Annotated[httpx2.AsyncClient, Depends(get_clues_client)],
) -> Response:
    return await forward_request(request, client, "/api/clue-games")


@router.api_route("/api/clue-games/{path:path}", methods=HTTP_METHODS)
async def proxy_clue_game_path(
    path: str,
    request: Request,
    client: Annotated[httpx2.AsyncClient, Depends(get_clues_client)],
) -> Response:
    return await forward_request(request, client, f"/api/clue-games/{path}")


@router.api_route("/api/favorites", methods=HTTP_METHODS)
async def proxy_favorites(
    request: Request,
    client: Annotated[httpx2.AsyncClient, Depends(get_favorites_client)],
) -> Response:
    return await forward_request(request, client, "/api/favorites")


@router.api_route("/api/favorites/{path:path}", methods=HTTP_METHODS)
async def proxy_favorite_path(
    path: str,
    request: Request,
    client: Annotated[httpx2.AsyncClient, Depends(get_favorites_client)],
) -> Response:
    return await forward_request(request, client, f"/api/favorites/{path}")
