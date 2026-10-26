import { homedir } from 'node:os';
import { join } from 'node:path';
import { classifyTarget } from './target.mjs';
import { readContextRoute } from './context-route.mjs';
import { contextIdentity, location, snapshot, stateRevision, replaceState } from './sources.mjs';
import { notionId } from './notion-internal.mjs';

// Home's view state is a generated projection of one revision of the AI Operating
// Model's Data and Context Definition, which alone owns source and query identities.
// Setup generates it; it is replaced whole when that revision changes, refused
// without a revision, and never edited here or field by field. It is saved beside the
// context's navigation links as aios/panel/<hash>.home.json. Format
// osm-home-projection/1 is OSM's reviewed product contract; owner-preview schemas and
// legacy or custom models map into it through Setup. It holds identities, labels,
// verified field names, safe links, the selected connection mode and dated
// observations, never page bodies, records, credentials or policy.
export const projectionFormat = 'osm-home-projection/1';
export const contextRoles = ['profile', 'memory', 'documents', 'skills', 'related'];
// Support material the definition names but Home never lists, reads or shows as context.
export const supportKinds = ['core_rules', 'source_index', 'writing_procedure', 'access', 'evidence', 'maintenance', 'recovery_snapshot'];
export const modes = ['official_notion_user', 'internal_selected_pages'];
export const fieldKeys = { profile: ['description'], documents: ['description'], skills: ['description'],
  memory: ['description', 'fact', 'decision', 'why', 'evidence'] };
const accessStates = ['readable', 'inaccessible', 'unsupported'];
const capabilities = ['read_content', 'insert_content', 'update_content', 'read_comments'];
const limit = 32768;
const unavailable = 'The Home projection is unavailable. It has been left unchanged.';
const home = () => process.env.CODEX_HOME || join(homedir(), '.codex');
const invalid = what => { throw new Error(`Invalid Home projection: ${what}.`); };
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
const date = (value, what) => typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : invalid(what);
function observed(value, what) {
  only(value, ['at', 'access', 'capabilities'], what);
  const at = date(value.at, what + ' date');
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
  if (role === 'related' || role === 'support' || type === 'pages') { if (value != null) invalid(what); return undefined; }
  only(value, ['title', ...fieldKeys[role]], what);
  const clean = { title: text(value.title, 100, what + ' title') };
  for (const name of fieldKeys[role]) if (value[name] != null) clean[name] = text(value[name], 100, `${what} ${name}`);
  return clean;
}
const identities = section => section.destination.type === 'pages' ? section.destination.pages.map(page => page.id)
  : section.destination.id ? [section.destination.id, ...(section.destination.databaseId ? [section.destination.databaseId] : [])] : [];
export function normalizeProjection(projection) {
  only(projection, ['definition', 'selectedMode', 'connection', 'root', 'sections'], 'shape');
  only(projection.definition, ['id', 'title', 'revision', 'generatedAt'], 'definition');
  const revision = typeof projection.definition.revision === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,59}$/.test(projection.definition.revision)
    ? projection.definition.revision : invalid('definition revision');
  const definition = { id: id(projection.definition.id, 'definition id'), title: text(projection.definition.title, 100, 'definition title'),
    revision, generatedAt: date(projection.definition.generatedAt, 'generation time') };
  if (!modes.includes(projection.selectedMode)) invalid('selected mode');
  const selectedMode = projection.selectedMode;
  // The internal connection's identity is part of an internal projection only.
  let connection;
  if (selectedMode === 'internal_selected_pages') {
    only(projection.connection, ['kind', 'botId', 'workspaceId', 'workspaceName'], 'connection');
    if (projection.connection.kind !== 'notion-internal') invalid('connection kind');
    connection = { kind: 'notion-internal', botId: id(projection.connection.botId, 'connection bot'), workspaceId: id(projection.connection.workspaceId, 'connection workspace'),
      ...(projection.connection.workspaceName != null && { workspaceName: text(projection.connection.workspaceName, 100, 'workspace name') }) };
  } else if (projection.connection != null) invalid('connection for the official mode');
  only(projection.root, ['id', 'title', 'link', 'observed'], 'root');
  const root = { id: id(projection.root.id, 'root id'), title: text(projection.root.title, 100, 'root title'), link: link(projection.root.link, 'root link'), observed: observed(projection.root.observed, 'root observation') };
  if (!Array.isArray(projection.sections) || !projection.sections.length || projection.sections.length > 16) invalid('sections');
  const sections = projection.sections.map(section => {
    only(section, ['key', 'label', 'role', 'kind', 'order', 'destination', 'view', 'fields', 'observed'], 'section');
    const key = typeof section.key === 'string' && /^[a-z0-9-]{1,40}$/.test(section.key) ? section.key : invalid('section key');
    if (section.role === 'support') { if (!supportKinds.includes(section.kind)) invalid(`section ${key} support kind`); }
    else if (!contextRoles.includes(section.role) || section.kind != null) invalid(`section ${key} role`);
    if (!Number.isInteger(section.order) || section.order < 0 || section.order > 99) invalid(`section ${key} order`);
    const target = destination(section.destination, section.role, key);
    const clean = { key, label: text(section.label, 60, `section ${key} label`), role: section.role, ...(section.kind != null && { kind: section.kind }), order: section.order, destination: target };
    if (section.view != null && (target.type !== 'data_source' || section.role === 'support')) invalid(`section ${key} view`);
    const saved = view(section.view);
    if (saved) clean.view = saved;
    const mapped = fields(section.fields, section.role, target.type, key);
    if (mapped) clean.fields = mapped;
    if (target.type === 'data_source' && section.role !== 'support' && !mapped) invalid(`section ${key} fields`);
    if (!['related', 'support'].includes(section.role)) clean.observed = observed(section.observed, `section ${key} observation`);
    else if (section.observed != null) invalid(`section ${key} observation`);
    return clean;
  });
  if (new Set(sections.map(section => section.key)).size !== sections.length) invalid('duplicate section key');
  if (sections.filter(section => section.role === 'skills').length > 1) invalid('more than one skills source');
  if (sections.filter(section => !['related', 'support'].includes(section.role)).length > 12) invalid('more than twelve context sections');
  // Support material can never also be a source of Context records.
  const support = new Set(sections.filter(section => section.role === 'support').flatMap(identities));
  if (sections.some(section => section.role !== 'support' && identities(section).some(value => support.has(value)))) invalid('support source also mapped as context');
  sections.sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
  return { definition, selectedMode, ...(connection && { connection }), root, sections };
}

function decode(value, target) {
  if (value.text === null) return { state: 'missing', revision: value.revision };
  const data = JSON.parse(value.text);
  if (data.format !== projectionFormat || data.contextIdentity !== contextIdentity(target)) throw new Error(unavailable);
  return { state: 'saved', revision: value.revision, projection: normalizeProjection(data.projection) };
}
export async function readHomeProjection(target, { codexHome = home() } = {}) {
  try { return decode(await snapshot(await location(codexHome, target, false, '.home.json'), limit), target); }
  catch { return { state: 'unavailable' }; }
}
const content = projection => JSON.stringify({ ...projection, definition: { ...projection.definition, generatedAt: undefined } });
// Whole replacement for the current context, revision-checked like saveSources. Content
// can change only with a new definition revision; regenerating the same revision is a
// no-op, and a different body under the same revision is refused.
export async function saveHomeProjection({ target, expectedContextRevision, expectedRevision, projection }, { codexHome = home() } = {}) {
  const clean = normalizeProjection(projection);
  const matches = context => context.state === 'configured' && context.revision === expectedContextRevision
    && contextIdentity(context.target) === contextIdentity(target);
  if (!matches(await readContextRoute({ codexHome }))) throw new Error('Your context changed. Refresh before saving the Home projection.');
  const path = await location(codexHome, target, true, '.home.json');
  const text = JSON.stringify({ format: projectionFormat, contextIdentity: contextIdentity(target), projection: clean }, null, 2) + '\n';
  if (text.length > limit) invalid('too large');
  let previous;
  const written = await replaceState(path, { expectedRevision, text, limit,
    decode: value => {
      previous = decode(value, target);
      const before = previous.projection?.definition;
      if (before && before.id === clean.definition.id && before.revision === clean.definition.revision && content(previous.projection) !== content(clean))
        throw new Error('This definition revision already has a different Home projection. Regenerate it from a new definition revision.');
      return previous;
    },
    same: value => value.state === 'saved' && content(value.projection) === content(clean),
    matches: async () => matches(await readContextRoute({ codexHome })),
    copy: { busy: 'Another Home projection update is in progress. Try again when it finishes.', changed: 'The Home projection changed. Refresh before saving again.',
      backup: 'Could not back up the Home projection. No changes were made.' } });
  if (!written) return previous;
  const after = await readHomeProjection(target, { codexHome });
  if (after.revision !== stateRevision(text)) throw new Error('The Home projection changed again. Refresh to inspect it.');
  if (!matches(await readContextRoute({ codexHome }))) throw new Error('Your context changed. The projection was saved for the previous context only.');
  return after;
}
