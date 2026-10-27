import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { classifyTarget } from './target.mjs';
import { createNotionClient, NotionReadError, notionId, pageTitle, propertyText, readBlocks, textProperties, readLimits } from './notion-internal.mjs';

// The host secret mechanisms OSM may read its internal Notion token from. Each entry
// needs a documented, supported secure store that injects the value into this
// process. None is declared in this release, so every host reports unsupported:
// - Codex: stdio MCP servers receive `env`/`env_vars` from config.toml or Codex's
//   own environment; no secure store is documented for stdio servers.
// - Claude Code: a plugin's `userConfig` option with `sensitive: true` is kept in the
//   platform credential store and substituted into its MCP server `env`, but OSM
//   declares no Claude MCP server yet (#61/#82).
// OSM never writes, prompts for or accepts a token itself.
export function hostCredential() { return { state: 'unsupported_host' }; }

const roleNouns = { profile: 'Profile', memory: 'Memory', documents: 'Document', skills: 'Personal skill' };
const fieldHeadings = { fact: 'Fact', decision: 'Decision', why: 'Why', evidence: 'Evidence' };
const failed = error => ({ state: error instanceof NotionReadError ? error.state : 'unavailable',
  ...(error?.retryAfter && { retryAfter: error.retryAfter }) });
const scopeOf = (identity, revision) => createHash('sha256').update(`${identity.botId}:${identity.workspaceId}:${revision}`).digest('hex').slice(0, 24);
const safeLink = (value, fallback) => classifyTarget(value)?.kind === 'notion' ? classifyTarget(value).target : fallback;

// Shared OSM methods, from the installed package's own skill metadata.
export async function readBuiltinSkills(root) {
  const skills = [];
  for (const name of (await readdir(root).catch(() => [])).sort().slice(0, 60)) {
    const text = await readFile(join(root, name, 'SKILL.md'), 'utf8').catch(() => '');
    const front = text.startsWith('---\n') ? text.slice(4, text.indexOf('\n---', 4)) : '';
    const field = key => front.match(new RegExp(`^${key}: (.+)$`, 'm'))?.[1].trim().replace(/^(["'])(.*)\1$/, '$2');
    const id = field('name'), description = field('description');
    if (id === name && description) skills.push({ name: id.slice(0, 60), description: description.slice(0, 300) });
  }
  return skills;
}

// Home reads only through the projection's selected connection mode and never moves to
// another mode or connection after a denial or when the mode is unavailable. This
// release reads through OSM's internal connection only: an official_notion_user
// projection reports official_mode and makes no request.
export function createHomeService({ credential = hostCredential, transport, readProjection }) {
  // Every call checks the mode, then the current credential and identity against the projection.
  async function open() {
    const mapping = await readProjection();
    if (mapping.state === 'saved' && mapping.projection.selectedMode !== 'internal_selected_pages') return { mapping, state: 'official_mode' };
    const secret = await credential();
    if (secret?.state === 'unsupported_host') return { mapping, state: 'unsupported_host' };
    if (secret?.state !== 'available') return { mapping, state: 'not_connected' };
    let client, identity;
    try { client = createNotionClient({ token: secret.token, transport }); identity = await client.identity(); }
    catch (error) { return { mapping, ...failed(error) }; }
    if (mapping.state === 'missing') return { mapping, identity, state: 'unmapped' };
    if (mapping.state !== 'saved') return { mapping, identity, state: 'mapping_unavailable' };
    const expected = mapping.projection.connection;
    if (expected.botId !== identity.botId || expected.workspaceId !== identity.workspaceId) return { mapping, identity, state: 'account_changed' };
    return { mapping, identity, client, state: 'ready', scope: scopeOf(identity, mapping.revision) };
  }
  // Related links are never read and support material is never Context.
  const readable = item => !['related', 'support'].includes(item.role);
  const section = (session, key) => session.mapping.projection.sections.find(item => item.key === key && readable(item));
  // Pages the definition names as support material stay out of every context list and
  // read, including when they are rows of a data source mapped as context.
  const supportPages = session => new Set(session.mapping.projection.sections.filter(item => item.role === 'support' && item.destination.type === 'pages')
    .flatMap(item => item.destination.pages.map(page => page.id)));

  async function status() {
    const checkedAt = new Date().toISOString();
    const session = await open();
    const saved = session.mapping.state === 'saved' ? session.mapping.projection : null;
    const base = { mapping: session.mapping.state, checkedAt, ...(session.identity && { workspaceName: session.identity.workspaceName }),
      ...(saved && { definitionRevision: saved.definition.revision, selectedMode: saved.selectedMode }) };
    if (session.state !== 'ready') return { ...base, state: session.state, ...(session.retryAfter && { retryAfter: session.retryAfter }) };
    const { root, sections } = saved;
    // Connected requires this identity and a successful read of the mapped root now.
    // A trashed root is not a readable Home.
    try { if ((await session.client.page(root.id)).in_trash) return { ...base, state: 'root_inaccessible' }; }
    catch (error) {
      const problem = failed(error);
      return { ...base, state: problem.state === 'inaccessible' ? 'root_inaccessible' : problem.state, ...(problem.retryAfter && { retryAfter: problem.retryAfter }) };
    }
    const support = sections.filter(item => item.role === 'support').length;
    return { ...base, state: 'ready', scope: session.scope, verifiedAt: new Date().toISOString(), root: { title: root.title, link: root.link },
      sections: sections.filter(item => item.role !== 'support').map(item => ({ key: item.key, label: item.label, role: item.role, title: item.destination.title, link: item.destination.link,
        ...(item.role === 'skills' && { describes: Boolean(item.fields?.description) }) })), ...(support && { supportHidden: support }) };
  }

  async function list({ key, cursor }) {
    const session = await open();
    if (session.state !== 'ready') return { state: session.state, ...(session.retryAfter && { retryAfter: session.retryAfter }) };
    const item = section(session, key);
    if (!item) return { state: 'unmapped', scope: session.scope };
    try {
      const target = item.destination;
      if (target.type === 'pages') {
        // A page list is the mapped pages themselves, each read under the current grant.
        const items = []; let denied = 0;
        for (const page of target.pages) {
          try { const value = await session.client.page(page.id); if (value.in_trash) denied++; else items.push({ id: page.id, title: pageTitle(value) || 'Untitled' }); }
          catch (error) { if (failed(error).state !== 'inaccessible') throw error; denied++; }
        }
        if (!items.length) return { state: denied ? 'inaccessible' : 'empty', scope: session.scope };
        return { state: 'listed', scope: session.scope, items, hasMore: false, ...(denied && { withheld: denied }) };
      }
      // The data source's schema must still hold the verified fields before any query.
      const schema = await session.client.dataSource(target.id);
      if (target.databaseId && notionId(schema.parent?.database_id) !== target.databaseId) return { state: 'unsupported', scope: session.scope };
      const types = Object.fromEntries(Object.entries(schema.properties || {}).map(([name, value]) => [name, value?.type]));
      if (types[item.fields.title] !== 'title') return { state: 'unsupported', scope: session.scope };
      const description = item.fields.description && textProperties.has(types[item.fields.description]) ? item.fields.description : undefined;
      const result = await session.client.query(target.id, { filter: item.view?.filter, sorts: item.view?.sorts, cursor,
        size: readLimits.pageSize, properties: [item.fields.title, ...(description ? [description] : [])] });
      const support = supportPages(session);
      const rows = (Array.isArray(result.results) ? result.results : [])
        .filter(page => page?.object === 'page' && !page.in_trash && notionId(page.parent?.data_source_id) === target.id && notionId(page.id));
      const excluded = rows.filter(page => support.has(notionId(page.id))).length;
      const items = rows.filter(page => !support.has(notionId(page.id)))
        .slice(0, readLimits.pageSize).map(page => {
          const text = description ? propertyText(page.properties?.[description]).trim().slice(0, 300) : '';
          return { id: notionId(page.id), title: propertyText(page.properties?.[item.fields.title]).trim().slice(0, 200) || 'Untitled', ...(text && { description: text }) };
        });
      const next = result.has_more && typeof result.next_cursor === 'string' && result.next_cursor.length <= 200 ? result.next_cursor : undefined;
      const notes = { ...(result.request_status?.type === 'incomplete' && { partial: true }), ...(excluded && { supportExcluded: excluded }) };
      if (!items.length && !cursor && !next) return { state: 'empty', scope: session.scope, ...notes };
      return { state: 'listed', scope: session.scope, items, hasMore: Boolean(next), ...(next && { cursor: next }), ...notes };
    } catch (error) { return { ...failed(error), scope: session.scope }; }
  }

  async function read({ key, id }) {
    const session = await open();
    if (session.state !== 'ready') return { state: session.state, ...(session.retryAfter && { retryAfter: session.retryAfter }) };
    const item = section(session, key), recordId = notionId(id);
    if (!item || !recordId) return { state: 'inaccessible', scope: session.scope };
    const target = item.destination;
    // Only mapped pages, or pages whose verified parent is the mapped data source.
    // Support pages are refused before any request for their content.
    if ((target.type === 'pages' && !target.pages.some(page => page.id === recordId)) || supportPages(session).has(recordId)) return { state: 'inaccessible', scope: session.scope };
    try {
      const page = await session.client.page(recordId);
      if (page.in_trash || (target.type === 'data_source' && notionId(page.parent?.data_source_id) !== target.id)) return { state: 'inaccessible', scope: session.scope };
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
      return { state: 'read', scope: session.scope, record: { title, meta: noun.toLowerCase() === item.label.toLowerCase() ? item.label : `${item.label} · ${noun}`,
        fields, blocks, truncated, ...(cut && { fieldsTruncated: true }), link: safeLink(page.url, target.link) } };
    } catch (error) { return { ...failed(error), scope: session.scope }; }
  }
  return { status, list, read };
}
