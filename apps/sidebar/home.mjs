// Home: a read-only Context/Skills view over Setup's generated projection, read through OSM's own
// internal Notion connection. Lists and bodies live only in this closure for the
// current scope: Back clears the body, and any account, scope, access or context
// change clears every list, body and section. Nothing is cached or stored; all
// retrieved text is rendered as text.
export function createHome({ $, call, open, changed, linksRevision = () => undefined }) {
  const copy = {
    unsupported_host: 'OSM’s own Notion connection is not supported on this host yet.',
    not_connected: 'OSM’s Notion connection is not connected or was revoked.',
    inaccessible: 'This source can’t be read with the current connection.',
    unsupported: 'This source can’t be shown here.',
    rate_limited: 'Notion asked OSM to wait. Try again shortly.',
    unavailable: 'Notion could not be read. Try again later.',
  };
  const gates = {
    not_connected: ['Connect your Notion', 'Ask OSM Setup in chat to connect OSM’s own Notion connection and share your OSM pages with it. No secret is entered here.'],
    unsupported_host: ['Home isn’t available here yet', copy.unsupported_host + ' Your saved links still work.'],
    unmapped: ['Continue OSM Setup', 'Your connection is ready. Ask OSM Setup in chat to locate or prepare your AI Operating Model.'],
    account_changed: ['Continue OSM Setup', 'This Home was set up for a different Notion connection, so nothing from it is shown. Ask OSM Setup in chat to map it again.'],
    root_inaccessible: ['Continue OSM Setup', 'Your OSM page can’t be read with the current connection. Share it with OSM’s connection, or ask OSM Setup in chat.'],
    mapping_unavailable: ['Continue OSM Setup', 'The Home projection needs attention. It has been left unchanged.'],
    rate_limited: ['Notion asked OSM to wait', copy.rate_limited],
    unavailable: ['Notion could not be read', copy.unavailable],
  };
  const labels = { ready: 'Notion · Connected', unmapped: 'Notion · Home not set up', root_inaccessible: 'Notion · Home can’t be read',
    account_changed: 'Notion · Different connection', not_connected: 'Notion · Not connected', unsupported_host: 'Notion · Not available here',
    mapping_unavailable: 'Notion · Needs attention' };
  const roleText = { profile: 'profile', memory: 'retained facts and decisions', documents: 'documents', skills: 'personal skills', related: 'outward links' };
  const resets = ['not_connected', 'account_changed', 'unsupported_host', 'unmapped', 'mapping_unavailable', 'root_inaccessible'];
  let data = null, context = null, showLinks = false, loading = false, generation = 0, recoveries = 0;
  let tab = 'context', reader = null, builtinOpen = false, lists = new Map(), openers = new Map();

  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text) node.textContent = text; if (cls) node.setAttribute('class', cls); return node; };
  const button = (text, cls, onClick) => { const node = el('button', text, cls); node.setAttribute('type', 'button'); node.addEventListener('click', onClick); return node; };
  const sections = () => data?.state === 'ready' ? data.sections : [];
  function clear() { lists = new Map(); reader = null; openers = new Map(); builtinOpen = false; }
  // Without a projection, Home appears only for a supported host's connect or Continue Setup
  // step; otherwise, including a failed check, the saved links view stays as it was. An
  // official_notion_user projection keeps the links view with its own note: this view
  // can't read through that connection yet, and it never switches to the internal one.
  const available = () => Boolean(data && data.state !== 'official_mode' && (data.mapping !== 'missing' || ['not_connected', 'unmapped'].includes(data.state)));
  const shown = () => available() && !showLinks;

  async function load() {
    const mine = ++generation;
    // No repaint here: sync() runs inside the app's render.
    loading = true;
    let value;
    try { value = (await call('osm_home', {}))?._meta?.['osm/home']; } catch { value = undefined; }
    if (mine !== generation) return;
    loading = false;
    const next = value && typeof value.state === 'string' ? value
      : { state: 'unavailable', mapping: data?.mapping ?? 'missing', builtin: [], failed: true, ...(data?.selectedMode && { selectedMode: data.selectedMode }) };
    if (next.state !== 'ready' || next.scope !== data?.scope) clear();
    data = next; changed();
  }
  // The app reports its current context; a different one, or none, drops everything.
  function sync(target) {
    if (target === context) return;
    context = target; ++generation; clear(); data = null; showLinks = false;
    recoveries = 0;
    if (target) void load();
  }
  // An explicit refresh rereads everything for the current context.
  function reload() { recoveries = 0; clear(); return load(); }
  // One automatic status reload per invalidation; a repeat waits for Try again, so a
  // persistent mismatch cannot loop.
  function revoke() {
    clear();
    data = data && { state: 'unavailable', mapping: data.mapping, builtin: data.builtin, ...(data.selectedMode && { selectedMode: data.selectedMode }) };
    if (++recoveries > 1) { ++generation; loading = false; return; }
    void load();
  }
  // A result for another scope, or a connection-level state, invalidates the whole view.
  function current(result, mine) {
    if (mine !== generation) return false;
    if (!result || resets.includes(result.state) || (result.scope && result.scope !== data?.scope)) { revoke(); return false; }
    if (result.scope) recoveries = 0;
    return true;
  }

  async function list(key, more = false) {
    const entry = lists.get(key) || {};
    if (entry.loading) return;
    const mine = generation;
    lists.set(key, { ...entry, loading: true }); changed();
    let result;
    try { result = (await call('osm_home_list', { section: key, ...(more && entry.cursor && { cursor: entry.cursor }) }))?._meta?.['osm/home-list']; } catch { result = { state: 'unavailable' }; }
    if (!current(result, mine)) return changed();
    // A source that had listed and is now denied is an access change, not a placeholder.
    if (result.state === 'inaccessible' && entry.state === 'listed') { revoke(); return changed(); }
    const items = more ? [...(entry.items || []), ...(result.items || [])].slice(0, 50) : result.items || [];
    lists.set(key, { state: result.state, items, cursor: result.cursor, hasMore: Boolean(result.hasMore) && items.length < 50, partial: result.partial,
      withheld: result.withheld, expanded: more || entry.expanded, retryAfter: result.retryAfter });
    changed();
  }
  async function read(key, id) {
    const mine = generation;
    reader = { key, id, state: 'loading' }; changed();
    $('reader-title')?.focus();
    let result;
    try { result = (await call('osm_home_read', { section: key, id }))?._meta?.['osm/home-record']; } catch { result = { state: 'unavailable' }; }
    if (!current(result, mine)) return changed();
    // A listed record that is now denied invalidates its titles and navigation too, also
    // when the reader was left before the answer arrived.
    if (result.state === 'inaccessible' && lists.get(key)?.items?.some(item => item.id === id)) { revoke(); return changed(); }
    if (reader?.id !== id) return changed();
    reader = { key, id, state: result.state, record: result.record };
    changed(); $('reader-title')?.focus();
  }
  function back() {
    const id = reader?.key + ':' + reader?.id;
    reader = null; changed(); openers.get(id)?.focus();
  }
  function choose(next, focus = false) { tab = next; reader = null; changed(); if (focus) $(next + '-tab').focus(); }

  function recordButton(section, item, describe) {
    const node = button('', 'record-button', () => read(section.key, item.id));
    const words = el('span');
    words.append(el('span', item.title, 'record-title'));
    if (describe && item.description) words.append(el('span', item.description, 'record-description'));
    const chevron = el('span', '›', 'chevron'); chevron.setAttribute('aria-hidden', 'true');
    node.append(words, chevron); node.dataset.open = item.id;
    openers.set(section.key + ':' + item.id, node);
    return node;
  }
  function sourceState(section, entry) {
    const box = el('div', null, 'unavailable');
    if (!entry || entry.loading && !entry.items) { box.append(el('p', 'Loading…')); return box; }
    if (entry.state === 'empty') { box.append(el('p', 'Nothing here yet.')); return box; }
    box.append(el('p', copy[entry.state] || copy.unavailable));
    if (['rate_limited', 'unavailable'].includes(entry.state)) box.append(button('Try again', 'text-button', () => list(section.key)));
    else box.append(button('Open in Notion ↗', 'text-button', () => open(section.link)));
    return box;
  }
  function records(section, describe) {
    const entry = lists.get(section.key);
    if (!entry && data?.state === 'ready') Promise.resolve().then(() => { if (!lists.has(section.key)) void list(section.key); });
    if (entry?.state !== 'listed') return [sourceState(section, entry)];
    const all = entry.expanded ? entry.items : entry.items.slice(0, 2);
    const ul = el('ul', null, describe ? 'record-list skills-list' : 'record-list');
    for (const item of all) { const li = el('li'); li.append(recordButton(section, item, describe)); ul.append(li); }
    const nodes = [ul];
    if (entry.items.length > 2 || entry.hasMore) {
      const more = button(entry.expanded ? 'Show fewer' : section.role === 'memory' ? 'More memories' : 'Show more', 'more', () => {
        const expanded = !entry.expanded;
        lists.set(section.key, { ...entry, expanded }); changed(); $('more-' + section.key)?.focus();
      });
      more.setAttribute('id', 'more-' + section.key); more.setAttribute('aria-expanded', String(Boolean(entry.expanded)));
      nodes.push(more);
    }
    if (entry.expanded && entry.hasMore) nodes.push(button(entry.loading ? 'Loading…' : 'Load more', 'more', () => list(section.key, true)));
    if (entry.partial) nodes.push(el('p', 'Notion stopped this list early. Open it in Notion for the rest.', 'reader-meta'));
    if (entry.withheld) nodes.push(el('p', 'Some pages can’t be read with the current connection.', 'reader-meta'));
    return nodes;
  }
  function renderReader(panel) {
    const article = el('article', null, 'reader');
    article.append(button('← ' + (tab === 'skills' ? 'Skills' : 'Context'), 'text-button back', back));
    const record = reader.record, heading = el('h2', record?.title || (reader.state === 'loading' ? 'Loading…' : 'Unavailable'));
    heading.setAttribute('id', 'reader-title'); heading.setAttribute('tabindex', '-1');
    article.setAttribute('aria-labelledby', 'reader-title');
    if (record) article.append(el('p', record.meta, 'reader-meta'));
    article.append(heading);
    const body = el('div', null, 'reader-body');
    if (!record && reader.state !== 'loading') body.append(el('p', copy[reader.state] || copy.unavailable, 'unavailable'));
    if (record) {
      for (const field of record.fields) { if (field.heading) body.append(el('h3', field.heading)); body.append(el('p', field.text)); }
      let previous;
      for (const block of record.blocks) {
        if ((block.kind === 'unsupported' || block.kind === 'child') && previous === block.kind) continue;
        previous = block.kind;
        if (block.kind === 'heading') body.append(el('h3', block.text));
        else if (block.kind === 'unsupported') body.append(el('p', 'Some content can’t be shown here.', 'muted'));
        else if (block.kind === 'child') body.append(el('p', 'A sub-page or database here isn’t opened in Home.', 'muted'));
        else if (block.text) body.append(el('p', block.text, block.kind === 'item' ? 'item' : block.kind === 'code' ? 'code' : null));
      }
      if (!record.fields.length && !record.blocks.length) body.append(el('p', 'This record has no text to show.', 'muted'));
      if (record.fieldsTruncated) body.append(el('p', 'Part of this record is longer than Home shows. The rest is in Notion.', 'muted'));
      if (record.truncated) body.append(el('p', 'The rest of this page is in Notion.', 'muted'));
    }
    article.append(body);
    if (record?.link) article.append(button('Open in Notion ↗', 'text-button open', () => open(record.link)));
    panel.append(article);
  }
  function renderContext(panel) {
    for (const section of sections().filter(item => !['skills', 'related'].includes(item.role))) {
      const root = el('section', null, 'context-section');
      root.append(el('h3', section.label, 'section-title'), ...records(section, false));
      panel.append(root);
    }
    const related = sections().filter(item => item.role === 'related');
    if (related.length) {
      const also = el('aside', null, 'also'), links = el('div', null, 'also-links');
      also.setAttribute('aria-label', 'Other work in your model');
      for (const item of related) links.append(button(item.label + ' ↗', 'text-button', () => open(item.link)));
      also.append(links); panel.append(also);
    }
  }
  function renderSkills(panel) {
    const source = sections().find(item => item.role === 'skills');
    panel.append(el('h3', 'Your skills', 'section-title'));
    if (source) panel.append(el('p', `From ${source.label} in Notion`, 'reader-meta'), ...records(source, true));
    else panel.append(el('p', 'No personal skills source is mapped yet.', 'unavailable'));
    const root = el('section', null, 'builtin');
    const toggle = button('Built into OSM ' + (builtinOpen ? '−' : '+'), 'text-button', () => { builtinOpen = !builtinOpen; changed(); $('builtin-toggle').focus(); });
    toggle.setAttribute('id', 'builtin-toggle'); toggle.setAttribute('aria-expanded', String(builtinOpen));
    root.append(toggle);
    if (builtinOpen) {
      const content = el('div', null, 'builtin-content');
      for (const skill of data.builtin || []) content.append(el('p', `${skill.name} — ${skill.description}`));
      content.append(el('p', 'From the installed OSM package. Reading a method here doesn’t run it.'));
      root.append(content);
    }
    panel.append(root);
  }

  function render(locked, active = true) {
    const visible = active && shown();
    document.body?.setAttribute?.('data-view', visible ? 'home' : 'links');
    $('home-note').hidden = data?.state !== 'official_mode';
    $('home-note').textContent = 'Home can’t read through your official Notion connection in this view yet. Your saved links below open each source in Notion.';
    // Saved links are a partial compatibility view of the projection's definition revision.
    const revision = data?.mapping === 'saved' ? data.definitionRevision : undefined;
    $('links-note').hidden = !revision;
    if (revision) $('links-note').textContent = linksRevision() === revision
      ? `Saved links: a partial view of your AI Operating Model, revision ${revision}.`
      : `Saved links: a partial view saved separately; it may not match your AI Operating Model revision ${revision}.`;
    $('brand-mark').hidden = !visible; $('home').hidden = !visible;
    $('show-home').hidden = !available() || !showLinks;
    const status = $('home-status');
    status.hidden = !visible;
    const verified = data?.state === 'ready' && Boolean(data.verifiedAt);
    status.dataset.state = verified ? 'connected' : 'neutral';
    $('home-status-label').textContent = loading && !data ? 'Notion · Checking…' : labels[data?.state] || 'Notion · Could not check';
    status.setAttribute('title', verified ? 'Checked ' + new Date(data.verifiedAt).toLocaleTimeString() : '');
    if (!visible) { $('home-panel').replaceChildren(); return; }
    const gate = data.state === 'ready' ? null : gates[data.state] || gates.unavailable;
    $('home-workspace').hidden = Boolean(gate); $('home-gate').hidden = !gate;
    if (gate) {
      $('home-panel').replaceChildren(); $('organisation').hidden = true;
      $('gate-title').textContent = gate[0]; $('gate-copy').textContent = gate[1];
      $('gate-action').textContent = ['rate_limited', 'unavailable'].includes(data.state) ? 'Try again' : 'Show saved links';
      $('gate-action').disabled = locked || loading;
      return;
    }
    for (const name of ['context', 'skills']) {
      const chosen = tab === name;
      $(name + '-tab').setAttribute('aria-selected', String(chosen)); $(name + '-tab').setAttribute('tabindex', chosen ? '0' : '-1');
    }
    const panel = $('home-panel');
    panel.setAttribute('aria-labelledby', tab + '-tab');
    panel.replaceChildren(); openers = new Map();
    $('home-footer').hidden = Boolean(reader); $('organisation').hidden ||= Boolean(reader);
    if (reader) renderReader(panel); else if (tab === 'context') renderContext(panel); else renderSkills(panel);
    $('organisation-copy').textContent = 'This Home maps ' + sections().map(item => `${item.label} to ${roleText[item.role]}`).join(', ')
      + `. Setup generated this from your AI Operating Model, revision ${data.definitionRevision}; Home does not infer sources or names.`
      + (data.supportHidden ? ' Rules, procedures, evidence and recovery snapshots stay in Notion and are not shown as context.' : '');
  }

  $('context-tab').addEventListener('click', () => choose('context'));
  $('skills-tab').addEventListener('click', () => choose('skills'));
  $('home-tabs').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    choose(event.key === 'Home' ? 'context' : event.key === 'End' ? 'skills' : tab === 'context' ? 'skills' : 'context', true);
  });
  $('organisation-toggle').addEventListener('click', () => {
    const region = $('organisation'); region.hidden = !region.hidden;
    $('organisation-toggle').setAttribute('aria-expanded', String(!region.hidden));
    $('organisation-toggle').textContent = 'How this is organised ' + (region.hidden ? '+' : '−');
  });
  $('home-open').addEventListener('click', () => data?.root && open(data.root.link));
  $('gate-action').addEventListener('click', () => {
    if (['rate_limited', 'unavailable'].includes(data?.state)) return reload();
    showLinks = true; changed(); $('show-home').focus();
  });
  for (const id of ['show-links']) $(id).addEventListener('click', () => { showLinks = true; changed(); $('show-home').focus(); });
  $('show-home').addEventListener('click', () => { showLinks = false; changed(); $('heading').focus(); });
  // Automatic page-icon reads use the official connection. They wait until Home's mode is
  // known and run only where the saved links are the visible view: official mode, no
  // projection, or links the user chose. Never while internal Home is shown, and never
  // while a status check (refresh, retry, recovery or context sync) is still pending:
  // only the resolved current status decides.
  function iconsAllowed(dashboard) {
    if (!context) return !dashboard;
    if (loading || !data || data.failed || data.mapping === 'unavailable') return false;
    return dashboard ? !shown() : data.selectedMode !== 'internal_selected_pages';
  }
  return { sync, reload, render, shown, iconsAllowed };
}
