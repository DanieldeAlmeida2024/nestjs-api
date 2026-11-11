# Plataforma de rotas e rastreamento — API NestJS

> **NEST-DOC v1.0.0** · 11/11/2026 · base analisada `4d06f21327dd1702c2c7f33bcd5e1ba52d867c40` · revisão estática.


## Propósito
API de rotas de entrega integrada ao Google Maps Directions, MongoDB (via Prisma), Kafka e Socket.IO. O módulo raiz `src/app.module.ts` importa `PrismaModule`, `MapsModule`, `RoutesModule` e `KafkaModule` com `ConfigModule` global.

## Contratos HTTP existentes
`src/routes/routes.controller.ts` expõe:
- `POST /routes`: criar rota por `CreateRouteDto`, origens/destinos `place_id`.
- `POST /routes/:id/start`: publicar evento de início de entrega.
- `POST /routes/:id/process-route`: registrar ponto `lat,lng`.
- `GET /routes` e `GET /routes/:id`: listagem/detalhes.
- `PATCH /routes/:id`: atualizar via `UpdateRouteDto`.
- `DELETE /routes/:id`: atualmente **retorna string placeholder**; não exclui rota de verdade.

## Persistência
`prisma/schema.prisma` usa `provider="mongodb"`, URL em `DATABASE_URL`. `Route` contém ID ObjectId, nome, `source`/`destination` do tipo embutido `Place`, distância, duração, frete opcional, direções JSON e relacionamento `RouteDriver?`. `RouteDriver` possui rota única e vetor de `Point` (latitude, longitude, timestamp).

## Fluxo e mensageria
`RoutesService.create` consulta Directions API do Google via `DirectionsService.getDirections`, persiste a rota e emite evento Kafka `RouteCreated` no tópico `route`, com ID, distância e pontos calculados pelas etapas do trajeto. `startRoute` emite `DeliveryStarted` após encontrar o ID.

`RoutesDriverConsumer` recebe `@MessagePattern('simulation')` e encaminha atualização HTTP para `localhost:3000/routes/:route_id/process-route`. `RoutesDriverService.processRoute` faz `upsert` de rota em andamento e acrescenta `Point`; depois `RoutesDriverGateway` emite `server:new-points/:route_id:list` e `server:new-points:list` via WebSocket.

## Dependências e problemas a medir
- Google Maps requer `GOOGLE_MAPS_API_KEY`; MongoDB exige `DATABASE_URL`, Kafka depende do broker.
- Persistência e publicação Kafka não têm transação distribuída/outbox demonstrada; uma falha de publicação pode deixar rota criada sem evento.
- `RoutesDriverGateway` configura CORS `origin:'*'`; revisar segurança antes de publicar na internet.
- `RoutesDriverConsumer` fixa `http://localhost:3000`; corrigir para serviço/configuração em deploy com contêiner.
- Código faz chamadas a API de mapas; não usar chave real nos testes.
- O repositório contém grande volume de `node_modules` versionado; limpar requer PR próprio cuidadoso.
