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
| 1.1.0 (proposta) | branch `fix/repo-hygiene-and-real-unit-tests-20261111` | Remove **20.153 entradas sob node_modules** e **60 sob dist** do Git atual; preserva package-lock; testes de rotas, Maps, tracking com mocks de rede e CI direcionado | GitHub Actions ainda por verificar |

A limpeza remove arquivos **do índice Git nesta branch**, não apaga artefatos de commits antigos nem edita dependências do `package.json`. O procedimento recomendado é `npm ci` após checkout limpo; arquivos ignorados são regenerados localmente. O código não publicou versão de API.

**Pendências após esta versão:** teste end-to-end real (MongoDB/Kafka), autorização WebSocket, tratamento de erro do provedor, outbox/retry Kafka, `DELETE /routes/:id` placeholder, configuração de CORS e testes da suíte antiga sem mocks. O escopo do CI adicionado é intencionalmente limitado a quatro suites.
