FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=2.4.1 \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app

RUN pip install --no-cache-dir "poetry==${POETRY_VERSION}"

COPY backend/pyproject.toml backend/poetry.lock ./backend/
RUN cd /app/backend && poetry install --with dev --no-root

COPY backend/app ./backend/app
COPY backend/alembic.ini ./backend/alembic.ini
COPY backend/alembic ./backend/alembic
COPY jogos.json ./jogos.json
COPY jogos_vendas.json ./jogos_vendas.json

WORKDIR /app/backend

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
