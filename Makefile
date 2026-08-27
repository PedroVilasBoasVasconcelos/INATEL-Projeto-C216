.PHONY: help install test lint format run clean

PYTEST := poetry run pytest
UVICORN := poetry run uvicorn
RUFF := poetry run ruff

help:
	@echo "Comandos disponiveis:"
	@echo "  make install  - instala dependencias"
	@echo "  make test     - executa testes"
	@echo "  make lint     - verifica o codigo"
	@echo "  make format   - formata o codigo"
	@echo "  make run      - inicia o servidor"
	@echo "  make clean    - remove arquivos temporarios"

install:
	@echo "Instalando dependencias..."
	@cd backend && poetry install --no-root

test:
	@echo "Executando testes..."
	@cd backend && $(PYTEST)

lint:
	@echo "Verificando codigo..."
	@cd backend && $(RUFF) check .

format:
	@echo "Formatando codigo..."
	@cd backend && $(RUFF) format .

run:
	@echo "Iniciando servidor..."
	@cd backend && $(UVICORN) app.main:app --reload

clean:
	@echo "Removendo arquivos temporarios..."
	@cd backend && poetry run python -c "import pathlib, shutil; [shutil.rmtree(path) for path in pathlib.Path('..').rglob('__pycache__') if path.is_dir()]; [shutil.rmtree(path) for path in pathlib.Path('..').rglob('.pytest_cache') if path.is_dir()]"