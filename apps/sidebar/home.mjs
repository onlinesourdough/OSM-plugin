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
  // I2: every service state a list or read can return, classified once. Section states
  // keep the view when they carry the current scope; every other state, including
  // not_connected, account_changed, unsupported_host, unmapped, mapping_unavailable,
  // root_inaccessible and official_mode (another mode), is invalidation, and so is a
  // result without the current scope.
  const sectionStates = new Set(['listed', 'empty', 'read', 'inaccessible', 'unsupported', 'rate_limited', 'unavailable']);
  // recoveries: the automatic-reload budget of the current invalidation episode.
  // recovering: an automatic recovery is active and has not yet settled.
  let data = null, context = null, showLinks = false, loading = false, generation = 0, recoveries = 0, recovering = false;
  let tab = 'context', reader = null, builtinOpen = false, lists = new Map(), openers = new Map();

  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text) node.textContent = text; if (cls) node.setAttribute('class', cls); return node; };
  const button = (text, cls, onClick) => { const node = el('button', text, cls); node.setAttribute('type', 'button'); node.addEventListener('click', onClick); return node; };
  const sections = () => data?.state === 'ready' ? data.sections : [];
  function clear() { lists = new Map(); reader = null; openers = new Map(); builtinOpen = false; }
  // Without a projection, Home appears only for a supported host's connect or Continue Setup
  // step; otherwise, including a failed check, the saved links view stays as it was. An
  // official_notion_user projection keeps the links view with its own note: this view
  // can't read through that connection yet, and it never switches to the internal one.
  // A status without a mapping field (a failed check or the server's error fallback) shows
  // the saved links, but is no evidence for anything else.
  const available = () => Boolean(data && data.state !== 'official_mode'
    && ((data.mapping && data.mapping !== 'missing') || ['not_connected', 'unmapped'].includes(data.state)));
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
      : { state: 'unavailable', ...(data?.mapping && { mapping: data.mapping }), builtin: [], failed: true, ...(data?.selectedMode && { selectedMode: data.selectedMode }) };
    if (next.state !== 'ready' || next.scope !== data?.scope) clear();
    data = next; changed();
  }
  // The app reports its current context; a different one, or none, drops everything.
  function sync(target) {
    if (target === context) return;
    context = target; ++generation; clear(); data = null; showLinks = false;
    rearm(true);
    if (target) void load();
  }
  // An explicit refresh or Try again rereads everything for the current context.
  function reload() { rearm(true); clear(); return load(); }
  // One automatic status reload per independent invalidation episode. revoke() spends the
  // budget and marks a recovery active; a second invalidation while it is spent stops
  // and waits for an explicit Refresh, Try again or context change.
  function revoke() {
    clear();
    data = data && { state: 'unavailable', mapping: data.mapping, builtin: data.builtin, ...(data.selectedMode && { selectedMode: data.selectedMode }) };
    if (++recoveries > 1) { recovering = false; ++generation; loading = false; return; }
    recovering = true;
    void load();
  }
  // The budget is re-armed explicitly (Refresh, Try again, context change), or once an
  // active recovery has fully settled successfully. That means its status loaded as ready
  // and every section it requested answered for the current generation with current valid
  // data, with none still pending, failed or invalid. A ready status or one healthy
  // sibling alone is not enough. Invalid siblings revoke instead, and stale callbacks
  // never reach this check.
  const settled = new Set(['listed', 'empty', 'inaccessible', 'unsupported']);
  function rearm(explicit = false) {
    if (!explicit) {
      if (!recovering || loading || data?.state !== 'ready' || !lists.size) return;
      for (const entry of lists.values()) if (entry.loading || !settled.has(entry.state)) return;
    }
    recovering = false; recoveries = 0;
  }
  // The shared invalidation path for list and read results, before anything else uses
  // them. `listed` says the result concerns a source or record already shown; a denial
  // for it is an access change. A source denied from its first read keeps its
  // placeholder.
  function current(result, mine, listed = false) {
    if (mine !== generation) return false;
    if (!result || !sectionStates.has(result.state) || !result.scope || result.scope !== data?.scope
        || (listed && result.state === 'inaccessible')) { revoke(); return false; }
    return true;
  }

  async function list(key, more = false) {
    const entry = lists.get(key) || {};
    if (entry.loading) return;
    const mine = generation;
    lists.set(key, { ...entry, loading: true }); changed();
    let result;
    try { result = (await call('osm_home_list', { section: key, ...(more && entry.cursor && { cursor: entry.cursor }) }))?._meta?.['osm/home-list']; } catch { result = { state: 'unavailable' }; }
    if (!current(result, mine, entry.state === 'listed')) return changed();
    const items = more ? [...(entry.items || []), ...(result.items || [])].slice(0, 50) : result.items || [];
    lists.set(key, { state: result.state, items, cursor: result.cursor, hasMore: Boolean(result.hasMore) && items.length < 50, partial: result.partial,
      withheld: result.withheld, expanded: more || entry.expanded, retryAfter: result.retryAfter });
    rearm();
    changed();
  }
  async function read(key, id) {
    const mine = generation;
    reader = { key, id, state: 'loading' }; changed();
    $('reader-title')?.focus();
    let result;
    try { result = (await call('osm_home_read', { section: key, id }))?._meta?.['osm/home-record']; } catch { result = { state: 'unavailable' }; }
    // Invalidation comes first, also when the reader was left before the answer arrived.
    if (!current(result, mine, Boolean(lists.get(key)?.items?.some(item => item.id === id)))) return changed();
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
    // A section's Try again is explicit too, so it resets the budget.
    if (['rate_limited', 'unavailable'].includes(entry.state)) box.append(button('Try again', 'text-button', () => { rearm(true); return list(section.key); }));
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
  // I3: only positive evidence from the resolved current status allows them: a resolved
  // official_mode, a confirmed missing projection, or the saved links the user chose
  // over a saved projection whose resolved status names its mode (internal included).
  // Unknown, failed, loading or error-valued status (including the server's fallback,
  // which has no mapping field) allows nothing. On the dashboard the saved links must
  // also be the visible view; internal Home itself never allows them.
  function iconsAllowed(dashboard) {
    if (!context) return !dashboard;
    if (loading || !data || data.failed) return false;
    // The chosen-links branch needs the status resolved as ready; the revoke() placeholder
    // and every other state (unavailable, rate_limited, not_connected, account_changed,
    // unsupported_host, root_inaccessible, mapping_unavailable, unmapped) allow nothing.
    const chosen = dashboard && showLinks && data.state === 'ready' && data.mapping === 'saved'
      && ['official_notion_user', 'internal_selected_pages'].includes(data.selectedMode);
    const evidence = data.state === 'official_mode' || data.mapping === 'missing' || chosen;
    return evidence && (!dashboard || !shown());
  }
  return { sync, reload, render, shown, iconsAllowed };
}
