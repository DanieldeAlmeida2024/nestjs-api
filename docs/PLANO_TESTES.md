# Plano de testes — nestjs-api

- CT-01 Arquivos de documentação e sintaxe básica UML.
- CT-02 Verificar `npm run build && npm test` com dependências instaladas.
- CT-03 Executar fluxo de negócio positivo e negativo.
- CT-04 Simular falhas de integração e credenciais ausentes.
- CT-05 Confirmar absence de segredos e artefatos versionados.

`python -m unittest discover -s tests -p test_documentacao.py -v` verifica **somente CT-01**. CT-02 a CT-05 ainda exigem execução/revisão.
