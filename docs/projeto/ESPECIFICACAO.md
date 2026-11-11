# Plataforma de rotas e rastreamento — API NestJS

> **NEST-DOC v1.1.0 proposta** · 11/11/2026 · base analisada `4d06f21327dd1702c2c7f33bcd5e1ba52d867c40` · revisão estática.


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
- A revisão 1.1.0 propõe limpeza do índice Git: 20.153 arquivos no diretório `node_modules` e 60 em `dist` deixam de ser rastreados; os diretórios já constavam no `.gitignore`. A mudança é em um PR próprio de higiene e testes, sem excluir dependências do manifesto/lock.


## Contrato de testes isolados — revisão 1.1.0 proposta
- `RoutesService.create`: o serviço consulta Directions, grava a rota via Prisma e emite `RouteCreated` no tópico `route`. O teste verifica `source/destination`, distância, duração, nome e os pontos enviados; nenhuma requisição Google, escrita Mongo ou Kafka real acontece.
- `RoutesService.startRoute`: `findUniqueOrThrow` precisa confirmar rota antes de enviar `DeliveryStarted`; rota ausente propaga erro e não envia evento.
- `DirectionsService`: input `place_id` e `TravelMode.driving` são preservados; erro do Maps é propagado sem resposta fictícia.
- `PlacesService`: solicita somente campos `place_id, formatted_address, geometry, name` e retorna a resposta do provedor simulada.
- `RoutesDriverService.processRoute`: `upsert` com ponto do motorista e publicação via gateway do mesmo payload; falha de persistência não emite evento WebSocket.
- Removido `console.log(createRouteDto)` no fluxo de criação para não registrar payload de entrada arbitrariamente.
- **Débito explícito:** falha Kafka após criação pode deixar registro sem evento; remover log e adicionar testes não equivale a outbox/retry. `RoutesService.remove` ainda devolve string sem exclusão real; manter bloqueado antes de disponibilizar essa rota em produção.

**Instalação limpa:** `npm ci` a partir do lock, executada no CI do PR. Não é necessário manter a árvore de dependências no Git. [Rastreabilidade dos testes](../testes/PLANO_DE_TESTES.md) e [sequência UML](../uml/04_testes_dominio_rotas.puml).


### Regressão de WebSocket descoberta no CI
A compilação de gateway falhava por `@ts-expect-error` obsoleto (TS2578), detectado no primeiro CI. O método `RoutesDriverGateway.handleMessage` também transmitia o **ponto inicial duas vezes** no canal global (a segunda emissão usava `lat,lng` ao invés de `lat2,lng2`). O patch corrige essa divergência e acrescenta teste com timers Jest, sem rede real. O `origin:'*'` segue aberto como problema de autorização/CORS.


**Evidência de regressão técnica:** o CI [#43112073712](https://github.com/DanieldeAlmeida2024/nestjs-api/actions/runs/43112073712) executou **5 testes agrupados em suites Jest, total de 13 métodos PASS**. A remoção de 20.153 arquivos de dependências versionadas e 60 de compilados tornou o checkout do PR reproduzível por `npm ci`; o lock permaneceu inalterado. A API não foi executada em servidor nem foram ativadas chamadas Google Maps/Kafka/Mongo.


## Boundary checks 1.2.0 proposta

- `RoutesDriverService.processRoute` valida `route_id` não vazio, `lat` finito em [-90,+90] e `lng` finito em [-180,+180], **antes de chamar Prisma**. HTTP com string no lugar de número retorna BadRequestException; o código de controller permanece com TypeScript tipado mas não assume parsing automático.
- `RoutesService.remove` deixa de devolver placeholder de sucesso; lança `NotImplementedException` (HTTP 501) de maneira deliberada. Não realiza exclusão até resolver autenticação, autorização de rota, integridade e auditoria.
- CI passa a compilar `nest build` antes dos Jest existentes. Se o build revelar problemas antigos, documentá-los e corrigir em PR sem enfraquecer testes.
- **Permanecem abertos:** WebSocket sem autorização, `origin:'*'`, Kafka outbox, ObjectId inválido, rate-limit e testes reais Mongo/Kafka.

[Plano de testes](../testes/PLANO_DE_TESTES.md) · [UML boundary checks](../uml/05_validacao_de_rotas.puml).


## Evidência executada — build NestJS e guardas de entrada

- [GitHub Actions #43114601405](https://github.com/DanieldeAlmeida2024/nestjs-api/actions/runs/43114601405): job `Jest rotas, Maps e rastreamento` **success**.
- Etapas explicitamente confirmadas no job: `npm ci`, **`npm run build` aprovado**, e cinco suítes Jest direcionadas aprovadas, incluindo entradas GPS inválidas e rejeição de DELETE placeholder.
- Commit de código/documentos validado: `c2899183f092f295a728c95c4626c40f5e945ce9`. Commit só documental posterior exige novo CI.
- Não é validação HTTP/Mongo/Kafka real nem certificação de autorização WebSocket. DELETE permanece explicitamente desabilitado com HTTP 501.


## Ingestão de pontos Kafka — contrato 1.3.0 proposto

**Antes:** o handler `@MessagePattern('simulation')` extraía `route_id,lat,lng` e chamava `http://localhost:3000/routes/{id}/process-route`. Isso falhava quando a API estava em outro endereço/porta, gerava overhead local e exigia disponibilizar uma rota HTTP só para comunicação interna.

**Agora:** `RoutesDriverConsumer` injeta `RoutesDriverService` (já provider no `RoutesModule`) e chama `processRoute` diretamente. O service já rejeita coordenadas inválidas, grava via Prisma, e só emite WebSocket após persistir. O consumidor não registra o payload de localização inteiro no log. A API `POST /routes/:id/process-route` **não** foi removida nem protegida nesta mudança; sua autorização segue pendente.

**Limites:** não foram adicionados idempotency keys, ordenação de eventos, deduplicação de pontos nem backoff/dead-letter para Kafka. Sem MongoDB real ou consumer group no CI, o teste é unitário com a implementação do service e gateways simulados.
