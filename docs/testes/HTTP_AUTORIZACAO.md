# NestJS API — matriz de autenticação HTTP NEST-HTTP-B

> **v1.5.0 proposta** · Controller HTTP e guards com `Test.createTestingModule` + Supertest, serviços externos substituídos por mocks. Não é teste end-to-end da infraestrutura.

| ID | Tipo | Cenário | Oráculo (resultado esperado) |
|---|---|---|---|
| NEST-HTTP-B01 | HTTP Nest | Sete endpoints admin/Maps sem bearer | 401; zero chamadas RoutesService/Google |
| NEST-HTTP-B02 | HTTP Nest | Bearer interno correto | POST 201, GET/PATCH 200 e chamadas somente aos serviços associados |
| NEST-HTTP-B03 | HTTP Nest | Capability de rota no endpoint admin/Maps | 401; tokens de usuários não conferem privilégio administrativo |
| NEST-HTTP-B04 | HTTP Nest | GET detalhe sem capability, de outra rota e da própria rota | 401, 401, 200; leitura somente da rota autorizada |
| NEST-HTTP-B05 | HTTP Nest | Capability expirada, adulterada ou secret ausente | 401 e zero leitura Prisma |
| NEST-HTTP-B06 | HTTP Nest | Token interno configurado como ausente | 401 mesmo com bearer anterior; nenhuma chamada Google/Kafka |
| NEST-HTTP-B07 | HTTP Nest | DELETE sem bearer e com bearer | 401; 501 para bearer válido, sem exclusão fictícia |
| NEST-HTTP-B08 | HTTP Nest | POST process-route com capability `simulate`, depois PATCH com mesma credencial | 201 e 401; separação de privilégios e fluxo do PR #6 preservado |
| NEST-HTTP-B09 | Unidade | Bearer correto, prefixo/assinatura incorretos, secret fraco | verdadeiro somente com token e secret fortes e exatos |
| NEST-HTTP-I01 | E2E real | Reverse proxy TLS + ACL/issuer + Mongo + Kafka + WSS | **Pendente** |
| NEST-HTTP-I02 | Financeiro | Limites/quotas/monitoramento das chamadas Google Maps | **Pendente** |
| NEST-HTTP-I03 | Segurança | Revogação, rate limits, escopos/identidade e segmentação tenant | **Pendente** |

**Comandos reproduzíveis:** `npm ci`, `npm run build`, `npm test -- --runInBand --runTestsByPath src/security/http-boundaries.spec.ts`. O workflow `.github/workflows/unit-tests.yml` inclui também as sete suítes anteriores. Consultar logs no SHA exato; não afirmar PASS antes de executar o CI.

**Testes isolados:** não acessam servidores Google, Kafka ou MongoDB; usam controladores e guardas NestJS reais, ciclo HTTP via Supertest e services substituídos. As verificações anteriores do PR #6 (Socket.IO por sala, GPS e simulação HTTP) permanecem no gate.

## Evidência no GitHub Actions (SHA de código e documentação)

- HEAD publicado e validado: `f4d597e4615014eeb461d12365bff4733020d915`.
- [Run #43128485353](https://github.com/DanieldeAlmeida2024/nestjs-api/actions/runs/43128485353): `npm ci --no-audit --no-fund`, **`npm run build` PASS**, oito suítes Jest **PASS**.
- [Run #43128713841](https://github.com/DanieldeAlmeida2024/nestjs-api/actions/runs/43128713841): **8/8 suítes e 51/51 testes PASS**, compilação NestJS PASS. Nove novos cenários NEST-HTTP-B01..09.
- O GitHub Actions usa Supertest com controllers/guards reais e dependências de Google/Mongo/Kafka simuladas. **Não comprova** TLS, Mongo/Kafka reais, identidade/ACL de usuários, emissor de capability, revogação nem rate-limiting.
- O commit desta nota apenas versiona a evidência. Revalidar o SHA final do PR, e não usar teste anterior como comprovação de código divergente.
