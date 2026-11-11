# NestJS Routes — plano de testes

> **NEST-DOC v1.1.0 proposta** · 11/11/2026 · base analisada `4d06f21327dd1702c2c7f33bcd5e1ba52d867c40` · revisão estática.


## Fontes já existentes
Há `*.spec.ts` em `src/routes`, `src/routes/routes-driver`, `src/maps`, `src/prisma` e `src/app.controller.spec.ts`. Estes nomes indicam intenção de suíte Jest; não declarar aprovação sem executar comando e analisar resultados.

| ID | Prioridade | Cenário | Esperado |
|---|---|---|---|
| NEST-T01 | P0 | Criar rota com Place IDs válidos | Gravar Route com direções, distância e duração |
| NEST-T02 | P0 | Falha da Google Directions | Sem registro parcial ou resposta 500 sem tratamento |
| NEST-T03 | P0 | Falha Kafka após persistir Route | Política de retry/outbox definida |
| NEST-T04 | P0 | `POST /routes/:id/start` inexistente | Erro claro, sem evento |
| NEST-T05 | P1 | Listar/detalhar rota | DTO correto, sem dados desnecessários |
| NEST-T06 | P0 | `POST process-route` | Upsert RouteDriver e novo Point |
| NEST-T07 | P0 | Mensagem em `simulation` | Handler traduz payload em atualização de rota |
| NEST-T08 | P1 | Websocket em rota específica | Evento com route_id e latitude/longitude |
| NEST-T09 | P1 | Dados lat/lng inválidos | Validação e rejeição sem persistência |
| NEST-T10 | P0 | `DELETE /routes/:id` | **Não implementado**: registrar comportamento placeholder |
| NEST-T11 | P0 | WebSocket sem autorização | Revisar política antes de exposição pública |
| NEST-T12 | P1 | ID malformado MongoDB | Tratamento HTTP controlado |
| NEST-T13 | P1 | `GOOGLE_MAPS_API_KEY` ausente | Erro de configuração legível |
| NEST-T14 | P1 | Reconexão broker Kafka | Estratégia de retry sem duplicação indevida |

## Como executar
Consultar `package.json` e usar os scripts de teste Jest do projeto; rodar build e lint separadamente. Para integração, usar MongoDB e Kafka descartáveis, simulação de Directions e fixture com rotas. E2E com Socket.IO precisa verificar ordering e reconexão.

**Critério:** todos os P0 validam persistência, autorização e emissão de eventos. Não promover testes estruturais Python como substitutos para Jest ou E2E.


## Execuções de código propostas — 1.1.0

| Caso | Implementação Jest | Controle verificado | Status inicial |
|---|---|---|---|
| NEST-T01 | `RoutesService` cria rota e emite RouteCreated | Mapeamento Maps → Mongo/Prisma → Kafka simulados | CI pendente |
| NEST-T02 | Falha de Directions | Nenhum registro nem evento após falha de Maps | CI pendente |
| NEST-T04 | Inexistência e existência de rota em start | Kafka não publica antes da validação do ID; publica após sucesso | CI pendente |
| NEST-T05 | `findOne` por ID | Filtro por ID esperado na query Prisma | CI pendente |
| NEST-T06 | `RoutesDriverService` upsert + gateway | Dados corretos; falha do banco impede emissão | CI pendente |
| NEST-T13 parcial | `DirectionsService` e `PlacesService` | Contratos Google Maps com chave **fictícia** injetada | CI pendente |

**Testes:** quatro arquivos `*.spec.ts` substituem verificação simples `toBeDefined()` por cenários de comportamento. [CI `.github/workflows/unit-tests.yml`](https://github.com/DanieldeAlmeida2024/nestjs-api/blob/fix/repo-hygiene-and-real-unit-tests-20261111/.github/workflows/unit-tests.yml) faz `npm ci` e executa somente estes quatro arquivos com `--runTestsByPath`. **Não** assumir que todas as demais specs ou testes e2e passam.

**Critérios ainda bloqueantes:** NEST-T03 (Kafka/outbox), NEST-T07/T08 (consumidor e WebSocket), T09 (pontos inválidos), T10 (DELETE placeholder), T11 (autorização websocket), T12 (ID malformado), T14 (reconexão Kafka). Esses controles exigem novas alterações e mais integração real.


### NEST-T08 — transmissão de pontos (incremental)
- Teste em `src/routes/routes-driver/routes-driver.gateway.spec.ts`: `emitNewPoints` deve publicar o mesmo ponto no canal individual e no global; `handleMessage` deve enviar **coordenadas de origem e destino distintas**, com relógio de teste para evitar espera de 2 s por etapa.
- **Defeito corrigido:** mensagem global do ponto final usava as coordenadas iniciais. A anotação TypeScript inválida `@ts-expect-error` foi removida após falha real de compilação no [CI #43111666268](https://github.com/DanieldeAlmeida2024/nestjs-api/actions/runs/43111666268).
- **Limite:** prova de unidade com sockets e banco simulados, não prova segurança WebSocket, ordenação sob carga nem consumo Kafka.


## Registro do CI da versão 1.1.0 proposta

[Workflow #43112073712](https://github.com/DanieldeAlmeida2024/nestjs-api/actions/runs/43112073712): **5 suites Jest aprovadas / 13 testes aprovados**, a partir do PR com `node_modules` e `dist` removidos do controle de versão. O teste de gateway verifica emissão individual/global e as coordenadas distintas do ponto final com relógio simulado. O teste de Mapas/Prisma/Kafka usa dublês e não prova segurança de rede real. Não executar e2e real sem ambientes descartáveis e chaves de teste autorizadas.


## Novos cenários automatizados — revisão 1.2.0 proposta

| Caso | Teste Jest | Invariante | Status |
|---|---|---|---|
| NEST-T09 | 10 entradas inválidas via `it.each` | Latitude/longitude finitas e dentro da faixa, route_id não vazio; nenhum `upsert`/broadcast ao rejeitar | CI pendente |
| NEST-T10 | `RoutesService.remove` | Retorna erro `NotImplementedException`, sem gravação Kafka/Prisma; não afirma exclusão fictícia | CI pendente |
| NEST-T15 | `npm run build` | Compila todo NestJS; revela TS de módulos não exercitados no Jest direcionado | CI pendente |

A suíte original de cinco arquivos permanece em `unit-tests.yml`. O build é gate adicional, sem alegar que a aplicação está pronta para deploy.


## Evidência executada — build NestJS e guardas de entrada

- [GitHub Actions #43114601405](https://github.com/DanieldeAlmeida2024/nestjs-api/actions/runs/43114601405): job `Jest rotas, Maps e rastreamento` **success**.
- Etapas explicitamente confirmadas no job: `npm ci`, **`npm run build` aprovado**, e cinco suítes Jest direcionadas aprovadas, incluindo entradas GPS inválidas e rejeição de DELETE placeholder.
- Commit de código/documentos validado: `c2899183f092f295a728c95c4626c40f5e945ce9`. Commit só documental posterior exige novo CI.
- Não é validação HTTP/Mongo/Kafka real nem certificação de autorização WebSocket. DELETE permanece explicitamente desabilitado com HTTP 501.


## NEST-T07 — consumidor Kafka sem chamada HTTP local (1.3.0 proposta)

| Cenário | Teste Jest | Esperado |
|---|---|---|
| Evento `simulation` válido | `RoutesDriverConsumer.driverMoved` com `RoutesDriverService` real e Prisma/gateway simulados | `upsert` chamado uma vez, ponto propagado pelo gateway |
| Coordenadas fora da faixa | mesmo handler | `BadRequestException`, nenhuma persistência nem broadcast |
| Payload ausente | mesmo handler | erro de validação, nenhuma persistência |
| Falha de banco | service `upsert` lança erro | propagação de erro, nenhum broadcast |

**Arquivo:** `routes-driver.consumer.spec.ts`, incluído no workflow das **seis** suites Jest e no build NestJS. O teste não executa Kafka/Mongo/HTTP real, mas verifica a integração direta e a ausência de dependência do loopback.


### Evidência verificada no CI da revisão 1.3.0

- [GitHub Actions #43116729112](https://github.com/DanieldeAlmeida2024/nestjs-api/actions/runs/43116729112): **31/31 PASS**. Seis suítes Jest, 31 testes aprovados e compilação NestJS aprovada. Inclui o consumidor Kafka com serviço interno, erros de coordenadas e ausência de chamada HTTP localhost.
- Commit de código testado: `7a5819029555f49a932ae76a5bc64cb0c762df73`. Documentação adicionada depois do run; novo HEAD deverá manter os mesmos gates verdes antes do merge.
- Sem deploy; CI não substitui testes de segurança/rede/ambiente real fora do escopo.

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


**NEST-WS01..07:** negar sem token, leitor sem simulação, isolamento entre rotas, emissão sem global, simulação autorizada, assinatura/TTL adulterados, validade máxima. Arquivo: `routes-driver.gateway.spec.ts`.


### Revisão adicional 1.4.0 — proteção da rota HTTP de localização

O endpoint `POST /routes/{id}/process-route` anteriormente permitia a **qualquer cliente** publicar coordenadas na rota (sem header de autenticação). Mesmo com salas Socket.IO protegidas, isso comprometia a integridade dos dados persistidos.

Agora o controller exige `Authorization: Bearer <route-capability>` assinado por HMAC, não expirado, com escopo `simulate` e `routeId` exatamente igual ao parâmetro `id`. Retorna **401 sem chamada ao service** em token ausente, inválido, somente leitura, expirado, associado à outra rota ou na ausência de segredo. O consumidor Kafka interno não usa esta rota, portanto segue funcionando.

**Testes NEST-HTTP01..06:** `src/routes/routes.controller.spec.ts` substitui o teste antigo que apenas instanciava o controller; incluído no CI Jest. Exigir também teste de integração HTTP real e autorização de emissão do token baseada na conta. `POST /routes`, `PATCH /routes/:id`, `POST /routes/:id/start` e GET ainda exigem revisão de RBAC; este PR não os protege.


### Resultado do gate da política de WebSocket e HTTP

- [GitHub Actions #43119629162](https://github.com/DanieldeAlmeida2024/nestjs-api/actions/runs/43119629162): **`npm run build` e 42/42 testes Jest aprovados em sete suítes** para o código de `9ba206432aac799f80e6c17c6bfd47ae7357aa4f`.
- Inclui sete verificações NEST-WS e seis NEST-HTTP com token omitido, escopo somente leitura, rota distinta, expiração, assinatura inválida e acesso válido. Os testes são de unidade com socket/service simulados, **não** conexão Socket.IO/HTTP real.
- Este PR altera contratos para rejeitar conexões/POST sem credencial de simulação; sem um emissor autorizado integrado aos usuários legítimos, o acesso ficará **bloqueado por padrão**. **Manter em draft até implementação e validação do emissor/ACL; não mesclar por estar verde.**
