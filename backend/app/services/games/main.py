from fastapi import FastAPI

from app.api.routes.games import router

app = FastAPI(title="Games Service", version="0.1.0")
app.include_router(router)
