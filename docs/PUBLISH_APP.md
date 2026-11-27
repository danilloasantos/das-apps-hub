# Publicar e atualizar apps

Tudo é feito em `apps.json`. Os apps integrados baixam o catálogo remotamente: **mudanças de conteúdo
não exigem nova build**. Elas aparecem após o deploy (o cache do Pages leva cerca de 10 min) e quando o
cache de 24 h do app vence, ou na atualização manual.

Exceções que exigem nova build: um novo host em `links.web` e o suporte a recursos que o app ainda não
implementa (ex.: criar a seção "Em breve" em um app que não a tem).

## Cadastrar um app

Adicione o item a `apps[]`. Todos os campos são obrigatórios, exceto `regions`.

```json
{
  "id": "meu-app",
  "name": "Meu App",
  "packageName": null,
  "category": { "pt-BR": "...", "en": "...", "es": "..." },
  "description": { "pt-BR": "...", "en": "...", "es": "..." },
  "iconUrl": null,
  "platforms": ["android"],
  "links": { "android": null, "ios": null, "web": null },
  "websiteUrl": null,
  "status": "coming_soon",
  "published": false,
  "featured": false,
  "order": 60
}
```

- `id`: minúsculas, números e hífens. **Nunca mude nem reutilize.**
- `platforms`: `android`, `ios`, `web`, `pwa`.
- `packageName`: só para Android; confira o `applicationId` do projeto.
- Cadastre apenas apps já aprovados para divulgação. O teste "cinco apps" em
  `scripts/validate.test.mjs` lista IDs e status: atualize-o ao adicionar app ou mudar status.

## De "Em breve" para publicado

1. Confirme que a ficha oficial abre e que o publicador é Danillo Santos.
2. Preencha o link:
   - Play Store: `links.android` = `https://play.google.com/store/apps/details?id=<packageName>`
   - App Store: `links.ios` = `https://apps.apple.com/...`
   - Web/PWA: `links.web`, apenas em hosts permitidos (hoje `danilloasantos.github.io`)
3. Mude **os dois**: `"status": "published"` e `"published": true`.
4. Ajuste o teste dos cinco apps e a lista no teste de compatibilidade.

Para um novo host web, atualize `scripts/validate.mjs`, `index.html` e `INTEGRATION.md`
(apps já distribuídos só o aceitam após nova build).

`websiteUrl` é uma página informativa opcional de app publicado. Em "Em breve", links e `websiteUrl`
ficam `null`: não divulgue piloto, ambiente de desenvolvimento, link provisório nem data de lançamento.

## Descrições, ícones e ordem

- Textos: sempre em `pt-BR`, `en` e `es`. Descreva só o que existe ou está especificado.
- Ícone oficial: salve uma cópia em `assets/apps/<id>.png` (PNG, JPG ou WebP; até 512×512 e 512 KB;
  preserve proporção e transparência; não altere o original). Defina `"iconUrl": "assets/apps/<id>.png"`.
  Não use ícones padrão de framework. Sem ícone, use `null` (aparece a inicial).
- Ao trocar uma imagem, incremente a versão: `?v=2`, `?v=3`...
- Avatar: `assets/developer/avatar.png`, com as mesmas regras de versão.
- Ordem: `order` crescente dentro de cada seção; `featured: true` vem primeiro.

## Ocultar

`"status": "hidden"` e `"published": false`. Para reexibir, volte ao estado anterior.
O arquivo é público: ocultar **não** é sigilo, e o histórico do Git permanece.

## Validar e publicar

1. Atualize `updatedAt` (UTC, `AAAA-MM-DDTHH:MM:SSZ`).
2. Rode:
   ```sh
   node scripts/validate.mjs
   node --test scripts/validate.test.mjs
   ```
3. `git add -A`, `git commit -m "catálogo: ..."`, `git push` (na `main`).
4. Acompanhe o Actions com `gh run watch`. Se a validação falhar, o site anterior continua no ar.
5. Confira com `node scripts/verify-endpoint.mjs` (JSON, imagens e links publicados) e abra o portal.
