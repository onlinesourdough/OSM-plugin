import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readContextRoute, saveContextRoute } from './context-route.mjs';

// A Mac without OSM's saved Keychain route is not_enabled; another OS is unsupported. The scratch
// environment sets no opt-in, so nothing here reads the Keychain.
const unready = process.platform === 'darwin' ? 'not_enabled' : 'unsupported_host';
const scratch = await mkdtemp(join(tmpdir(), 'osm-notion-smoke-'));
const client = new Client({ name: 'osm-notion-check', version: '1' });
const transport = new StdioClientTransport({
  command: process.execPath, args: [fileURLToPath(new URL('../../runtime/notion/server.cjs', import.meta.url))],
  env: { PATH: process.env.PATH, HOME: scratch, CODEX_HOME: scratch }, stderr: 'pipe',
});
const text = result => JSON.parse(result.content[0].text);
try {
  await client.connect(transport);
  // Headless: model tools only, no resource, prompt, icon, UI entrypoint or app-only tool.
  const capabilities = client.getServerCapabilities();
  assert.ok(capabilities.tools); assert.equal(capabilities.resources, undefined); assert.equal(capabilities.prompts, undefined);
  assert.equal(client.getServerVersion().icons, undefined);
  assert.match(client.getInstructions(), /official Notion plugin/);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name), ['osm_sources', 'osm_save_sources', 'osm_connection', 'osm_context_list', 'osm_context_read',
    'osm_context_home', 'osm_save_home_projection', 'osm_save_connection_route']);
  for (const tool of tools) {
    assert.equal(tool._meta, undefined, `${tool.name} carries no UI metadata`); assert.equal(tool.icons, undefined);
    assert.doesNotMatch(tool.description, /\b(panel|dashboard|sidebar|picker|fullscreen)\b/i, tool.name);
  }
  for (const name of ['osm_sources', 'osm_connection', 'osm_context_list', 'osm_context_read', 'osm_context_home']) {
    assert.equal(tools.find(tool => tool.name === name).annotations.readOnlyHint, true, name);
  }
  for (const name of ['osm_save_sources', 'osm_save_home_projection', 'osm_save_connection_route']) {
    assert.equal(tools.find(tool => tool.name === name).annotations.readOnlyHint, false, name);
  }
  // A first run has no selected context, so nothing is saved or read.
  const empty = text(await client.callTool({ name: 'osm_sources', arguments: {} }));
  assert.equal(empty.context.state, 'missing'); assert.equal(empty.home.state, 'missing'); assert.equal(empty.connectionRoute.state, 'missing');
  // Setup records the selected root in the managed instructions block; the fixture writes it the same way.
  const target = 'https://app.notion.com/p/00000000000000000000000000000001';
  const bridge = await readFile(new URL('../../skills/osm-data-context/assets/bridge.md', import.meta.url), 'utf8');
  await saveContextRoute({ target, expectedRevision: (await readContextRoute({ codexHome: scratch })).revision }, { codexHome: scratch, bridge });
  const read = text(await client.callTool({ name: 'osm_sources', arguments: {} }));
  assert.equal(read.context.target, target);
  const stale = await client.callTool({ name: 'osm_save_sources', arguments: { target, expectedContextRevision: 'f'.repeat(64), expectedRevision: read.sources.revision, title: 'My AIOS', links: {} } });
  assert.equal(stale.isError, true);
  const links = { memory: { title: 'Decisions', target: 'https://example.com/memory' }, teamMemory: { title: 'Team decisions', target: 'https://example.com/team-memory' } };
  const sources = await client.callTool({ name: 'osm_save_sources', arguments: { target, expectedContextRevision: read.context.revision, expectedRevision: read.sources.revision, title: 'My AIOS', links } });
  assert.equal(sources.isError, undefined);
  assert.deepEqual(text(sources).sources.links, links);
  const metadata = text(await client.callTool({ name: 'osm_sources', arguments: {} }));
  assert.deepEqual(metadata.sources.links, links);
  assert.equal(metadata.home.state, 'missing');
  // Without credential opt-in every read reports why and reads nothing.
  const connection = text(await client.callTool({ name: 'osm_connection', arguments: {} }));
  assert.equal(connection.state, unready);
  assert.equal(connection.accessInventory, 'mapped-sources-only');
  // The bootstrap read needs the same opt-in. The route is never turned on here: on a Mac the next
  // read would ask the real Keychain. Only the tool's registration and a no-op disable are exercised.
  assert.equal(text(await client.callTool({ name: 'osm_context_home', arguments: {} })).state, unready);
  assert.equal(metadata.connectionRoute.state, 'missing');
  const routeOff = await client.callTool({ name: 'osm_save_connection_route', arguments: { target, expectedContextRevision: read.context.revision,
    expectedRevision: metadata.connectionRoute.revision, selectedMode: 'internal_selected_pages', enabled: false } });
  assert.equal(routeOff.isError, undefined);
  assert.equal(text(routeOff).connectionRoute.enabled, false);
  assert.equal(text(await client.callTool({ name: 'osm_context_list', arguments: { section: 'memory' } })).state, unready);
  assert.equal(text(await client.callTool({ name: 'osm_context_read', arguments: { section: 'memory', id: '00000000000000000000000000000001' } })).state, unready);
  const at = '2026-10-26T12:00:00.000Z', fictional = n => n.toString(16).padStart(32, '0');
  const projection = { definition: { id: fictional(0xd01), title: 'Fictional AI Operating Model', revision: 'fictional-r1', generatedAt: at },
    selectedMode: 'official_notion_user',
    root: { id: fictional(1), title: 'Fictional OSM', link: `https://www.notion.so/${fictional(1)}`, observed: { at, access: 'readable' } },
    sections: [{ key: 'tasks', label: 'Tasks', role: 'related', order: 0, destination: { title: 'Tasks', link: 'https://www.notion.so/fictional-tasks' } }] };
  const mapped = await client.callTool({ name: 'osm_save_home_projection', arguments: { target, expectedContextRevision: read.context.revision,
    expectedRevision: metadata.home.revision, projection } });
  assert.equal(mapped.isError, undefined);
  const after = text(await client.callTool({ name: 'osm_sources', arguments: {} }));
  assert.equal(after.home.projection.sections[0].label, 'Tasks');
  assert.deepEqual(after.sources.links, links);
  // The official mode is reported as such; it is never read here or switched to the internal connection.
  for (const name of ['osm_connection', 'osm_context_home']) assert.equal(text(await client.callTool({ name, arguments: {} })).state, 'official_mode', name);
  // With the official mode recorded, the internal route cannot be turned on for this context.
  const refused = await client.callTool({ name: 'osm_save_connection_route', arguments: { target, expectedContextRevision: read.context.revision,
    expectedRevision: text(routeOff).connectionRoute.revision, selectedMode: 'internal_selected_pages', enabled: true } });
  assert.equal(refused.isError, true);
  console.log('PASS: headless stdio server, model tools only, saved context state, Home projection and isolated first run.');
} finally { await client.close(); await rm(scratch, { recursive: true, force: true }); }
