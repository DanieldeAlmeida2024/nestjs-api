# Controle de versões — nestjs-api

Versão **1.1.0 proposta**, 11/11/2026. Base de código: `4d06f21327dd1702c2c7f33bcd5e1ba52d867c40`.

| ID | Documento | Versão |
|---|---|---|
| NEST-PROJ | [Projeto](../projeto/ESPECIFICACAO.md) | 1.1.0 proposta |
| NEST-UML | [Diagramas](../uml/README.md) | 1.1.0 proposta |
| NEST-TST | [Testes](../testes/PLANO_DE_TESTES.md) | 1.1.0 proposta |

Versão MAJOR quando contrato/entidades mudarem; MINOR para novos fluxos; PATCH para revisão editorial. Testes devem registrar SHA, fixtures e evidência. Diagramas e plano não comprovam funcionamento por si só.


## Histórico de mudanças de testes e higiene
| Versão | Commit/base | Escopo | Evidência |
|---|---|---|---|
| 1.0.0 | main `d0a9fc9495a03e27357ae88edc861d9be3e3b60f` | Projeto/documentos anteriores, com gerados versionados | Inspeção estática |
| 1.1.0 (proposta) | branch `fix/repo-hygiene-and-real-unit-tests-20261111` | Remove **20.153 entradas sob node_modules** e **60 sob dist** do Git atual; preserva package-lock; testes de rotas, Maps, tracking com mocks de rede e CI direcionado | GitHub Actions #43112073712 aprovado (5 suites, 13 testes) |

A limpeza remove arquivos **do índice Git nesta branch**, não apaga artefatos de commits antigos nem edita dependências do `package.json`. O procedimento recomendado é `npm ci` após checkout limpo; arquivos ignorados são regenerados localmente. O código não publicou versão de API.

**Pendências após esta versão:** teste end-to-end real (MongoDB/Kafka), autorização WebSocket, tratamento de erro do provedor, outbox/retry Kafka, `DELETE /routes/:id` placeholder, configuração de CORS e testes da suíte antiga sem mocks. O escopo do CI adicionado é intencionalmente limitado a quatro suites.


### Falha detectada no primeiro CI e correção adicional
- [Run #43111666268](https://github.com/DanieldeAlmeida2024/nestjs-api/actions/runs/43111666268): **3/4 suites passaram** (9 testes), a suite de `RoutesDriverService` falhou em compilação porque `routes-driver.gateway.ts` continha `@ts-expect-error` obsoleto, agora rejeitado por TypeScript (`TS2578`).
- **Correção no código:** remove anotação inválida e corrige um erro funcional no broadcast: a coordenada final antes repetia `lat,lng` iniciais; agora publica `lat2,lng2` corretos.
- **Cobertura nova:** `RoutesDriverGateway` tem dois testes Jest, incluindo avanço de relógio simulado e verificação de início/fim sem esperar 4 segundos reais; o workflow executa agora cinco suites.
- Resultado dos novos jobs deve ser verificado no HEAD; não confundir o CI anterior com aprovação.


### Evidência de execução verificada na correção

- **Primeira tentativa:** [CI #43111666268](https://github.com/DanieldeAlmeida2024/nestjs-api/actions/runs/43111666268) revelou TS2578 no gateway, com 3 suítes e 9 testes passando antes da correção.
- **Correção integrada:** remover comentário TypeScript obsoleto, corrigir broadcast das coordenadas finais e adicionar testes do canal WebSocket.
- **Resultado posterior:** [GitHub Actions #43112073712](https://github.com/DanieldeAlmeida2024/nestjs-api/actions/runs/43112073712) aprovou **5 suites Jest e 13 testes**, incluindo dois de gateway, usando `npm ci` a partir do `package-lock.json` preservado e sem Google Maps/MongoDB/Kafka reais.
- Este gate **não** executou `npm run build`, todas as specs ou E2E; status parcial, não aptidão para produção. Os diretórios `node_modules` e `dist` continuam ignorados, mas não estão mais versionados no HEAD deste PR.


## Integração 1.1.0 e proposta de proteção de entrada — 11/11/2026

| Marco | Referência | Evidência | Situação |
|---|---|---|---|
| **1.1.0 integrada** | [PR #3](https://github.com/DanieldeAlmeida2024/nestjs-api/pull/3), squash `af64402532f723a58b2193377157e9de31609774` | [CI main #43112866410](https://github.com/DanieldeAlmeida2024/nestjs-api/actions/runs/43112866410), 5 suites Jest aprovadas | Código e documentação mesclados, sem deploy |
| **1.2.0 proposta** | `fix/route-boundaries-and-build-ci-20261111` | Adiciona validação de coordenadas/ID, DELETE fail-closed e gate `npm run build` | CI da nova branch pendente |

**Compatibilidade:** `DELETE /routes/:id` antes respondia HTTP 200 com texto de sucesso **falso**; a revisão retorna HTTP 501 até que um contrato autorizado de exclusão seja implementado. `POST /routes/:id/process-route` passa a retornar HTTP 400 quando as coordenadas não são numéricas/finitas ou excedem o intervalo geográfico. Sem autorização WebSocket/Mongo integrados, ainda não considerar a API pronta para exposição pública.


## Evidência executada — build NestJS e guardas de entrada

- [GitHub Actions #43114601405](https://github.com/DanieldeAlmeida2024/nestjs-api/actions/runs/43114601405): job `Jest rotas, Maps e rastreamento` **success**.
- Etapas explicitamente confirmadas no job: `npm ci`, **`npm run build` aprovado**, e cinco suítes Jest direcionadas aprovadas, incluindo entradas GPS inválidas e rejeição de DELETE placeholder.
- Commit de código/documentos validado: `c2899183f092f295a728c95c4626c40f5e945ce9`. Commit só documental posterior exige novo CI.
- Não é validação HTTP/Mongo/Kafka real nem certificação de autorização WebSocket. DELETE permanece explicitamente desabilitado com HTTP 501.


## Versão 1.3.0 proposta — consumidor Kafka sem HTTP de loopback (11/11/2026)

| Marco | SHA / PR | Estado |
|---|---|---|
| **1.2.0 integrada** | [PR #4](https://github.com/DanieldeAlmeida2024/nestjs-api/pull/4), squash `7d6a5061a2fb056e43a4000d6b6762cd00e63abe` | GPS validado, DELETE falha com 501, build no CI |
| **1.3.0 proposta** | `fix/kafka-consumer-internal-service-20261111` | `RoutesDriverConsumer` injeta `RoutesDriverService` e não usa `HttpService.axiosRef.post(localhost:3000)`; testes de simulação Kafka simulada em CI |

O evento `simulation` já trafega dentro do mesmo módulo NestJS. O novo consumidor mantém a persistência `routeDriver.upsert` e o WebSocket por meio do serviço existente, sem exigir que o processo faça chamada HTTP a si próprio. Validação das coordenadas permanece centralizada no service e erros são propagados ao broker (política efetiva de retry/idempotência Kafka ainda **não implementada**). Não há deploy.


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


### Revisão adicional 1.4.0 — proteção da rota HTTP de localização

O endpoint `POST /routes/{id}/process-route` anteriormente permitia a **qualquer cliente** publicar coordenadas na rota (sem header de autenticação). Mesmo com salas Socket.IO protegidas, isso comprometia a integridade dos dados persistidos.

Agora o controller exige `Authorization: Bearer <route-capability>` assinado por HMAC, não expirado, com escopo `simulate` e `routeId` exatamente igual ao parâmetro `id`. Retorna **401 sem chamada ao service** em token ausente, inválido, somente leitura, expirado, associado à outra rota ou na ausência de segredo. O consumidor Kafka interno não usa esta rota, portanto segue funcionando.

**Testes NEST-HTTP01..06:** `src/routes/routes.controller.spec.ts` substitui o teste antigo que apenas instanciava o controller; incluído no CI Jest. Exigir também teste de integração HTTP real e autorização de emissão do token baseada na conta. `POST /routes`, `PATCH /routes/:id`, `POST /routes/:id/start` e GET ainda exigem revisão de RBAC; este PR não os protege.
