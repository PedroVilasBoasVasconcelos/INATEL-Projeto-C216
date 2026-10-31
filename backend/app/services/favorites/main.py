from fastapi import FastAPI

from app.api.routes.favorites import router

app = FastAPI(title="Favorites Service", version="0.1.0")
app.include_router(router)
