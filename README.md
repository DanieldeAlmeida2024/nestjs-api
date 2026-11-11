# nestjs-api

Backend Node.js/NestJS de laboratório para rastreamento de veículos, integrações de mapas e mensageria.

## Tecnologias
Node.js, NestJS, TypeScript e Kafka.

## Execução (após configurar dependências)
```bash
cp .env.example .env && docker compose up -d
```

**Validação sugerida:** `npm run build && npm test`. Não foi realizada nesta revisão documental.

## Navegação
Arquivos de referência: `src/, test/, package.json, api.http`.

## Estado e riscos
O README antigo dizia Django, mas o manifesto comprova NestJS. O repositório inclui node_modules e dist rastreados: limpar em PR separado após build controlado.

## Guia técnico
- [Requisitos](docs/REQUISITOS.md)
- [Arquitetura](docs/ARQUITETURA.md)
- [UML](docs/UML.puml)
- [Plano de testes](docs/PLANO_TESTES.md)
- [Instruções para IA](AGENTS.md)

---

## README histórico (algumas instruções podem estar desatualizadas)

# Imersão Fullcycle 20 - Sistema de rastreamento de veículos

## Descrição

Repositório do Django (admin dos vídeos)

## Requerimentos

É necessário integrar com Google Maps, para isso, é necessário criar uma chave de API no Google Cloud Platform. Para isso, siga os passos:

1. Acesse o [Google Cloud Platform](https://cloud.google.com/).
2. Crie um novo projeto.
3. Ative a API do Places e Directions do Google Maps.
4. Guarde a chave de API gerada.

## Rodar a aplicação

Gere o arquivo `.env` através do comando:

```
cp .env.example .env
```

Coloque a chave de API gerada no Google Cloud Platform no arquivo `.env`.

Levante os containers do Nest.js e MongoDB:

```bash
docker-compose up -d
```

Entre no container do Nest.js e instale as dependências:

```bash
docker-compose exec app bash
npm install
```

Rode o servidor:

```bash
npm run start:dev
```

As especificações das chamadas HTTP estão no arquivo `api.http`. Você pode usar a extensão `REST Client` do VSCode para fazer as chamadas.

## Documentação técnica v1.1.0 proposta

- [Especificação do projeto](docs/projeto/ESPECIFICACAO.md)
- [Diagramas UML separados](docs/uml/README.md)
- [Casos de teste](docs/testes/PLANO_DE_TESTES.md)
- [Versionamento](docs/controle/VERSIONAMENTO.md)



## Qualidade e checkout reproduzível (PR 1.1.0 proposto)

O projeto tinha mais de 20 mil arquivos instalados em `node_modules` e código compilado em `dist` no índice Git, mesmo ignorados. Esta branch retira esses gerados do controle de versão **sem alterar o package-lock** e adiciona testes de comportamento de rotas, Google Maps e integração de pontos do motorista **com mocks**.

```bash
npm ci
npm test -- --runInBand --runTestsByPath src/routes/routes.service.spec.ts src/maps/directions/directions.service.spec.ts src/maps/places/places.service.spec.ts src/routes/routes-driver/routes-driver.service.spec.ts
```

**Não afirmar:** cobertura completa, Kafka outbox, MongoDB real ou permissão segura de WebSocket. A rota `DELETE /routes/:id` permanece placeholder. [Contrato e riscos](docs/projeto/ESPECIFICACAO.md) · [Plano de testes](docs/testes/PLANO_DE_TESTES.md) · [Histórico de versão](docs/controle/VERSIONAMENTO.md).


## Segurança de contrato HTTP (v1.2.0 proposta)
`POST /routes/:id/process-route` rejeita coordenadas fora dos intervalos geográficos ou não finitas antes de consultar Prisma; `DELETE /routes/:id` responde **501 Não implementado**, em vez de simular exclusão. O CI adiciona `npm run build` ao gate Jest. [Especificação](docs/projeto/ESPECIFICACAO.md) · [Testes](docs/testes/PLANO_DE_TESTES.md). Nenhum deploy foi realizado.
