from fastapi import FastAPI

from app.api.routes.gateway import router

app = FastAPI(title="Termo de Jogos API Gateway", version="0.1.0")
app.include_router(router)
