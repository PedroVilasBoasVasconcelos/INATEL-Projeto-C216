from fastapi import FastAPI

from app.api.routes.clues import router

app = FastAPI(title="Clue Games Service", version="0.1.0")
app.include_router(router)
