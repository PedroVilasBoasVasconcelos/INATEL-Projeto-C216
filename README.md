# Agenda Acadêmica

Aplicação web para estudantes organizarem os prazos das atividades da
faculdade em um só lugar. A proposta é facilitar o acompanhamento de trabalhos,
provas e outras entregas, ajudando a identificar o que está próximo do prazo e
o que já foi concluído.

> **Estado do projeto:** API de prazos funcional com persistência PostgreSQL,
> migração inicial e testes. O frontend ainda está na tela inicial; sua
> integração com a API será feita em uma etapa posterior.

## Objetivo

Reunir os compromissos acadêmicos em uma agenda simples, permitindo registrar
cada atividade com sua disciplina e data de entrega. A aplicação será
desenvolvida como um projeto full-stack independente.

## Funcionalidades

- Criar, consultar, editar e excluir prazos acadêmicos pela API.
- Registrar título, descrição, disciplina, data de entrega, prioridade e status.
- Acompanhar os estados da atividade: pendente, concluída ou atrasada.
- Filtrar prazos por disciplina e status; a listagem é ordenada por data.
- Persistir os dados no PostgreSQL por meio do SQLAlchemy e de migrações Alembic.
- Validar entradas e documentar os endpoints automaticamente com OpenAPI.
- Construir futuramente a interface para acompanhar os prazos e conversar com a
  API.

## Tecnologias

| Parte | Tecnologias |
| --- | --- |
| Backend | Python 3.12, FastAPI, SQLAlchemy, Alembic e PostgreSQL |
| Frontend | React com JavaScript, Vite e Tailwind CSS |
| Testes | Pytest no backend; Vitest e Testing Library no frontend |
| Ferramentas previstas | Docker Compose e Playwright para a validação ponta a ponta |

## Organização do projeto

```text
agenda-academica/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # Endpoints HTTP
│   │   ├── repositories/     # Acesso e persistência de dados
│   │   ├── schemas/          # Formatos de entrada e saída da API
│   │   ├── services/         # Regras de negócio
│   │   ├── database.py       # Base e configuração de persistência
│   │   └── models.py         # Modelos SQLAlchemy
│   ├── migrations/           # Migrações Alembic
│   ├── tests/                # Testes da API
│   └── main.py               # Inicialização da aplicação FastAPI
└── frontend/
    └── src/
        ├── assets/           # Recursos estáticos
        ├── components/       # Componentes visuais reutilizáveis
        ├── services/         # Comunicação com a API
        ├── test/             # Configuração compartilhada de testes
        ├── App.jsx           # Estrutura principal da interface
        └── main.jsx          # Inicialização do React
```

O backend separa rotas, regras de negócio, persistência e validação para manter
a API organizada. No frontend, `App.jsx` serve como ponto de entrada da
interface; componentes e serviços serão adicionados conforme as telas e a
integração com a API forem desenvolvidas.

## Requisitos para desenvolvimento

- Python 3.12
- Poetry
- Node.js e npm
- PostgreSQL
- GNU Make

## Como executar

Na raiz do repositório, instale as dependências:

```sh
make install
```

Configure o banco de dados PostgreSQL e as variáveis do backend. Copie
`agenda-academica/backend/.env.example` para
`agenda-academica/backend/.env` e ajuste `DATABASE_URL` e `CORS_ORIGINS` se
necessário. A URL padrão considera PostgreSQL local com o banco
`agenda_academica`; crie esse banco antes de aplicar a migração.

Na raiz do repositório, aplique as migrações:

```sh
make backend-migrate
```

Inicie o backend:

```sh
make backend-dev
```

O backend fica disponível em `http://localhost:8000`, sua documentação
interativa em `http://localhost:8000/docs` e o endpoint de saúde em
`http://localhost:8000/health`.

Para iniciar a tela atual do frontend, use outro terminal:

```sh
make frontend-dev
```

O endereço local do frontend é normalmente `http://localhost:5173`.

## API de prazos

Todos os endpoints de prazos usam o prefixo `/api/deadlines`.

| Método | Endpoint | Ação |
| --- | --- | --- |
| `POST` | `/api/deadlines` | Criar prazo |
| `GET` | `/api/deadlines` | Listar prazos |
| `GET` | `/api/deadlines/{id}` | Consultar um prazo |
| `PUT` | `/api/deadlines/{id}` | Atualizar um prazo |
| `PATCH` | `/api/deadlines/{id}/status` | Marcar como pendente ou concluído |
| `DELETE` | `/api/deadlines/{id}` | Excluir um prazo |

A listagem aceita `course`, `status`, `limit` e `offset`. Os status aceitos no
filtro são `pending`, `completed` e `overdue`; um prazo vencido é calculado a
partir da data de entrega e não pode ser definido manualmente. A prioridade pode
ser `low`, `medium` ou `high`.

Exemplo de criação:

```json
{
  "title": "Entrega do projeto",
  "description": "Concluir a primeira etapa",
  "course": "C216",
  "due_date": "2026-11-20",
  "priority": "high"
}
```

## Testes e verificações

Execute os testes individualmente:

```sh
make backend-test
make frontend-test
```

Para executar lint, verificação de formatação, testes e build do frontend:

```sh
make check
```

## Etapas de desenvolvimento

1. Estruturar os projetos, instalar dependências e preparar os comandos de
   desenvolvimento — concluído.
2. Modelar os dados e implementar a API de prazos com persistência e testes —
   concluído.
3. Construir a interface e integrá-la à API.
4. Preparar a execução com Docker Compose e adicionar testes ponta a ponta com
   persistência real.
5. Revisar a aplicação, completar a documentação e preparar a demonstração e a
   entrega.
