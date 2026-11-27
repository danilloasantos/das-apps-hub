# DAS Apps Hub

Site estático público: `apps.json` (única fonte oficial) + `index.html`. Sem backend, frameworks ou dependências.

## Comandos

- `node scripts/validate.mjs`
- `node --test scripts/validate.test.mjs`
- `node scripts/verify-endpoint.mjs` (após o deploy)

## Regras

- Repositório público: nada de credenciais ou dados privados.
- Não inventar nomes de pacote, URLs, logotipos ou funcionalidades. Confirmar o publicador antes de usar
  uma ficha de loja: há apps de terceiros chamados "Odomo" e "Puller".
- Não gerar imagem do proprietário. Sem avatar, `avatarUrl: null` (monograma DS).
- Não duplicar dados do catálogo no HTML.
- Contrato v1 retrocompatível (ver `INTEGRATION.md`). Nunca mudar ou reutilizar um `id`.
- Atualizar `updatedAt` a cada mudança no catálogo.
- Hosts permitidos: manter iguais em `scripts/validate.mjs`, `index.html` e `INTEGRATION.md`.
- Push na `main` publica o site (após a validação no Actions).
- Não alterar repositórios dos apps a partir daqui.

Procedimentos: `README.md`.
