# Agenda Acadêmica

Aplicação web para estudantes organizarem os prazos das atividades da
faculdade em um só lugar. A proposta é facilitar o acompanhamento de trabalhos,
provas e outras entregas, ajudando a identificar o que está próximo do prazo e
o que já foi concluído.

> **Estado do projeto:** a estrutura inicial está pronta. Neste momento, a API
> oferece um endpoint de saúde e o frontend apresenta a tela inicial. As
> funcionalidades descritas abaixo fazem parte do escopo planejado e serão
> implementadas nas próximas etapas.

## Objetivo

Reunir os compromissos acadêmicos em uma agenda simples, permitindo registrar
cada atividade com sua disciplina e data de entrega. A aplicação será
desenvolvida como um projeto full-stack independente.

## Funcionalidades planejadas

- Criar, consultar, editar e excluir prazos acadêmicos.
- Registrar título, descrição, disciplina, data de entrega, prioridade e status.
- Acompanhar os estados da atividade: pendente, concluída ou atrasada.
- Filtrar prazos por disciplina e status.
- Consultar os prazos em ordem de data, destacando os que estão próximos ou
  atrasados.
- Persistir os dados no PostgreSQL para que continuem disponíveis após reiniciar
  a aplicação.

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
- GNU Make

## Como executar

Na raiz do repositório, instale as dependências:

```sh
make install
```

Inicie o backend e o frontend em terminais separados:

```sh
make backend-dev
```

```sh
make frontend-dev
```

O backend fica disponível em `http://localhost:8000` e sua documentação
interativa em `http://localhost:8000/docs`. O frontend fica disponível no
endereço local informado pelo Vite, normalmente `http://localhost:5173`.

O exemplo de configuração do banco está em
[`agenda-academica/backend/.env.example`](agenda-academica/backend/.env.example).
A configuração e a inicialização do PostgreSQL serão concluídas junto com a
implementação da persistência.

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
   desenvolvimento.
2. Modelar os dados e implementar a API de prazos com persistência e testes.
3. Construir a interface e integrá-la à API.
4. Preparar a execução com Docker Compose e adicionar testes ponta a ponta com
   persistência real.
5. Revisar a aplicação, completar a documentação e preparar a demonstração e a
   entrega.
