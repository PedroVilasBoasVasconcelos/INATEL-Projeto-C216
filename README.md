# INATEL-Projeto-C216

## Arquitetura

O frontend React é uma SPA integrada ao API Gateway, que encaminha cada domínio para um serviço independente:

- `games-service`: partidas de capa e busca de jogos.
- `clues-service`: partidas do modo pistas e dicas.
- `favorites-service`: consulta, ordenação e remoção de sequências favoritas.

Os serviços são executados em containers separados pelo Docker Compose. O frontend acessa somente o gateway em `http://localhost:8000`; os serviços internos não expõem portas ao host.

Os serviços de partidas, pistas e favoritos usam PostgreSQL para persistir sessões, palpites, dicas e favoritos. A conexão vem da variável `DATABASE_URL`, e o volume `postgres_data` preserva os dados após reinicializações. Um serviço de migração aplica o Alembic antes de os serviços da API iniciarem; para reaplicar manualmente, use `make db-migrate`.

A estrutura do backend segue a organização apresentada em aula:

```text
backend/
├── app/
│   ├── main.py
│   ├── api/routes/
│   ├── schemas/
│   ├── models/
│   ├── repositories/
│   ├── database/
│   └── services/
│       ├── games/
│       │   ├── logic.py
│       │   └── main.py
│       ├── clues/
│       │   ├── logic.py
│       │   └── main.py
│       └── favorites/
│           ├── logic.py
│           └── main.py
├── alembic/
│   └── versions/
├── tests/
│   ├── unit/
│   └── integration/
├── pyproject.toml
├── alembic.ini
└── poetry.lock
```

## Frontend

O frontend usa JavaScript, React, Vite, Tailwind CSS e Biome para apresentar o **Termo de Jogos**. Os modos de capa, sequência, pistas e favoritos consomem os serviços do backend por meio de módulos separados por domínio e compartilham um cliente HTTP que exibe erros da API.

Organização do frontend:

```text
frontend/
├── src/
│   ├── app/
│   │   └── App.jsx
│   ├── features/
│   │   ├── game/gameService.js
│   │   ├── clues/
│   │   │   ├── ClueMode.jsx
│   │   │   └── clueService.js
│   │   └── favorites/favoriteService.js
│   ├── services/
│   │   └── apiClient.js
│   ├── styles.css
│   └── main.jsx
├── Dockerfile
├── nginx.conf
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── setup.js
├── biome.json
├── index.html
├── vite.config.js
├── playwright.config.js
├── package.json
└── package-lock.json
```

`package-lock.json` deve ser versionado para reproduzir as dependências. `node_modules/`, `dist/`, `playwright-report/` e `test-results/` são ignorados pelo Git.

Para iniciar a aplicação completa com Docker Compose:

```bash
make run
```

O frontend fica disponível em `http://localhost:5173`; o gateway da API, em
`http://localhost:8000`. Para desenvolvimento local do frontend, inicie o
backend com `docker compose up -d backend` e execute:

```bash
make frontend-install
make frontend-dev
```

O Vite fica disponível em `http://localhost:5173`. O gateway permite
explicitamente as origens locais do frontend por CORS. Para validar o frontend,
incluindo E2E:

```bash
make frontend-check
make frontend-test-e2e
```

Os testes end-to-end usam Playwright e Chromium. Instale o navegador uma vez antes de executá-los localmente. `make check-all` também inclui as verificações do backend:

```bash
cd frontend
npx playwright install chromium
cd ..
make check-all
```

O workflow `.github/workflows/ci-frontend.yml` executa Biome, Vitest, build e Playwright em todos os pull requests e em pushes para `aulas` ou `main`.

## Backend

O gateway da API fica em `http://localhost:8000`, com documentação em
`http://localhost:8000/docs`. O frontend acessa somente esse gateway; os
serviços internos não são expostos ao navegador.

## Testes do backend

O backend usa Poetry para gerenciar as dependências e Pytest para os testes automatizados.

Na raiz do projeto, instale as dependências:

```bash
make install
```

Execute a suíte de testes:

```bash
make test
```

Para visualizar cada caso individualmente:

```bash
make test-verbose
```

Também é possível executar diretamente dentro do backend:

```bash
cd backend
poetry run pytest
```

O workflow de CI executa os testes automaticamente em cada `push` e `pull_request` usando Python 3.12 e Poetry.
Na CI, a suíte roda contra um PostgreSQL temporário. Sem `DATABASE_URL`, os testes locais usam SQLite em memória.
