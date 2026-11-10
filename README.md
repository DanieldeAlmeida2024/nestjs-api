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
