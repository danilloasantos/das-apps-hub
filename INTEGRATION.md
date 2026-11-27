# Integração dos aplicativos consumidores

## Endpoint

```
GET https://danilloasantos.github.io/das-apps-hub/apps.json
```

Público, HTTPS, CORS liberado. **Sem token, chave, login ou cookies.** Não envie dados pessoais,
IDs de usuário ou de dispositivo, nem em cabeçalhos ou query string. Como em qualquer requisição HTTP,
o provedor recebe o IP e dados técnicos de conexão.

## Schema (v1)

Esta descrição é o contrato para **leitura**. O validador do repositório é mais rígido (rejeita campos extras).

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["schemaVersion", "updatedAt", "developer", "apps"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "updatedAt": { "type": "string", "format": "date-time" },
    "developer": {
      "type": "object",
      "required": ["displayName", "brand", "avatarUrl", "bio", "websiteUrl"],
      "properties": {
        "displayName": { "type": "string" },
        "brand": { "type": "string" },
        "avatarUrl": { "type": ["string", "null"] },
        "bio": { "$ref": "#/$defs/i18n" },
        "websiteUrl": { "type": ["string", "null"] }
      }
    },
    "apps": { "type": "array", "items": { "$ref": "#/$defs/app" } }
  },
  "$defs": {
    "i18n": {
      "type": "object",
      "required": ["pt-BR", "en", "es"],
      "properties": { "pt-BR": { "type": "string" }, "en": { "type": "string" }, "es": { "type": "string" } }
    },
    "app": {
      "type": "object",
      "required": ["id", "name", "packageName", "description", "iconUrl", "links", "published", "featured", "order"],
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" },
        "name": { "type": "string" },
        "packageName": { "type": ["string", "null"] },
        "description": { "$ref": "#/$defs/i18n" },
        "iconUrl": { "type": ["string", "null"] },
        "links": {
          "type": "object",
          "properties": {
            "android": { "type": ["string", "null"] },
            "ios": { "type": ["string", "null"] },
            "web": { "type": ["string", "null"] }
          }
        },
        "published": { "type": "boolean" },
        "status": { "type": "string", "examples": ["published", "coming_soon", "hidden"] },
        "category": { "$ref": "#/$defs/i18n" },
        "platforms": { "type": "array", "items": { "type": "string", "examples": ["android", "ios", "web", "pwa"] } },
        "websiteUrl": { "type": ["string", "null"] },
        "featured": { "type": "boolean" },
        "order": { "type": "integer" },
        "regions": {
          "type": "object",
          "properties": {
            "include": { "type": "array", "items": { "type": "string" } },
            "exclude": { "type": "array", "items": { "type": "string" } }
          }
        }
      }
    }
  }
}
```

`status`, `category`, `platforms` e `websiteUrl` do app são adições opcionais da v1 (fora de `required`).
`category` é texto traduzido, como a descrição.

## Estados

| `status` | `published` | Como tratar |
| --- | --- | --- |
| `published` | `true` | Disponível. Pode ter botão de instalação. |
| `coming_soon` | `false` | "Em breve": **sem** botão, link ou data. Exibir é opcional. |
| `hidden` | `false` | Não exibir. |

`published` continua sendo o campo de compatibilidade: apps que só o conhecem veem apenas os publicados.
Se `status` estiver ausente, use só `published`. Valor desconhecido ou combinação divergente: não exiba.

## Carregamento e cache

1. A consulta é assíncrona e **nunca bloqueia a inicialização**. Faça-a quando a tela "Mais apps / Sobre" precisar.
2. Mostre imediatamente o último catálogo válido salvo, se existir.
3. Cache de **24 h**, contado do último download bem-sucedido (não de `updatedAt`).
4. **Atualização manual** ignora as 24 h.
5. **Timeout** total de 8 s. Sem retentativas em laço.
6. Aceite somente HTTP 200 sem redirecionamento para outra origem, com corpo de até 256 KB.
7. Faça parse e valide **antes** de substituir o cache. Grave de forma atômica.
8. Em erro de rede, timeout, HTTP (incluindo 404 e 429), JSON ou schema: mantenha o último catálogo válido,
   mesmo vencido. Não apresente erro bloqueante. Na atualização manual, um aviso discreto é suficiente.
9. Sem cache válido: mostre os fallbacks e oculte a lista de apps.

O servidor ou CDN pode atrasar uma publicação em cerca de 10 min.

## Fallbacks e idioma

| Dado | Fallback |
| --- | --- |
| Avatar nulo, inválido ou com falha | Monograma **DS** desenhado pelo app |
| Nome ausente | **Danillo Santos** |
| Marca ausente | DAS Apps |
| Ícone nulo ou com falha | Inicial do nome do app |

Use o idioma **do aplicativo**: `pt*` → `pt-BR`, `es*` → `es`, demais → `en`.
Se o texto faltar: `en`, depois `pt-BR`; se não houver nenhum, oculte o texto.

## Filtragem e ordem

Na ordem:

1. Disponíveis: somente `published === true` (booleano) e `status` ausente ou `"published"`.
   Uma seção "Em breve" opcional usa `published === false` e `status === "coming_soon"`.
2. **Excluir o próprio app:** compare `id` com uma constante interna (ex.: `"odomo"`) **ou**, se não nulo,
   `packageName` com o pacote em execução. Use os dois, pois `packageName` pode ser `null`.
3. Região: use o país das configurações do aparelho (ISO 3166-1 alfa-2), **sem pedir localização** e sem
   enviá-lo. `include`: mostre só se o país estiver na lista (desconhecido: oculte).
   `exclude`: oculte se estiver na lista (desconhecido: mostre).
4. Nos disponíveis, mantenha apps com link válido para a plataforma atual: `links.android` no Android,
   `links.ios` no iOS, `links.web` na Web. Fora da Web, não troque o link da loja por outro sem decisão
   explícita do app. `websiteUrl` é página informativa, **não** link de instalação. "Em breve" não exige link;
   ignore qualquer link que venha nesses itens.
5. Ordene por `featured` (true primeiro), `order` crescente e `name`.

Lista vazia é um resultado válido: oculte a seção. Item inválido é descartado sozinho, sem rejeitar o catálogo.

## Segurança das URLs

Trate o catálogo como entrada não confiável. A lista de destinos fica **fixa no app**:

| Campo | Permitido |
| --- | --- |
| `links.android` | `https://play.google.com/store/apps/details?id=...` |
| `links.ios` | `https://apps.apple.com/...` |
| `links.web` | `https://danilloasantos.github.io/...` |
| `developer.websiteUrl` e `apps[].websiteUrl` | HTTPS; abrir apenas no navegador externo |

Exija esquema `https` e host **exato** (nada de `contains` ou `endsWith`), sem usuário, senha ou porta.
Abra links no navegador ou na loja, nunca em WebView com ponte nativa. Mostre os textos como texto puro.

## Imagens

`avatarUrl` e `iconUrl` são relativos à URL do catálogo, no formato
`assets/(developer|apps)/arquivo.(png|jpg|jpeg|webp)`, com `?v=N` opcional.

- Rejeite URL absoluta, caminho iniciado por `/` e qualquer `..`.
- Resolva contra a URL do catálogo (`new URL(path, ENDPOINT)` ou `Uri.resolve`), sem concatenar com host fixo.
- O resultado deve estar na mesma origem e dentro do diretório do catálogo.
- Use a URL completa, com `?v=N`, como chave de cache. Carregue imagens de forma assíncrona.

## Compatibilidade

- Dentro da v1, mudanças são só **aditivas e opcionais**. Ignore campos desconhecidos, inclusive novas chaves em `links`.
- Campos não são removidos, renomeados nem mudam de tipo ou significado. IDs não mudam nem são reutilizados.
- Mudança incompatível vai para um novo arquivo (ex.: `apps.v2.json`) com `schemaVersion: 2`;
  `apps.json` permanece na v1 para versões antigas dos apps.
- Se receber `schemaVersion` não suportado, mantenha o último catálogo válido.
