import { sourceLabel } from './source-label.mjs';
// Home: a read-only overview and reader over Setup's generated projection, read through OSM's own
// internal Notion connection. Lists and bodies live only in this closure for the
// current scope: Back clears the body, and any account, scope, access or context
// change clears every list, body and section. Nothing is cached or stored; all
// retrieved text is rendered as text.
export function createHome({ $, call, open, changed, linksRevision = () => undefined }) {
  const copy = {
    unsupported_host: 'OSM’s own Notion connection is not supported on this host yet.',
    not_connected: 'OSM’s Notion connection is not connected or was revoked.',
    not_enabled: 'OSM’s Mac route is off for this Data & Context home.',
    keychain_blocked: 'macOS Keychain is locked or didn’t allow OSM to read its item.',
    keychain_timeout: 'macOS Keychain didn’t answer in time.',
    inaccessible: 'This source can’t be read with the current connection.',
    unsupported: 'This source can’t be shown here.',
    rate_limited: 'Notion asked OSM to wait. Try again shortly.',
    unavailable: 'Notion could not be read. Try again later.',
  };
  const gates = {
    not_connected: ['Reconnect Notion', 'OSM isn’t connected to Notion, or its connection was removed, so nothing from your home is shown.'],
    unsupported_host: ['Home isn’t available here yet', copy.unsupported_host + ' Your saved links still work.'],
    not_enabled: ['Turn on OSM’s Mac route', copy.not_enabled + ' Ask OSM Setup in chat to turn it on. Your saved links still work.'],
    keychain_blocked: ['Keychain needs approval', copy.keychain_blocked + ' Unlock or approve it, then check again.'],
    keychain_timeout: ['Keychain didn’t answer', copy.keychain_timeout + ' An approval prompt may be waiting. Approve it, then check again.'],
    unmapped: ['Continue OSM Setup', 'Your connection is ready. Ask OSM Setup in chat to locate or prepare your AI Operating Model.'],
    account_changed: ['Continue OSM Setup', 'This Home was set up for a different Notion connection, so nothing from it is shown. Ask OSM Setup in chat to map it again.'],
    root_inaccessible: ['Your home page can’t be read', 'OSM’s connection can’t read your home. In Notion, open the page’s ••• menu → Connections and add OSM.'],
    mapping_unavailable: ['Continue OSM Setup', 'The Home projection needs attention. It has been left unchanged.'],
    rate_limited: ['Notion asked OSM to wait', copy.rate_limited],
    unavailable: ['Notion could not be read', 'Check your connection, then try again.'],
  };
  const labels = { ready: 'Notion · Connected', unmapped: 'Notion · Home not set up', root_inaccessible: 'Notion · Home can’t be read',
    account_changed: 'Notion · Different connection', not_connected: 'Notion · Not connected', unsupported_host: 'Notion · Not available here',
    mapping_unavailable: 'Notion · Needs attention', not_enabled: 'Notion · Route off', keychain_blocked: 'Notion · Keychain blocked', keychain_timeout: 'Notion · Keychain timed out' };
  // I2: every service state a list or read can return, classified once. Section states
  // keep the view when they carry the current scope; every other state, including
  // not_connected, account_changed, unsupported_host, unmapped, mapping_unavailable,
  // root_inaccessible and official_mode (another mode), is invalidation, and so is a
  // result without the current scope.
  const sectionStates = new Set(['listed', 'empty', 'read', 'inaccessible', 'unsupported', 'rate_limited', 'unavailable']);
  // recoveries: the automatic-reload budget of the current invalidation episode.
  // recovering: an automatic recovery is active and has not yet settled.
  let data = null, context = null, showLinks = false, loading = false, generation = 0, recoveries = 0, recovering = false;
  // lists and reads hold this view's requests: lists by section, reads by request (pending
  // or failed reads only). clear() drops both, so older generations never count.
  let view = { kind: 'overview' }, history = [], searchResults = new Map(), searchVersion = 0, searchTimer, searching = false, searchQueued = false, linkState = null, locatedSearch = null, searchRequest = null, lastVisibleCheck = -Infinity;
  let reader = null, lists = new Map(), reads = new Map(), openers = new Map();

  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text) node.textContent = text; if (cls) node.setAttribute('class', cls); return node; };
  const button = (text, cls, onClick) => { const node = el('button', text, cls); node.setAttribute('type', 'button'); node.addEventListener('click', onClick); return node; };
  const sections = () => data?.state === 'ready' ? data.sections.filter(item => ['profile', 'documents', 'memory', 'skills', 'related'].includes(item.role)) : [];
  function clear() { lists = new Map(); reads = new Map(); reader = null; openers = new Map(); view = { kind: 'overview' }; history = []; resetSearch(); }
  function resetSearch() {
    searchResults.clear(); ++searchVersion; clearTimeout(searchTimer); searchTimer = undefined;
    searching = false; searchQueued = false; searchRequest = null; linkState = null; locatedSearch = null;
    $('home-search').value = '';
  }
  // Without a projection, Home appears only for a supported host's connect or Continue Setup
  // step; otherwise, including a failed check, the saved links view stays as it was. An
  // official_notion_user projection keeps the links view with its own note: this view
  // can't read through that connection yet, and it never switches to the internal one.
  // A status without a mapping field (a failed check or the server's error fallback) shows
  // the saved links, but is no evidence for anything else.
  const available = () => Boolean(data && data.state !== 'official_mode'
    && ((data.mapping && data.mapping !== 'missing') || ['not_connected', 'unmapped'].includes(data.state)));
  // R8-1: an observed account change is a demonstrated invalidation. Its gate offers no saved
  // links and no path reveals or opens them until Setup has reconciled the mapping. The saved
  // links themselves are left as they are and return once Home is ready again.
  // R9-1: the change holds until Home observes `ready` with `mapping: saved`, which needs a
  // projection saved for the current connection. No other status lifts it: not official_mode,
  // which never checks the connection, nor a failed, pending, transient or mapping-less check,
  // nor a list or read that reports the change. A context change resets it.
  let accountChanged = false;
  const suppressed = () => accountChanged;
  // While it holds, Home shows the account-change gate; a failed or transient check keeps its
  // own gate, whose Try again rechecks status and never shows saved links.
  const retry = () => ['rate_limited', 'unavailable'].includes(data?.state);
  const gateState = () => suppressed() && !retry() ? 'account_changed' : data?.state;
  const shown = () => suppressed() || Boolean(loading && context && !data) || available() && !showLinks;

  async function load(recheck = false) {
    const mine = ++generation;
    // No repaint here: sync() runs inside the app's render.
    loading = true;
    let value;
    try { value = (await call('osm_home', {}))?._meta?.['osm/home']; } catch { value = undefined; }
    if (mine !== generation) return;
    loading = false;
    // L-2: a status read for another context (its route changed outside this panel) is not applied;
    // it counts as a failed check, and Refresh rereads the current context.
    if (typeof value?.context === 'string' && value.context !== context) value = undefined;
    const next = value && typeof value.state === 'string' ? value
      : { state: 'unavailable', ...(data?.mapping && { mapping: data.mapping }), builtin: [], failed: true, ...(data?.selectedMode && { selectedMode: data.selectedMode }) };
    if (next.state !== 'ready' || next.scope !== data?.scope || recheck) clear();
    if (next.state === 'account_changed') accountChanged = true; else if (next.state === 'ready' && next.mapping === 'saved') accountChanged = false;
    data = next;
    // Root metadata is already verified by status; blocks load only on activation.
    changed();
  }
  // The app reports its current context; a different one, or none, drops everything.
  function sync(target) {
    if (target === context) return;
    context = target; ++generation; clear(); data = null; showLinks = false; accountChanged = false;
    rearm(true);
    if (target) void load();
  }
  // An explicit refresh or Try again rereads everything for the current context.
  function reload() { rearm(true); const pending = load(true); changed(); return pending; }
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
  // data, with none still pending, failed or invalid. Reads count too: a current-generation
  // read that is pending or failed keeps the recovery unsettled, also after Back or another
  // selection. A ready status, one healthy sibling or all lists alone is not enough.
  // Invalid results revoke instead, and stale callbacks never reach this check.
  const settled = new Set(['listed', 'empty', 'inaccessible', 'unsupported']);
  function rearm(explicit = false) {
    if (!explicit) {
      if (!recovering || loading || data?.state !== 'ready' || !lists.size || reads.size) return;
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
    if (result?.state === 'account_changed') accountChanged = true;
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
    lists.set(key, { state: result.state, items, cursor: result.cursor, hasMore: Boolean(result.hasMore) && items.length < 50, capped: Boolean(result.hasMore) && items.length >= 50, partial: result.partial,
      withheld: result.withheld, source: result.source, expanded: more || entry.expanded, retryAfter: result.retryAfter });
    rearm();
    changed();
  }
  async function read(key, id, opener, replace = false) {
    if (!replace) history.push({ view: { ...view }, focus: opener || key + ':' + id }); view = { kind: 'reader' };
    const mine = generation, scope = data?.scope, request = {}, outstanding = reads;
    const wasListed = Boolean(lists.get(key)?.items?.some(item => item.id === id) || searchResults.get(key)?.items?.some(item => item.id === id));
    const located = locatedSearch?.key === key && locatedSearch.id === id && locatedSearch.version === searchVersion ? locatedSearch : null;
    if (located) { located.state = 'loading'; located.request = request; searchResults.delete(key); }
    outstanding.set(request, 'pending');
    reader = { key, id, state: 'loading', request }; changed();
    $('reader-title')?.focus();
    let result;
    try { result = key === '$root' ? (await call('osm_home_page', {}))?._meta?.['osm/home-page'] : (await call('osm_home_read', { section: key, id }))?._meta?.['osm/home-record']; } catch { result = { state: 'unavailable', scope }; }
    // Invalidation comes first, also when the reader was left before the answer arrived.
    if (!current(result, mine, wasListed || Boolean(lists.get(key)?.items?.some(item => item.id === id) || searchResults.get(key)?.items?.some(item => item.id === id)))) return changed();
    // This generation's read has answered: a failure keeps the recovery unsettled; a valid
    // answer may complete it, whether or not the reader is still on this record.
    if (['unavailable', 'rate_limited'].includes(result.state)) outstanding.set(request, 'failed'); else outstanding.delete(request);
    rearm();
    // Retain only the verified Q01 row for this link-search lifetime. Invalidation above
    // must run even after Back; neither locate metadata nor the article is retained.
    if (located && located === locatedSearch && located.version === searchVersion && located.request === request) {
      located.state = result.state === 'read' && !result.record ? 'unavailable' : result.state;
      if (result.state === 'read' && result.record) {
        const { title, icon } = result.record;
        searchResults.set(key, { state: 'listed', items: [{ id, title, ...(icon && { icon }) }], source: lists.get(key)?.source });
      }
      if (view.kind === 'search' && !reader) {
        changed(); (openers.get(key + ':' + id) || $('home-search'))?.focus(); return;
      }
    }
    // R8-2: only the answer to the reader's own request and section is displayed, so an
    // older read of a reopened record never replaces the newer article.
    if (reader?.request !== request || reader.key !== key) return;
    reader = { key, id, state: result.state, record: result.state === 'read' ? result.record : undefined, request };
    changed(); $('reader-title')?.focus();
  }
  function back() {
    const previous = history.pop(); reader = null; view = previous?.view || { kind: 'overview' };
    $('home-search').value = view.query || ''; changed();
    (openers.get(previous?.focus) || $(previous?.focus) || $('home-search'))?.focus();
  }
  function sourceView(section) { history.push({ view: { ...view }, focus: 'source-' + section.key }); view = { kind: 'source', key: section.key }; reader = null; changed(); }
  async function search(query) {
    query = query.trim();
    if (searching) { searchQueued = true; return; }
    searching = true; const version = searchVersion, mine = generation, request = {}, outstanding = reads; searchRequest = request; let failedSearch = false;
    outstanding.set(request, 'pending'); changed();
    try {
      if (/^https?:\/\//i.test(query)) {
        let result; try { result = (await call('osm_home_locate', { link: query }))?._meta?.['osm/home-location']; } catch { result = { state: 'unavailable', scope: data?.scope }; }
        if (mine !== generation) return;
        if (!['located', 'outside', 'inaccessible'].includes(result?.state)) { if (!current(result, mine)) return changed(); }
        else if (result.scope !== data?.scope) { revoke(); return changed(); }
        if (version !== searchVersion) return;
        failedSearch = ['unavailable', 'rate_limited'].includes(result.state);
        if (result.state === 'located') {
          if (!sections().some(section => section.key === result.key && ['profile', 'documents', 'memory', 'skills'].includes(section.role)) || typeof result.id !== 'string') { linkState = 'outside'; changed(); return; }
          locatedSearch = { key: result.key, id: result.id, version, state: 'loading' };
          return read(result.key, result.id, result.key + ':' + result.id);
        }
        linkState = result.state; changed(); return;
      }
      await Promise.all(sections().filter(item => ['profile', 'documents', 'memory', 'skills'].includes(item.role)).map(async section => {
        let result; try { result = (await call('osm_home_search', { section: section.key, query }))?._meta?.['osm/home-list']; } catch { result = { state: 'unavailable', scope: data?.scope }; }
        if (mine !== generation) return;
        if (!current(result, mine, lists.get(section.key)?.state === 'listed' || searchResults.get(section.key)?.state === 'listed')) return changed();
        if (version !== searchVersion) return;
        if (['unavailable', 'rate_limited'].includes(result.state)) failedSearch = true;
        searchResults.set(section.key, result); changed();
      }));
    } finally {
      if (failedSearch) outstanding.set(request, 'failed'); else outstanding.delete(request);
      rearm();
      if (searchRequest === request) {
        searching = false; searchRequest = null;
        if (searchQueued) { searchQueued = false; if (view.kind === 'search') void search(view.query); }
        changed();
      }
    }
  }
  function recordButton(section, item, describe, searched = false) {
    const node = button('', 'row', () => read(section.key, item.id));
    if (searched) { node.setAttribute('role', 'option'); node.setAttribute('aria-selected', 'false'); }
    const words = el('span');
    const title = el('span', null, 'row-title'); sourceLabel(title, item); words.append(title);
    if (item.icon) words.setAttribute('class', 'record-words has-icon');
    if (describe && item.description) words.append(el('span', item.description, 'hint record-description'));
    node.append(words); node.dataset.open = item.id;
    openers.set(section.key + ':' + item.id, node);
    return node;
  }
  function sourceState(section, entry) {
    const box = el('div', null, 'hint unavailable');
    if (!entry || entry.loading && !entry.items) { box.append(el('p', 'Loading…')); return box; }
    if (entry.state === 'empty') { box.append(el('p', 'Nothing here yet.')); return box; }
    box.append(el('p', entry.state === 'inaccessible' ? 'OSM’s connection can’t read ' + section.label + '.' : copy[entry.state] || copy.unavailable));
    // A section's Try again is explicit too, so it resets the budget.
    if (['rate_limited', 'unavailable'].includes(entry.state)) box.append(button('Try again', 'btn btn-ghost', () => { rearm(true); return list(section.key); }));
    else { if (entry.state === 'inaccessible') box.append(el('p', 'In Notion, use ••• → Connections to share this source with OSM.')); box.append(button(entry.state === 'inaccessible' ? 'How to share it ›' : 'Open in Notion ↗', 'btn btn-ghost', () => open(section.link))); }
    return box;
  }
  function records(section, describe, full = false, searched = false) {
    const entry = searched ? searchResults.get(section.key) : lists.get(section.key);
    if (!searched && !entry && data?.state === 'ready') Promise.resolve().then(() => { if (!lists.has(section.key)) void list(section.key); });
    if (entry?.state !== 'listed') return [sourceState(section, entry)];
    const limit = 3;
    const all = full || searched ? entry.items : entry.items.slice(0, limit);
    const ul = el('ul', null, 'record-list'); ul.setAttribute('role', searched ? 'group' : 'list');
    for (const item of all) { const li = el('li'); li.append(recordButton(section, item, describe, searched)); ul.append(li); }
    const nodes = [ul], title = entry.source?.title || section.label;
    if (!full && !searched && entry.state === 'listed' && entry.items.length) {
      const actions = el('div', null, 'step-actions');
      const action = button('Open ' + title, 'btn btn-ghost', () => sourceView(section)); action.id = 'source-' + section.key; actions.append(action); nodes.push(actions);
    }
    if (full && entry.hasMore) { const actions = el('div', null, 'step-actions'); actions.append(button(entry.loading ? 'Loading…' : 'Load more from ' + title, 'btn btn-ghost', () => list(section.key, true))); nodes.push(actions); }
    if (full && entry.capped) nodes.push(el('p', 'Home shows up to 50 pages. Open this source in Notion for the rest.', 'reader-meta'));
    if (entry.partial) nodes.push(el('p', 'Notion stopped this list early. Open it in Notion for the rest.', 'reader-meta'));
    if (entry.withheld) nodes.push(el('p', entry.withheld + ' pages here can’t be read with OSM’s connection.', 'reader-meta'));
    return nodes;
  }
  function breadcrumbs(panel, section, record) {
    const nav = el('nav', null, 'breadcrumbs'); nav.setAttribute('aria-label', 'Breadcrumb');
    const root = button(data.root.title, 'breadcrumb-link breadcrumb-root', () => {
      reader = null; view = { kind: 'overview' }; history = []; resetSearch(); changed();
    });
    if (!section && record) { const current = el('span', record.title, 'breadcrumb-segment'); current.setAttribute('aria-current', 'page'); nav.append(current); panel.append(nav); return; }
    nav.append(root);
    if (section) nav.append(button(lists.get(section.key)?.source?.title || section.label, 'breadcrumb-link breadcrumb-segment', () => { reader = null; view = { kind: 'source', key: section.key }; changed(); }));
    if (record) { const current = el('span', record.title, 'breadcrumb-segment'); current.setAttribute('aria-current', 'page'); nav.append(current); }
    panel.append(nav);
  }

  function renderReader(panel, value = reader) {
    const article = el('article', null, 'reader');
    const section = sections().find(item => item.key === value.key);
    const bar = el('div', null, 'reader-bar'), leading = el('div', null, 'reader-leading');
    const backButton = button('‹', 'btn btn-ghost icon back', back);
    backButton.setAttribute('aria-label', 'Back to ' + (history.at(-1)?.view.kind === 'search' ? 'search results' : history.at(-1)?.view.kind === 'source' ? (lists.get(section?.key)?.source?.title || section?.label || 'source') : 'Home'));
    leading.append(backButton); breadcrumbs(leading, section, value.record); bar.append(leading);
    if (value.record?.link) {
      const tools = el('div', null, 'reader-tools'), status = el('span'); status.setAttribute('role', 'status');
      tools.append(button('Copy link', 'btn btn-ghost', async () => {
        try { await navigator.clipboard.writeText(value.record.link); status.textContent = 'Link copied'; setTimeout(() => { status.textContent = ''; }, 2000); }
        catch { tools.setAttribute('data-manual-copy', 'true'); const input = el('input'); input.value = value.record.link; input.readOnly = true; input.setAttribute('aria-label', 'Copy this Notion URL'); tools.append(input); input.focus(); input.select?.(); }
      }), button('Open in Notion ↗', 'btn btn-ghost', () => open(value.record.link)), status); bar.append(tools);
    }
    panel.append(bar);
    const record = value.record, heading = el('h2', record?.title || (value.state === 'loading' ? 'Loading…' : 'Unavailable'));
    heading.setAttribute('id', 'reader-title'); heading.setAttribute('tabindex', '-1');
    article.setAttribute('aria-labelledby', 'reader-title');
    if (record) sourceLabel(heading, record);
    article.append(heading);
    if (record?.meta) article.append(el('p', record.meta, 'reader-meta'));
    const body = el('div', null, 'reader-body');
    if (!record && value.state !== 'loading') {
      body.append(el('p', copy[value.state] || copy.unavailable, 'unavailable'));
      if (['unavailable', 'rate_limited'].includes(value.state)) body.append(button('Try again', 'btn btn-ghost', () => { rearm(true); return read(value.key, value.id, undefined, true); }));
    }
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

    panel.append(article);
  }
  function sourceSection(source) {
    const root = el('section', null, 'step'), heading = el('h3', null, 'source-head');
    const label = el('span'); sourceLabel(label, source);
    const slot = el('span', null, 'step-number source-slot');
    const icon = [...label.children].find(node => node.className === 'source-icon');
    if (icon) slot.append(icon);
    const title = [...label.children].find(node => node.className === 'source-title');
    title.className = 'step-label'; heading.append(slot, title);
    const content = el('div', null, 'source-panel'); root.append(heading, content);
    return { root, content };
  }
  function renderOverview(panel) {
    const card = el('div', null, 'osm-card');
    for (const section of sections().filter(item => ['profile', 'documents', 'memory', 'skills'].includes(item.role))) {
      const entry = lists.get(section.key);
      const source = ['listed', 'empty'].includes(entry?.state) ? entry.source : null;
      const { root, content } = sourceSection(source || { title: section.label });
      content.append(...records(section, section.role === 'skills')); card.append(root);
    }
    panel.append(card);
    const related = sections().filter(item => item.role === 'related');
    if (related.length) { const aside = el('aside', 'Elsewhere in Notion', 'also'); for (const item of related) aside.append(button(item.label + ' ↗', 'btn btn-ghost', () => open(item.link))); panel.append(aside); }
  }
  function renderSearch(panel) {
    const locatedState = locatedSearch?.state;
    const unavailableLink = ['unavailable', 'rate_limited'].includes(linkState || locatedState);
    if (unavailableLink) {
      const section = sections().find(item => item.key === locatedSearch?.key);
      const title = lists.get(section?.key)?.source?.title || section?.label || 'This page';
      panel.append(el('p', title + ' couldn’t be searched right now'), button('Try again', 'btn btn-ghost', () => {
        rearm(true); locatedSearch = null; linkState = null; searchResults.clear(); return search(view.query);
      })); return;
    }
    if (linkState || ['inaccessible', 'unsupported'].includes(locatedState)) {
      panel.append(el('p', linkState === 'outside' ? 'This page isn’t part of your Data & Context home. Home opens only pages in the sources your home routes to.' : 'OSM can’t open this page here'));
      if (/^https:\/\/(?:www\.)?(?:notion\.so|notion\.com|app\.notion\.com)\//i.test(view.query.trim())) panel.append(button('Open in Notion ↗', 'btn btn-ghost', () => open(view.query.trim())));
      return;
    }
    const searched = sections().filter(item => ['profile', 'documents', 'memory', 'skills'].includes(item.role));
    let count = 0;
    const card = el('div', null, 'osm-card');
    for (const section of searched) {
      const result = searchResults.get(section.key); if (!result) continue;
      const failed = !['listed', 'empty'].includes(result.state);
      const items = result.state === 'listed' ? (result.items || []).slice(0, 5) : [];
      if (!items.length && !failed && !result.hasMore && !result.partial && !result.withheld) continue;
      const source = !failed && result.source?.title ? result.source : { title: section.label };
      const { root, content } = sourceSection(source); card.append(root);
      if (items.length) {
        const ul = el('ul', null, 'record-list'); ul.setAttribute('role', 'group');
        for (const item of items) { const li = el('li'); li.append(recordButton(section, item, section.role === 'skills', true)); ul.append(li); }
        content.append(ul); count += items.length;
      }
      if (failed) content.append(el('p', source.title + ' couldn’t be searched right now', 'reader-meta'));
      else if (result.hasMore || result.partial) content.append(el('p', source.title + ' couldn’t be searched completely', 'reader-meta'));
      if (result.withheld) content.append(el('p', result.withheld + ' pages here can’t be read with OSM’s connection.', 'reader-meta'));
      if (result.hasMore && !failed) { const actions = el('div', null, 'step-actions'), action = button('Open ' + source.title, 'btn btn-ghost', () => sourceView(section)); action.id = 'source-' + section.key; actions.append(action); content.append(actions); }
      else if (failed || result.partial) content.append(button('Try again', 'btn btn-ghost', () => { rearm(true); return search(view.query); }));
    }
    if (card.children.length) panel.append(card);
    if (searching || searchTimer || locatedState === 'loading') panel.append(el('p', 'Searching…', 'reader-meta'));
    else if (!locatedSearch && !count && searched.every(section => {
      const result = searchResults.get(section.key);
      return result && ['empty', 'listed'].includes(result.state) && !result.items?.length && !result.hasMore && !result.partial && !result.withheld;
    })) {
      panel.append(el('p', 'No titles in this home match “' + view.query + '”.', 'reader-meta'), el('p', 'Searched ' + searched.map(section => searchResults.get(section.key)?.source?.title || section.label).join(', ') + '.', 'reader-meta'));
    }
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
    $('brand-mark').replaceChildren(); $('brand-mark').hidden = true; $('home').hidden = !visible;
    if (visible) $('heading').textContent = 'OSM';
    $('show-home').hidden = !available() || !showLinks;
    const status = $('home-status');
    status.hidden = true;
    const verified = data?.state === 'ready' && Boolean(data.verifiedAt);
    status.dataset.state = verified ? 'connected' : 'neutral';
    $('home-status-label').textContent = loading && !data ? 'Notion · Checking…' : labels[gateState()] || 'Notion · Could not check';
    status.setAttribute('title', verified ? 'Checked ' + new Date(data.verifiedAt).toLocaleTimeString() : '');
    const ready = data?.state === 'ready' && !suppressed();
    $('page-header').hidden = visible && (Boolean(reader) || view.kind === 'source') && ready;
    $('osm-workspace').textContent = ready ? 'Connected · ' + (data.workspaceName || 'Notion') : labels[gateState()] || 'OSM connection not checked';
    $('osm-workspace').dataset.state = ready ? 'connected' : 'neutral';
    $('osm-checked').hidden = !ready || !data.verifiedAt;
    $('osm-checked').textContent = ready && data.verifiedAt ? 'Checked at ' + new Date(data.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) + ' when Home opened' : '';
    $('settings-connection').hidden = ready;
    $('settings-connection').setAttribute('class', 'btn btn-primary');
    $('settings-connection').textContent = data?.state === 'not_connected' ? 'Connect Notion' : 'Manage OSM connection';
    $('connection-provisioning').hidden = data?.state !== 'not_connected' || suppressed();
    $('connection-guidance').hidden = !ready;
    $('manage-access').hidden = !ready;
    $('home-definition').textContent = ready ? 'Definition revision ' + data.definitionRevision + ' routes Home to ' + sections().filter(item => item.role !== 'related').length + ' sources. It routes; access comes from OSM’s connection.' : 'Home not verified';
    const methods = data?.builtin?.length || 0;
    $('builtin-summary').textContent = methods + (methods === 1 ? ' method' : ' methods');
    const builtin = $('builtin-content'); builtin.replaceChildren();
    for (const skill of data?.builtin || []) { const method = el('div', null, 'builtin-method'); method.append(el('p', skill.name, 'builtin-name'), el('p', skill.description, 'hint')); builtin.append(method); }
    $('organisation-copy').hidden = true;
    $('organisation-copy').textContent = '';
    $('manage-access').disabled = !ready || locked;
    if (!visible) { $('home-panel').replaceChildren(); $('home-page').replaceChildren(); return; }
    const gate = data?.state === 'ready' && !suppressed() ? null : gates[gateState()] || gates.unavailable;
    $('home-workspace').hidden = Boolean(gate); $('home-gate').hidden = !gate;
    if (loading && !data) {
      $('home-workspace').hidden = false; $('home-gate').hidden = true; $('home-page').replaceChildren(el('p', 'Opening your home…', 'reader-meta'));
      $('home-panel').replaceChildren(el('p', 'Loading…', 'reader-meta')); $('home-search').hidden = false; $('home-search').disabled = true; return;
    }
    if (gate) {
      $('home-panel').replaceChildren(); $('home-page').replaceChildren(); $('organisation').hidden = false;
      $('heading').textContent = gate[0];
      $('gate-title').textContent = gate[0]; $('gate-copy').textContent = gate[1];
      $('gate-action').textContent = retry() ? 'Try again' : data?.state === 'root_inaccessible' ? 'Check again' : 'Show saved links';
      const rootDenied = data?.state === 'root_inaccessible' && !suppressed();
      const humanGate = rootDenied || data?.state === 'not_connected' && !suppressed();
      $('gate-notion').hidden = !rootDenied;
      $('gate-connect').hidden = rootDenied;
      $('gate-connect').textContent = data?.state === 'not_connected' ? 'Open connection settings' : 'Manage OSM connection';
      $('gate-setup').textContent = humanGate ? 'Get help from your agent' : 'Continue with agent';
      $('gate-setup').setAttribute('class', 'btn btn-ghost');
      $('gate-action').setAttribute('class', humanGate ? 'btn btn-ghost' : 'btn btn-primary');
      $('gate-connect').setAttribute('class', humanGate ? 'btn btn-primary' : 'btn btn-ghost');
      const actions = $('gate-action').parentNode;
      const ordered = humanGate ? ['gate-notion', 'gate-connect', 'gate-action', 'gate-setup'] : ['gate-action', 'gate-connect', 'gate-notion', 'gate-setup'];
      actions.replaceChildren(...ordered.map($));
      $('gate-action').disabled = locked || loading; $('gate-action').hidden = suppressed() && !retry();
      return;
    }
    const rootPanel = $('home-page'); rootPanel.replaceChildren(); rootPanel.hidden = Boolean(reader) || view.kind !== 'overview';
    if (!reader && view.kind !== 'source') {
      const label = el('span'); sourceLabel(label, data.root);
      const icon = [...label.children].find(node => node.className === 'source-icon');
      if (icon) { $('brand-mark').append(icon); $('brand-mark').hidden = false; }
      const title = button('', 'title-link', () => read('$root', '$root', 'home-root-title')); title.id = 'home-root-title';
      title.append(...label.children); $('heading').replaceChildren(title);
    }
    $('home-search').hidden = Boolean(reader) || view.kind === 'source';
    $('home-search').disabled = loading;
    $('home-checking').hidden = !loading; $('home-workspace').setAttribute('aria-busy', String(loading));
    const panel = $('home-panel'); panel.setAttribute('role', view.kind === 'search' && !reader ? 'listbox' : 'region'); panel.replaceChildren(); openers = new Map();
    if (reader) renderReader(panel);
    else if (view.kind === 'source') {
      const section = sections().find(item => item.key === view.key);
      if (section) {
        const bar = el('div', null, 'reader-bar'), leading = el('div', null, 'reader-leading');
        const backButton = button('‹', 'btn btn-ghost icon back', back);
        backButton.setAttribute('aria-label', history.at(-1)?.view.kind === 'search' ? 'Back to search results' : 'Back to Home');
        leading.append(backButton); breadcrumbs(leading, section); bar.append(leading); panel.append(bar);
        const heading = el('h2', null, 'source-title-h'); sourceLabel(heading, lists.get(section.key)?.source || { title: section.label });
        const rows = records(section, section.role === 'skills', true), card = el('div', null, 'osm-card source-records');
        if (rows[0]?.tagName === 'UL') card.append(rows.shift());
        panel.append(heading, button('Open in Notion ↗', 'btn btn-ghost', () => open(section.link)));
        if (card.children.length) panel.append(card);
        panel.append(...rows);
      }
    }
    else if (view.kind === 'search') renderSearch(panel);
    else renderOverview(panel);
  }
  $('home-search').addEventListener('input', () => {
    const query = $('home-search').value; ++searchVersion; clearTimeout(searchTimer); searchTimer = undefined; searchResults.clear(); linkState = null; locatedSearch = null; history = [];
    view = query.trim() ? { kind: 'search', query } : { kind: 'overview' }; reader = null; changed();
    if (query.trim()) searchTimer = setTimeout(() => { searchTimer = undefined; void search(query); }, 300);
  });
  $('home-search').addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); resetSearch(); reader = null; history = []; view = { kind: 'overview' }; changed(); }
    if (event.key === 'ArrowDown') { event.preventDefault(); openers.values().next().value?.focus(); }
  });
  $('home-panel').addEventListener('keydown', event => {
    const rows = [...openers.values()], index = rows.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && index >= 0) { event.preventDefault(); rows[(index + (event.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length]?.focus(); }
  });
  $('builtin-toggle').addEventListener('click', () => {
    const expanded = $('builtin-toggle').getAttribute('aria-expanded') !== 'true';
    $('builtin-toggle').setAttribute('aria-expanded', String(expanded)); $('builtin-panel').hidden = !expanded;
  });
  let wasHidden = false;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { wasHidden = true; return; }
    if (!wasHidden) return; wasHidden = false;
    const now = Date.now(); if (context && !loading && now - lastVisibleCheck >= 30000) { lastVisibleCheck = now; void reload(); }
  });
  $('home-recheck').addEventListener('click', reload);
  $('gate-notion').addEventListener('click', () => !suppressed() && context && open(context));
  $('manage-access').addEventListener('click', () => data?.state === 'ready' && open(data.root.link));
  $('gate-action').addEventListener('click', () => {
    if (retry() || data?.state === 'root_inaccessible') return reload();
    if (suppressed()) return;
    showLinks = true; changed(); $('show-home').focus();
  });
  for (const id of ['show-links']) $(id).addEventListener('click', () => { if (suppressed()) return; showLinks = true; changed(); $('show-home').focus(); });
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
    // R9-1: none while an observed account change holds, whatever the later status.
    if (loading || !data || data.failed || suppressed()) return false;
    // The chosen-links branch needs the status resolved as ready; the revoke() placeholder
    // and every other state (unavailable, rate_limited, not_connected, account_changed,
    // unsupported_host, root_inaccessible, mapping_unavailable, unmapped) allow nothing.
    const chosen = dashboard && showLinks && data.state === 'ready' && data.mapping === 'saved'
      && ['official_notion_user', 'internal_selected_pages'].includes(data.selectedMode);
    const evidence = data.state === 'official_mode' || data.mapping === 'missing' || chosen;
    return evidence && (!dashboard || !shown());
  }
  return { sync, reload, render, shown, suppressed, iconsAllowed, currentRoot: () => data?.state === 'ready' && !suppressed() ? data.root : null };
}
