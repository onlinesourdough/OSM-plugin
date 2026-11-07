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
  const gate = { 'home-revoked': 'root_inaccessible', 'home-changed': 'account_changed', 'home-error': 'unavailable', 'home-limited': 'rate_limited' }[scenario];
  const home = { state: gate || 'ready', mapping: 'saved', selectedMode: 'internal_selected_pages', scope,
    context: 'https://app.notion.com/p/00000000000000000000000000000001', workspaceName: 'Fictional studio', definitionRevision: 'fictional-preview-r1', verifiedAt: new Date().toISOString(),
    root: { title: 'Data & Context', icon: '🧠', link }, sections,
    builtin: [{ name: 'osm-write-code', description: 'Write and verify code.' }] };
  const result = (kind, data) => ({ content: [], _meta: { 'osm/kind': kind, [`osm/${kind}`]: data } });
  if (name === 'osm_connection') return { content: [{ type: 'text', text: JSON.stringify({ state: gate || 'ready', accessInventory: 'mapped-sources-only' }) }] };
  if (name === 'osm_home') return result('home', home);
  const kind = name === 'osm_home_page' ? 'home-page' : name === 'osm_home_list' ? 'home-list' : 'home-record';
  if (gate) return result(kind, { state: gate, scope });
  if (name === 'osm_home_page') return result(kind, { state: 'read', scope, record: { title: 'Data & Context', icon: '🧠', meta: '', link, fields: [],
    blocks: [{ kind: 'text', text: 'A shared place for what we know, how we work and what we learn.' },
      { kind: 'heading', text: 'Start here' }, { kind: 'text', text: 'Keep useful context close to the work. Your original pages stay in Notion.' },
      { kind: 'heading', text: 'Our foundation' }, { kind: 'item', text: '📚 Knowledge — goals, offers and working context' },
      { kind: 'item', text: '🧠 Memory — decisions and lessons' }, { kind: 'item', text: '⚡ Skills — methods we use' }], truncated: scenario === 'home-partial' } });
  const titles = args.section === 'skills' ? ['Weekly client update', 'Project kickoff'] : args.section === 'memory'
    ? ['Agree scope before retainers', 'Keep one current topic'] : ['Goals and priorities', 'Customers and offers', 'How we work'];
  if (name === 'osm_home_list') return result(kind, scenario === 'home-empty' ? { state: 'empty', scope } : { state: 'listed', scope,
    items: titles.map((title, i) => ({ id: String(i + 1).padStart(32, '0'), title, icon: args.section === 'memory' ? '🧠' : '📄', description: args.section === 'skills' ? 'A reusable personal method.' : undefined })), hasMore: false });
  return result(kind, { state: 'read', scope, record: { title: titles[Math.max(0, Number(args.id) - 1)] || titles[0], icon: '📄', meta: sections.find(s => s.key === args.section)?.label,
    link, fields: [], blocks: [{ kind: 'text', text: 'Make a useful first result small enough to finish and clear enough to review.' },
      { kind: 'heading', text: 'What matters now' }, { kind: 'item', text: 'Preserve existing work and evidence.' },
      { kind: 'item', text: 'Keep one owner for each decision.' }, { kind: 'item', text: 'Check the result at the real boundary.' }], truncated: scenario === 'home-partial' } });
}
