# INATEL-Projeto-C216

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