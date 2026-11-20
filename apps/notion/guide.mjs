import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPublicGuideReader } from './guide-reader.mjs';

export { validPublicGuide } from './guide-reader.mjs';

const URI = 'ui://osm/guide-v1';
export const readPublicGuide = createPublicGuideReader(__OSM_PUBLIC_GUIDE__);
export function registerPublicGuide(server, registerTool = server.registerTool.bind(server)) {
  server.registerResource('osm-guide', URI, { mimeType: 'text/html;profile=mcp-app' }, async () => ({
    contents: [{ uri: URI, mimeType: 'text/html;profile=mcp-app',
      text: await readFile(join(__dirname, 'guide.html'), 'utf8'),
      _meta: { ui: { prefersBorder: false }, 'openai/ui': { preferredDisplayMode: 'fullscreen', availableDisplayModes: ['fullscreen'] } } }],
  }));
  registerTool('osm_guide', {
    title: 'OSM',
    icons: __OSM_GUIDE_ICONS__,
    description: 'Read the public OSM method guide. This view never reads private Notion context or credentials.',
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    _meta: { ui: { resourceUri: URI, visibility: ['app'] }, 'openai/ui': { entrypoints: [{ type: 'global' }] } },
  }, async () => ({ content: [], _meta: { 'osm/publicGuide': await readPublicGuide() } }));
}
