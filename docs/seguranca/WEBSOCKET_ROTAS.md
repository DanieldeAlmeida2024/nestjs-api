# Segurança de WebSocket — rastreamento por rota

## Arquitetura
O gateway Socket.IO elimina o canal global `server:new-points:list`. O cliente deve apresentar `handshake.auth.token` assinado com HMAC-SHA256 por um serviço confiável; claims têm escopo `read` ou `simulate`, `routeId`, audiência e validade até 15 minutos. Apenas assinantes da sala `route:<id>` recebem posições da rota.

O segredo `ROUTES_WS_TOKEN_SECRET` exige pelo menos 32 bytes e fica exclusivamente no backend. `ROUTES_WS_ALLOWED_ORIGINS` limita navegadores, mas CORS **não** autentica clientes não-browser. Sem segredo, a conexão falha fechada. A expiração força desconexão, inclusive em sockets ociosos.

## Contrato de testes
O arquivo `src/routes/routes-driver/routes-driver.gateway.spec.ts` exercita negação sem token, alteração de assinatura, TTL expirado, impossibilidade de simular com escopo `read`, acesso cruzado entre rotas, emissão exclusiva por sala e simulação permitida. O Actions executa Jest e build, sem Kafka/MongoDB e sem conexão real Socket.IO.

## Bloqueadores de publicação
- **Ainda não existe emissor de token com ACL de usuários/organizações**. O helper de assinatura não deve ser exposto diretamente em endpoint público nem o segredo enviado ao cliente.
- Atualizar frontend para solicitar capability emitida após autorização de rota, e usar evento por rota; o evento global antigo é removido.
- Testar WebSocket/WSS e Kafka reais, TLS, quotas de posições, revogação antecipada, anti-replay, auditoria e rate limit em homologação.
- Nunca executar em produção sem emissor confiável e migração de clientes. Este documento é de código proposto, não de deploy.

## Isolamento da aplicação
Não foram modificados banco, serviços FoodBridge, integração Google Maps ou infraestrutura remota.
