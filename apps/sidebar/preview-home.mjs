// Explicitly fictional data for the browser fixture. No connection, credential
// store or live API is consulted by this adapter.
export function previewHome(name, args, scenario) {
  const scope = 'fictional-preview-scope';
  const link = 'https://www.notion.so/00000000000000000000000000000001';
  const sections = [
    { key: 'knowledge', label: 'Knowledge', role: 'documents', link, title: 'Knowledge' },
    { key: 'memory', label: 'Memory', role: 'memory', link, title: 'Memory' },
    { key: 'skills', label: 'Skills', role: 'skills', link, title: 'Skills', describes: true },
  ];
  // Synthetic raster document; no private or remote image bytes.
  const fileIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAPUlEQVR4nGNgoAWIL5/3Hx9et+/6f6oZRJRhxBpE0DBSDMJrGCGD0DF9DXr94QdWPHAuGvXaiPYaRQZRAgAIKehi+n1KDQAAAABJRU5ErkJggg==';
  const icons = ['📚', fileIcon, null, 'https://www.notion.so/icons/copy_lightgray.svg'];
  const gate = { 'home-revoked': 'root_inaccessible', 'home-ended': 'not_connected', 'home-notconnected': 'not_connected', 'home-changed': 'account_changed', 'home-error': 'unavailable', 'home-limited': 'rate_limited' }[scenario];
  const home = { state: gate || 'ready', mapping: 'saved', selectedMode: 'internal_selected_pages', scope,
    context: 'https://app.notion.com/p/00000000000000000000000000000001', workspaceName: 'Northwind sample workspace', definitionRevision: 'fictional-preview-r1', verifiedAt: new Date().toISOString(),
    root: { title: 'Northwind · Sample home', icon: '🗂️', link }, sections,
    builtin: [{ name: 'osm-write-code', description: 'Write and verify code.' }] };
  const result = (kind, data) => ({ content: [], _meta: { 'osm/kind': kind, [`osm/${kind}`]: data } });
  if (gate) { delete home.root; delete home.sections; delete home.workspaceName; delete home.definitionRevision; delete home.verifiedAt; }
  if (name === 'osm_connection') return { content: [{ type: 'text', text: JSON.stringify({ state: gate || 'ready', accessInventory: 'mapped-sources-only' }) }] };
  if (name === 'osm_home') return result('home', home);
  const kind = name === 'osm_home_locate' ? 'home-location' : name === 'osm_home_page' ? 'home-page' : ['osm_home_list', 'osm_home_search'].includes(name) ? 'home-list' : 'home-record';
  if (gate) return result(kind, { state: gate, scope });
  if (name === 'osm_home_page') return result(kind, { state: 'read', scope, record: { title: 'Northwind · Sample home', icon: '🗂️', meta: '', link, fields: [],
    blocks: [{ kind: 'text', text: 'A shared place for what we know, how we work and what we learn.' },
      { kind: 'heading', text: 'Sample introduction' }, { kind: 'text', text: 'Keep useful context close to the work. Your original pages stay in Notion.' },
      { kind: 'heading', text: 'Sample sources' }, { kind: 'item', text: '📚 Knowledge — goals, offers and working context' },
      { kind: 'item', text: '🗂️ Memory — decisions and lessons' }, { kind: 'item', text: '⚡ Skills — methods we use' }], truncated: scenario === 'home-partial' } });
  if (name === 'osm_home_locate') return result(kind, { state: 'outside', scope });
  const titles = args.section === 'skills' ? ['Sample weekly update', 'Sample project kickoff', 'Sample review method', 'Sample planning method', 'Sample writing method'] : args.section === 'memory'
    ? ['Sample scope decision', 'Sample lesson', 'Sample delivery decision', 'Sample review decision'] : ['Sample goals', 'Sample customers', 'Sample working agreement', 'Sample project notes', 'Sample guide'];
  if (['osm_home_list', 'osm_home_search'].includes(name)) {
    if (scenario === 'home-source-denied' && args.section === 'memory') return result(kind, { state: 'inaccessible', scope });
    if (scenario === 'home-empty' || scenario === 'home-q02' && name === 'osm_home_search') return result(kind, { state: 'empty', scope, items: [] });
    const offset = args.cursor === 'fictional-next' ? 5 : 0;
    const items = (offset ? ['Sample continuation', 'Sample final note'] : titles).map((title, i) => ({
      id: String(offset + i + 1).padStart(32, '0'), title, icon: icons[(offset + i) % icons.length],
      description: args.section === 'skills' ? ['Summarize a week’s work for the team.', 'Prepare a focused first project session.', 'Review a result against its intended outcome.'][i % 3] : undefined,
    })).filter(item => name !== 'osm_home_search' || item.title.toLowerCase().includes(args.query.trim().toLowerCase())).slice(0, name === 'osm_home_search' ? 5 : 10);
    return result(kind, { state: items.length ? 'listed' : 'empty', scope,
      source: { title: sections.find(s => s.key === args.section)?.title, icon: icons[args.section === 'memory' ? 1 : 0] },
      items, hasMore: scenario === 'home-paginated' && !offset && name === 'osm_home_list',
      ...(scenario === 'home-paginated' && name === 'osm_home_list' && { cursor: offset ? undefined : 'fictional-next', withheld: 2 }),
    });
  }
  return result(kind, { state: 'read', scope, record: { title: titles[Math.max(0, Number(args.id) - 1)] || (Number(args.id) === 6 ? 'Sample continuation' : 'Sample final note'), icon: icons[(Math.max(1, Number(args.id)) - 1) % icons.length], meta: sections.find(s => s.key === args.section)?.label,
    link, fields: [], blocks: [{ kind: 'text', text: 'Make a useful first result small enough to finish and clear enough to review.' },
      { kind: 'heading', text: 'What matters now' }, { kind: 'item', text: 'Preserve existing work and evidence.' },
      { kind: 'item', text: 'Keep one owner for each decision.' }, { kind: 'item', text: 'Check the result at the real boundary.' }], truncated: scenario === 'home-partial' } });
}
