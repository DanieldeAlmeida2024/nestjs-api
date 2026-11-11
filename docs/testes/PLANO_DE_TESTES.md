# NestJS Routes — plano de testes

> **NEST-DOC v1.0.0** · 11/11/2026 · base analisada `4d06f21327dd1702c2c7f33bcd5e1ba52d867c40` · revisão estática.


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
