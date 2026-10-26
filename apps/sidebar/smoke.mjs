import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const scratch = await mkdtemp(join(tmpdir(), 'osm-sidebar-smoke-'));
const client = new Client({ name: 'osm-sidebar-check', version: '1' });
const transport = new StdioClientTransport({
  command: process.execPath, args: [fileURLToPath(new URL('../../runtime/sidebar/server.cjs', import.meta.url))],
  env: { PATH: process.env.PATH, HOME: scratch, CODEX_HOME: scratch }, stderr: 'pipe',
});
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((tool) => tool.name), ['osm_open', 'osm_notion_pages', 'osm_notion_icons', 'osm_status', 'osm_settings', 'osm_save_context', 'osm_sources', 'osm_save_sources',
    'osm_home', 'osm_home_list', 'osm_home_read', 'osm_save_home_projection']);
  assert.deepEqual(tools[0]._meta['openai/ui'].entrypoints, [{ type: 'global' }]);
  for (const name of ['osm_notion_pages', 'osm_notion_icons', 'osm_status', 'osm_home', 'osm_home_list', 'osm_home_read']) {
    assert.deepEqual(tools.find(tool => tool.name === name)._meta.ui.visibility, ['app']);
    assert.equal(tools.find(tool => tool.name === name).annotations.openWorldHint, true);
  }
  // Hosts read the global tool's icons before the server icon, so both carry the same single
  // theme-less SVG, and no other tool has an icon.
  const icons = client.getServerVersion().icons;
  assert.deepEqual(tools[0].icons, icons);
  assert.deepEqual(tools.filter(tool => tool.icons).map(tool => tool.name), ['osm_open']);
  assert.equal(icons.length, 1);
  const [icon] = icons;
  assert.equal(icon.theme, undefined);
  assert.equal(icon.mimeType, 'image/svg+xml');
  assert.deepEqual(icon.sizes, ['16x16']);
  assert.ok(icon.src.startsWith('data:image/svg+xml;base64,'));
  const svg = Buffer.from(icon.src.slice(icon.src.indexOf(',') + 1), 'base64').toString();
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" [^>]*viewBox="0 0 20 20"[^>]*>.*<\/svg>$/s);
  // A monochrome icon leaves its colour to the host: it paints only with currentColor and sets no
  // colour, style, opacity or filter of its own.
  for (const [, attribute, value] of svg.matchAll(/\s(fill|stroke)="([^"]*)"/g)) assert.ok(['none', 'currentColor'].includes(value), `${attribute}="${value}"`);
  assert.doesNotMatch(svg, /<style|\sstyle=|\scolor=|opacity|filter/i);
  // The context-hub mark: one filled hub at the centre and four outline nodes placed symmetrically around it.
  const circles = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="[\d.]+"( fill="currentColor")?\/>/g)].map(([, x, y, filled]) => ({ x: +x, y: +y, filled: !!filled }));
  assert.deepEqual(circles.filter(circle => circle.filled), [{ x: 10, y: 10, filled: true }]);
  const nodes = circles.filter(circle => !circle.filled);
  assert.equal(nodes.length, 4);
  for (const { x, y } of nodes) assert.ok(nodes.some(other => other.x === 20 - x && other.y === 20 - y), `node ${x},${y} has an opposite`);
  const view = await client.readResource({ uri: 'ui://osm/home-v1' });
  assert.equal(view.contents[0].mimeType, 'text/html;profile=mcp-app');
  assert.deepEqual(view.contents[0]._meta['openai/ui'], { preferredDisplayMode: 'fullscreen', availableDisplayModes: ['fullscreen'] });
  assert.ok(view.contents[0].text.includes('onlinesourdough'));
  const settings = await client.callTool({ name: 'osm_settings', arguments: {} });
  assert.equal(settings._meta['osm/view'], 'settings');
  assert.equal(tools.find(tool=>tool.name==='osm_settings')._meta['openai/ui'].entrypoints[0].type, 'settings');
  const result = await client.callTool({ name: 'osm_open', arguments: {} });
  assert.equal(result.isError, undefined);
  assert.equal(result._meta['osm/status'].context.state, 'missing');
  assert.ok(['unknown', 'not_connected', 'not_installed'].includes(result._meta['osm/status'].notion.state));
  assert.equal(JSON.stringify(result.content).includes('Context:'), false);
  const target = 'https://app.notion.com/p/00000000000000000000000000000001';
  const invalid = await client.callTool({ name: 'osm_save_context', arguments: { target, expectedRevision: 'stale' } });
  assert.equal(invalid.isError, true);
  const saved =await client.callTool({ name: 'osm_save_context', arguments: { target, expectedRevision: result._meta['osm/status'].context.revision } });
  assert.equal(saved.isError, undefined);
  assert.equal(saved._meta['osm/status'].context.target, target);
  const read = await client.callTool({ name: 'osm_status', arguments: {} });
  assert.equal(read._meta['osm/status'].context.target, target);
  assert.equal(tools.find(tool=>tool.name==='osm_save_context').annotations.readOnlyHint, false);
  assert.deepEqual(tools.find(tool=>tool.name==='osm_save_context')._meta.ui.visibility, ['app']);
  const links = { memory: { title: 'Decisions', target: 'https://example.com/memory' }, teamMemory: { title: 'Team decisions', target: 'https://example.com/team-memory' } };
  const sources = await client.callTool({ name: 'osm_save_sources', arguments: { target, expectedContextRevision: read._meta['osm/status'].context.revision, expectedRevision: read._meta['osm/status'].sources.revision, title: 'My AIOS', links } });
  assert.equal(sources.isError, undefined);
  assert.deepEqual(sources._meta['osm/status'].sources.links, links);
  const metadata = await client.callTool({ name: 'osm_sources', arguments: {} });
  assert.deepEqual(JSON.parse(metadata.content[0].text).sources.links, links);
  assert.equal(JSON.parse(metadata.content[0].text).home.state, 'missing');
  // No host declares a secret mechanism yet: Home reports that and reads nothing.
  const home = await client.callTool({ name: 'osm_home', arguments: {} });
  assert.equal(home._meta['osm/home'].state, 'unsupported_host');
  assert.deepEqual(home.content, []);
  assert.ok(home._meta['osm/home'].builtin.some(skill => skill.name === 'osm-setup'));
  assert.equal((await client.callTool({ name: 'osm_home_list', arguments: { section: 'memory' } }))._meta['osm/home-list'].state, 'unsupported_host');
  const at = '2026-10-26T12:00:00.000Z', fictional = n => n.toString(16).padStart(32, '0');
  const projection = { definition: { id: fictional(0xd01), title: 'Fictional AI Operating Model', revision: 'fictional-r1', generatedAt: at },
    selectedMode: 'official_notion_user',
    root: { id: fictional(1), title: 'Fictional OSM', link: `https://www.notion.so/${fictional(1)}`, observed: { at, access: 'readable' } },
    sections: [{ key: 'tasks', label: 'Tasks', role: 'related', order: 0, destination: { title: 'Tasks', link: 'https://www.notion.so/fictional-tasks' } }] };
  const mapped = await client.callTool({ name: 'osm_save_home_projection', arguments: { target, expectedContextRevision: read._meta['osm/status'].context.revision,
    expectedRevision: JSON.parse(metadata.content[0].text).home.revision, projection } });
  assert.equal(mapped.isError, undefined);
  assert.equal(JSON.parse((await client.callTool({ name: 'osm_sources', arguments: {} })).content[0].text).home.projection.sections[0].label, 'Tasks');
  // The official mode is reported as such; it is never read here or switched to the internal connection.
  assert.equal((await client.callTool({ name: 'osm_home', arguments: {} }))._meta['osm/home'].state, 'official_mode');
  assert.deepEqual(JSON.parse((await client.callTool({ name: 'osm_sources', arguments: {} })).content[0].text).sources.links, links);
  console.log('PASS: bundled stdio server, global entrypoint, fullscreen resource, Home mapping and isolated first run.');
} finally { await client.close(); await rm(scratch, { recursive: true, force: true }); }
