# Agenda Acadêmica

Aplicação web para estudantes organizarem os prazos das atividades da
faculdade em um só lugar. A proposta é facilitar o acompanhamento de trabalhos,
provas e outras entregas, ajudando a identificar o que está próximo do prazo e
o que já foi concluído.

> **Estado do projeto:** interface React integrada ao CRUD da API e PostgreSQL.
> O ambiente completo pode ser iniciado com Docker Compose; as migrações são
> aplicadas automaticamente quando o backend inicia.

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
- Criar, buscar, editar, concluir/reabrir e excluir prazos pela interface React.
- Informar datas no formato brasileiro `DD/MM/AAAA`; a interface converte para
  ISO antes de enviar à API.
- Exibir indicadores para prazos pendentes, atrasados e concluídos, além de
  estados de carregamento, sucesso, erro e lista vazia.
- Alternar entre tema claro e escuro, salvando a preferência no navegador.
- Usar animações leves de interface, respeitando a preferência do sistema por
  movimento reduzido.

## Tecnologias

| Parte | Tecnologias |
| --- | --- |
| Backend | Python 3.12, FastAPI, SQLAlchemy, Alembic e PostgreSQL |
| Frontend | React com JavaScript, Vite e Tailwind CSS |
| Infraestrutura e CI | Docker Compose, GitHub Actions |
| Testes | Pytest, Vitest e Testing Library; testes ponta a ponta com Playwright ainda são uma etapa separada |

## Organização do projeto

```text
.
├── .github/workflows/ci.yml  # Testes e verificações automatizados
├── docker-compose.yml        # PostgreSQL, API e frontend
└── agenda-academica/
    ├── backend/
    │   ├── app/
    │   │   ├── api/routes/   # Endpoints HTTP
    │   │   ├── repositories/ # Acesso e persistência de dados
    │   │   ├── schemas/      # Formatos de entrada e saída da API
    │   │   ├── services/     # Regras de negócio
    │   │   ├── database.py   # Base e configuração de persistência
    │   │   └── models.py     # Modelos SQLAlchemy
    │   ├── migrations/       # Migrações Alembic
    │   ├── tests/            # Testes da API
    │   └── main.py           # Inicialização da aplicação FastAPI
    └── frontend/
        └── src/
            ├── assets/       # Recursos estáticos
            ├── components/   # Componentes visuais reutilizáveis
            ├── services/     # Comunicação com a API
            ├── test/         # Configuração compartilhada de testes
            ├── App.jsx       # Estrutura principal da interface
            └── main.jsx      # Inicialização do React
```

O backend separa rotas, regras de negócio, persistência e validação para manter
a API organizada. No frontend, `App.jsx` coordena a tela e o estado; formulários,
lista de prazos e comunicação HTTP ficam separados em componentes e serviços.

## Requisitos para desenvolvimento

- Python 3.12
- Poetry
- Node.js e npm
- PostgreSQL
- GNU Make
- Docker e Docker Compose (para executar a stack em containers)

## Como executar

## Executar com Docker Compose

Copie o arquivo de exemplo para configurar portas e credenciais locais (opcional):

```sh
cp .env.example .env
```

Inicie PostgreSQL, backend e frontend:

```sh
make docker-up
```

A aplicação fica disponível em `http://localhost:5174`, a API em
`http://localhost:8001` e a documentação interativa em
`http://localhost:8001/docs`. As migrações são aplicadas automaticamente e os
dados do PostgreSQL ficam no volume `postgres_data`.

Para acompanhar os serviços ou pará-los:

```sh
make docker-logs
make docker-down
```

`make docker-down` preserva o volume do banco. Para apagar também os dados,
execute `docker compose down --volumes`.

As portas padrão do Compose são `5174` (frontend), `8001` (API) e `5433`
(PostgreSQL), para evitar conflitos com ferramentas que já usem as portas de
desenvolvimento usuais. Elas podem ser alteradas no `.env`.

## Executar localmente para desenvolvimento

O Compose é a opção recomendada para iniciar toda a aplicação. Para rodar
backend e frontend diretamente no computador, configure o PostgreSQL localmente
e copie
`agenda-academica/backend/.env.example` para
`agenda-academica/backend/.env` e ajuste `DATABASE_URL` e `CORS_ORIGINS` se
necessário. A URL padrão considera PostgreSQL local com o banco
`agenda_academica`.

Instale as dependências do backend e frontend:

```sh
make install
```

Na raiz do repositório, aplique as migrações:

```sh
make backend-migrate
```

Inicie o backend e o frontend em terminais separados:

```sh
make backend-dev
```

O backend fica disponível em `http://localhost:8000`, sua documentação
interativa em `http://localhost:8000/docs` e o endpoint de saúde em
`http://localhost:8000/health`.

```sh
make frontend-dev
```

O endereço local do frontend é normalmente `http://localhost:5173`. O frontend
usa `VITE_API_URL` (opcional; padrão `http://localhost:8000`) para localizar a
API. As origens permitidas pelo backend podem ser configuradas em
`CORS_ORIGINS`, separadas por vírgula.

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

O workflow do GitHub Actions executa lint, formatação, testes e build do
frontend, além de lint, formatação e testes do backend em cada push e pull
request; também valida a configuração e constrói as imagens Docker.

## Etapas de desenvolvimento

1. Estruturar os projetos, instalar dependências e preparar os comandos de
   desenvolvimento — concluído.
2. Modelar os dados e implementar a API de prazos com persistência e testes —
   concluído.
3. Construir e integrar a interface React ao CRUD da API — concluído.
4. Preparar a execução com Docker Compose e automatizar os testes do backend e
   frontend — concluído.
5. Adicionar testes ponta a ponta com persistência real, revisar a aplicação e
   preparar a demonstração e a entrega.
