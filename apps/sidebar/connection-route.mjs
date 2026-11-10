import { homedir } from 'node:os';
import { join } from 'node:path';
import { readContextRoute } from './context-route.mjs';
import { readHomeProjection } from './home-map.mjs';
import { contextIdentity, location, snapshot, stateRevision, replaceState } from './sources.mjs';

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
// A damaged or foreign file is not an opt-in. It reads as off and can be replaced; the
// replaced bytes are backed up by replaceState.
function decode(value, target) {
  if (value.text === null) return { state: 'missing', revision: value.revision, enabled: false };
  try {
    const data = JSON.parse(value.text);
    if (data.format === routeFormat && data.contextIdentity === contextIdentity(target) && data.route === routeName
      && data.mode === routeMode && typeof data.enabled === 'boolean') return { state: 'saved', revision: value.revision, enabled: data.enabled };
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
export async function saveConnectionRoute({ target, expectedContextRevision, expectedRevision, selectedMode, enabled }, { codexHome = process.env.CODEX_HOME || join(homedir(), '.codex') } = {}) {
  if (selectedMode !== routeMode) throw new Error('OSM’s own connection route is only for the internal selected-pages mode. Nothing was changed.');
  if (typeof enabled !== 'boolean') throw new Error(unavailable);
  if (!notionContext(target)) throw new Error('Only a Notion Data & Context home can use OSM’s Keychain route. Nothing was changed.');
  const matches = context => context.state === 'configured' && context.revision === expectedContextRevision
    && contextIdentity(context.target) === contextIdentity(target);
  if (!matches(await readContextRoute({ codexHome }))) throw new Error('Your context changed. Refresh before saving OSM’s connection route.');
  const mapping = await readHomeProjection(target, { codexHome });
  if (enabled && mapping.state === 'saved' && mapping.projection.selectedMode !== routeMode) throw new Error('The saved Home mapping selected the separate official connection. OSM’s own route was not changed.');
  const path = await location(codexHome, target, true, '.connection.json');
  const text = JSON.stringify({ format: routeFormat, contextIdentity: contextIdentity(target), route: routeName, mode: routeMode, enabled }, null, 2) + '\n';
  let previous;
  const written = await replaceState(path, { expectedRevision, text, limit,
    decode: value => (previous = decode(value, target)),
    same: value => value.enabled === enabled,
    matches: async () => matches(await readContextRoute({ codexHome })),
    copy: { busy: 'Another connection route update is in progress. Try again when it finishes.', changed: 'OSM’s connection route changed. Refresh before saving again.',
      backup: 'Could not back up OSM’s connection route. No changes were made.' } });
  if (!written) return previous;
  const after = await readConnectionRoute(target, { codexHome });
  if (after.revision !== stateRevision(text)) throw new Error('OSM’s connection route changed again. Refresh to inspect it.');
  if (!matches(await readContextRoute({ codexHome }))) throw new Error('Your context changed. The route was saved for the previous context only.');
  return after;
}
