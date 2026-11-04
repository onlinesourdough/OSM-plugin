import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { OpenAIExtensions } from '@openai/mcp-extensions/server';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readNotionSetup } from './codex-status.mjs';
import { readContextRoute, saveContextRoute } from './context-route.mjs';
import { readSources, saveSources } from './sources.mjs';
import { readHomeProjection, saveHomeProjection } from './home-map.mjs';
import { createHomeService, hostCredential, readBuiltinSkills } from './home-service.mjs';
import { fetchTransport } from './notion-internal.mjs';
import { z } from 'zod';
import { NotionPages } from './notion-pages.mjs';

const uri = 'ui://osm/home-v1';
const notionPages = new NotionPages();
// Home reads only through OSM's own internal Notion connection, never notionPages.
// L-2: the mapping names the context it was read for, from this same route read.
const readProjection = async () => {
  const context = await readContextRoute();
  return context.state === 'configured' ? { ...await readHomeProjection(context.target), target: context.target } : { state: 'missing' };
};
const home = createHomeService({ credential: hostCredential, transport: fetchTransport, readProjection });
let builtin;
const builtinSkills = async () => (builtin ??= await readBuiltinSkills(join(__dirname, '../../skills')));
// Context-hub mark; assets/branding/aios-icon.svg renders the same geometry as assets/icon.png.
// A monochrome SVG drawn only in currentColor, with no colour of its own, so the host can colour
// it like its other sidebar icons. It is the global tool icon and the server icon.
const icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="3.25" fill="currentColor"/><circle cx="3.75" cy="3.75" r="2"/><circle cx="16.25" cy="3.75" r="2"/><circle cx="3.75" cy="16.25" r="2"/><circle cx="16.25" cy="16.25" r="2"/><path d="M5.2 5.2l2.4 2.4M14.8 5.2l-2.4 2.4M5.2 14.8l2.4-2.4M14.8 14.8l-2.4-2.4"/></svg>';
const icons = [{ src: `data:image/svg+xml;base64,${Buffer.from(icon).toString('base64')}`, mimeType: 'image/svg+xml', sizes: ['16x16'] }];
const server = new McpServer({ name: 'osm', title: 'OSM', version: __OSM_VERSION__, icons });
new OpenAIExtensions(server);
// Registered tool handles, in registration order, for the tools/list handler below.
const tools = new Map();
const appTool = (name, config, cb) => tools.set(name, registerAppTool(server, name, config, cb));
const modelTool = (name, config, cb) => tools.set(name, server.registerTool(name, config, cb));

registerAppResource(server, 'osm-setup', uri, {}, async () => ({ contents: [{
  uri, mimeType: RESOURCE_MIME_TYPE, text: await readFile(join(__dirname, 'index.html'), 'utf8'),
  _meta: {
    ui: { csp: { connectDomains: [], resourceDomains: ['https://www.notion.so'] }, prefersBorder: false },
    'openai/ui': { preferredDisplayMode: 'fullscreen', availableDisplayModes: ['fullscreen'] },
  },
}] }));

// Each snapshot carries its start time so delayed reads cannot undo a newer save.
let lastCheck = 0;
async function status() {
  lastCheck = Math.max(lastCheck + 1, Date.now());
  const checkedAt = new Date(lastCheck).toISOString();
  const [notion, context] = await Promise.all([readNotionSetup(), readContextRoute()]);
  const sources = context.state === 'configured' ? await readSources(context.target) : { state: 'missing', title: '', links: {} };
  return { version: __OSM_VERSION__, features: { notionPages: true, notionIcons: true }, notion, context, sources, checkedAt };
}
async function result() {
  return { content: [{ type: 'text', text: 'OSM dashboard. Connection status and saved links to Context, Docs, Skills and Memory; no business records are copied.' }],
    _meta: { 'osm/status': await status() } };
}
appTool('osm_open', {
  title: 'OSM', description: 'Open the OSM panel with connection status and the saved context location. No page search, conversation request or Notion write.',
  inputSchema: {},
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  _meta: { ui: { resourceUri: uri }, 'openai/ui': { entrypoints: [{ type: 'global' }] } },
}, result);
appTool('osm_notion_pages', {
  title: 'Choose a Notion page', description: 'List or search accessible Notion page names through the separate official Notion connection. Returns navigation metadata only. No page bodies, model turn, second connection or Notion write.',
  inputSchema: { query: z.string().max(160).default('') },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  _meta: { ui: { visibility: ['app'] } },
}, async ({ query }) => {
  try { return { content: [], _meta: { 'osm/kind': 'pages', 'osm/pages': await notionPages.list(query) } }; }
  catch (error) { return { isError: true, content: [{ type: 'text', text: error.message }], _meta: { 'osm/kind': 'pages' } }; }
});
appTool('osm_notion_icons', {
  title: 'Read selected page icons', description: 'Read icons for up to six selected Notion destinations. The official fetch response is reduced to page identity and icon; page bodies are discarded, never returned or stored.',
  inputSchema: { targets: z.array(z.string().max(2048)).min(1).max(6) },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  _meta: { ui: { visibility: ['app'] } },
}, async ({ targets }) => {
  try { return { content: [], _meta: { 'osm/kind': 'icons', 'osm/icons': await notionPages.icons(targets) } }; }
  catch { return { isError: true, content: [{ type: 'text', text: 'Page icons are unavailable.' }], _meta: { 'osm/kind': 'icons' } }; }
});
appTool('osm_status', {
  title: 'Refresh OSM', description: 'Refresh Notion connection metadata and the saved context location.',
  inputSchema: {},
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  _meta: { ui: { visibility: ['app'] } },
}, result);
appTool('osm_settings', {
  title: 'OSM settings', description: 'Open the OSM source settings. Reads current configuration without changing it.',
  inputSchema: {},
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  _meta: { ui: { resourceUri: uri, visibility: ['app'] }, 'openai/ui': { entrypoints: [{ type: 'settings', searchTerms: ['context', 'skills', 'memory', 'Notion'] }] } },
}, async () => {
  const snapshot = await result();
  snapshot._meta['osm/view'] = 'settings';
  return snapshot;
});
appTool('osm_save_context', {
  title: 'Save your context', description: 'Save the user-entered personal default context location in the managed context block of Codex instructions. Preserve other rules and back up changed instructions. This does not verify access or create business sources.',
  inputSchema: { target: z.string().min(1).max(2048), expectedRevision: z.string().regex(/^[a-f0-9]{64}$/) },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  _meta: { ui: { visibility: ['app'] } },
}, async (args) => {
  try {
    const bridge = await readFile(join(__dirname, '../../skills/osm-context/assets/bridge.md'), 'utf8');
    await saveContextRoute(args, { bridge });
    return await result();
  } catch (error) { return { isError: true, content: [{ type: 'text', text: error.message }] }; }
});

modelTool('osm_sources', {
  title: 'Read OSM source links',
  description: 'Read the current personal context location and its saved navigation links with revision tokens. Use only for requested setup or source-link maintenance. These are saved links, not live Notion records or proof of access.',
  inputSchema: {},
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
}, async () => {
  const context = await readContextRoute();
  const sources = context.state === 'configured' ? await readSources(context.target) : { state: 'missing', title: '', links: {} };
  const projection = context.state === 'configured' ? await readHomeProjection(context.target) : { state: 'missing' };
  return { content: [{ type: 'text', text: JSON.stringify({ context, sources, home: projection }) }] };
});
const sourceLink = z.object({ title: z.string().min(1).max(100), target: z.string().min(1).max(2048) }).strict();
appTool('osm_save_sources', {
  title: 'Save OSM source links',
  description: 'Save only navigation names and links for the selected personal context. Setup uses verified destinations; the panel accepts user-entered links. Does not read or write Notion content, store skills or memories, verify access, or change the context pointer. Replaces the whole link map; include every role to keep. Read osm_sources for current revision tokens first. Never use the personal default for a different client. When Setup generates these links from the AI Operating Model definition, pass that definitionRevision; they remain a partial compatibility view of it, not a second map.',
  inputSchema: { target: z.string().min(1).max(2048), expectedContextRevision: z.string().regex(/^[a-f0-9]{64}$/), expectedRevision: z.string().regex(/^[a-f0-9]{64}$/), title: z.string().max(100), links: z.object({ docs: sourceLink.optional(), personalSkills: sourceLink.optional(), teamSkills: sourceLink.optional(), memory: sourceLink.optional(), teamMemory: sourceLink.optional() }).strict(),
    definitionRevision: z.string().max(60).optional() },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  _meta: { ui: { visibility: ['app', 'model'] } },
}, async args => {
  try {
    await saveSources(args);
    return await result();
  } catch (error) { return { isError: true, content: [{ type: 'text', text: error.message }] }; }
});

// Home: Setup's generated projection, read through its selected connection mode. Results are
// UI metadata for the panel only; bodies are returned per request and never stored.
const homeAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
const homeResult = (kind, value) => ({ content: [], _meta: { 'osm/kind': kind, [`osm/${kind}`]: value } });
appTool('osm_home', {
  title: 'Read OSM Home status', description: 'Check the saved Home projection and its selected connection mode, and list its sections. No page content.',
  inputSchema: {}, annotations: homeAnnotations, _meta: { ui: { visibility: ['app'] } },
}, async () => {
  try { return homeResult('home', { ...await home.status(), builtin: await builtinSkills() }); }
  catch { return homeResult('home', { state: 'unavailable', builtin: [] }); }
});
appTool('osm_home_list', {
  title: 'List Home records', description: 'List up to ten record titles from one mapped Home section through OSM’s own Notion connection.',
  inputSchema: { section: z.string().regex(/^[a-z0-9-]{1,40}$/), cursor: z.string().max(200).optional() },
  annotations: homeAnnotations, _meta: { ui: { visibility: ['app'] } },
}, async ({ section, cursor }) => {
  try { return homeResult('home-list', await home.list({ key: section, cursor })); }
  catch { return homeResult('home-list', { state: 'unavailable' }); }
});
appTool('osm_home_read', {
  title: 'Read a Home record', description: 'Read one record of a mapped Home section, its mapped fields and bounded page blocks, for display in the panel only.',
  inputSchema: { section: z.string().regex(/^[a-z0-9-]{1,40}$/), id: z.string().max(36) },
  annotations: homeAnnotations, _meta: { ui: { visibility: ['app'] } },
}, async ({ section, id }) => {
  try { return homeResult('home-record', await home.read({ key: section, id })); }
  catch { return homeResult('home-record', { state: 'unavailable' }); }
});
const homeObject = z.object({}).passthrough();
modelTool('osm_save_home_projection', {
  title: 'Save the OSM Home projection',
  description: 'Save the Home projection Setup generated from one revision of the AI Operating Model’s Data and Context Definition, for the selected personal context. Never edit it by hand or field by field: content changes only with a new definition revision, and the same revision with different content is refused. Format osm-home-projection/1: definition {id, title, revision, generatedAt}; selectedMode official_notion_user or internal_selected_pages (record the owner’s choice; never switch it); connection {kind "notion-internal", botId, workspaceId} for internal_selected_pages only; root {id, title, link, observed}; and sections {key, label, role: profile|memory|documents|skills|related|support, kind (support only: core_rules|source_index|writing_procedure|access|evidence|maintenance|recovery_snapshot), order, destination, view?, fields?, observed}. Support sections are recorded so Home never shows them as context. A destination is {type: "data_source", id, databaseId?, title, link} with fields {title, description?, and for memory fact?, decision?, why?, evidence?} naming verified properties, or {type: "pages", title, link, pages: [{id, title, link}]} (up to six), or for related {title, link} only. observed is {at, access: readable|inaccessible|unsupported, capabilities?}. Use the definition’s actual IDs and labels; never infer roles from titles, invent fields or store page content, private defaults or secrets. Replaces the whole projection. Read osm_sources for current revisions first.',
  inputSchema: { target: z.string().min(1).max(2048), expectedContextRevision: z.string().regex(/^[a-f0-9]{64}$/), expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
    projection: z.object({ definition: homeObject, selectedMode: z.enum(['official_notion_user', 'internal_selected_pages']), connection: homeObject.optional(), root: homeObject, sections: z.array(homeObject).min(1).max(16) }).strict() },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
}, async args => {
  try {
    const saved = await saveHomeProjection(args);
    return { content: [{ type: 'text', text: JSON.stringify({ home: saved }) }] };
  } catch (error) { return { isError: true, content: [{ type: 'text', text: error.message }] }; }
});

// MCP SDK 1.31's McpServer omits tool icons from tools/list. This handler, set through the SDK's
// public low-level server, lists the same registered tools as McpServer does and adds the icon to
// the global entry, which hosts read before the server icon. Registration, validation and calls
// stay with McpServer.
const jsonSchema = (schema, io) => z.toJSONSchema(schema, { target: 'draft-7', io });
server.server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: [...tools].filter(([, tool]) => tool.enabled).map(([name, tool]) => ({
    name, title: tool.title, description: tool.description,
    inputSchema: tool.inputSchema ? jsonSchema(tool.inputSchema, 'input') : { type: 'object', properties: {} },
    annotations: tool.annotations, execution: tool.execution, _meta: tool._meta,
    ...(tool.outputSchema && { outputSchema: jsonSchema(tool.outputSchema, 'output') }),
    ...(name === 'osm_open' && { icons }),
  })),
}));

server.connect(new StdioServerTransport()).catch(() => {
  console.error('OSM sidebar could not start. Check the Node runtime and plugin installation.');
  process.exitCode = 1;
});
process.stdin.on('end', () => void notionPages.close());
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await notionPages.close(); process.exit(0); });
