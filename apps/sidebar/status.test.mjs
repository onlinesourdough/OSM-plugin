import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NOTION_ID, notionState, readNotionConnection, resolveCodexCommand } from './codex-status.mjs';
import { parseContextRoute, readContextRoute } from './context-route.mjs';
import { classifyTarget } from './ui-model.mjs';

test('connection availability never implies page access, enablement or missing evidence', () => {
  assert.equal(notionState({ callable: true, enabled: true }), 'connected');
  assert.equal(notionState({ callable: true, enabled: false }), 'disabled');
  assert.equal(notionState({ callable: false, enabled: true }), 'unavailable');
  assert.equal(notionState({ enabled: true }), 'unknown');
  assert.equal(notionState({ callable: true }), 'unknown');
});

test('desktop CLI discovery respects PATH and finds Homebrew without a login shell', async () => {
  const seen = [];
  const executable = async (path) => { seen.push(path); if (path !== '/opt/homebrew/bin/codex') throw new Error('missing'); };
  assert.equal(await resolveCodexCommand({ path: '/usr/bin:/bin', platform: 'darwin', executable }), '/opt/homebrew/bin/codex');
  assert.deepEqual(seen, ['/usr/bin/codex', '/bin/codex', '/opt/homebrew/bin/codex']);
  assert.equal(await resolveCodexCommand({ path: '/custom', platform: 'linux', executable: async () => {} }), '/custom/codex');
  assert.equal(await resolveCodexCommand({ path: '', platform: 'linux', executable }), 'codex');
});

function fixture(replies, initialize = { result: {} }) {
  const requests = [];
  const child = new EventEmitter();
  child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.exitCode = null;
  child.kill = () => { child.exitCode = 0; child.emit('exit', 0); };
  child.stdin.on('data', (chunk) => {
    const request = JSON.parse(String(chunk)); requests.push(request);
    if (request.id) queueMicrotask(() => {
      const response = request.method === 'initialize' ? initialize : replies.shift();
      if (response) child.stdout.write((response.raw ?? JSON.stringify({ id: request.id, ...response })) + '\n');
    });
  });
  return { requests, child, launch: (_command, _args, options) => { assert.equal(options.cwd, tmpdir()); return child; } };
}

test('native status selects exact Notion identity and closes its process', async () => {
  const f = fixture([
    { result: { apps: [{ id: 'unrelated', callable: true, enabled: true }, { id: NOTION_ID, callable: true, enabled: true }] } },
  ]);
  const result = await readNotionConnection(f);
  assert.equal(result.state, 'connected');
  assert.deepEqual(f.requests.filter((r) => r.method === 'app/installed').map((r) => r.params), [{ forceRefresh: true }]);
  assert.equal(f.child.exitCode, 0);
  assert.equal(JSON.stringify(result).includes('unrelated'), false);
});

test('a complete empty inventory differs from failed or malformed discovery', async () => {
  assert.equal((await readNotionConnection(fixture([{ result: { apps: [] } }]))).state, 'not_connected');
  for (const replies of [
    [{ error: { code: -1, message: 'private failure detail' } }],
    [{ result: {} }],
    [{ result: { apps: [null, {}] } }],
    [{ result: { apps: [{ id: '', callable: true, enabled: true }] } }],
    [{ result: { apps: [{ id: 'unrelated', callable: 'yes', enabled: true }] } }],
    [{ result: { apps: [{ id: NOTION_ID }] } }],
    [{ result: { apps: [{ id: NOTION_ID }, { id: NOTION_ID }] } }],
  ]) {
    const result = await readNotionConnection(fixture(replies));
    assert.equal(result.state, 'unknown');
    assert.equal(JSON.stringify(result).includes('private'), false);
  }
});

test('malformed asynchronous protocol frames recover as unknown without throwing', async () => {
  for (const raw of ['null', '[]', 'true', '42', '"text"', '{invalid']) {
    for (const f of [fixture([{ raw }]), fixture([], { raw })]) {
      assert.equal((await readNotionConnection(f)).state, 'unknown');
      assert.equal(f.child.exitCode, 0);
    }
  }
});

test('timeouts and unavailable CLI return an explicit unknown state and stop', async () => {
  const f = fixture([]);
  assert.equal((await readNotionConnection({ ...f, timeoutMs: 20 })).state, 'unknown');
  assert.equal(f.child.exitCode, 0);
  assert.equal((await readNotionConnection({ launch: () => { throw new Error('no binary'); } })).state, 'unknown');
});

const block = (route) => `unrelated private instructions\n<!-- AIOS:BEGIN -->\nContext: ${route}.\nOnly load relevant context.\n<!-- AIOS:END -->\nmore private instructions`;
test('reads only the exact routing block and rejects ambiguous legacy instructions', () => {
  assert.deepEqual(parseContextRoute(block('https://app.notion.com/p/example')), {
    state: 'configured', target: 'https://app.notion.com/p/example', kind: 'notion',
  });
  assert.deepEqual(parseContextRoute('Context: https://example.com'), { state: 'missing' });
  assert.deepEqual(parseContextRoute(block('https://example.com') + block('https://other.com')), { state: 'ambiguous' });
  assert.deepEqual(parseContextRoute(block('https://a.com\nContext: https://b.com')), { state: 'ambiguous' });
  assert.deepEqual(parseContextRoute('<!-- AIOS:BEGIN -->\nold prose'), { state: 'ambiguous' });
});

test('the shipped context bridge round-trips web, Unix and Windows locations', async () => {
  const bridge = await readFile(new URL('../../skills/osm-data-context/assets/bridge.md', import.meta.url), 'utf8');
  for (const target of ['https://app.notion.com/p/example', 'https://example.com/context.', '/work/my vault', '/work/company.', 'C:\\Work\\Knowledge']) {
    const saved = bridge.replace('<verified-notion-root-entry-url>', target);
    assert.deepEqual(parseContextRoute(saved), { state: 'configured', ...classifyTarget(target) });
  }
});

test('route read does not fall back to another home; bounded files only', async (t) => {
  const folder = await mkdtemp(join(tmpdir(), 'osm-route-'));
  t.after(() => rm(folder, { recursive: true, force: true }));
  assert.equal((await readContextRoute({ codexHome: folder })).state, 'missing');
  await writeFile(join(folder, 'AGENTS.md'), block('https://example.com'));
  assert.equal((await readContextRoute({ codexHome: folder })).target, 'https://example.com/');
  await writeFile(join(folder, 'AGENTS.md'), 'x'.repeat(65537));
  assert.deepEqual(await readContextRoute({ codexHome: folder }), { state: 'unavailable' });
});

test('links reject credentials, unsafe schemes, control characters and lookalike Notion hosts', () => {
  for (const input of ['javascript:alert(1)', 'http://example.com', 'https://user:secret@example.com', '/tmp/a\nb', 'x'.repeat(2049)]) assert.equal(classifyTarget(input), null);
  assert.equal(classifyTarget('https://notion.so.attacker.test').kind, 'url');
});

import { notionPluginState, NOTION_PLUGIN_ID, setupState, readNotionPlugin } from './codex-status.mjs';
test('installation and connection are independent; neither falsely implies ready', () => {
  assert.equal(notionPluginState({ installed: [] }), 'missing');
  const p = { pluginId: NOTION_PLUGIN_ID, installed: true, enabled: true };
  assert.equal(notionPluginState({ installed: [p] }), 'enabled');
  assert.equal(notionPluginState({ installed: [{ ...p, enabled: false }] }), 'disabled');
  for (const inventory of [{}, { installed: [null] }, { installed: [p, p] }]) assert.equal(notionPluginState(inventory), 'unknown');
  assert.equal(notionPluginState({ installed: [{ ...p, pluginId: 'notion@lookalike' }] }), 'missing');
  assert.equal(setupState('missing', 'connected'), 'not_installed');
  assert.equal(setupState('disabled', 'connected'), 'plugin_disabled');
  assert.equal(setupState('unknown', 'connected'), 'unknown');
  assert.equal(setupState('enabled', 'not_connected'), 'not_connected');
  assert.equal(setupState('enabled', 'connected'), 'connected');
});
test('plugin detection uses bounded native CLI and hides raw errors', async () => {
  const state = await readNotionPlugin({ run: async (cmd, args, opts) => {
    assert.equal(cmd, 'codex'); assert.deepEqual(args, ['plugin', 'list', '--json']); assert.ok(opts.timeout <= 12000);
    assert.equal(opts.cwd, tmpdir());
    return { stdout: JSON.stringify({ installed: [] }) };
  } });
  assert.equal(state, 'missing');
  assert.equal(await readNotionPlugin({ run: async () => { throw new Error('secret'); } }), 'unknown');
});
