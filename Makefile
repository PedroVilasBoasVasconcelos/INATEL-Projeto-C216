.PHONY: help install test test-verbose lint format check check-all run frontend-install frontend-dev frontend-build frontend-test frontend-test-e2e frontend-lint frontend-format frontend-format-check frontend-check clean docker-build docker-up docker-down docker-logs docker-test db-migrate db-shell

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
	@echo "  make test-verbose - executa testes com mais detalhes"
	@echo "  make lint     - verifica o codigo "
	@echo "  make format   - formata o codigo "
	@echo "  make check    - executa lint e testes "
	@echo "  make run      - inicia frontend, gateway, servicos e banco via Docker "
	@echo "  make frontend-install - instala dependencias do frontend"
	@echo "  make frontend-dev - inicia o frontend"
	@echo "  make frontend-build - gera o build do frontend"
	@echo "  make frontend-test - executa testes unitarios e de integracao"
	@echo "  make frontend-test-e2e - executa testes de ponta a ponta"
	@echo "  make frontend-lint - verifica o codigo do frontend"
	@echo "  make frontend-format - formata o codigo do frontend"
	@echo "  make frontend-format-check - verifica a formatacao do frontend"
	@echo "  make frontend-check - executa lint, formatacao, testes e build"
	@echo "  make check-all - valida backend e frontend, incluindo E2E"
	@echo "  make clean    - remove arquivos temporarios "
	@echo "  make docker-build - constroi a imagem do backend "
	@echo "  make docker-up - inicia backend e banco "
	@echo "  make docker-down - para os servicos Docker "
	@echo "  make docker-logs - acompanha os logs dos servicos "
	@echo "  make docker-test - executa testes no container "
	@echo "  make db-migrate - aplica as migrations no banco "
	@echo "  make db-shell - abre o PostgreSQL "

install:
	@echo "Instalando dependencias..."
	@cd $(BACKEND_DIR) && $(POETRY) install --no-root

test:
	@echo "Executando testes..."
	@cd $(BACKEND_DIR) && $(PYTEST)

test-verbose:
	@echo "Executando testes em modo detalhado..."
	@cd $(BACKEND_DIR) && $(PYTEST) -vv

lint:
	@echo "Verificando codigo..."
	@cd $(BACKEND_DIR) && $(RUFF) check .

format:
	@echo "Formatando codigo..."
	@cd $(BACKEND_DIR) && $(RUFF) format .
	@cd $(BACKEND_DIR) && $(RUFF) check . --fix

check: lint test

run:
	@echo "Iniciando gateway e servicos..."
	@docker compose up --build

frontend-install:
	@cd $(FRONTEND_DIR) && npm ci

frontend-dev:
	@cd $(FRONTEND_DIR) && npm run dev

frontend-build:
	@cd $(FRONTEND_DIR) && npm run build

frontend-test:
	@cd $(FRONTEND_DIR) && npm test

frontend-test-e2e:
	@cd $(FRONTEND_DIR) && npm run test:e2e

frontend-lint:
	@cd $(FRONTEND_DIR) && npm run lint

frontend-format:
	@cd $(FRONTEND_DIR) && npm run format

frontend-format-check:
	@cd $(FRONTEND_DIR) && npm run format:check

frontend-check: frontend-lint frontend-format-check frontend-test frontend-build

check-all: check frontend-check frontend-test-e2e

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

db-migrate:
	@docker compose run --rm migrations

db-shell:
	@docker compose exec db psql -U postgres -d termodejogos

clean:
	@echo "Removendo arquivos temporarios..."
	@cd $(BACKEND_DIR) && $(POETRY) run python -c "import pathlib, shutil; [shutil.rmtree(path) for path in pathlib.Path('..').rglob('__pycache__') if path.is_dir()]; [shutil.rmtree(path) for path in pathlib.Path('..').rglob('.pytest_cache') if path.is_dir()]"
