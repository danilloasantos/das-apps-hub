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
  published: true, packageName: 'com.example.app',
  links: { android: url, ios: null, web: null },
});

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
rejects('publicado sem link', (c, a) => { a.published = true; }, /ao menos um link/);
rejects('http', (c, a) => publish(a, 'http://play.google.com/store/apps/details?id=com.example.app'), /https/);
rejects('destino não permitido', (c, a) => publish(a, 'https://play.google.com.evil.test/x'), /não permitido/);
rejects('pacote divergente', (c, a) => publish(a, 'https://play.google.com/store/apps/details?id=com.other.app'), /packageName/);
rejects('credencial na URL', (c) => { c.developer.websiteUrl = 'https://example.com/?token=abc'; }, /credencial/);
rejects('imagem inexistente', (c, a) => { a.iconUrl = 'assets/apps/nao-existe.png'; }, /não encontrado/);
rejects('path traversal', (c, a) => { a.iconUrl = 'assets/apps/../../x.png'; }, /caminho relativo/);
rejects('região inválida', (c, a) => { a.regions = { include: ['Brasil'] }; }, /ISO 3166/);
