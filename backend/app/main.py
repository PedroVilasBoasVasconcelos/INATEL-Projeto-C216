from fastapi import FastAPI

from app.routes import router

app = FastAPI(title="Termo de Jogos API", version="0.1.0")
app.include_router(router)
