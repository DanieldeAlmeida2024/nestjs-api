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
