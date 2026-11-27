# DAS Apps Hub

Catálogo público do desenvolvedor e dos aplicativos DAS Apps. `apps.json` é a **única fonte oficial**.
Alterar o conteúdo não exige nova build dos apps.

- Endpoint: https://danilloasantos.github.io/das-apps-hub/apps.json
- Portal: https://danilloasantos.github.io/das-apps-hub/
- Integração dos apps: [INTEGRATION.md](INTEGRATION.md)

> Este repositório é público. Nunca inclua credenciais, tokens ou dados privados.

## Cadastrar e atualizar apps

Veja [docs/PUBLISH_APP.md](docs/PUBLISH_APP.md): cadastro, "Em breve" → publicado, links, textos, ícones,
avatar, ordem, ocultação e publicação.

## Hospedagem

GitHub Pages via Actions. Os [limites](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
incluem site de até 1 GB e banda de 100 GB/mês (limite flexível). O Pages não pode servir como hospedagem
de negócio online, e-commerce ou SaaS; este projeto é só portfólio e catálogo estático.

Os caminhos de imagem são relativos, então os arquivos podem ir para qualquer hospedagem estática HTTPS
com CORS liberado. Porém, a URL do endpoint fica gravada nos apps. Antes de distribuir muitos apps,
considere um domínio próprio; ao migrar, mantenha o endereço antigo respondendo enquanto houver versões antigas.

## Teste local

`python -m http.server 8000` e abra http://localhost:8000 (`file://` não funciona).
