// node --test scripts/validate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validate } from './validate.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const real = JSON.parse(readFileSync(new URL('../apps.json', import.meta.url), 'utf8'));

const rejects = (name, mutate, expected) => test(name, () => {
  const copy = structuredClone(real);
  mutate(copy, copy.apps[0]);
  const errors = validate(copy, root);
  assert.ok(errors.some((e) => expected.test(e)), errors.join('\n') || 'nenhum erro');
});

const publish = (a, url) => Object.assign(a, {
  status: 'published', published: true, packageName: 'com.example.app', platforms: ['android'],
  links: { android: url, ios: null, web: null }, websiteUrl: null,
});
const soon = (c) => c.apps.find((a) => a.id === 'dascore');

test('catálogo real é válido', () => assert.deepEqual(validate(real, root), []));

test('app publicado com link correto é válido', () => {
  const copy = structuredClone(real);
  publish(copy.apps[0], 'https://play.google.com/store/apps/details?id=com.example.app');
  assert.deepEqual(validate(copy, root), []);
});

rejects('ID duplicado', (c) => { c.apps[1].id = c.apps[0].id; }, /ID duplicado/);
rejects('campo obrigatório', (c, a) => { delete a.name; }, /name: campo obrigatório/);
rejects('tradução ausente', (c, a) => { delete a.description.es; }, /description\.es/);
rejects('bio vazia', (c) => { c.developer.bio.en = ' '; }, /bio\.en: tradução vazia/);
rejects('campo desconhecido', (c, a) => { a.featurd = true; }, /desconhecido/);
rejects('publicado sem link', (c, a) => { a.links.android = null; }, /ao menos um link/);
rejects('http', (c, a) => publish(a, 'http://play.google.com/store/apps/details?id=com.example.app'), /https/);
rejects('destino não permitido', (c, a) => publish(a, 'https://play.google.com.evil.test/x'), /não permitido/);
rejects('pacote divergente', (c, a) => publish(a, 'https://play.google.com/store/apps/details?id=com.other.app'), /packageName/);
rejects('credencial na URL', (c) => { c.developer.websiteUrl = 'https://example.com/?token=abc'; }, /credencial/);
rejects('imagem inexistente', (c, a) => { a.iconUrl = 'assets/apps/nao-existe.png'; }, /não encontrado/);
rejects('path traversal', (c, a) => { a.iconUrl = 'assets/apps/../../x.png'; }, /caminho relativo/);
rejects('região inválida', (c, a) => { a.regions = { include: ['Brasil'] }; }, /ISO 3166/);
rejects('status desconhecido', (c, a) => { a.status = 'beta'; }, /status: use/);
rejects('published divergente do status', (c) => { soon(c).published = true; }, /somente quando status/);
rejects('em breve com link de instalação', (c) => { soon(c).links.android = 'https://play.google.com/store/apps/details?id=com.danilloasantos.dascore'; }, /em breve/);
rejects('em breve com site', (c) => { soon(c).websiteUrl = 'https://example.com/'; }, /em breve/);
rejects('categoria sem tradução', (c, a) => { delete a.category.en; }, /category\.en/);
rejects('plataforma inválida', (c, a) => { a.platforms = ['symbian']; }, /platforms/);
rejects('link fora das plataformas', (c, a) => { a.platforms = ['web']; }, /não está em platforms/);

test('app pode ser ocultado', () => {
  const copy = structuredClone(real);
  Object.assign(copy.apps[0], { status: 'hidden', published: false });
  assert.deepEqual(validate(copy, root), []);
});

test('catálogo contém exatamente os cinco apps, na ordem e com os status esperados', () => {
  assert.deepEqual([...real.apps].sort((a, b) => a.order - b.order).map((a) => `${a.id}:${a.status}`),
    ['odomo:published', 'puller:published', 'dascore:coming_soon', 'dasoma:coming_soon', 'dasmoto:coming_soon']);
});

test('compatibilidade: consumidor v1 antigo mantém os campos e só vê publicados', () => {
  assert.equal(real.schemaVersion, 1);
  for (const a of real.apps) {
    for (const k of ['id', 'name']) assert.equal(typeof a[k], 'string');
    assert.ok(a.packageName === null || typeof a.packageName === 'string');
    assert.ok(a.iconUrl === null || typeof a.iconUrl === 'string');
    for (const k of ['published', 'featured']) assert.equal(typeof a[k], 'boolean');
    assert.ok(Number.isInteger(a.order));
    assert.deepEqual(Object.keys(a.links).sort(), ['android', 'ios', 'web']);
  }
  assert.deepEqual(real.apps.filter((a) => a.published === true).map((a) => a.id), ['odomo', 'puller']);
});
