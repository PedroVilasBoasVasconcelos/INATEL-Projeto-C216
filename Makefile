.PHONY: help install test lint format check run frontend-install frontend-dev frontend-build clean docker-build docker-up docker-down docker-logs docker-test db-shell

BACKEND_DIR := backend
FRONTEND_DIR := frontend
POETRY := poetry
PYTEST := $(POETRY) run pytest
UVICORN := $(POETRY) run uvicorn
RUFF := $(POETRY) run ruff

.DEFAULT_GOAL := help

help:
	@echo "Comandos disponiveis:"
	@echo "  make install  - instala dependencias "
	@echo "  make test     - executa testes "
	@echo "  make lint     - verifica o codigo "
	@echo "  make format   - formata o codigo "
	@echo "  make check    - executa lint e testes "
	@echo "  make run      - inicia o servidor "
	@echo "  make frontend-install - instala dependencias do frontend"
	@echo "  make frontend-dev - inicia o frontend"
	@echo "  make frontend-build - gera o build do frontend"
	@echo "  make clean    - remove arquivos temporarios "
	@echo "  make docker-build - constroi a imagem do backend "
	@echo "  make docker-up - inicia backend e banco "
	@echo "  make docker-down - para os servicos Docker "
	@echo "  make docker-logs - acompanha os logs dos servicos "
	@echo "  make docker-test - executa testes no container "
	@echo "  make db-shell - abre o PostgreSQL "

install:
	@echo "Instalando dependencias..."
	@cd $(BACKEND_DIR) && $(POETRY) install --no-root

test:
	@echo "Executando testes..."
	@cd $(BACKEND_DIR) && $(PYTEST)

lint:
	@echo "Verificando codigo..."
	@cd $(BACKEND_DIR) && $(RUFF) check .

format:
	@echo "Formatando codigo..."
	@cd $(BACKEND_DIR) && $(RUFF) format .
	@cd $(BACKEND_DIR) && $(RUFF) check . --fix

check: lint test

run:
	@echo "Iniciando servidor..."
	@cd $(BACKEND_DIR) && $(UVICORN) app.main:app --reload --host 127.0.0.1 --port 8000

frontend-install:
	@cd $(FRONTEND_DIR) && npm install

frontend-dev:
	@cd $(FRONTEND_DIR) && npm run dev

frontend-build:
	@cd $(FRONTEND_DIR) && npm run build

docker-build:
	@docker compose build

docker-up:
	@docker compose up -d --build

docker-down:
	@docker compose down

docker-logs:
	@docker compose logs -f

docker-test:
	@docker compose run --rm backend poetry run pytest

db-shell:
	@docker compose exec db psql -U postgres -d termodejogos

clean:
	@echo "Removendo arquivos temporarios..."
	@cd $(BACKEND_DIR) && $(POETRY) run python -c "import pathlib, shutil; [shutil.rmtree(path) for path in pathlib.Path('..').rglob('__pycache__') if path.is_dir()]; [shutil.rmtree(path) for path in pathlib.Path('..').rglob('.pytest_cache') if path.is_dir()]"