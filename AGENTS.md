# Contexto de projeto — nestjs-api

Backend Node.js/NestJS de laboratório para rastreamento de veículos, integrações de mapas e mensageria.

Antes de qualquer alteração: ler `src/, test/, package.json, api.http`, README, requisitos e configuração do projeto.

- Preservar tecnologias e contratos existentes (Node.js, NestJS, TypeScript e Kafka).
- Não alterar versões de dependências sem testes de compatibilidade.
- Nunca comitar segredos, .env, node_modules, dist ou dados sensíveis.
- Separar interface, regras e integrações. Preferir nomenclatura em português em novas abstrações sem quebrar APIs.
- Conferir npm run build && npm test antes de alegar funcionamento.
- Diagramas adicionados são referenciais; validar contra código.

**Risco:** O README antigo dizia Django, mas o manifesto comprova NestJS. O repositório inclui node_modules e dist rastreados: limpar em PR separado após build controlado.
