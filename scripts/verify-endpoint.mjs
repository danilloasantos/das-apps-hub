// Verifica o catálogo publicado: HTTP 200, JSON, acesso anônimo/CORS, imagens e links oficiais.
// Uso: node scripts/verify-endpoint.mjs [url]
const url = process.argv[2] ?? 'https://danilloasantos.github.io/das-apps-hub/apps.json';
let failed = false;
const check = (ok, label) => { console.log(`${ok ? 'OK   ' : 'FALHA'} ${label}`); failed ||= !ok; };
const get = (u) => fetch(u, { signal: AbortSignal.timeout(10_000), cache: 'no-store' });

try {
  const res = await get(url);
  check(res.status === 200, `HTTP ${res.status} ${url}`);
  check(url.startsWith('https://') && res.url.startsWith('https://'), 'HTTPS');
  check(res.headers.get('access-control-allow-origin') === '*', 'CORS público');
  const catalog = await res.json();
  check(catalog.schemaVersion === 1 && Array.isArray(catalog.apps), `JSON válido (updatedAt ${catalog.updatedAt})`);

  const images = [catalog.developer.avatarUrl, ...catalog.apps.map((a) => a.iconUrl)].filter(Boolean);
  if (!images.length) console.log('--    nenhuma imagem referenciada no catálogo');
  for (const path of images) {
    const img = await get(new URL(path, res.url));
    check(img.status === 200 && (img.headers.get('content-type') ?? '').startsWith('image/'), `HTTP ${img.status} ${path}`);
  }
  for (const app of catalog.apps.filter((a) => a.published === true)) {
    for (const link of [...Object.values(app.links), app.websiteUrl].filter(Boolean)) {
      const r = await get(link);
      check(r.status === 200, `HTTP ${r.status} ${app.id} ${link}`);
    }
  }
} catch (e) {
  check(false, e.message);
}
process.exit(failed ? 1 : 0);
