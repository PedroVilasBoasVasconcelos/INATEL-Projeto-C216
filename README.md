# INATEL-Projeto-C216

## Arquitetura

O frontend React funciona como uma SPA e envia as requisições para o API Gateway. O gateway encaminha cada domínio para um serviço independente:

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

Para iniciar o stack completo, com Docker Compose instalado:

```bash
make run
```

O gateway fica disponível em `http://localhost:8000` e a documentação da API em `http://localhost:8000/docs`.

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