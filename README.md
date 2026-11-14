# API de Rastreamento de Veículos — NestJS

Backend do sistema de rastreamento de veículos desenvolvido no contexto da Imersão Full Cycle. A aplicação organiza rotas, consulta serviços de mapas, processa posições de motoristas e participa do fluxo de eventos com Kafka.

O sistema é composto também por [frontend Next.js](../next-frontend), [simulador Go](../golang-simulator), [Kafka](../kafka) e [orquestrador Docker Compose](../Sistema-de-rastreamento-de-veiculos---Curso-Full-Cycle-2.0-). Consulte os respectivos repositórios para os limites de cada serviço.

## Stack

Node.js · NestJS · TypeScript · Prisma · MongoDB · Kafka · Google Maps (Places/Directions) · Socket.IO.

## Execução local

Requer Node.js, npm e Docker. Configure variáveis a partir de `.env.example`, sem versionar valores privados.

```bash
cp .env.example .env
docker compose up -d
npm ci
npm run build
npm run start:dev
```

Consulte `api.http` para exemplos de operações da API. Para iniciar todo o sistema, utilize o Docker Compose do repositório orquestrador.

## Fluxo de rastreamento

1. O cliente solicita informações de origem e destino pelas integrações Maps.
2. A API organiza e persiste rotas.
3. O simulador Go e os tópicos Kafka participam da geração e distribuição de eventos.
4. O backend processa posições e disponibiliza atualizações para os clientes.

A implementação e as condições de infraestrutura de cada etapa podem ser examinadas nos módulos correspondentes.

## Autorização e limites de segurança

O `RoutesApiKeyGuard` protege operações HTTP de rotas mediante `ROUTES_API_KEY` com pelo menos 32 caracteres. Sem a configuração requerida, o serviço deve negar a operação; sem a chave esperada, responde com falha de autenticação. Mantenha o segredo apenas entre serviços confiáveis e use TLS nas conexões remotas.

Uma chave compartilhada **não substitui autorização individual por usuário e por recurso**. Os controles de Socket.IO e o acesso administrativo exigem validação específica antes de qualquer exposição pública. O laboratório não deve ser publicado como solução multiusuário segura sem esses controles.

O endpoint `DELETE /routes/:id` retorna `501` para indicar uma operação indisponível. As validações HTTP verificam dados geográficos antes de consultar os serviços externos.

## Testes e qualidade

```bash
npm ci
npm run build
npm test -- --runInBand
```

O GitHub Actions executa suites de serviços, controllers e regras de segurança com mocks. Esses testes não comprovam, por si, a integração completa com Google Maps, Kafka, MongoDB e serviços WebSocket em ambiente real.

## Documentação

[Especificação](docs/projeto/ESPECIFICACAO.md) · [Arquitetura](docs/ARQUITETURA.md) · [UML](docs/uml/README.md) · [Plano de testes](docs/testes/PLANO_DE_TESTES.md) · [Controle de versões](docs/controle/VERSIONAMENTO.md).

Material de origem: [Imersão Full Cycle](https://imersao.fullcycle.com.br/).
