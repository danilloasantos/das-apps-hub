# DAS Apps Hub

Catálogo público do desenvolvedor e dos aplicativos DAS Apps. `apps.json` é a **única fonte oficial**.
Alterar o conteúdo não exige nova build dos apps.

- Endpoint: https://danilloasantos.github.io/das-apps-hub/apps.json
- Portal: https://danilloasantos.github.io/das-apps-hub/
- Integração dos apps: [INTEGRATION.md](INTEGRATION.md)

> Este repositório é público. Nunca inclua credenciais, tokens ou dados privados.

## Publicar alterações

1. Edite `apps.json` e atualize `updatedAt` (UTC, `AAAA-MM-DDTHH:MM:SSZ`).
2. Valide (Node 22+, sem `npm install`):
   ```sh
   node scripts/validate.mjs
   node --test scripts/validate.test.mjs
   ```
3. `git add -A`, `git commit -m "catálogo: ..."`, `git push`.
4. O GitHub Actions valida de novo e só então publica no Pages. Acompanhe com `gh run watch`.
5. Confira (o cache do Pages pode levar cerca de 10 min):
   ```sh
   node scripts/verify-endpoint.mjs
   ```

Nos apps, a mudança aparece quando o cache de 24 h expira ou na atualização manual.

## Tarefas

| Tarefa | Como fazer |
| --- | --- |
| Cadastrar app | Copie o modelo abaixo para `apps[]`. |
| Atualizar informações | Edite os campos do app. **Nunca mude o `id`.** |
| Alterar avatar | Salve em `assets/developer/avatar.png` (quadrado, 512×512, até 512 KB) e defina `"avatarUrl": "assets/developer/avatar.png"`. Nas trocas seguintes, incremente: `...avatar.png?v=2`. |
| Alterar logotipo | Salve em `assets/apps/<id>.png` e aponte `iconUrl`. Nas trocas, use `?v=2`, `?v=3`... |
| Destacar | `"featured": true`. |
| Ordenar | `order` crescente; destaques vêm primeiro. |
| Ocultar | `"published": false`. Não apague a entrada. |
| Limitar região | `"regions": {"include": ["BR"]}` **ou** `{"exclude": ["US"]}`. |

Ocultar não é sigilo: o `apps.json` é público, inclusive apps não publicados e o histórico do Git.

## Modelo de app

Todos os campos são obrigatórios, exceto `regions`. Use `null` quando não houver valor.

```json
{
  "id": "meu-app",
  "name": "Meu App",
  "packageName": null,
  "description": { "pt-BR": "...", "en": "...", "es": "..." },
  "iconUrl": null,
  "links": { "android": null, "ios": null, "web": null },
  "published": false,
  "featured": false,
  "order": 30
}
```

Para publicar (`published: true`), informe ao menos um link oficial já funcionando:

- Android: `https://play.google.com/store/apps/details?id=<packageName>`
- iOS: `https://apps.apple.com/...`
- Web: apenas hosts permitidos (hoje `danilloasantos.github.io`).

Antes de publicar, confirme na loja que a ficha é da conta oficial. Existem apps de terceiros com os mesmos nomes.

Um novo host web precisa ser incluído em `scripts/validate.mjs`, `index.html` e `INTEGRATION.md`;
apps já distribuídos só o aceitarão após uma nova build.

## Hospedagem

GitHub Pages via Actions. Os [limites](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
incluem site de até 1 GB e banda de 100 GB/mês (limite flexível). O Pages não pode servir como hospedagem
de negócio online, e-commerce ou SaaS; este projeto é só portfólio e catálogo estático.

Os caminhos de imagem são relativos, então os arquivos podem ir para qualquer hospedagem estática HTTPS
com CORS liberado. Porém, a URL do endpoint fica gravada nos apps. Antes de distribuir muitos apps,
considere um domínio próprio; ao migrar, mantenha o endereço antigo respondendo enquanto houver versões antigas.

## Teste local

`python -m http.server 8000` e abra http://localhost:8000 (`file://` não funciona).
