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
import { readModelOverview, saveModelOverview } from './model-snapshot.mjs';
import { LIMITS, outcomes } from './model-overview.mjs';
import { z } from 'zod';
import { NotionPages } from './notion-pages.mjs';

const uri = 'ui://osm/home-v1';
const notionPages = new NotionPages();
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
  const [notion, context, model] = await Promise.all([readNotionSetup(), readContextRoute(), readModelOverview()]);
  const sources = context.state === 'configured' ? await readSources(context.target) : { state: 'missing', title: '', links: {} };
  return { version: __OSM_VERSION__, features: { notionPages: true, notionIcons: true, modelOverview: true }, notion, context, sources, model, checkedAt };
}
async function result() {
  return { content: [{ type: 'text', text: 'OSM dashboard. Connection status, the saved context pointer, any operating-model overview snapshot and saved shortcuts; no business records are copied.' }],
    _meta: { 'osm/status': await status() } };
}
appTool('osm_open', {
  title: 'OSM', description: 'Open the OSM panel with connection status, the saved context location and any operating-model overview snapshot. No page search, conversation request or Notion write.',
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
  title: 'Save your context', description: 'Save the personal default context location the user explicitly confirmed in the managed context block of Codex instructions. Preserve other rules and back up changed instructions. This does not verify access, create business sources or show that an agent has loaded it.',
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
  description: 'Read the current personal context location, its saved navigation links with revision tokens and the operating-model overview snapshot. Use only for requested setup or source-link maintenance. These are saved links and a dated snapshot, not live Notion records or proof of access.',
  inputSchema: {},
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
}, async () => {
  const [context, overview] = await Promise.all([readContextRoute(), readModelOverview()]);
  const sources = context.state === 'configured' ? await readSources(context.target) : { state: 'missing', title: '', links: {} };
  return { content: [{ type: 'text', text: JSON.stringify({ context, sources, overview }) }] };
});
const sourceLink = z.object({ title: z.string().min(1).max(100), target: z.string().min(1).max(2048) }).strict();
appTool('osm_save_sources', {
  title: 'Save OSM source links',
  description: 'Save only navigation names and links for the selected personal context. Setup uses verified destinations; the panel accepts user-entered links. Does not read or write Notion content, store skills or memories, verify access, or change the context pointer. Replaces the whole link map; include every role to keep. Read osm_sources for current revision tokens first. Never use the personal default for a different client.',
  inputSchema: { target: z.string().min(1).max(2048), expectedContextRevision: z.string().regex(/^[a-f0-9]{64}$/), expectedRevision: z.string().regex(/^[a-f0-9]{64}$/), title: z.string().max(100), links: z.object({ docs: sourceLink.optional(), personalSkills: sourceLink.optional(), teamSkills: sourceLink.optional(), memory: sourceLink.optional(), teamMemory: sourceLink.optional() }).strict() },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  _meta: { ui: { visibility: ['app', 'model'] } },
}, async args => {
  try {
    await saveSources(args);
    return await result();
  } catch (error) { return { isError: true, content: [{ type: 'text', text: error.message }] }; }
});
modelTool('osm_save_model_overview', {
  title: 'Save the AI Operating Model overview',
  description: 'During a Setup or Settings refresh the user asked for, save a dated overview of the selected AI Operating Model for the OSM panel. Pass the model text exactly as the official Notion fetch returned it, or a failed outcome instead. OSM keeps only groups, labels and links from headings followed by lists of page or database references, and discards the text. It does not read Notion, follow links, change the context pointer, enable skills or create memory. Use sections only after the user chose among listed sections.',
  inputSchema: {
    target: z.string().min(1).max(2048), title: z.string().min(1).max(LIMITS.label), revision: z.string().max(LIMITS.label).default(''),
    outcome: z.enum(outcomes).default('read'), content: z.string().max(LIMITS.content).default(''), complete: z.boolean().default(true),
    sections: z.array(z.string().min(1).max(LIMITS.section)).max(LIMITS.sections).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
}, async args => {
  try {
    const { model, state, revision, readAt, partial, skipped, missing, selection, sections, changes, groups } = await saveModelOverview(args);
    const summary = { model, state, revision, readAt, partial, skipped, missing, selection, sections, changes, groups: groups.map(group => ({ title: group.title, links: group.links.length })) };
    return { content: [{ type: 'text', text: JSON.stringify(summary) }] };
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
