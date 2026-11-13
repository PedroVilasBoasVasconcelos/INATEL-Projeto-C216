BACKEND_DIR := agenda-academica/backend
FRONTEND_DIR := agenda-academica/frontend

.PHONY: help install backend-install frontend-install backend-dev frontend-dev \
	backend-migrate backend-test backend-lint backend-format backend-check frontend-test \
	frontend-lint frontend-format frontend-build frontend-check docker-up docker-down \
	docker-logs docker-check e2e-test check

help:
	@echo "install           Install backend and frontend dependencies"
	@echo "backend-dev       Run the FastAPI development server"
	@echo "backend-migrate   Apply database migrations"
	@echo "frontend-dev      Run the Vite development server"
	@echo "docker-up         Build and start the complete Docker Compose stack"
	@echo "docker-down       Stop the Docker Compose stack (keeps database data)"
	@echo "docker-logs       Follow Docker Compose service logs"
	@echo "docker-check      Validate the Docker Compose configuration"
	@echo "e2e-test          Run Playwright end-to-end tests (requires Docker stack)"
	@echo "backend-check     Lint and test the backend"
	@echo "frontend-check    Lint, test, and build the frontend"
	@echo "check             Run all backend and frontend checks"

install: backend-install frontend-install

backend-install:
	cd $(BACKEND_DIR) && poetry install

frontend-install:
	cd $(FRONTEND_DIR) && npm install

backend-dev:
	cd $(BACKEND_DIR) && poetry run uvicorn main:app --reload

backend-migrate:
	cd $(BACKEND_DIR) && poetry run alembic upgrade head

frontend-dev:
	cd $(FRONTEND_DIR) && npm run dev

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-check:
	docker compose config --quiet

e2e-test:
	cd $(FRONTEND_DIR) && npm run test:e2e

backend-test:
	cd $(BACKEND_DIR) && poetry run pytest

backend-lint:
	cd $(BACKEND_DIR) && poetry run ruff check .

backend-format:
	cd $(BACKEND_DIR) && poetry run ruff format --check .

backend-check: backend-lint backend-format backend-test

frontend-test:
	cd $(FRONTEND_DIR) && npm test

frontend-lint:
	cd $(FRONTEND_DIR) && npm run lint

frontend-format:
	cd $(FRONTEND_DIR) && npm run format:check

frontend-build:
	cd $(FRONTEND_DIR) && npm run build

frontend-check: frontend-lint frontend-format frontend-test frontend-build

check: backend-check frontend-check
