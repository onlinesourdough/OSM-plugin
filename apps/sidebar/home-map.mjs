import { homedir } from 'node:os';
import { join } from 'node:path';
import { classifyTarget } from './target.mjs';
import { readContextRoute } from './context-route.mjs';
import { contextIdentity, location, snapshot, stateRevision, replaceState } from './sources.mjs';
import { notionId } from './notion-internal.mjs';

// Setup's bounded view mapping for Home, saved beside the context's navigation links
// as aios/panel/<hash>.home.json with its own revision. It names real destinations,
// roles, labels, order, verified fields, safe links, the connection identity and dated
// observations. It never holds page bodies, records, credentials or policy.
export const homeRoles = ['profile', 'memory', 'documents', 'skills', 'related'];
export const fieldKeys = { profile: ['description'], documents: ['description'], skills: ['description'],
  memory: ['description', 'fact', 'decision', 'why', 'evidence'] };
const accessStates = ['readable', 'inaccessible', 'unsupported'];
const capabilities = ['read_content', 'insert_content', 'update_content', 'read_comments'];
const limit = 32768;
const unavailable = 'The Home mapping is unavailable. It has been left unchanged.';
const home = () => process.env.CODEX_HOME || join(homedir(), '.codex');
const invalid = what => { throw new Error(`Invalid Home mapping: ${what}.`); };
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const only = (value, keys, what) => { if (!record(value) || Object.keys(value).some(key => !keys.includes(key))) invalid(what); };
function text(value, max, what, optional = false) {
  if (optional && value == null) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f\x7f]/.test(value)) invalid(what);
  return value.trim();
}
function id(value, what) { return notionId(value) || invalid(what); }
function link(value, what) {
  const route = classifyTarget(value);
  if (!route || route.kind === 'path' || /[<>]/.test(route.target)) invalid(what);
  return route.target;
}
function observed(value, what) {
  only(value, ['at', 'access', 'capabilities'], what);
  const at = typeof value.at === 'string' && value.at.length <= 40 && !Number.isNaN(Date.parse(value.at)) ? new Date(value.at).toISOString() : invalid(what + ' date');
  if (!accessStates.includes(value.access)) invalid(what + ' access');
  const caps = value.capabilities ?? [];
  if (!Array.isArray(caps) || caps.length > capabilities.length || caps.some(cap => !capabilities.includes(cap))) invalid(what + ' capabilities');
  return { at, access: value.access, ...(caps.length && { capabilities: [...new Set(caps)] }) };
}
// A saved filter is passed to Notion's data source query as given; it is bounded JSON.
function json(value, max, what) {
  const encoded = JSON.stringify(value);
  const depth = (item, level) => level > 8 ? invalid(what) : Array.isArray(item) ? item.forEach(child => depth(child, level + 1))
    : record(item) ? Object.values(item).forEach(child => depth(child, level + 1)) : undefined;
  if (encoded === undefined || encoded.length > max) invalid(what);
  depth(value, 0);
  return JSON.parse(encoded);
}
function view(value) {
  if (value == null) return undefined;
  only(value, ['name', 'id', 'filter', 'sorts'], 'view');
  const sorts = value.sorts ?? [];
  if (!Array.isArray(sorts) || sorts.length > 5) invalid('view sorts');
  const clean = sorts.map(sort => {
    only(sort, ['property', 'timestamp', 'direction'], 'view sort');
    if (!['ascending', 'descending'].includes(sort.direction) || (sort.property == null) === (sort.timestamp == null)) invalid('view sort');
    if (sort.timestamp != null && !['created_time', 'last_edited_time'].includes(sort.timestamp)) invalid('view sort');
    return sort.property != null ? { property: text(sort.property, 100, 'view sort'), direction: sort.direction } : { timestamp: sort.timestamp, direction: sort.direction };
  });
  return { ...(value.name != null && { name: text(value.name, 100, 'view name') }), ...(value.id != null && { id: text(value.id, 100, 'view id') }),
    ...(value.filter != null && { filter: record(value.filter) ? json(value.filter, 2000, 'view filter') : invalid('view filter') }), ...(clean.length && { sorts: clean }) };
}
function destination(value, role, key) {
  const what = `section ${key} destination`;
  if (role === 'related') {
    only(value, ['title', 'link'], what);
    return { title: text(value.title, 100, what + ' title'), link: link(value.link, what + ' link') };
  }
  if (value?.type === 'data_source') {
    only(value, ['type', 'id', 'databaseId', 'title', 'link'], what);
    return { type: 'data_source', id: id(value.id, what + ' id'), ...(value.databaseId != null && { databaseId: id(value.databaseId, what + ' database') }),
      title: text(value.title, 100, what + ' title'), link: link(value.link, what + ' link') };
  }
  if (value?.type === 'pages') {
    only(value, ['type', 'title', 'link', 'pages'], what);
    if (!Array.isArray(value.pages) || !value.pages.length || value.pages.length > 6) invalid(what + ' pages');
    const pages = value.pages.map(page => { only(page, ['id', 'title', 'link'], what + ' page');
      return { id: id(page.id, what + ' page id'), title: text(page.title, 100, what + ' page title'), link: link(page.link, what + ' page link') }; });
    if (new Set(pages.map(page => page.id)).size !== pages.length) invalid(what + ' pages');
    return { type: 'pages', title: text(value.title, 100, what + ' title'), link: link(value.link, what + ' link'), pages };
  }
  return invalid(what + ' type');
}
function fields(value, role, type, key) {
  const what = `section ${key} fields`;
  if (role === 'related' || type === 'pages') { if (value != null) invalid(what); return undefined; }
  only(value, ['title', ...fieldKeys[role]], what);
  const clean = { title: text(value.title, 100, what + ' title') };
  for (const name of fieldKeys[role]) if (value[name] != null) clean[name] = text(value[name], 100, `${what} ${name}`);
  return clean;
}
export function normalizeHomeMap(map) {
  only(map, ['connection', 'root', 'sections'], 'shape');
  only(map.connection, ['kind', 'botId', 'workspaceId', 'workspaceName'], 'connection');
  if (map.connection.kind !== 'notion-internal') invalid('connection kind');
  const connection = { kind: 'notion-internal', botId: id(map.connection.botId, 'connection bot'), workspaceId: id(map.connection.workspaceId, 'connection workspace'),
    ...(map.connection.workspaceName != null && { workspaceName: text(map.connection.workspaceName, 100, 'workspace name') }) };
  only(map.root, ['id', 'title', 'link', 'observed'], 'root');
  const root = { id: id(map.root.id, 'root id'), title: text(map.root.title, 100, 'root title'), link: link(map.root.link, 'root link'), observed: observed(map.root.observed, 'root observation') };
  if (!Array.isArray(map.sections) || !map.sections.length || map.sections.length > 12) invalid('sections');
  const sections = map.sections.map(section => {
    only(section, ['key', 'label', 'role', 'order', 'destination', 'view', 'fields', 'observed'], 'section');
    const key = typeof section.key === 'string' && /^[a-z0-9-]{1,40}$/.test(section.key) ? section.key : invalid('section key');
    if (!homeRoles.includes(section.role)) invalid(`section ${key} role`);
    if (!Number.isInteger(section.order) || section.order < 0 || section.order > 99) invalid(`section ${key} order`);
    const target = destination(section.destination, section.role, key);
    if (section.role !== 'related' && section.view != null && target.type !== 'data_source') invalid(`section ${key} view`);
    const clean = { key, label: text(section.label, 60, `section ${key} label`), role: section.role, order: section.order, destination: target };
    const saved = section.role === 'related' ? (section.view != null ? invalid(`section ${key} view`) : undefined) : view(section.view);
    if (saved) clean.view = saved;
    const mapped = fields(section.fields, section.role, target.type, key);
    if (mapped) clean.fields = mapped;
    if (target.type === 'data_source' && !mapped) invalid(`section ${key} fields`);
    if (section.role !== 'related') clean.observed = observed(section.observed, `section ${key} observation`);
    else if (section.observed != null) invalid(`section ${key} observation`);
    return clean;
  });
  if (new Set(sections.map(section => section.key)).size !== sections.length) invalid('duplicate section key');
  if (sections.filter(section => section.role === 'skills').length > 1) invalid('more than one skills source');
  sections.sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
  return { connection, root, sections };
}

function decode(value, target) {
  if (value.text === null) return { state: 'missing', revision: value.revision };
  const data = JSON.parse(value.text);
  if (data.version !== 1 || data.contextIdentity !== contextIdentity(target)) throw new Error(unavailable);
  return { state: 'saved', revision: value.revision, map: normalizeHomeMap(data.map) };
}
export async function readHomeMap(target, { codexHome = home() } = {}) {
  try { return decode(await snapshot(await location(codexHome, target, false, '.home.json'), limit), target); }
  catch { return { state: 'unavailable' }; }
}
// Revision-checked whole-mapping replacement for the current context, like saveSources.
export async function saveHomeMap({ target, expectedContextRevision, expectedRevision, map }, { codexHome = home() } = {}) {
  const clean = normalizeHomeMap(map);
  const matches = context => context.state === 'configured' && context.revision === expectedContextRevision
    && contextIdentity(context.target) === contextIdentity(target);
  if (!matches(await readContextRoute({ codexHome }))) throw new Error('Your context changed. Refresh before saving the Home mapping.');
  const path = await location(codexHome, target, true, '.home.json');
  const text = JSON.stringify({ version: 1, contextIdentity: contextIdentity(target), map: clean }, null, 2) + '\n';
  if (text.length > limit) invalid('too large');
  let previous;
  const written = await replaceState(path, { expectedRevision, text, limit,
    decode: value => (previous = decode(value, target)),
    same: value => value.state === 'saved' && JSON.stringify(value.map) === JSON.stringify(clean),
    matches: async () => matches(await readContextRoute({ codexHome })),
    copy: { busy: 'Another Home mapping update is in progress. Try again when it finishes.', changed: 'The Home mapping changed. Refresh before saving again.',
      backup: 'Could not back up the Home mapping. No changes were made.' } });
  if (!written) return previous;
  const after = await readHomeMap(target, { codexHome });
  if (after.revision !== stateRevision(text)) throw new Error('The Home mapping changed again. Refresh to inspect it.');
  if (!matches(await readContextRoute({ codexHome }))) throw new Error('Your context changed. The mapping was saved for the previous context only.');
  return after;
}
