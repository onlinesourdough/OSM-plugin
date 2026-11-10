import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { classifyTarget } from './target.mjs';
import { contextIdentity } from './sources.mjs';
import { createNotionClient, NotionReadError, notionId, pageTitle, plainText, propertyText, readBlocks, textProperties, readLimits } from './notion-internal.mjs';

import { readPageIcon } from './notion-icons.mjs';
import { hostCredential } from './credential.mjs';
export { hostCredential } from './credential.mjs';

const roleNouns = { profile: 'Profile', memory: 'Memory', documents: 'Document', content: 'Content item', skills: 'Personal skill' };
const fieldHeadings = { fact: 'Fact', decision: 'Decision', why: 'Why', evidence: 'Evidence' };
const failed = error => ({ state: error instanceof NotionReadError ? error.state : 'unavailable',
  ...(error?.retryAfter && { retryAfter: error.retryAfter }) });
const scopeOf = (identity, revision) => createHash('sha256').update(`${identity.botId}:${identity.workspaceId}:${revision}`).digest('hex').slice(0, 24);
const safeLink = (value, fallback) => classifyTarget(value)?.kind === 'notion' ? classifyTarget(value).target : fallback;
// The page a pasted Notion link or bare ID names, or null.
const linkId = value => {
  const target = classifyTarget(value);
  return target?.kind === 'notion' ? notionId(new URL(target.target).pathname.replaceAll('-', '').match(/([a-f0-9]{32})\/?$/i)?.[1]) : notionId(value);
};
// Every state the host credential can report that stops a read before any request.
const credentialStops = new Set(['unsupported_host', 'not_enabled', 'unavailable', 'keychain_blocked', 'keychain_timeout']);

// The method list and a method's text both come through this one loader, so the package boundary is the
// same for both. Under the package's skills folder it needs a real folder (a symlinked folder is not one,
// and the folder must resolve to its own place), then a real, unlinked SKILL.md within the size bound, and
// all of that is checked before a byte is read. The file is then opened without following a link and read
// through the handle for at most the bound, so a file that changes after the check still cannot be read
// past it. Anything else returns null: it is neither listed nor readable.
const skillTextLimit = 128 * 1024, skillBlockLimit = 400, skillBlockText = 4000;
async function bundledSkillText(root, name) {
  if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,59}$/.test(name)) return null;
  const folder = join(root, name), file = join(folder, 'SKILL.md');
  let handle;
  try {
    if (!(await lstat(folder)).isDirectory()) return null;
    if (await realpath(folder) !== join(await realpath(root), name)) return null;
    const info = await lstat(file);
    if (!info.isFile() || info.size > skillTextLimit) return null;
    handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== info.dev || opened.ino !== info.ino || opened.size > skillTextLimit) return null;
    const buffer = Buffer.alloc(skillTextLimit + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return bytesRead > skillTextLimit ? null : new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, bytesRead));
  } catch { return null; } finally { await handle?.close(); }
}

// Shared OSM methods, from the installed package's own skill metadata.
export async function readBuiltinSkills(root) {
  const skills = [];
  for (const name of (await readdir(root).catch(() => [])).sort().slice(0, 60)) {
    const text = await bundledSkillText(root, name) ?? '';
    const front = text.startsWith('---\n') ? text.slice(4, text.indexOf('\n---', 4)) : '';
    const field = key => front.match(new RegExp(`^${key}: (.+)$`, 'm'))?.[1].trim().replace(/^(["'])(.*)\1$/, '$2');
    const id = field('name'), description = field('description');
    if (id === name && description) skills.push({ name: id.slice(0, 60), description: description.slice(0, 300) });
  }
  return skills;
}

// One bundled skill's SKILL.md as plain blocks, for the Settings reader. The name must be one the package's
// own skills folder lists (never a path); a folder or file that is a link or over the bound is not listed, so
// it is inaccessible here, and nothing outside the package is read. The text is bounded package content, not
// owner data, and is shown as text only.
export async function readBuiltinSkill(root, name) {
  const listed = typeof name === 'string' ? (await readBuiltinSkills(root)).find(skill => skill.name === name) : undefined;
  if (!listed) return { state: 'inaccessible' };
  const text = await bundledSkillText(root, name);
  if (text === null) return { state: 'unavailable' };
  const front = text.startsWith('---\n') ? text.indexOf('\n---', 4) : -1;
  const body = front > 0 ? text.slice(front + 4).replace(/^\r?\n/, '') : text;
  const blocks = []; let paragraph = [], fence = null, truncated = false;
  const push = (kind, value) => {
    if (blocks.length >= skillBlockLimit) { truncated = true; return; }
    const clipped = value.length > skillBlockText; if (clipped) truncated = true;
    blocks.push({ kind, depth: 0, text: value.slice(0, skillBlockText) });
  };
  const flush = () => { if (paragraph.length) push('text', paragraph.join(' ')); paragraph = []; };
  for (const line of body.split(/\r?\n/)) {
    if (/^```/.test(line)) { if (fence) { push('code', fence.join('\n')); fence = null; } else { flush(); fence = []; } continue; }
    if (fence) { fence.push(line); continue; }
    const heading = line.match(/^#{1,6}\s+(.*\S)\s*$/), item = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*\S)\s*$/);
    if (heading) { flush(); push('heading', heading[1]); }
    else if (item) { flush(); push('item', item[1]); }
    else if (!line.trim()) flush();
    else paragraph.push(line.trim());
  }
  if (fence) push('code', fence.join('\n'));
  flush();
  return { state: 'read', record: { title: name, meta: 'Built into OSM', description: listed.description, fields: [], blocks, truncated } };
}

// Home reads only through the projection's selected connection mode and never moves to
// another mode or connection after a denial or when the mode is unavailable. This
// release reads through OSM's internal connection only: an official_notion_user
// projection reports official_mode and makes no request.
export function createHomeService({ credential = hostCredential, route = async () => ({ enabled: false, source: 'none' }), transport, readProjection }) {
  // Every call checks the mode, then the owner's opt-in for this context, the current
  // credential and its identity against the projection. No opt-in means no credential read.
  async function open() {
    const mapping = await readProjection();
    if (mapping.state === 'saved' && mapping.projection.selectedMode !== 'internal_selected_pages') return { mapping, state: 'official_mode' };
    const optIn = await route(mapping.target).catch(() => ({ enabled: false, source: 'none' }));
    const secret = await credential({ enabled: Boolean(optIn?.enabled) });
    if (secret?.state !== 'available') return { mapping, state: credentialStops.has(secret?.state) ? secret.state : 'not_connected' };
    let client, identity;
    try { client = createNotionClient({ token: secret.token, transport }); identity = await client.identity(); }
    catch (error) { return { mapping, ...failed(error) }; }
    const source = optIn?.source || 'none';
    // The saved access link counts only for the bot and workspace the live connection actually is.
    const manage = optIn?.manage && optIn.manage.botId === identity.botId && optIn.manage.workspaceId === identity.workspaceId ? optIn.manage.link : undefined;
    if (mapping.state === 'missing') return { mapping, identity, client, optIn: source, manage, state: 'unmapped' };
    if (mapping.state !== 'saved') return { mapping, identity, optIn: source, manage, state: 'mapping_unavailable' };
    const expected = mapping.projection.connection;
    if (expected.botId !== identity.botId || expected.workspaceId !== identity.workspaceId) return { mapping, identity, optIn: source, state: 'account_changed' };
    return { mapping, identity, client, optIn: source, manage, state: 'ready', scope: scopeOf(identity, mapping.revision) };
  }
  // Related links are never read and support material is never Context.
  const readable = item => !['related', 'support'].includes(item.role);
  const section = (session, key) => session.mapping.projection.sections.find(item => item.key === key && readable(item));
  // I1, support containment: one predicate decides for every list and read path whether
  // a page or data source is support material or inside it. It walks the parent chain:
  // page parents through page metadata reads, at most ancestryBound per item (cached
  // within a call), and a data source through the schema already fetched for its
  // section (its database and that database's documented `database_parent`). It never
  // reads a database. It stops clear at the mapped root or the workspace. Anything it
  // can't resolve within the bound is refused as unresolved: a block parent, an
  // unreadable parent, a data source without a fetched schema, a database parent of a
  // database.
  const ancestryBound = 3;
  const supportIds = session => new Set(session.mapping.projection.sections.filter(item => item.role === 'support').flatMap(item => item.destination.type === 'pages'
    ? item.destination.pages.map(page => page.id) : [item.destination.id, ...(item.destination.databaseId ? [item.destination.databaseId] : [])]));
  const walkFor = (schemas = []) => ({ pages: new Map(), schemas: new Map(schemas) });
  async function containment(session, id, parent, walk) {
    const support = supportIds(session), root = session.mapping.projection.root.id;
    // `hops` counts every ancestor page step for this item, cached or not, so the result
    // never depends on what an earlier item in the same call happened to read.
    let ids = [id], hops = 0;
    for (;;) {
      if (ids.some(value => value && support.has(value))) return 'support';
      if (ids.includes(root)) return 'clear';
      switch (parent?.type) {
        case 'workspace': return 'clear';
        case 'page_id': {
          const next = notionId(parent.page_id);
          if (!next) return 'unresolved';
          let page;
          if (!support.has(next) && next !== root) {
            if (hops >= ancestryBound) return 'unresolved';
            hops++;
            page = walk.pages.get(next);
            if (!page) {
              try { page = await session.client.page(next); } catch (error) { if (failed(error).state === 'inaccessible') return 'unresolved'; throw error; }
              walk.pages.set(next, page);
            }
          }
          ids = [next]; parent = page?.parent; continue;
        }
        case 'data_source_id': {
          const source = notionId(parent.data_source_id), schema = walk.schemas.get(source);
          if ([source, notionId(parent.database_id)].some(value => value && support.has(value))) return 'support';
          if (!schema) return 'unresolved';
          // The schema's own parent: normally its database. An externally synced source
          // can have another data source as parent; it is support when either ID is, and
          // otherwise unresolved, since that source is never read.
          const above = schema.parent;
          if (above?.type === 'data_source_id') {
            return [above.data_source_id, above.database_id].some(value => notionId(value) && support.has(notionId(value))) ? 'support' : 'unresolved';
          }
          if (above?.type !== 'database_id' || !notionId(above.database_id)) return 'unresolved';
          ids = [source, notionId(above.database_id)]; parent = schema.database_parent; continue;
        }
        case 'database_id': return support.has(notionId(parent.database_id)) ? 'support' : 'unresolved';
        default: return 'unresolved';
      }
    }
  }

  // Agent and Home share this service, credential and verified identity. No
  // raw token or external connector identity crosses the tool boundary.
  async function connection() {
    const session = await open();
    return { state: session.state, ...(session.identity && { connection: session.identity }),
      credentialRoute: 'macos-keychain-opt-in', ...(session.optIn && { optIn: session.optIn }), accessInventory: 'mapped-sources-only' };
  }

  async function status() {
    const checkedAt = new Date().toISOString();
    const session = await open();
    const saved = session.mapping.state === 'saved' ? session.mapping.projection : null;
    // L-2: every status names the context its projection was read for; all returns below spread base.
    const base = { mapping: session.mapping.state, checkedAt, ...(session.mapping.target && { context: session.mapping.target }),
      ...(session.identity && { workspaceName: session.identity.workspaceName }),
      ...(saved && { definitionRevision: saved.definition.revision, selectedMode: saved.selectedMode }),
      ...(session.manage && { manageLink: session.manage }) };
    if (session.state !== 'ready') return { ...base, state: session.state, ...(session.retryAfter && { retryAfter: session.retryAfter }) };
    const { root, sections } = saved;
    // Connected requires this identity and a successful read of the mapped root now.
    // A trashed root is not a readable Home.
    let rootPage;
    try { rootPage = await session.client.page(root.id); if (rootPage.in_trash) return { ...base, state: 'root_inaccessible' }; }
    catch (error) {
      const problem = failed(error);
      return { ...base, state: problem.state === 'inaccessible' ? 'root_inaccessible' : problem.state, ...(problem.retryAfter && { retryAfter: problem.retryAfter }) };
    }
    const support = sections.filter(item => item.role === 'support').length;
    return { ...base, state: 'ready', scope: session.scope, verifiedAt: new Date().toISOString(), root: { title: pageTitle(rootPage) || root.title, icon: await readPageIcon(rootPage.icon), link: root.link },
      // Status verifies only the root. A Content route is optional and its saved title, link and label are
      // the owner's, so status names it only as a neutral routing entry (its key and role): Home asks for its
      // list, and the title and link come back only inside that list's own result, which proves access to it.
      sections: sections.filter(item => item.role !== 'support').map(item => item.role === 'content' ? { key: item.key, label: 'Content', role: 'content' }
        : { key: item.key, label: item.label, role: item.role, title: item.destination.title, link: item.destination.link,
          ...(item.role === 'skills' && { describes: Boolean(item.fields?.description) }) }), ...(support && { supportHidden: support }) };
  }

  async function list({ key, cursor, query = '' }) {
    const session = await open();
    if (session.state !== 'ready') return { state: session.state, ...(session.retryAfter && { retryAfter: session.retryAfter }) };
    const item = section(session, key);
    if (!item) return { state: 'unmapped', scope: session.scope };
    try {
      const target = item.destination;
      if (target.type === 'pages') {
        // A page list is the mapped pages themselves, each read under the current grant.
        const items = [], walk = walkFor(); let denied = 0, excluded = 0;
        for (const page of target.pages) {
          try {
            const value = await session.client.page(page.id);
            const where = value.in_trash ? 'trash' : await containment(session, page.id, value.parent, walk);
            if (where === 'support') excluded++; else if (where !== 'clear') denied++; else items.push({ id: page.id, title: pageTitle(value) || 'Untitled', icon: await readPageIcon(value.icon) });
          } catch (error) { if (failed(error).state !== 'inaccessible') throw error; denied++; }
        }
        const notes = excluded ? { supportExcluded: excluded } : {};
        // For a Content route, a result that proves access also carries the saved title and link for display.
        const named = item.role === 'content' ? { source: { title: item.label, link: target.link } } : {};
        if (!items.length) return { state: denied ? 'inaccessible' : 'empty', scope: session.scope, ...(!denied && named), ...notes };
        return { state: 'listed', scope: session.scope, ...named, items: query ? items.filter(item => item.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 5) : items, hasMore: false, ...(denied && { withheld: denied }), ...notes };
      }
      // The data source's schema must still hold the verified fields before any query.
      const schema = await session.client.dataSource(target.id);
      if (target.databaseId && notionId(schema.parent?.database_id) !== target.databaseId) return { state: 'unsupported', scope: session.scope };
      // A source inside support material, or one whose place can't be resolved, lists nothing.
      const walk = walkFor([[target.id, schema]]);
      const where = await containment(session, target.id, { type: 'data_source_id', data_source_id: target.id, database_id: schema.parent?.database_id }, walk);
      if (where !== 'clear') return { state: 'unsupported', scope: session.scope, contained: where };
      const types = Object.fromEntries(Object.entries(schema.properties || {}).map(([name, value]) => [name, value?.type]));
      if (types[item.fields.title] !== 'title') return { state: 'unsupported', scope: session.scope };
      const source = { title: plainText(schema.title).trim().slice(0, 200) || item.label, icon: await readPageIcon(schema.icon),
        ...(item.role === 'content' && { link: item.destination.link }) };
      const description = item.fields.description && textProperties.has(types[item.fields.description]) ? item.fields.description : undefined;
      const titleFilter = { property: item.fields.title, title: { contains: query } };
      const filter = query ? item.view?.filter ? { and: [item.view.filter, titleFilter] } : titleFilter : item.view?.filter;
      const result = await session.client.query(target.id, { filter, sorts: item.view?.sorts, cursor,
        size: query ? 5 : readLimits.pageSize, properties: [item.fields.title, ...(description ? [description] : [])] });
      const rows = (Array.isArray(result.results) ? result.results : [])
        .filter(page => page?.object === 'page' && !page.in_trash && notionId(page.parent?.data_source_id) === target.id && notionId(page.id));
      // The same predicate per row; rows share the source's chain, so this reads nothing more.
      const places = [];
      for (const page of rows) places.push(await containment(session, notionId(page.id), page.parent, walk));
      const excluded = places.filter(place => place === 'support').length, withheld = places.filter(place => place === 'unresolved').length;
      const items = await Promise.all(rows.filter((page, index) => places[index] === 'clear')
        .slice(0, query ? 5 : readLimits.pageSize).map(async page => {
          const text = description ? propertyText(page.properties?.[description]).trim().slice(0, 300) : '';
          return { id: notionId(page.id), icon: await readPageIcon(page.icon), title: propertyText(page.properties?.[item.fields.title]).trim().slice(0, 200) || 'Untitled', ...(text && { description: text }) };
        }));
      const next = result.has_more && typeof result.next_cursor === 'string' && result.next_cursor.length <= 200 ? result.next_cursor : undefined;
      const notes = { ...(result.request_status?.type === 'incomplete' && { partial: true }), ...(excluded && { supportExcluded: excluded }), ...(withheld && { withheld }) };
      if (!items.length && !cursor && !next) return { state: 'empty', scope: session.scope, source, ...notes };
      return { state: 'listed', scope: session.scope, source, items, hasMore: Boolean(next), ...(next && { cursor: next }), ...notes };
    } catch (error) { return { ...failed(error), scope: session.scope }; }
  }

  async function read({ key, id }) {
    const session = await open();
    if (session.state !== 'ready') return { state: session.state, ...(session.retryAfter && { retryAfter: session.retryAfter }) };
    const item = section(session, key), recordId = notionId(id);
    if (!item || !recordId) return { state: 'inaccessible', scope: session.scope };
    const target = item.destination;
    // Only mapped pages, or pages whose verified parent is the mapped data source.
    // Named support pages are refused before any request.
    if ((target.type === 'pages' && !target.pages.some(page => page.id === recordId)) || supportIds(session).has(recordId)) return { state: 'inaccessible', scope: session.scope };
    try {
      const page = await session.client.page(recordId);
      if (page.in_trash || (target.type === 'data_source' && notionId(page.parent?.data_source_id) !== target.id)) return { state: 'inaccessible', scope: session.scope };
      // The list's predicate, before any title, field or block is used: for a data source
      // record its source's schema is read and checked exactly as the list checks it.
      let walk = walkFor();
      if (target.type === 'data_source') {
        const schema = await session.client.dataSource(target.id);
        if (target.databaseId && notionId(schema.parent?.database_id) !== target.databaseId) return { state: 'unsupported', scope: session.scope };
        walk = walkFor([[target.id, schema]]);
      }
      if (await containment(session, recordId, page.parent, walk) !== 'clear') return { state: 'inaccessible', scope: session.scope };
      const properties = page.properties || {};
      // Property text over the display bound is cut and the article says it is partial.
      let cut = false;
      const value = name => {
        if (!name || !textProperties.has(properties[name]?.type)) return '';
        const text = propertyText(properties[name]).trim();
        if (text.length > 4000) cut = true;
        return text.slice(0, 4000);
      };
      const title = (item.fields ? value(item.fields.title) : '') || pageTitle(page) || 'Untitled';
      const fields = [];
      if (item.fields) {
        const description = value(item.fields.description);
        if (description) fields.push({ heading: '', text: description });
        for (const [field, heading] of Object.entries(fieldHeadings)) {
          const text = value(item.fields[field]);
          if (text) fields.push({ heading, text });
        }
      }
      const { blocks, truncated } = await readBlocks(session.client, recordId);
      const noun = roleNouns[item.role];
      return { state: 'read', scope: session.scope, record: { title, icon: await readPageIcon(page.icon), meta: noun.toLowerCase() === item.label.toLowerCase() ? item.label : `${item.label} · ${noun}`,
        fields, blocks, truncated, ...(cut && { fieldsTruncated: true }), link: safeLink(page.url, `https://www.notion.so/${recordId}`) } };
    } catch (error) { return { ...failed(error), scope: session.scope }; }
  }
  // Resolve links without exposing any metadata until membership and containment pass.
  async function locate({ link }) {
    const session = await open();
    if (session.state !== 'ready') return { state: session.state };
    const target = classifyTarget(link), id = target?.kind === 'notion' ? linkId(link) : null;
    if (!id || supportIds(session).has(id)) return { state: 'outside', scope: session.scope };
    try {
      const value = await session.client.page(id);
      if (value.in_trash) return { state: 'inaccessible', scope: session.scope };
      for (const item of session.mapping.projection.sections.filter(readable)) {
        const dest = item.destination;
        if (!(dest.type === 'pages' ? dest.pages.some(page => page.id === id) : notionId(value.parent?.data_source_id) === dest.id)) continue;
        let walk = walkFor();
        if (dest.type === 'data_source') {
          const schema = await session.client.dataSource(dest.id);
          if (dest.databaseId && notionId(schema.parent?.database_id) !== dest.databaseId) continue;
          walk = walkFor([[dest.id, schema]]);
        }
        if (await containment(session, id, value.parent, walk) === 'clear') return { state: 'located', scope: session.scope, key: item.key, id };
      }
      return { state: 'outside', scope: session.scope };
    } catch (error) { return { ...failed(error), scope: session.scope }; }
  }
  async function readPage(session) {
    if (session.state !== 'ready') return { state: session.state };
    try {
      const root = session.mapping.projection.root;
      const value = await session.client.page(root.id);
      if (value.in_trash) return { state: 'root_inaccessible', scope: session.scope };
      const content = await readBlocks(session.client, root.id);
      return { state: 'read', scope: session.scope, record: { title: pageTitle(value) || root.title,
        icon: await readPageIcon(value.icon), meta: 'Data & Context', fields: [], ...content, link: root.link } };
    } catch (error) {
      const result = failed(error);
      return { ...result, state: result.state === 'inaccessible' ? 'root_inaccessible' : result.state, scope: session.scope };
    }
  }
  const page = async () => readPage(await open());

  // Before any projection exists there is nothing to map from, so the bootstrap read goes
  // only to the root the owner already selected as the context home, through the same
  // connection and identity check, never a search or another page. It returns the root's
  // bounded content (which holds the definition) with the evidence a projection save needs:
  // the connection's bot and workspace, the context and its revision, and the projection's
  // current revision. `check` may name destinations the root's own text names (at most
  // eight): each is read once for access, title and property names and types, never values
  // or bodies. Containment, support exclusion and the owner's grants are then applied by the
  // normal reader on every later read; a destination outside the grant reads as inaccessible.
  const idPattern = /[0-9a-f]{32}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/gi;
  const maxChecks = 8;
  async function destination(client, id) {
    let denied = false;
    for (const [kind, read] of [['page', () => client.page(id)], ['data_source', () => client.dataSource(id)], ['database', () => client.database(id)]]) {
      let value;
      try { value = await read(); }
      catch (error) {
        const problem = failed(error);
        if (['inaccessible', 'unsupported'].includes(problem.state)) { denied ||= problem.state === 'inaccessible'; continue; }
        return { id, ...problem };
      }
      if (kind === 'page') return { id, kind, state: value.in_trash ? 'inaccessible' : 'readable', ...(!value.in_trash && { title: pageTitle(value) || 'Untitled' }) };
      if (kind === 'data_source') return { id, kind, state: 'readable', title: plainText(value.title).trim().slice(0, 200) || 'Untitled',
        ...(notionId(value.parent?.database_id) && { databaseId: notionId(value.parent.database_id) }),
        properties: Object.entries(value.properties || {}).slice(0, 60).map(([name, property]) => ({ name: name.slice(0, 100), type: String(property?.type ?? 'unknown').slice(0, 40) })) };
      return { id, kind, state: 'readable', title: plainText(value.title).trim().slice(0, 200) || 'Untitled',
        dataSources: (Array.isArray(value.data_sources) ? value.data_sources : []).slice(0, 10).filter(item => notionId(item?.id))
          .map(item => ({ id: notionId(item.id), name: String(item.name ?? '').slice(0, 100) })) };
    }
    return { id, state: denied ? 'inaccessible' : 'unsupported' };
  }
  async function bootstrap(session, check) {
    const { mapping, identity, client } = session;
    if (!mapping.target) return { state: 'no_context' };
    let rootId;
    try { const key = contextIdentity(mapping.target); rootId = key.startsWith('notion:') ? key.slice(7) : null; } catch { rootId = null; }
    if (!rootId || !notionId(rootId)) return { state: 'unsupported_context' };
    try {
      const value = await client.page(rootId);
      if (value.in_trash) return { state: 'root_inaccessible' };
      const content = await readBlocks(client, rootId);
      const named = new Set(content.blocks.flatMap(block => (block.text.match(idPattern) || []).map(notionId)));
      const wanted = [...new Set(check.map(linkId))].slice(0, maxChecks);
      const checks = [];
      for (const id of wanted) {
        if (!id) checks.push({ state: 'unsupported' });
        else if (id !== rootId && !named.has(id)) checks.push({ id, state: 'not_named' });
        else { checks.push(await destination(client, id)); if (['rate_limited', 'not_connected', 'unavailable'].includes(checks.at(-1).state)) break; }
      }
      return { state: 'bootstrap_read', checkedAt: new Date().toISOString(), connection: identity, optIn: session.optIn,
        context: { target: mapping.target, revision: mapping.contextRevision }, projectionRevision: mapping.revision,
        root: { id: rootId, title: pageTitle(value) || 'Untitled', link: mapping.target }, ...content, ...(checks.length && { checks }) };
    } catch (error) {
      const result = failed(error);
      return { ...result, state: result.state === 'inaccessible' ? 'root_inaccessible' : result.state };
    }
  }
  // The model's view of the home: the mapped root once Home is ready, or the bootstrap read
  // while the selected context has no projection yet. Every other state reads nothing.
  async function contextHome({ check = [] } = {}) {
    const session = await open();
    if (session.state === 'unmapped') return bootstrap(session, check);
    return readPage(session);
  }
  return { connection, status, list, read, page, locate, contextHome };
}
