import { homedir } from 'node:os';
import { join } from 'node:path';
import { readContextRoute } from './context-route.mjs';
import { readHomeProjection } from './home-map.mjs';
import { contextIdentity, location, snapshot, stateRevision, replaceState } from './sources.mjs';
import { classifyTarget } from './target.mjs';
import { notionId } from './notion-internal.mjs';

// The owner's recorded choice of OSM's own internal connection, read from the macOS
// Keychain, for one selected context. It is a small non-secret file beside the context's
// other panel state (aios/panel/<hash>.connection.json under CODEX_HOME), because the
// installed package's MCP declaration sets no environment, so the packaged setup exposed no
// per-context opt-in. The documentation reviewed does not establish a general override; that
// is a gap in what it shows, not a claim that none exists. It holds no credential, token,
// identity or page content; the secret stays in the
// private Keychain item the owner provisions. Another context has another file, so the
// route never turns on for a context the owner did not select, and the saved Home
// projection's mode is still checked before any credential is requested.
export const routeFormat = 'osm-connection-route/1';
export const routeMode = 'internal_selected_pages';
const routeName = 'macos-keychain';
const limit = 2048;
const unavailable = 'OSM’s connection route setting is unavailable. It has been left unchanged.';

const notionContext = target => contextIdentity(target).startsWith('notion:');

// An optional link to this connection's own access page in Notion, saved with the bot and workspace
// it was verified for. Home offers it only while the live connection is that same bot and workspace;
// otherwise it falls back to the generic Settings path. Notion documents no URL for a connection's
// access page, so a link is never built from identifiers: it is whatever the owner's Setup saved.
// Only Notion's own hosts are accepted, and never the developer pages that show a credential.
const manageHosts = new Set(['notion.so', 'www.notion.so', 'notion.com', 'www.notion.com', 'app.notion.com']);
const credentialPages = [/^\/my-integrations(\/|$)/i, /^\/profile\/integrations(\/|$)/i];
export function normalizeManage(value) {
  if (value == null) return undefined;
  const keys = ['link', 'botId', 'workspaceId'];
  if (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) throw new Error('Invalid connection access link.');
  const route = classifyTarget(value.link);
  if (!route || route.kind !== 'notion') throw new Error('The access link must be an https Notion page.');
  const url = new URL(route.target);
  if (!manageHosts.has(url.hostname)) throw new Error('The access link must be on Notion’s own site.');
  if (credentialPages.some(pattern => pattern.test(url.pathname))) throw new Error('That link opens a developer page that shows the connection’s credential. Use the access page in Settings → Connections.');
  const botId = notionId(value.botId), workspaceId = notionId(value.workspaceId);
  if (!botId || !workspaceId) throw new Error('The access link needs the connection’s bot and workspace.');
  return { link: url.href, botId, workspaceId };
}
const sameManage = (a, b) => (a?.link ?? null) === (b?.link ?? null) && (a?.botId ?? null) === (b?.botId ?? null) && (a?.workspaceId ?? null) === (b?.workspaceId ?? null);
// A damaged or foreign file is not an opt-in. It reads as off and can be replaced; the
// replaced bytes are backed up by replaceState.
function decode(value, target) {
  if (value.text === null) return { state: 'missing', revision: value.revision, enabled: false };
  try {
    const data = JSON.parse(value.text);
    if (data.format === routeFormat && data.contextIdentity === contextIdentity(target) && data.route === routeName
      && data.mode === routeMode && typeof data.enabled === 'boolean') {
      // A damaged access link is dropped; it never disables the route.
      let manage; try { manage = normalizeManage(data.manage); } catch { manage = undefined; }
      return { state: 'saved', revision: value.revision, enabled: data.enabled, ...(manage && { manage }) };
    }
  } catch { /* Not an opt-in. */ }
  return { state: 'invalid', revision: value.revision, enabled: false };
}
export async function readConnectionRoute(target, { codexHome = process.env.CODEX_HOME || join(homedir(), '.codex') } = {}) {
  try { return decode(await snapshot(await location(codexHome, target, false, '.connection.json'), limit), target); }
  catch { return { state: 'unavailable', enabled: false }; }
}

// Whole replacement, revision-checked like the links and the projection. Enabling needs the
// owner's recorded selection of the internal connection and a Notion context; it is refused
// when the saved Home mapping chose the official connection. Turning it off is always allowed.
export async function saveConnectionRoute({ target, expectedContextRevision, expectedRevision, selectedMode, enabled, manage }, { codexHome = process.env.CODEX_HOME || join(homedir(), '.codex') } = {}) {
  if (selectedMode !== routeMode) throw new Error('OSM’s own connection route is only for the internal selected-pages mode. Nothing was changed.');
  if (typeof enabled !== 'boolean') throw new Error(unavailable);
  if (!notionContext(target)) throw new Error('Only a Notion Data & Context home can use OSM’s Keychain route. Nothing was changed.');
  const matches = context => context.state === 'configured' && context.revision === expectedContextRevision
    && contextIdentity(context.target) === contextIdentity(target);
  if (!matches(await readContextRoute({ codexHome }))) throw new Error('Your context changed. Refresh before saving OSM’s connection route.');
  const mapping = await readHomeProjection(target, { codexHome });
  if (enabled && mapping.state === 'saved' && mapping.projection.selectedMode !== routeMode) throw new Error('The saved Home mapping selected the separate official connection. OSM’s own route was not changed.');
  // `manage` left out keeps the saved access link, null removes it, and an object replaces it.
  const current = await readConnectionRoute(target, { codexHome });
  if (current.revision !== expectedRevision) throw new Error('OSM’s connection route changed. Refresh before saving again.');
  const link = manage === undefined ? current.manage : manage === null ? undefined : normalizeManage(manage);
  const path = await location(codexHome, target, true, '.connection.json');
  const text = JSON.stringify({ format: routeFormat, contextIdentity: contextIdentity(target), route: routeName, mode: routeMode, enabled, ...(link && { manage: link }) }, null, 2) + '\n';
  let previous;
  const written = await replaceState(path, { expectedRevision, text, limit,
    decode: value => (previous = decode(value, target)),
    same: value => value.enabled === enabled && sameManage(value.manage, link),
    matches: async () => matches(await readContextRoute({ codexHome })),
    copy: { busy: 'Another connection route update is in progress. Try again when it finishes.', changed: 'OSM’s connection route changed. Refresh before saving again.',
      backup: 'Could not back up OSM’s connection route. No changes were made.' } });
  if (!written) return previous;
  const after = await readConnectionRoute(target, { codexHome });
  if (after.revision !== stateRevision(text)) throw new Error('OSM’s connection route changed again. Refresh to inspect it.');
  if (!matches(await readContextRoute({ codexHome }))) throw new Error('Your context changed. The route was saved for the previous context only.');
  return after;
}
