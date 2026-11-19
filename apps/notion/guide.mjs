import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const URI = 'ui://osm/guide-v1';
const SOURCE = 'https://raw.githubusercontent.com/onlinesourdough/OSM-plugin/main/docs-publisher/public-guide.json';
const ROOT = '40d6d2e17f568124af82ceb93dabf77a';
const MAX_BYTES = 512 * 1024;
let cached;
let checked = 0;

export function validPublicGuide(value) {
  return value?.format === 'osm-public-guide/1' && value.root === ROOT &&
    value.pages && Object.keys(value.pages).length <= 80 && value.pages[ROOT] &&
    Object.entries(value.pages).every(([id, page]) => /^[a-f0-9]{32}$/.test(id) &&
      page.id === id && typeof page.title === 'string' && typeof page.body === 'string' &&
      page.url === 'https://gustavanderson.notion.site/' + id) &&
    Buffer.byteLength(JSON.stringify(value)) <= MAX_BYTES;
}
export async function readPublicGuide({ fetcher = fetch, now = Date.now() } = {}) {
  if (cached && now - checked < 300000) return cached;
  checked = now;
  try {
    const response = await fetcher(SOURCE, { redirect: 'error', signal: AbortSignal.timeout(6000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Unavailable public guide');
    const length = Number(response.headers.get('content-length'));
    if (length && length > MAX_BYTES) throw new Error('Guide too large');
    let text = '';
    const decoder = new TextDecoder();
    for await (const part of response.body) {
      text += decoder.decode(part, { stream: true });
      if (Buffer.byteLength(text) > MAX_BYTES) throw new Error('Guide too large');
    }
    text += decoder.decode();
    const parsed = JSON.parse(text);
    if (!validPublicGuide(parsed)) throw new Error('Invalid public guide');
    cached = parsed;
  } catch { cached ||= __OSM_PUBLIC_GUIDE__; }
  return cached;
}
export function registerPublicGuide(server) {
  server.registerResource('osm-guide', URI, { mimeType: 'text/html;profile=mcp-app' }, async () => ({
    contents: [{ uri: URI, mimeType: 'text/html;profile=mcp-app',
      text: await readFile(join(__dirname, 'guide.html'), 'utf8'),
      _meta: { ui: { prefersBorder: false }, 'openai/ui': { preferredDisplayMode: 'fullscreen', availableDisplayModes: ['fullscreen'] } } }],
  }));
  server.registerTool('osm_guide', {
    title: 'OSM',
    icons: __OSM_GUIDE_ICONS__,
    description: 'Read the public OSM method guide. This view never reads private Notion context or credentials.',
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    _meta: { ui: { resourceUri: URI, visibility: ['app'] }, 'openai/ui': { entrypoints: [{ type: 'global' }] } },
  }, async () => ({ content: [], _meta: { 'osm/publicGuide': await readPublicGuide() } }));
}
