# NestJS API — controles HTTP internos e consulta por capability

> **NEST-HTTP v1.5.0 proposta** · 11/11/2026 · base: PR #6, head `0222dff9`. **Não é release nem autenticação completa de usuários.**

## Contexto
A aplicação NestJS 10 oferece planejamento de rotas com Google Maps, MongoDB via Prisma, Kafka e acompanhamento Socket.IO. O PR #6 corrigiu transmissão de coordenadas por sala e exige capabilities assinadas e temporárias para `POST /routes/:id/process-route`. Na mesma base, criar/atualizar/iniciar/listar rotas e consultar Google Maps seguiam sem autenticação. Isso permite alterações não autorizadas, enumeração de rotas e consumo de APIs de terceiros faturáveis se houver exposição pública.

## Fronteiras novas
`src/security/http-access.guards.ts` centraliza duas verificações NestJS `CanActivate` aplicadas via `@UseGuards` antes de executar os métodos. A validação do bearer de serviço usa SHA-256 com `timingSafeEqual` e aceita `ROUTES_INTERNAL_API_TOKEN` **somente se houver segredo de pelo menos 32 bytes** e formato `Bearer <token>`. Ausência de segredo = acesso negado, não uma permissão temporária de desenvolvimento.

| Endpoint | Verificação obrigatória | Sem credencial |
|---|---|---|
| `POST /routes` | Bearer de serviço interno | 401, sem chamar Maps/Prisma/Kafka |
| `POST /routes/:id/start` | Bearer de serviço interno | 401, sem publicar Kafka |
| `PATCH /routes/:id` | Bearer de serviço interno | 401, sem persistir |
| `GET /routes` | Bearer de serviço interno | 401, sem enumerar rotas |
| `DELETE /routes/:id` | Bearer de serviço interno | 401; **mesmo com bearer válido permanece 501** |
| `GET /places`, `GET /directions` | Bearer de serviço interno | 401, sem consumir quota do Google |
| `GET /routes/:id` | Capability assinada HMAC para **a mesma rota**, escopo `read` ou `simulate` | 401, sem consulta Prisma |
| `POST /routes/:id/process-route` | Capability HMAC da mesma rota e `simulate` (PR #6, preservado) | 401, sem escrita/broadcast |

## Segregação e emissão de credenciais
- `ROUTES_INTERNAL_API_TOKEN` é para **backends confiáveis**, com canal privado HTTPS e rotação controlada. Não deve chegar a navegador, aplicativo mobile, arquivo `api.http` versionado, logs ou repositório; **não é identidade de usuário nem substitui RBAC de contas ou tenants**.
- `ROUTES_WS_TOKEN_SECRET` é outro segredo, para validar capacidades de rotas, e deve ser **diferente** do token interno. Os tokens de rota continuam expiram em no máximo 15 minutos, com `aud`, `routeId` e escopo `read/simulate`. Não há endpoint emissor público nesta revisão.
- `GET /routes/:id` exige capability concedida por emissor de confiança **depois de verificar acesso do usuário à rota**. A existência desse emissor/ACL ainda NÃO foi demonstrada. Sem ele, clientes legítimos não conseguem obter credenciais e a API fica fechada por padrão.
- Kafka `@MessagePattern('simulation')` usa serviço interno, sem chamada HTTP. A segurança do **broker** (ACL Kafka/SASL, validação de produtor e anti-replay) segue fora deste gate.

## Limites e riscos
O uso de segredo estático de serviço cria um principal interno único: um vazamento compromete todas as operações protegidas por ele. Falta autenticação de contas e autorização detalhada por tenant, revogação individual, auditoria e rate limiting. O guard HTTP NÃO substitui autenticação de Socket.IO, segurança do tráfego Kafka ou autorização das chaves do Google no provedor. É um bloqueio preventivo para não expor os endpoints enquanto se implementa uma solução de identidade.

## Migração / rollback seguro
1. Criar dois segredos distintos, aleatórios, >=32 bytes em secret manager: `ROUTES_INTERNAL_API_TOKEN` e `ROUTES_WS_TOKEN_SECRET`. Configurar origens WS explícitas e TLS externo.
2. Provisionar credenciais somente aos serviços confiáveis; **nunca** entregar o bearer interno a usuário final para contornar 401. Integrar emissor de capabilities à autenticação + ACL real antes de habilitar usuários.
3. Ensaiar em staging as respostas 401/200/201/501, os fluxos de tracking e as chamadas Google (com mocks/quotas de teste). Migrar os consumidores antes do deploy, pois é alteração incompatível.
4. Planejar rollback controlado preservando os secrets e sem remover os guards nem tornar a API pública. Monitorar 401, tráfego faturado, desvios Kafka e reconexões.
5. Não fazer deploy até a validação de HTTP real, WS real, Mongo, Kafka e ACL de usuário.

## Rastreabilidade
- [Matriz de testes detalhada](../testes/HTTP_AUTORIZACAO.md).
- [Diagrama de sequência editável](../uml/08_http_guards_e_escopos.puml).
- [Controle de versão](../controle/VERSIONAMENTO.md).
