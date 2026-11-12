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

## 1.4.0 proposta — controle de acesso WebSocket por rota (11/11/2026)

Base: `main` no commit `0f0b856b144e1b4329b20e6476fe2553444a6da9`. Branch: `fix/ws-route-scoped-auth-20261111`.

**Achado:** `RoutesDriverGateway` aceitava qualquer conexão Socket.IO e simulava rotas por `route_id` fornecido pelo cliente. `emitNewPoints` transmitia GPS para todos no evento global `server:new-points:list`. `cors.origin='*'` permitia qualquer origem de navegador.

**Mitigação codificada:**
- Socket recebe `handshake.auth.token` HMAC-SHA256 com `aud=nestjs-route-points`, `routeId`, `scope='read'|'simulate'`, expiração máxima de 15 minutos; sem secret de 32 bytes em `ROUTES_WS_TOKEN_SECRET`, a conexão é rejeitada.
- `ROUTES_WS_ALLOWED_ORIGINS` é lista explícita, separada por vírgula; padrão vazio, **não usa wildcard**.
- Conexões inválidas desconectadas; credenciais válidas entram apenas na sala Socket.IO `route:<routeId>`; timer desconecta após expiração.
- O comando `client:new-points` requer escopo `simulate`, token vigente e ID da mesma rota. O escopo `read` não autoriza simular.
- `emitNewPoints` transmite somente à sala da rota; evento global eliminado para impedir que a localização seja vista por assinantes de outras rotas.
- Emissão de token só em backend confiável, **após autorização do usuário e da rota** via helper `issueRouteAccessToken`. **Nenhum endpoint público emite token.**

**Limitações bloqueantes:** ainda não existe integração de autenticação de contas/tenant ou emissor autorizado nesta aplicação; a política protege apenas conexões com capabilities provisionadas externamente e sua emissão precisa ser vinculada à ACL real. A rota HTTP `POST /routes/:id/process-route` e outros endpoints permanecem sem RBAC; CORS não protege clientes não browser. Token compartilhado entre usuários é proibido. HTTPS/WSS, revogação antecipada, limitação de taxa e auditoria de reconexões exigem implementação antes da exposição pública. É alteração incompatível do contrato de eventos; clientes que usam feed global precisam migrar.

**Gates:** `npm run build`, seis suites anteriores e novos testes NEST-WS01..07. Não declarar E2E Socket.IO de rede antes da execução.


### Revisão adicional 1.4.0 — proteção da rota HTTP de localização

O endpoint `POST /routes/{id}/process-route` anteriormente permitia a **qualquer cliente** publicar coordenadas na rota (sem header de autenticação). Mesmo com salas Socket.IO protegidas, isso comprometia a integridade dos dados persistidos.

Agora o controller exige `Authorization: Bearer <route-capability>` assinado por HMAC, não expirado, com escopo `simulate` e `routeId` exatamente igual ao parâmetro `id`. Retorna **401 sem chamada ao service** em token ausente, inválido, somente leitura, expirado, associado à outra rota ou na ausência de segredo. O consumidor Kafka interno não usa esta rota, portanto segue funcionando.

**Testes NEST-HTTP01..06:** `src/routes/routes.controller.spec.ts` substitui o teste antigo que apenas instanciava o controller; incluído no CI Jest. Exigir também teste de integração HTTP real e autorização de emissão do token baseada na conta. `POST /routes`, `PATCH /routes/:id`, `POST /routes/:id/start` e GET ainda exigem revisão de RBAC; este PR não os protege.


### Resultado do gate da política de WebSocket e HTTP

- [GitHub Actions #43119629162](https://github.com/DanieldeAlmeida2024/nestjs-api/actions/runs/43119629162): **`npm run build` e 42/42 testes Jest aprovados em sete suítes** para o código de `9ba206432aac799f80e6c17c6bfd47ae7357aa4f`.
- Inclui sete verificações NEST-WS e seis NEST-HTTP com token omitido, escopo somente leitura, rota distinta, expiração, assinatura inválida e acesso válido. Os testes são de unidade com socket/service simulados, **não** conexão Socket.IO/HTTP real.
- Este PR altera contratos para rejeitar conexões/POST sem credencial de simulação; sem um emissor autorizado integrado aos usuários legítimos, o acesso ficará **bloqueado por padrão**. **Manter em draft até implementação e validação do emissor/ACL; não mesclar por estar verde.**

## Versão 1.5.0 proposta — guarda de autorização das operações HTTP

As rotas de escrita/listagem e consumo Google Maps eram acessíveis sem credenciais. Os controllers agora usam `InternalServiceGuard` com segredo próprio para `POST /routes`, `POST /routes/:id/start`, `PATCH /routes/:id`, `GET /routes`, `DELETE /routes/:id`, `GET /places` e `GET /directions`. O detalhe `GET /routes/:id` usa `RouteReadGuard` e exige capability HMAC de escopo `read` ou `simulate`, da mesma rota. `POST /routes/:id/process-route` mantém a exigência de `simulate` da versão 1.4.0. Fonte canônica: [controles HTTP internos](../seguranca/CONTROLES_HTTP_INTERNOS.md). **Não há emissor confiável de capabilities ligado à identidade de usuário** nem RBAC/ACL egress completos; esta versão é fail-closed, não release de produção.
