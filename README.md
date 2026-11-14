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

## Compatibilidade NestJS → Kafka → Go Simulator

A criação de rotas valida o retorno do Google Maps **antes** de persistir no MongoDB e publicar `RouteCreated`. O produtor aceita até **300 etapas** (até **600 coordenadas**, duas por etapa), exige distância e duração inteiras não negativas e rejeita coordenadas inexistentes ou fora dos intervalos de latitude/longitude. Esse orçamento acompanha o contrato `GO-SIM 1.2.0` do [simulador Go](https://github.com/DanieldeAlmeida2024/golang-simulator).

Respostas de direções inválidas geram erro explícito de gateway (**502**), sem gravação de rota nem publicação Kafka. Isso não resolve a possibilidade de falha de Kafka **depois** de uma rota válida já ter sido gravada; para consistência forte ainda é necessário um outbox transacional e processamento idempotente.

## Segurança do canal WebSocket por rota (proposta)

Rastreamento não deve transmitir GPS globalmente. A evolução proposta exige token HMAC de rota (escopos `read`/`simulate`, validade <=15min), com salas isoladas e CORS explícito. **Falta um emissor confiável de capabilities integrado ao usuário; sem ele, conexões do navegador são negadas.** Consulte `docs/seguranca/WEBSOCKET_ROTAS.md` e os testes de gateway. Não publicar até homologar cliente Next.js, Kafka e WSS.
