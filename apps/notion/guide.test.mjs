import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicGuideReader, validPublicGuide } from './guide-reader.mjs';
import { linkedPage, notionId, readable } from './guide/readable.mjs';

const root = '40d6d2e17f568124af82ceb93dabf77a';
const other = '40d6d2e17f568113a397fb6ecd9b5fff';
const url = id => 'https://gustavanderson.notion.site/' + id;
const guide = title => ({ format: 'osm-public-guide/1', root, pages: {
  [root]: { id: root, title, body: 'A public method', url: url(root) },
} });
const fallback = guide('Bundled guide');
const reply = value => new Response(JSON.stringify(value));

test('public guide accepts only its fixed public identity, shape and bounded body', () => {
  assert.equal(validPublicGuide(fallback), true);
  for (const value of [null, {}, { ...fallback, root: other },
    { ...fallback, pages: { [root]: null } },
    { ...fallback, pages: { [root]: { ...fallback.pages[root], url: 'https://example.com/private' } } },
    { ...fallback, pages: { [root]: { ...fallback.pages[root], body: 'x'.repeat(512 * 1024) } } }]) {
    assert.equal(validPublicGuide(value), false);
  }
});

test('live read uses the fixed URL, timeout and no redirects, then caches for five minutes', async () => {
  const reader = createPublicGuideReader(fallback);
  const live = guide('Live public guide');
  let calls = 0;
  const fetcher = async (target, options) => {
    calls++;
    assert.equal(target, 'https://raw.githubusercontent.com/onlinesourdough/OSM-plugin/main/docs-publisher/public-guide.json');
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.headers.Accept, 'application/json');
    return reply(live);
  };
  assert.deepEqual(await reader({ fetcher, now: 1000 }), live);
  assert.deepEqual(await reader({ fetcher, now: 300999 }), live);
  assert.equal(calls, 1);
  await reader({ fetcher, now: 301000 });
  assert.equal(calls, 2);
});

test('failed, malformed, foreign and oversized reads return the bundle without another source', async t => {
  const cases = {
    unavailable: async () => { throw new Error('offline'); },
    missing: async () => new Response('', { status: 404 }),
    invalidJSON: async () => new Response('not json'),
    wrongShape: async () => reply({ format: 'different' }),
    foreignPage: async () => reply({ ...fallback, pages: { [root]: { ...fallback.pages[root], url: 'https://example.com/' } } }),
    declaredOversize: async () => new Response('{}', { headers: { 'content-length': String(512 * 1024 + 1) } }),
    streamedOversize: async () => new Response('x'.repeat(512 * 1024 + 1)),
  };
  for (const [name, fetcher] of Object.entries(cases)) await t.test(name, async () => {
    assert.deepEqual(await createPublicGuideReader(fallback)({ fetcher, now: 0 }), fallback);
  });
});

test('failed refresh retains the last verified public guide', async () => {
  const reader = createPublicGuideReader(fallback);
  const live = guide('Verified earlier');
  await reader({ fetcher: async () => reply(live), now: 0 });
  assert.deepEqual(await reader({ fetcher: async () => { throw new Error('offline'); }, now: 300000 }), live);
});

test('mixed self-closing and paired files preserve intervening prose and both downloads', () => {
  const body = '<file source="notion-file-block://one" />\nThe earlier foundation/diagram source packet stays historical.\n<file source="notion-file-block://two">Current diagram</file>';
  const text = readable(body, { url: url(root) });
  assert.match(text, /earlier foundation\/diagram source packet stays historical/);
  assert.equal(text.match(/Supporting download in Notion/g).length, 2);
});

test('same-page media links are copyable, while known other pages navigate internally', () => {
  const pages = { [root]: {}, [other]: {} };
  assert.equal(linkedPage(url(root), pages, root), null);
  assert.equal(linkedPage(url(other), pages, root), other);
  assert.equal(linkedPage('https://example.com/' + other, pages, root), null);
  assert.equal(linkedPage(url('f'.repeat(32)), pages, root), null);
});

test('slugged and hyphenated Notion URLs resolve their final page identity', () => {
  assert.equal(notionId('https://gustavanderson.notion.site/OSM-Onlinesourdough-Method-' + root), root);
  assert.equal(notionId('https://app.notion.com/p/40d6d2e1-7f56-8124-af82-ceb93dabf77a'), root);
  assert.equal(notionId('https://notion.so.evil.example/' + root), null);
});
