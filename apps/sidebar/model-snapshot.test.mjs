import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile, rm, symlink, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readContextRoute, saveContextRoute } from './context-route.mjs';
import { readSources, saveSources } from './sources.mjs';
import { readModelOverview, saveModelOverview } from './model-snapshot.mjs';
import { ownerModel, mixedModel, modelTarget } from './model-fixtures.mjs';

const bridge = await readFile(new URL('../../skills/osm-context/assets/bridge.md', import.meta.url), 'utf8');
const args = { target: modelTarget, title: 'AI Operating Model', revision: '2026-10-19T09:00:00.000Z', content: ownerModel };
async function home(t) {
  const codexHome = await mkdtemp(join(tmpdir(), 'aios-overview-test-')); t.after(() => rm(codexHome, { recursive: true, force: true }));
  return { codexHome };
}
const file = options => join(options.codexHome, 'aios/overview/model.json');

test('a refresh stores only the derived overview and never writes the pointer or saved shortcuts', async t => {
  const options = await home(t);
  assert.equal((await readModelOverview(options)).state, 'missing');
  const saved = await saveModelOverview(args, options);
  assert.equal(saved.state, 'ready'); assert.equal(saved.groups.length, 2);
  assert.equal(saved.revision, args.revision); assert.equal(saved.changes, null);
  assert.deepEqual(await readModelOverview(options), saved);
  const text = await readFile(file(options), 'utf8');
  for (const phrase of ['Never copy live task status', 'privacy policy', 'pricing', 'Read this model once']) assert.ok(!text.includes(phrase), `model text "${phrase}" is not kept`);
  await assert.rejects(access(join(options.codexHome, 'AGENTS.md')), 'reviewing an overview does not write host instructions');
  await assert.rejects(access(join(options.codexHome, 'aios/panel')));
});

test('route edits appear on the next refresh with visible additions and removals', async t => {
  const options = await home(t);
  await saveModelOverview(args, options);
  const edited = ownerModel.replace(/\t- \[Skills\]\([^)]*\)\n/, '').replace('## Work and outputs\n', '## Work and outputs\n- [Calendar](https://example.com/calendar)\n- [Notes](https://example.com/notes)\n');
  const next = await saveModelOverview({ ...args, content: edited, revision: 'later' }, options);
  assert.deepEqual(next.changes, { added: 2, removed: 1 });
  assert.ok(next.groups[1].links.some(link => link.title === 'Calendar'));
  assert.ok(!next.groups[0].links.some(link => link.title === 'Skills'));
});

test('a one-time section choice carries to later refreshes of the same model; an empty choice clears it', async t => {
  const options = await home(t);
  const target = 'https://app.notion.com/p/00000000000000000000000000000040';
  assert.equal((await saveModelOverview({ ...args, target, content: mixedModel }, options)).state, 'ambiguous');
  const chosen = await saveModelOverview({ ...args, target, content: mixedModel, sections: ['Sources'] }, options);
  assert.deepEqual(chosen.selection, ['Sources']); assert.equal(chosen.state, 'ready');
  const again = await saveModelOverview({ ...args, target, content: mixedModel }, options);
  assert.deepEqual(again.selection, ['Sources']); assert.equal(again.groups[0].links[0].title, 'Docs');
  const removed = await saveModelOverview({ ...args, target, content: mixedModel.replace('## Sources', '## Renamed') }, options);
  assert.equal(removed.state, 'changed'); assert.deepEqual(removed.missing, ['Sources']);
  assert.equal((await saveModelOverview({ ...args, target, content: mixedModel, sections: [] }, options)).state, 'ambiguous');
  const other = await saveModelOverview(args, options);
  assert.equal(other.selection, null, 'another model never inherits a section choice');
});

test('a failed read replaces earlier links instead of presenting them as current', async t => {
  const options = await home(t);
  await saveModelOverview(args, options);
  for (const outcome of ['no_access', 'not_found', 'disconnected']) {
    const failed = await saveModelOverview({ ...args, outcome, content: '' }, options);
    assert.equal(failed.state, outcome); assert.deepEqual(failed.groups, []); assert.equal(failed.changes, null);
    assert.ok(!(await readFile(file(options), 'utf8')).includes('app.notion.com/p/00000000000000000000000000000011'));
  }
  const restored = await saveModelOverview(args, options);
  assert.equal(restored.changes, null, 'no comparison against a failed read');
});

test('invalid requests write nothing', async t => {
  const options = await home(t);
  for (const bad of [{ target: 'https://example.com/model' }, { target: '/work/model' }, { content: '' }, { content: 'x'.repeat(256 * 1024 + 1) },
    { outcome: 'live' }, { title: '' }, { revision: 'r'.repeat(101) }, { sections: Array.from({ length: 13 }, (_, i) => 'S' + i) }, { sections: ['A', 'A'] }]) {
    await assert.rejects(saveModelOverview({ ...args, ...bad }, options));
  }
  assert.equal((await readModelOverview(options)).state, 'missing');
});

test('corrupt or symlinked state fails closed; concurrent refreshes keep one consistent result', async t => {
  const options = await home(t);
  const results = await Promise.allSettled([saveModelOverview(args, options), saveModelOverview({ ...args, revision: 'other' }, options)]);
  assert.ok(results.some(result => result.status === 'fulfilled'));
  assert.ok((await readModelOverview(options)).groups.length);
  assert.deepEqual((await readdir(join(options.codexHome, 'aios/overview'))).filter(name => name !== 'model.json'), [], 'no lock or temporary file is left');
  await writeFile(file(options), 'invalid json');
  assert.equal((await readModelOverview(options)).state, 'unavailable');
  await assert.rejects(saveModelOverview(args, options), /needs attention/);
  assert.equal(await readFile(file(options), 'utf8'), 'invalid json');
  await rm(join(options.codexHome, 'aios/overview'), { recursive: true }); await symlink(options.codexHome, join(options.codexHome, 'aios/overview'));
  assert.equal((await readModelOverview(options)).state, 'unavailable');
  await assert.rejects(saveModelOverview(args, options));
});

test('an over-bound or malformed stored snapshot reads as unavailable and is never rewritten', async t => {
  const options = await home(t);
  const valid = await saveModelOverview(args, options);
  const page = n => `https://app.notion.com/p/${String(n).padStart(32, '0')}`;
  const groupsOf = (count, size) => Array.from({ length: count }, (_, g) => ({ title: `G${g}`,
    links: Array.from({ length: size }, (_, i) => ({ title: `P${g}-${i}`, target: page(1000 + g * 100 + i) })) }));
  for (const [name, groups] of [['aggregate overflow', groupsOf(4, 20)], ['too many groups', groupsOf(13, 1)], ['too many links in a group', groupsOf(1, 21)],
    ['malformed trailing group', [...groupsOf(12, 1), { title: 'G', links: [{ title: '', target: 'javascript:void' }] }]]]) {
    const text = JSON.stringify({ ...valid, groups }, null, 2) + '\n';
    await writeFile(file(options), text);
    assert.equal((await readModelOverview(options)).state, 'unavailable', name);
    await assert.rejects(saveModelOverview(args, options), /needs attention/, name);
    assert.equal(await readFile(file(options), 'utf8'), text, `${name}: the file is neither repaired nor replaced`);
    assert.deepEqual((await readdir(join(options.codexHome, 'aios/overview'))).sort(), ['model.json'], `${name}: no lock or temporary file is left`);
  }
  await writeFile(file(options), JSON.stringify({ ...valid, groups: groupsOf(3, 20) }));
  const upper = await readModelOverview(options);
  assert.equal(upper.groups.flatMap(group => group.links).length, 60, 'the legal upper bound still reads');
  assert.equal((await saveModelOverview(args, options)).state, 'ready', 'a valid stored snapshot can still be refreshed');
});

test('a stored snapshot with a non-string target or read time is refused, not coerced or overwritten', async t => {
  const options = await home(t);
  const valid = await saveModelOverview(args, options);
  const docs = 'https://app.notion.com/p/00000000000000000000000000000077';
  for (const [name, snapshot] of [
    ['a link target in a one-element array', { ...valid, groups: [{ title: 'G', links: [{ title: 'Docs', target: [docs] }] }] }],
    ['a model target in a one-element array', { ...valid, model: { ...valid.model, target: [valid.model.target] } }],
    ['a read time in a one-element array', { ...valid, readAt: [valid.readAt] }],
  ]) {
    const text = JSON.stringify(snapshot, null, 2) + '\n';
    await writeFile(file(options), text);
    assert.equal((await readModelOverview(options)).state, 'unavailable', name);
    await assert.rejects(saveModelOverview(args, options), /needs attention/, name);
    assert.equal(await readFile(file(options), 'utf8'), text, `${name}: the file is neither repaired nor replaced`);
    assert.deepEqual((await readdir(join(options.codexHome, 'aios/overview'))).sort(), ['model.json'], `${name}: no lock or temporary file is left`);
  }
  await writeFile(file(options), JSON.stringify({ ...valid, groups: [{ title: 'G', links: [{ title: 'Docs', target: docs }] }] }));
  assert.equal((await readModelOverview(options)).groups[0].links[0].target, docs, 'an ordinary string target still reads');
  assert.equal((await saveModelOverview(args, options)).state, 'ready', 'and can still be refreshed');
});

test('existing pointers, saved shortcuts and file contexts are untouched by overview refreshes', async t => {
  const options = await home(t), withBridge = { ...options, bridge };
  const context = await saveContextRoute({ target: '/work/context', expectedRevision: (await readContextRoute(options)).revision }, withBridge);
  const links = { docs: { title: 'Documents', target: 'https://example.com/docs' } };
  const sources = await saveSources({ target: '/work/context', expectedContextRevision: context.revision, expectedRevision: (await readSources('/work/context', options)).revision, title: 'Studio', links }, options);
  const before = await readFile(join(options.codexHome, 'AGENTS.md'));
  await saveModelOverview(args, options);
  assert.deepEqual(await readFile(join(options.codexHome, 'AGENTS.md')), before);
  assert.deepEqual(await readSources('/work/context', options), sources);
  assert.equal((await readContextRoute(options)).target, '/work/context');
});
