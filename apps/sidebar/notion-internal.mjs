// OSM's own internal Notion connection: a minimal read-only REST client.
// Implemented against Notion API version 2026-03-11, sent in the required
// Notion-Version header (https://developers.notion.com/reference/versioning).
// The token stays in this closure. Errors carry fixed states and copy, never a
// provider message, body, title or identifier, and there is no automatic retry.
export const notionVersion = '2026-03-11';
export const readLimits = { pageSize: 10, blockPageSize: 50, blocks: 120, depth: 3, blockRequests: 12, retryAfter: 60, response: 2 * 1024 * 1024 };
const origin = 'https://api.notion.com';
export const accessCopy = {
  unsupported_host: 'OSM’s own Notion connection is not supported on this host yet.',
  not_connected: 'OSM’s Notion connection is not connected or was revoked.',
  inaccessible: 'This source can’t be read with the current connection.',
  unsupported: 'This source can’t be shown here.',
  rate_limited: 'Notion asked OSM to wait. Try again shortly.',
  unavailable: 'Notion could not be read. Try again later.',
};
export class NotionReadError extends Error {
  constructor(state, retryAfter) {
    super(accessCopy[state] || accessCopy.unavailable);
    this.state = accessCopy[state] ? state : 'unavailable';
    if (this.state === 'rate_limited') this.retryAfter = retryAfter;
  }
}

// Notion IDs are UUIDs, with or without hyphens. Anything else is refused before a request.
export function notionId(value) {
  const id = typeof value === 'string' && value.replaceAll('-', '').toLowerCase();
  return id && /^[a-f0-9]{32}$/.test(id) ? id : null;
}
const dashed = id => `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;

function failure(status, headers) {
  if (status === 401) return new NotionReadError('not_connected');
  if (status === 403 || status === 404) return new NotionReadError('inaccessible');
  if (status === 400) return new NotionReadError('unsupported');
  if (status === 429) {
    const seconds = Number.parseInt(headers?.get?.('retry-after') ?? '', 10);
    return new NotionReadError('rate_limited', Math.min(readLimits.retryAfter, Number.isFinite(seconds) && seconds > 0 ? seconds : readLimits.retryAfter));
  }
  return new NotionReadError('unavailable');
}

// Production transport: one HTTPS request to the fixed API origin, bounded in time and size.
export async function fetchTransport({ method, path, query, body, headers }) {
  const url = new URL(path, origin);
  for (const [key, value] of query || []) url.searchParams.append(key, value);
  const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'error', signal: AbortSignal.timeout(15000) });
  const text = await response.text();
  if (text.length > readLimits.response) throw new Error('Response too large.');
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: response.status, headers: response.headers, json };
}

export function createNotionClient({ token, transport = fetchTransport }) {
  if (typeof token !== 'string' || !token) throw new NotionReadError('not_connected');
  async function request(method, path, { query, body, object } = {}) {
    let response;
    try {
      response = await transport({ method, path, query, body,
        headers: { Authorization: `Bearer ${token}`, 'Notion-Version': notionVersion, 'Content-Type': 'application/json' } });
    } catch { throw new NotionReadError('unavailable'); }
    if (!response || response.status !== 200) throw failure(response?.status, response?.headers);
    const json = response.json;
    if (!json || typeof json !== 'object' || (object && json.object !== object)) throw new NotionReadError('unavailable');
    return json;
  }
  const checked = value => { const id = notionId(value); if (!id) throw new NotionReadError('unsupported'); return dashed(id); };
  const bounded = (size, max = readLimits.pageSize) => Math.max(1, Math.min(max, Number(size) || max));
  return {
    // The connection's bot user and workspace (GET /v1/users/me).
    async identity() {
      const me = await request('GET', '/v1/users/me', { object: 'user' });
      const botId = notionId(me.id), workspaceId = notionId(me.bot?.workspace_id);
      if (me.type !== 'bot' || !botId || !workspaceId) throw new NotionReadError('unsupported');
      const name = typeof me.bot.workspace_name === 'string' ? me.bot.workspace_name.slice(0, 100) : '';
      return { botId, workspaceId, workspaceName: name };
    },
    page: id => request('GET', `/v1/pages/${checked(id)}`, { object: 'page' }),
    database: id => request('GET', `/v1/databases/${checked(id)}`, { object: 'database' }),
    dataSource: id => request('GET', `/v1/data_sources/${checked(id)}`, { object: 'data_source' }),
    children: (id, cursor, size) => request('GET', `/v1/blocks/${checked(id)}/children`, {
      object: 'list', query: [['page_size', String(bounded(size, readLimits.blockPageSize))], ...(cursor ? [['start_cursor', cursor]] : [])] }),
    // One page of results; callers pass next_cursor back. Totals are never computed.
    query: (id, { filter, sorts, cursor, size, properties = [] } = {}) => request('POST', `/v1/data_sources/${checked(id)}/query`, {
      object: 'list', query: properties.map(name => ['filter_properties[]', name]),
      body: { page_size: bounded(size), result_type: 'page', ...(filter && { filter }), ...(sorts?.length && { sorts }), ...(cursor && { start_cursor: cursor }) } }),
  };
}

// Rich text renders as plain text. Mentions are not resolved: a mention can name a
// page outside the grant, so it shows as a neutral placeholder with no title or ID.
export function plainText(items) {
  return clippedText(items).text;
}
// The same text, and whether the 200-item or 20,000-character bound cut it.
function clippedText(items) {
  if (!Array.isArray(items)) return { text: '', clipped: false };
  const text = items.slice(0, 200).map(item => item?.type === 'mention' ? (item.mention?.type === 'date' ? String(item.plain_text ?? '') : '[mention]')
    : typeof item?.plain_text === 'string' ? item.plain_text : '').join('');
  return { text: text.slice(0, 20000), clipped: items.length > 200 || text.length > 20000 };
}
const textBlocks = new Set(['paragraph', 'heading_1', 'heading_2', 'heading_3', 'heading_4', 'bulleted_list_item', 'numbered_list_item',
  'to_do', 'toggle', 'quote', 'callout', 'code']);
const containers = new Set(['column_list', 'column']);
const skipped = new Set(['divider', 'breadcrumb', 'table_of_contents']);

// Reads the selected page's blocks within readLimits. Child pages and databases are
// listed by kind only; they are never opened. Unsupported content stays visible as such.
export async function readBlocks(client, pageId) {
  const blocks = [];
  let truncated = false, requests = 0;
  async function walk(id, depth) {
    let cursor;
    do {
      if (blocks.length >= readLimits.blocks || requests >= readLimits.blockRequests) { truncated = true; return; }
      requests++;
      const page = await client.children(id, cursor, readLimits.blockPageSize);
      for (const block of Array.isArray(page.results) ? page.results : []) {
        if (blocks.length >= readLimits.blocks) { truncated = true; return; }
        const type = typeof block?.type === 'string' ? block.type : 'unsupported';
        if (block?.in_trash || skipped.has(type)) continue;
        if (textBlocks.has(type)) {
          // A cut block text makes the article partial, like every other bound.
          const { text, clipped } = clippedText(block[type]?.rich_text);
          if (clipped) truncated = true;
          blocks.push({ kind: type === 'code' ? 'code' : type.startsWith('heading_') ? 'heading' : type.endsWith('list_item') || type === 'to_do' ? 'item' : 'text', depth, text });
        }
        else if (type === 'child_page' || type === 'child_database') blocks.push({ kind: 'child', depth, text: type === 'child_page' ? 'Sub-page' : 'Database' });
        else if (!containers.has(type)) { blocks.push({ kind: 'unsupported', depth, text: '' }); continue; }
        if (block.has_children && type !== 'child_page' && type !== 'child_database') {
          if (depth + 1 >= readLimits.depth) { truncated = true; continue; }
          const id = notionId(block.id);
          if (id) await walk(id, depth + 1);
          if (truncated && blocks.length >= readLimits.blocks) return;
        }
      }
      cursor = page.has_more && typeof page.next_cursor === 'string' ? page.next_cursor : undefined;
      if (cursor && depth > 0) { truncated = true; cursor = undefined; }
    } while (cursor);
  }
  await walk(pageId, 0);
  return { blocks, truncated };
}

// Property values that can be shown as text. Relations, rollups, formulas, people and
// files are not resolved: they can reference sources outside the grant.
export const textProperties = new Set(['title', 'rich_text', 'select', 'multi_select', 'status', 'date', 'number', 'checkbox', 'url',
  'created_time', 'last_edited_time']);
export function propertyText(value) {
  switch (value?.type) {
    case 'title': case 'rich_text': return plainText(value[value.type]);
    case 'select': case 'status': return typeof value[value.type]?.name === 'string' ? value[value.type].name : '';
    case 'multi_select': return Array.isArray(value.multi_select) ? value.multi_select.slice(0, 50).map(option => option?.name).filter(name => typeof name === 'string').join(', ') : '';
    case 'date': return typeof value.date?.start === 'string' ? value.date.start + (typeof value.date.end === 'string' ? ' – ' + value.date.end : '') : '';
    case 'number': return typeof value.number === 'number' ? String(value.number) : '';
    case 'checkbox': return typeof value.checkbox === 'boolean' ? (value.checkbox ? 'Yes' : 'No') : '';
    case 'url': return typeof value.url === 'string' ? value.url.slice(0, 2048) : '';
    case 'created_time': case 'last_edited_time': return typeof value[value.type] === 'string' ? value[value.type] : '';
    default: return '';
  }
}
export function pageTitle(page) {
  const title = Object.values(page?.properties || {}).find(value => value?.type === 'title');
  return propertyText(title).trim().slice(0, 200);
}
