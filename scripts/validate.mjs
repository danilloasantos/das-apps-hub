// Validação do catálogo. Uso: node scripts/validate.mjs [caminho/apps.json]
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const LANGS = ['pt-BR', 'en', 'es'];
// Destinos permitidos. Ao alterar, atualize também index.html e INTEGRATION.md.
export const HOSTS = {
  android: ['play.google.com'],
  ios: ['apps.apple.com'],
  web: ['danilloasantos.github.io'],
};
export const STATUSES = ['published', 'coming_soon', 'hidden'];
export const PLATFORMS = ['android', 'ios', 'web', 'pwa'];
const MAX_IMAGE = 512 * 1024;
const MAX_CATALOG = 256 * 1024;
const IMAGE_PATH = /^assets\/(developer|apps)\/[a-z0-9][a-z0-9._-]*\.(png|jpg|jpeg|webp)(\?v=\d+)?$/;

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.trim().length > 0;

export function validate(catalog, root) {
  const errors = [];
  const fail = (at, msg) => errors.push(`${at}: ${msg}`);

  // Todos os campos são obrigatórios (podem ser null quando indicado); desconhecidos são erro.
  const shape = (obj, at, required, optional = []) => {
    if (!isObject(obj)) { fail(at, 'deve ser um objeto'); return false; }
    for (const k of required) if (!(k in obj)) fail(`${at}.${k}`, 'campo obrigatório ausente');
    for (const k of Object.keys(obj))
      if (!required.includes(k) && !optional.includes(k)) fail(`${at}.${k}`, 'campo desconhecido');
    return true;
  };

  const translations = (v, at) => {
    if (!shape(v, at, LANGS)) return;
    for (const l of LANGS) if (!isText(v[l])) fail(`${at}.${l}`, 'tradução vazia');
  };

  const httpsUrl = (v, at, hosts) => {
    let u;
    try { u = new URL(v); } catch { fail(at, 'URL inválida'); return null; }
    if (typeof v !== 'string' || !v.startsWith('https://')) fail(at, 'deve usar https://');
    if (u.username || u.password || u.port) fail(at, 'não pode ter usuário, senha ou porta');
    if (hosts && !hosts.includes(u.hostname)) fail(at, `destino não permitido: ${u.hostname}`);
    if ([...u.searchParams.keys()].some((k) => /token|key|secret|password|auth|sig/i.test(k)))
      fail(at, 'parâmetro com aparência de credencial');
    return u;
  };

  const image = (v, at) => {
    if (v === null) return;
    if (typeof v !== 'string' || !IMAGE_PATH.test(v))
      return fail(at, 'use caminho relativo como assets/apps/nome.png (opcional ?v=2)');
    const file = join(root, v.split('?')[0]);
    if (!existsSync(file)) return fail(at, `arquivo não encontrado: ${v}`);
    if (statSync(file).size > MAX_IMAGE) fail(at, 'imagem maior que 512 KB');
    const b = readFileSync(file);
    const type = b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' ? 'png'
      : b.subarray(0, 3).toString('hex') === 'ffd8ff' ? 'jpg'
      : b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP' ? 'webp' : null;
    const ext = v.split('?')[0].split('.').pop().replace('jpeg', 'jpg');
    if (type !== ext) fail(at, 'conteúdo não corresponde à extensão');
  };

  if (!shape(catalog, '$', ['schemaVersion', 'updatedAt', 'developer', 'apps'])) return errors;
  if (catalog.schemaVersion !== 1) fail('schemaVersion', 'deve ser 1');
  const when = Date.parse(catalog.updatedAt);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(catalog.updatedAt) || Number.isNaN(when))
    fail('updatedAt', 'use o formato AAAA-MM-DDTHH:MM:SSZ');
  else if (when > Date.now() + 36 * 3600e3) fail('updatedAt', 'data no futuro');

  const dev = catalog.developer;
  if (shape(dev, 'developer', ['displayName', 'brand', 'avatarUrl', 'bio', 'websiteUrl'])) {
    if (!isText(dev.displayName)) fail('developer.displayName', 'obrigatório');
    if (!isText(dev.brand)) fail('developer.brand', 'obrigatório');
    image(dev.avatarUrl, 'developer.avatarUrl');
    translations(dev.bio, 'developer.bio');
    if (dev.websiteUrl !== null) httpsUrl(dev.websiteUrl, 'developer.websiteUrl');
  }

  if (!Array.isArray(catalog.apps)) { fail('apps', 'deve ser uma lista'); return errors; }
  const ids = new Set();
  const packages = new Set();
  catalog.apps.forEach((app, i) => {
    const at = `apps[${i}]`;
    if (!shape(app, at, ['id', 'name', 'packageName', 'category', 'description', 'iconUrl', 'platforms',
      'links', 'websiteUrl', 'status', 'published', 'featured', 'order'], ['regions'])) return;

    if (typeof app.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(app.id))
      fail(`${at}.id`, 'use minúsculas, números e hífens');
    if (ids.has(app.id)) fail(`${at}.id`, `ID duplicado: ${app.id}`);
    ids.add(app.id);

    if (!isText(app.name)) fail(`${at}.name`, 'obrigatório');
    if (app.packageName !== null) {
      if (typeof app.packageName !== 'string' || !/^[A-Za-z]\w*(\.[A-Za-z]\w*)+$/.test(app.packageName))
        fail(`${at}.packageName`, 'formato inválido');
      if (packages.has(app.packageName)) fail(`${at}.packageName`, 'packageName duplicado');
      packages.add(app.packageName);
    }

    translations(app.category, `${at}.category`);
    translations(app.description, `${at}.description`);
    if (app.websiteUrl !== null) httpsUrl(app.websiteUrl, `${at}.websiteUrl`);

    const platforms = Array.isArray(app.platforms) ? app.platforms : [];
    if (!platforms.length || new Set(platforms).size !== platforms.length ||
      !platforms.every((p) => PLATFORMS.includes(p)))
      fail(`${at}.platforms`, `lista sem repetição com: ${PLATFORMS.join(', ')}`);
    if (app.packageName !== null && !platforms.includes('android'))
      fail(`${at}.packageName`, 'só se aplica a apps com plataforma android');

    // published é mantido para consumidores antigos e precisa concordar com status.
    if (!STATUSES.includes(app.status)) fail(`${at}.status`, `use: ${STATUSES.join(', ')}`);
    if (app.published !== (app.status === 'published'))
      fail(`${at}.published`, 'deve ser true somente quando status é "published"');
    image(app.iconUrl, `${at}.iconUrl`);
    for (const k of ['published', 'featured'])
      if (typeof app[k] !== 'boolean') fail(`${at}.${k}`, 'deve ser true ou false');
    if (!Number.isInteger(app.order)) fail(`${at}.order`, 'deve ser um inteiro');

    if (shape(app.links, `${at}.links`, Object.keys(HOSTS))) {
      for (const [k, hosts] of Object.entries(HOSTS)) {
        const v = app.links[k];
        if (v === null || v === undefined) continue;
        if (!platforms.includes(k)) fail(`${at}.links.${k}`, `plataforma ${k} não está em platforms`);
        const u = httpsUrl(v, `${at}.links.${k}`, hosts);
        if (u && k === 'android' && (u.pathname !== '/store/apps/details' ||
          !app.packageName || u.searchParams.get('id') !== app.packageName))
          fail(`${at}.links.android`, 'deve ser /store/apps/details?id=<packageName>');
      }
      if (app.published === true && !Object.values(app.links).some(Boolean))
        fail(`${at}.links`, 'app publicado precisa de ao menos um link');
      // Evita divulgar link de instalação, piloto ou ambiente de desenvolvimento.
      if (app.status === 'coming_soon' && (Object.values(app.links).some((l) => l !== null) || app.websiteUrl !== null))
        fail(`${at}`, 'app "em breve" deve ter links e websiteUrl null');
    }

    if ('regions' in app && shape(app.regions, `${at}.regions`, [], ['include', 'exclude'])) {
      const keys = Object.keys(app.regions);
      if (keys.length !== 1) fail(`${at}.regions`, 'informe apenas include ou exclude');
      for (const k of keys) {
        const list = app.regions[k];
        if (!Array.isArray(list) || !list.length || !list.every((c) => /^[A-Z]{2}$/.test(c)))
          fail(`${at}.regions.${k}`, 'lista de códigos ISO 3166-1 alfa-2, ex.: ["BR"]');
      }
    }
  });

  return errors;
}

export function validateFile(path) {
  const raw = readFileSync(path, 'utf8');
  if (Buffer.byteLength(raw) > MAX_CATALOG) return ['$: catálogo maior que 256 KB'];
  let data;
  try { data = JSON.parse(raw); } catch (e) { return [`$: JSON inválido (${e.message})`]; }
  return validate(data, dirname(resolve(path)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'apps.json');
  const errors = validateFile(path);
  if (errors.length) {
    console.error(`Catálogo inválido (${errors.length}):\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  console.log('Catálogo válido.');
}
