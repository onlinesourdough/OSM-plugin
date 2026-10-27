import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { classifyTarget, connectionCopy } from './ui-model.mjs';
import { createDocument } from './test-dom.mjs';
// The browser modules share one VM realm with a small DOM; imports become globals.
const read = name => readFile(new URL(name, import.meta.url), 'utf8');
const source = (await Promise.all(['page-icons.mjs', 'source-label.mjs', 'setup-state.mjs', 'picker.mjs', 'home.mjs', 'app.mjs'].map(read)))
  .map(text => text.replace(/^import .*;\n/gm, '').replace(/^export /gm, '')).join('\n');
const template = await read('index.html');
const target = 'https://app.notion.com/p/00000000000000000000000000000001';
const other = 'https://app.notion.com/p/00000000000000000000000000000002';
const configured = (revision = 'a') => ({ state: 'configured', target, kind: 'notion', revision: revision.repeat(64) });
const saved = (links, title = 'Our AIOS') => ({ state: 'saved', revision: 'c'.repeat(64), title, links });
const plain = value => JSON.parse(JSON.stringify(value));

async function ui(context = { state: 'missing', revision: 'a'.repeat(64) }, sources = { state: 'missing', revision: 'c'.repeat(64), title: '', links: {} }, options = {}) {
  let time = 100000, host, fail = Boolean(options.initialFailure), delay, release, revision = 0, linkFailure = false;
  const calls = [], homeCalls = [], links = [], document = createDocument(template);
  const status = { features: { notionPages: Boolean(options.pages), notionIcons: Boolean(options.icons) }, notion: { state: options.notion || 'connected' }, context, sources, checkedAt: new Date(time).toISOString() };
  const snapshot = () => ({ _meta: { 'osm/status': structuredClone({ ...status, checkedAt: new Date(time).toISOString() }) } });
  const rejected = text => ({ isError: true, content: [{ type: 'text', text }] });
  class App {
    constructor() { host = this; }
    getHostContext() { return {}; }
    async connect() {
      if (options.initial === 'none') return;
      const result = options.initial === 'malformed' ? {} : snapshot();
      if (options.view) result._meta['osm/view'] = options.view;
      this.ontoolresult(result);
    }
    async openLink(args) {
      links.push(args.url);
      if (linkFailure === 'throw') throw new Error('Link blocked');
      return linkFailure === 'error' ? { isError: true } : {};
    }
    // Mirrors the server contract: revision and context checks, whole-map replacement.
    async callServerTool({ name, arguments: args }) {
      // Home tools are recorded apart; by default the host has no supported connection.
      if (name.startsWith('osm_home')) {
        homeCalls.push({ name, args: plain(args) });
        return options.home ? options.home(name, args) : { content: [], _meta: { 'osm/kind': 'home', 'osm/home': { state: 'unsupported_host', mapping: 'missing', builtin: [] } } };
      }
      calls.push({ name, args: plain(args) }); if (delay) await delay;
      if (fail) throw new Error('Request failed');
      if (name === 'osm_notion_pages') return { _meta: { 'osm/pages': await options.pages(args.query) } };
      if (name === 'osm_notion_icons') return { _meta: { 'osm/kind': 'icons', 'osm/icons': await options.icons(args.targets) } };
      time += 10;
      if (name === 'osm_save_context') {
        if (args.expectedRevision !== status.context.revision) return rejected('Your context changed. Refresh before trying again.');
        status.context = { state: 'configured', ...classifyTarget(args.target), revision: String(++revision).padStart(64, 'b') };
        status.sources = options.recoveredSources || { state: 'missing', revision: 'c'.repeat(64), title: '', links: {} };
      }
      if (name === 'osm_save_sources') {
        if (options.failSources) return rejected('Could not save source names.');
        if (args.target !== status.context.target || args.expectedContextRevision !== status.context.revision
          || args.expectedRevision !== status.sources.revision) return rejected('Source links changed. Refresh before saving again.');
        status.sources = { state: 'saved', revision: String(++revision).padStart(64, 'd'), title: args.title, links: args.links };
      }
      return snapshot();
    }
  }
  const sandbox = { App, classifyTarget, connectionCopy, __OSM_VERSION__: 'test', applyDocumentTheme() {}, applyHostStyleVariables() {},
    document, URL, structuredClone, setTimeout, clearTimeout, Date: class extends Date { static now() { return time; } } };
  await vm.runInNewContext(`(async () => {${source}})()`, sandbox);
  const get = id => document.getElementById(id);
  const u = {
    get, calls, homeCalls, links, status, document, names: () => calls.map(call => call.name), focused: () => document.activeElement?.id,
    text: id => get(id).textContent, shown: id => !get(id).hidden,
    notify: value => host.ontoolresult(value), fail: value => { fail = value; }, failLinks: value => { linkFailure = value; },
    delay() { delay = new Promise(resolve => { release = resolve; }); }, release() { release(); delay = undefined; },
    click: id => get(id).dispatch('click'),
    key: (id, key) => get(id).dispatch('keydown', { key }),
    input: value => { get('target').value = value; return get('target').dispatch('input'); },
    provider: () => u.click('provider'),
    submit: () => get('setup').dispatch('submit'),
    options: picker => get(`${picker}-list`).descendants().filter(node => node.getAttribute('role') === 'option'),
    async choose(picker, label) {
      await u.click(picker);
      const option = u.options(picker).find(node => node.textContent.startsWith(label));
      assert.ok(option, `${label} in ${picker}`); return option.dispatch('click');
    },
    async addLink(picker, link, name = '') {
      await u.choose(picker, get(picker).dataset.empty === 'true' ? 'Add link…' : 'Edit link…');
      get(`${picker}-link`).value = link; if (get(`${picker}-name`)) get(`${picker}-name`).value = name;
      return u.click(`${picker}-apply`);
    },
  };
  return u;
}

test('onboarding saves the context, then each source step without chat, and opens every destination', async () => {
  const u = await ui();
  assert.equal(u.text('heading'), 'Get started'); assert.equal(u.shown('panel-1'), true);
  await u.input(target); await u.submit();
  assert.deepEqual(u.names(), ['osm_save_context']);
  assert.equal(u.shown('panel-1'), true); assert.equal(u.focused(), 'setup-docs-picker');
  await u.addLink('setup-docs-picker', 'https://example.com/docs'); await u.submit();
  assert.equal(u.shown('panel-2'), true);
  await u.addLink('setup-personalSkills-picker', 'https://example.com/skills', 'Writing skills');
  await u.addLink('setup-teamSkills-picker', 'https://example.com/team'); await u.submit();
  assert.equal(u.text('continue-3'), 'Finish');
  await u.addLink('setup-memory-picker', 'https://example.com/memory'); await u.addLink('setup-teamMemory-picker', 'https://example.com/team-memory');
  await u.submit();
  assert.equal(u.shown('dashboard'), true); assert.equal(u.text('heading'), 'OSM'); assert.equal(u.focused(), 'heading');
  assert.deepEqual(u.names(), ['osm_save_context', 'osm_save_sources', 'osm_save_sources', 'osm_save_sources']);
  assert.deepEqual(u.calls[3].args.links, { docs: { title: 'Docs', target: 'https://example.com/docs' },
    personalSkills: { title: 'Writing skills', target: 'https://example.com/skills' }, teamSkills: { title: 'Team skills', target: 'https://example.com/team' },
    memory: { title: 'Memory', target: 'https://example.com/memory' }, teamMemory: { title: 'Team memory', target: 'https://example.com/team-memory' } });
  for (const id of ['context', 'docs', 'personalSkills', 'teamSkills', 'memory', 'teamMemory']) await u.click('open-' + id);
  assert.deepEqual(u.links, [target, 'https://example.com/docs', 'https://example.com/skills', 'https://example.com/team', 'https://example.com/memory', 'https://example.com/team-memory']);
});

test('every step opens before a context exists and explains the one requirement', async () => {
  const u = await ui();
  for (const step of [0, 2, 3]) { await u.click(`step-${step}`); assert.equal(u.shown(`panel-${step}`), true); }
  assert.equal(u.shown('reason-3'), true); assert.equal(u.get('setup-memory-picker').disabled, true);
  await u.submit();
  assert.equal(u.calls.length, 0); assert.equal(u.shown('panel-1'), true); assert.equal(u.text('feedback-text'), 'Save the context first.');
});

test('jumping between steps keeps the source draft and one Continue saves every pending edit', async () => {
  const u = await ui(); await u.input(target); await u.submit();
  await u.click('step-2'); await u.addLink('setup-personalSkills-picker', 'https://example.com/skills');
  await u.click('step-3'); await u.addLink('setup-memory-picker', 'https://example.com/memory');
  assert.equal(u.text('summary-2'), 'Edited');
  await u.click('step-0'); await u.click('step-2');
  assert.equal(u.get('setup-personalSkills-picker').textContent, 'Personal skills');
  await u.click('step-3'); await u.submit();
  assert.deepEqual(u.names(), ['osm_save_context', 'osm_save_sources']);
  assert.deepEqual(Object.keys(u.calls[1].args.links), ['personalSkills', 'memory']);
  assert.equal(u.shown('dashboard'), true);
});

test('an existing context opens the dashboard with Personal and Team slots and a quiet Add', async () => {
  const u = await ui(configured(), saved({ personalSkills: { title: 'Writing skills', target: 'https://example.com/skills' }, memory: { title: 'Memory', target: 'https://example.com/memory' } }));
  assert.equal(u.text('heading'), 'OSM'); assert.equal(u.shown('badge'), true); assert.equal(u.shown('setup'), false);
  assert.equal(u.text('context-meta'), 'Our AIOS');
  assert.deepEqual(['personalSkills', 'teamSkills', 'memory', 'teamMemory'].map(role => u.text(`${role}-meta`)), ['Writing skills', 'Add', 'example.com/memory', 'Add']);
  await u.click('open-personalSkills'); assert.deepEqual(u.links, ['https://example.com/skills']);
  await u.click('open-teamMemory');
  assert.equal(u.get('drawer').open, true); assert.equal(u.focused(), 'settings-teamMemory-picker-link');
  assert.equal(u.calls.length, 0);
});

test('Settings Save persists every pending edit once and keeps untouched keys', async () => {
  const docs = { title: 'Docs', target: 'https://example.com/docs' }, skills = { title: 'Writing skills', target: 'https://example.com/skills' }, memory = { title: 'Decisions', target: 'https://example.com/memory' };
  const u = await ui(configured(), saved({ docs, personalSkills: skills, memory }));
  await u.click('settings');
  assert.equal(u.get('drawer').open, true); assert.equal(u.focused(), 'drawer-title'); assert.equal(u.get('drawer-save').disabled, true);
  await u.choose('settings-docs-picker', 'None');
  await u.addLink('settings-teamSkills-picker', 'https://example.com/team', 'Studio methods');
  assert.equal(u.get('drawer-save').disabled, false);
  await Promise.all([u.click('drawer-save'), u.click('drawer-save')]);
  assert.deepEqual(u.names(), ['osm_save_sources']);
  assert.deepEqual(u.calls[0].args.links, { personalSkills: skills, teamSkills: { title: 'Studio methods', target: 'https://example.com/team' }, memory });
  assert.equal(u.get('drawer').open, false); assert.equal(u.focused(), 'settings');
  assert.equal(u.text('teamSkills-meta'), 'Studio methods'); assert.equal(u.text('docs-meta'), 'Add');
});

test('closing Settings with unsaved edits asks first; Keep editing and Escape keep the draft', async () => {
  const u = await ui(configured(), saved({}));
  await u.click('settings'); await u.key('drawer', 'Escape');
  assert.equal(u.get('drawer').open, false);
  await u.click('settings'); await u.addLink('settings-memory-picker', 'https://example.com/memory');
  await u.click('drawer-close');
  assert.equal(u.get('drawer').open, true); assert.equal(u.shown('foot-discard'), true); assert.equal(u.focused(), 'keep-editing');
  await u.key('drawer', 'Escape'); assert.equal(u.shown('foot-edit'), true);
  assert.equal(u.get('settings-memory-picker').textContent, 'Memory');
  await u.key('drawer', 'Escape'); assert.equal(u.shown('foot-discard'), true);
  await u.click('discard');
  assert.equal(u.get('drawer').open, false); assert.equal(u.calls.length, 0);
  await u.click('settings'); assert.equal(u.get('settings-memory-picker').textContent, 'None');
});

test('the source picker is a keyboard listbox of saved choices, None and a link editor', async () => {
  const u = await ui(configured(), saved({ memory: { title: 'Decisions', target: 'https://example.com/memory' } }));
  await u.click('settings');
  const picker = u.get('settings-memory-picker');
  await u.key('settings-memory-picker', 'ArrowDown');
  assert.equal(picker.getAttribute('aria-expanded'), 'true');
  assert.deepEqual(u.options('settings-memory-picker').map(node => node.textContent), ['Decisionsexample.com/memory', 'None', 'Edit link…']);
  assert.equal(u.text('settings-memory-picker-list').startsWith('Saved sources'), true);
  assert.equal(picker.getAttribute('aria-activedescendant'), 'settings-memory-picker-opt-0');
  await u.key('settings-memory-picker', 'End'); await u.key('settings-memory-picker', 'Home'); await u.key('settings-memory-picker', 'ArrowDown');
  assert.equal(picker.getAttribute('aria-activedescendant'), 'settings-memory-picker-opt-1');
  await u.key('settings-memory-picker', 'Escape');
  assert.equal(picker.getAttribute('aria-expanded'), 'false'); assert.equal(u.get('drawer').open, true);
  await u.key('settings-memory-picker', 'ArrowDown'); await u.key('settings-memory-picker', 'ArrowDown'); await u.key('settings-memory-picker', ' ');
  assert.equal(picker.textContent, 'None'); assert.equal(u.focused(), 'settings-memory-picker');
  await u.key('settings-memory-picker', 'ArrowDown'); await u.key('settings-memory-picker', 'End'); await u.key('settings-memory-picker', 'Enter');
  assert.equal(u.focused(), 'settings-memory-picker-link');
  u.get('settings-memory-picker-link').value = 'javascript:alert(1)'; await u.click('settings-memory-picker-apply');
  assert.equal(u.text('settings-memory-picker').includes('None'), true);
  await u.key('settings-memory-picker-link', 'Escape');
  assert.equal(u.focused(), 'settings-memory-picker'); assert.equal(u.get('drawer').open, true);
  await u.choose('settings-memory-picker', 'Decisions'); assert.equal(u.get('drawer-save').disabled, true);
});

test('an unapplied link keeps its original context and asks before closing Settings', async () => {
  const u = await ui(configured(), saved({}));
  await u.click('settings'); await u.choose('settings-memory-picker', 'Add link…');
  u.get('settings-memory-picker-link').value = 'https://example.com/unapplied';
  await u.get('settings-memory-picker-link').dispatch('input');
  await u.click('drawer-close');
  assert.equal(u.get('drawer').open, true); assert.equal(u.shown('foot-discard'), true);
  await u.click('keep-editing');
  assert.equal(u.focused(), 'settings-memory-picker-link');
  u.status.context = { ...configured('b'), target: other };
  u.status.sources = saved({ docs: { title: 'Other docs', target: 'https://example.com/other' } });
  await u.click('drawer-refresh');
  assert.equal(u.get('settings-memory-picker-link').value, 'https://example.com/unapplied');
  await u.click('settings-memory-picker-apply'); await u.click('drawer-save');
  assert.equal(u.names().includes('osm_save_sources'), false);
  assert.equal(u.shown('drawer-reload'), true);
});

test('switching context explicitly discards unapplied editors as well as applied drafts', async () => {
  const u = await ui(configured(), saved({}));
  await u.click('settings'); await u.choose('settings-memory-picker', 'Add link…');
  u.get('settings-memory-picker-link').value = 'https://example.com/old-context';
  await u.get('settings-memory-picker-link').dispatch('input');
  await u.choose('settings-context-picker', 'Switch context…');
  assert.equal(u.text('settings-context-picker-apply'), 'Discard and switch');
  u.get('settings-context-picker-link').value = other;
  await u.click('settings-context-picker-apply');
  assert.equal(u.get('settings-memory-picker-link').parentNode.parentNode.hidden, true);
  assert.equal(u.get('settings-memory-picker').textContent, 'None');
  assert.deepEqual(u.names(), ['osm_save_context']);
});

test('pending save locks input and blocks double submit; failures keep the draft', async () => {
  const u = await ui(); await u.input(target); u.delay(); u.fail(true);
  const save = u.submit(); assert.equal(u.get('target').disabled, true); await u.submit();
  assert.equal(u.calls.length, 1); u.release(); await save;
  assert.equal(u.get('target').disabled, false); assert.equal(u.get('target').value, target);
  assert.equal(u.shown('dashboard'), false); assert.equal(u.get('feedback').dataset.error, 'true');

  const s = await ui(configured(), saved({}));
  await s.click('settings'); await s.addLink('settings-docs-picker', 'https://example.com/docs');
  s.fail(true); await s.click('drawer-save');
  assert.equal(s.get('drawer').open, true); assert.equal(s.get('drawer-feedback').dataset.error, 'true');
  assert.equal(s.get('settings-docs-picker').textContent, 'Docs');
  s.fail(false); await s.click('drawer-save'); assert.equal(s.get('drawer').open, false);
});

test('failed refresh clears Connected; late snapshots cannot restore it and retry recovers', async () => {
  const u = await ui(); u.fail(true); await u.click('refresh');
  assert.equal(u.text('connection-label'), 'Could not verify');
  u.notify({ _meta: { 'osm/status': u.status } });
  assert.equal(u.text('connection-label'), 'Could not verify');
  u.fail(false); await u.click('refresh'); assert.equal(u.text('connection-label'), '✓ Connected');
});

test('non-Notion contexts omit connection actions; ambiguous instructions cannot be saved', async () => {
  const u = await ui(undefined, undefined, { initial: 'none' }); await u.click('retry-load');
  u.status.notion = { state: 'not_connected' }; await u.click('refresh');
  assert.equal(u.shown('connect'), true);
  await u.provider(); assert.equal(u.shown('connect'), false); assert.equal(u.text('summary-0'), 'Not needed');
  await u.click('step-1'); await u.input('/work/my vault'); await u.submit();
  assert.equal(u.calls.at(-1).args.target, '/work/my vault');
  const blocked = await ui({ state: 'ambiguous', revision: 'a'.repeat(64) });
  assert.equal(blocked.get('continue-1').disabled, true); assert.equal(blocked.shown('feedback'), true);
});

test('malformed status removes the Connected claim and leaves a working retry', async () => {
  const u = await ui(); u.notify({ _meta: { 'osm/status': { notion: { state: 'connected' }, context: { state: 'configured' }, checkedAt: new Date(100005).toISOString() } } });
  assert.equal(u.text('connection-label'), 'Could not verify');
  assert.equal(u.get('refresh').disabled, false);
  await u.click('refresh'); assert.equal(u.text('connection-label'), '✓ Connected');
});

test('refresh in progress blocks a new save until the current snapshot arrives', async () => {
  const u = await ui(); await u.input(target); u.delay();
  const refreshing = u.click('refresh');
  assert.equal(u.get('continue-1').disabled, true);
  await u.submit(); assert.deepEqual(u.names(), ['osm_status']);
  u.release(); await refreshing;
  assert.equal(u.get('continue-1').disabled, false);
  await u.submit(); assert.deepEqual(u.names(), ['osm_status', 'osm_save_context']);
});

test('switching context in Settings warns about pending edits and never carries sources over', async () => {
  const u = await ui(configured(), saved({ docs: { title: 'Private docs', target: 'https://example.com/a' } }, 'Client A'));
  await u.click('settings'); await u.addLink('settings-memory-picker', 'https://example.com/a-memory');
  await u.choose('settings-context-picker', 'Switch context…');
  assert.equal(u.get('settings-context-picker-apply').textContent, 'Discard and switch');
  assert.equal(u.get('settings-context-picker').parentNode.parentNode.textContent.includes('Unsaved source changes will be discarded.'), true);
  u.get('settings-context-picker-link').value = other; await u.click('settings-context-picker-apply');
  assert.deepEqual(u.names(), ['osm_save_context']);
  assert.equal(u.text('drawer-feedback-text'), 'Switched context. Showing its saved sources.');
  assert.equal(u.get('settings-docs-picker').textContent, 'None'); assert.equal(u.get('settings-memory-picker').textContent, 'None');
  assert.equal(u.get('drawer-save').disabled, true);
  await u.addLink('settings-personalSkills-picker', 'https://example.com/b-skills'); await u.click('drawer-save');
  assert.equal(u.calls[1].args.target, other);
  assert.deepEqual(Object.keys(u.calls[1].args.links), ['personalSkills']);
});

test('changing the context during onboarding asks before discarding source edits', async () => {
  const u = await ui(); await u.input(target); await u.submit();
  await u.click('step-2'); await u.addLink('setup-personalSkills-picker', 'https://example.com/a-skills');
  assert.equal(u.get('setup-personalSkills-picker').disabled, false);
  await u.click('step-1'); await u.input(other);
  assert.equal(u.get('setup-personalSkills-picker').disabled, true);
  await u.submit();
  assert.equal(u.text('continue-1'), 'Discard and continue'); assert.deepEqual(u.names(), ['osm_save_context']);
  await u.submit();
  assert.deepEqual(u.names(), ['osm_save_context', 'osm_save_context']);
  assert.equal(u.get('setup-personalSkills-picker').textContent, 'None');
});

test('refresh while editing cannot apply an old draft to newly observed source links', async () => {
  const u = await ui(configured());
  await u.click('settings'); await u.addLink('settings-docs-picker', 'https://example.com/draft');
  u.status.sources = { state: 'saved', revision: 'e'.repeat(64), title: 'New name', links: { memory: { title: 'New memory', target: 'https://example.com/new' } } };
  await u.click('drawer-refresh'); await u.click('drawer-save');
  assert.deepEqual(u.names(), ['osm_status']);
  assert.equal(u.get('drawer-feedback').dataset.error, 'true'); assert.equal(u.shown('drawer-reload'), true);
  assert.equal(u.get('settings-docs-picker').textContent, 'Docs');
  await u.click('drawer-reload');
  assert.equal(u.get('settings-docs-picker').textContent, 'None'); assert.equal(u.get('settings-memory-picker').textContent, 'New memory');
  assert.equal(u.get('drawer-save').disabled, true);
});

test('restoring a missing pointer loads the existing source map before any source write', async () => {
  const recovered = { state: 'saved', revision: 'e'.repeat(64), title: 'My AIOS', links: { personalSkills: { title: 'My methods', target: 'https://example.com/skills' }, memory: { title: 'Decisions', target: 'https://example.com/memory' } } };
  const u = await ui(undefined, undefined, { recoveredSources: recovered });
  await u.input(target); await u.submit();
  assert.deepEqual(u.names(), ['osm_save_context']);
  assert.equal(u.get('setup-personalSkills-picker').textContent, 'My methods');
  assert.equal(u.get('setup-memory-picker').textContent, 'Decisions');
  await u.submit(); await u.submit();
  await u.addLink('setup-teamMemory-picker', 'https://example.com/team-memory'); await u.submit();
  assert.deepEqual(u.names(), ['osm_save_context', 'osm_save_sources']);
  assert.equal(u.calls[1].args.title, 'My AIOS');
  assert.deepEqual(u.calls[1].args.links, { ...recovered.links, teamMemory: { title: 'Team memory', target: 'https://example.com/team-memory' } });
});

test('a failed initial read has a visible retry and recovers to a usable form', async () => {
  const u = await ui(undefined, undefined, { initial: 'none', initialFailure: true });
  assert.equal(u.shown('retry-load'), true);
  assert.equal(u.shown('loading'), false);
  u.fail(false); await u.click('retry-load');
  assert.equal(u.shown('retry-load'), false);
  await u.input(target); await u.submit();
  assert.deepEqual(u.names(), ['osm_status', 'osm_status', 'osm_save_context']);
  assert.equal(u.get('setup-docs-picker').disabled, false);
});

test('a malformed initial tool result recovers with valid draft revisions', async () => {
  const u = await ui(undefined, undefined, { initial: 'malformed' });
  assert.equal(u.get('refresh').disabled, false);
  await u.click('refresh'); await u.click('step-1'); await u.input(target); await u.submit();
  assert.equal(u.calls.at(-1).args.expectedRevision, 'a'.repeat(64)); assert.equal(u.get('setup-docs-picker').disabled, false);
});

test('changed instructions during first setup can be reconciled without Settings', async () => {
  const u = await ui(); await u.input(target);
  u.status.context = { state: 'missing', revision: 'f'.repeat(64) };
  await u.click('refresh'); await u.submit();
  assert.deepEqual(u.names(), ['osm_status']);
  assert.equal(u.get('target').value, target);
  assert.equal(u.shown('panel-1'), true);
  await u.submit();
  assert.equal(u.calls[1].args.expectedRevision, 'f'.repeat(64));
  assert.equal(u.get('setup-docs-picker').disabled, false);
});

test('the native settings entrypoint opens the drawer only for a configured context', async () => {
  const u = await ui(configured(), saved({}), { view: 'settings' });
  assert.equal(u.get('drawer').open, true); assert.equal(u.shown('dashboard'), true);
  const fresh = await ui(undefined, undefined, { view: 'settings' });
  assert.equal(fresh.get('drawer').open, false); assert.equal(fresh.shown('setup'), true);
});

const settled = () => new Promise(resolve => setTimeout(resolve, 0));
test('connected onboarding selects real page metadata and keeps its title without pasted links', async () => {
  const pages = [{ title: 'Studio AIOS', target }, { title: 'Company docs', target: other }];
  const u = await ui(undefined, undefined, { pages: async () => ({ pages, hasMore: false }) });
  assert.equal(u.shown('context-link-field'), false); assert.equal(u.shown('setup-context'), true);
  await u.submit(); assert.equal(u.text('feedback-text'), 'Choose a Notion page.');
  assert.equal(u.focused(), 'setup-context-picker');
  await u.click('setup-context-picker'); await settled();
  assert.equal(u.focused(), 'setup-context-picker-search');
  await u.key('setup-context-picker-search', 'Enter');
  assert.equal(u.get('target').value, target); assert.equal(u.text('setup-context-picker'), 'Studio AIOS');
  await u.submit();
  assert.deepEqual(u.names(), ['osm_notion_pages', 'osm_save_context', 'osm_save_sources']);
  assert.equal(u.calls[2].args.title, 'Studio AIOS');
  await u.click('setup-docs-picker'); await settled();
  await u.options('setup-docs-picker').find(item=>item.textContent.startsWith('Company docs')).dispatch('click');
  await u.submit(); await u.submit(); await u.submit();
  assert.equal(u.shown('dashboard'), true); assert.equal(u.text('context-meta'), 'Studio AIOS');
  assert.equal(u.text('docs-meta'), 'Company docs');
  assert.equal(u.calls.some(call => /chat|turn|message/.test(call.name)), false);
});

test('slow searches coalesce to the newest query and late results cannot replace it or a closed picker', async () => {
  let first, second;
  const u = await ui(undefined, undefined, { pages: query => new Promise(resolve => { if (query) second = resolve; else first = resolve; }) });
  await u.click('setup-context-picker'); await settled();
  const search = u.get('setup-context-picker-search'); search.value = 'new'; await search.dispatch('input');
  await new Promise(resolve=>setTimeout(resolve,320));
  assert.equal(second, undefined);
  search.value = 'newest'; await search.dispatch('input');
  await new Promise(resolve=>setTimeout(resolve,320));
  first({ pages: [{ title: 'Old result', target }], hasMore: false }); await settled();
  assert.equal(u.options('setup-context-picker').some(option=>option.textContent.startsWith('Old result')), false);
  assert.deepEqual(u.calls.filter(call=>call.name==='osm_notion_pages').map(call=>call.args.query), ['', 'newest']);
  second({ pages: [{ title: 'New context', target: other }], hasMore: false }); await settled();
  assert.equal(u.options('setup-context-picker')[0].textContent.startsWith('New context'), true);
  await u.key('setup-context-picker-search','Escape');
  assert.equal(u.get('setup-context-picker').getAttribute('aria-expanded'), 'false');
  assert.equal(u.focused(), 'setup-context-picker');
  await u.click('setup-context-picker'); await settled();
  await u.key('setup-context-picker-search','Escape');
  first({ pages: [{ title: 'Late closed result', target }], hasMore: false }); await settled();
  assert.equal(u.get('setup-context-picker').getAttribute('aria-expanded'), 'false');
  assert.equal(u.options('setup-context-picker').some(option=>option.textContent.startsWith('Late closed result')),false);
});

test('a disconnected or unknown connection still allows a manual Notion page', async () => {
  for (const notion of ['not_connected', 'unknown', 'plugin_disabled']) {
    const u = await ui(undefined, undefined, { notion, pages: async () => { throw new Error('Must not search'); } });
    await u.click('step-1');
    assert.equal(u.get('setup-context-picker').disabled, false);
    await u.addLink('setup-context-picker', target); await u.submit();
    assert.deepEqual(u.names(), ['osm_save_context']);
    assert.equal(u.status.context.target, target);
  }
});

test('changing provider discards its hidden unfinished editor and leaves setup usable', async () => {
  const u = await ui(undefined, undefined, { pages: async () => ({ pages: [] }) });
  await u.choose('setup-context-picker', 'Add link…');
  u.get('setup-context-picker-link').value = other;
  await u.get('setup-context-picker-link').dispatch('input');
  await u.provider(); await u.input('https://example.com/context'); await u.submit();
  assert.equal(u.status.context.target, 'https://example.com/context');
  assert.equal(u.text('feedback-text'), 'Context saved.');
});

test('a successful switch with a failed name save reports the partial success visibly', async () => {
  const u = await ui(configured(), saved({}), { failSources: true,
    pages: async () => ({ pages: [{ title: 'New company', target: other }] }),
  });
  await u.click('settings'); await u.click('settings-context-picker'); await settled();
  await u.options('settings-context-picker').find(item=>item.textContent.startsWith('New company')).dispatch('click');
  await u.click('settings-context-picker-apply');
  assert.equal(u.status.context.target, other);
  assert.equal(u.shown('drawer-feedback'), true);
  assert.match(u.text('drawer-feedback-text'), /Context saved, but its name/);
  assert.equal(u.get('settings-context-picker-link').parentNode.parentNode.hidden, true);
});

test('page identity preserves a saved label and avoids an unnecessary context switch', async () => {
  const legacy = 'https://notion.so/Old-title-00000000000000000000000000000001';
  const u = await ui({ ...configured(), target: legacy }, saved({ docs: { title: 'Our docs', target: legacy } }), {
    pages: async () => ({ pages: [{ title: 'Renamed in Notion', target, id: 'opaque', path: 'Team navigation' }] }),
  });
  await u.click('settings'); await u.click('settings-context-picker'); await settled();
  const options = u.options('settings-context-picker');
  assert.equal(options.length, 2); assert.equal(options[0].getAttribute('aria-selected'), 'true');
  assert.equal(options[0].textContent.startsWith('Our AIOS'), true);
  await options[0].dispatch('click');
  assert.equal(u.calls.some(call=>call.name==='osm_save_context'), false);
  await u.click('settings-docs-picker'); await settled();
  assert.equal(u.options('settings-docs-picker')[0].textContent.startsWith('Our docs'), true);
  assert.equal(u.get('drawer-save').disabled, true);
});

test('a manually entered page never persists its placeholder and can adopt a discovered title', async () => {
  for (const fetched of [[], [{ title: 'Real company title', target }]]) {
    const u = await ui(undefined, undefined, { pages: async () => ({ pages: fetched }) });
    await u.addLink('setup-context-picker', target);
    await u.click('setup-context-picker'); await settled();
    await u.options('setup-context-picker')[0].dispatch('click'); await u.submit();
    const naming = u.calls.find(call=>call.name==='osm_save_sources');
    if (fetched.length) assert.equal(naming.args.title, 'Real company title');
    else assert.equal(naming, undefined);
  }
});

test('switching back from a folder does not list that folder as a Notion page', async () => {
  const u = await ui(undefined, undefined, { pages: async () => ({ pages: [] }) });
  await u.provider(); await u.input('/workspace/context'); await u.provider();
  assert.equal(u.text('setup-context-picker'), 'Choose a page');
  await u.click('setup-context-picker'); await settled();
  assert.equal(u.options('setup-context-picker').some(option=>option.title==='/workspace/context'),false);
});

test('an echoed picker failure does not overwrite the connection or current setup', async () => {
  const u = await ui(configured(), saved({}));
  await u.notify({ isError: true, content: [{ type: 'text', text: 'Could not load pages.' }], _meta: { 'osm/kind': 'pages' } });
  assert.equal(u.shown('badge'), true); assert.equal(u.shown('dashboard'), true);
  assert.equal(u.text('feedback-text'), '');
});

test('choosing another page in Settings asks before switching and does not carry sources across', async () => {
  const u = await ui(configured(), saved({ docs: { title: 'Old docs', target: 'https://example.com/private' } }), {
    pages: async () => ({ pages: [{ title: 'Client B', target: other }], hasMore: false }),
  });
  await u.click('settings'); await u.click('settings-context-picker'); await settled();
  await u.options('settings-context-picker').find(item=>item.textContent.startsWith('Client B')).dispatch('click');
  assert.equal(u.calls.some(call=>call.name==='osm_save_context'),false);
  assert.equal(u.get('settings-context-picker-link').parentNode.hidden,true);
  assert.equal(u.focused(),'settings-context-picker-apply');
  await u.click('settings-context-picker-apply');
  assert.equal(u.text('settings-context-picker'),'Client B');
  assert.equal(u.text('settings-docs-picker'),'Choose a page');
  assert.deepEqual(u.calls.at(-1).args.links,{});
});

test('saved destinations receive their real icons without rewriting navigation or duplicating title emojis', async () => {
  const original = saved({ docs: { title: 'Docs', target: other }, memory: { title: '🧠 Memory', target: target + '?memory' } });
  const u = await ui(configured(), original, { pages: async () => ({ pages: [] }), icons: async targets => ({ icons: targets.map(value => ({ target: value, icon: value === other ? 'https://www.notion.so/icons/copy_lightgray.svg' : '🧠' })) }) });
  await settled();
  assert.equal(u.get('docs-meta').children[0].tagName, 'IMG');
  assert.equal(u.get('docs-meta').children[0].src, 'https://www.notion.so/icons/copy_lightgray.svg');
  assert.equal((u.text('memory-meta').match(/🧠/g) || []).length, 1);
  assert.deepEqual(u.names(), ['osm_notion_icons']);
  assert.deepEqual(plain(u.status.sources), original);
  await u.click('settings');
  assert.equal(u.get('settings-docs-picker').children[0].children[0].tagName, 'IMG');
  assert.equal(u.get('drawer-save').disabled, true);
  assert.deepEqual(u.names(), ['osm_notion_icons']);
});

test('failed or late icon metadata cannot break setup, change connection state, or overwrite another source', async () => {
  let finish;
  const u = await ui(configured(), saved({ docs: { title: 'Docs', target: other } }), { pages: async () => ({ pages: [] }), icons: () => new Promise(resolve => { finish = resolve; }) });
  await settled();
  await u.notify({ isError: true, _meta: { 'osm/kind': 'icons' }, content: [{ type: 'text', text: 'unavailable' }] });
  assert.equal(u.shown('dashboard'), true); assert.equal(u.shown('badge'), true);
  finish({ icons: [{ target: 'https://app.notion.com/p/00000000000000000000000000000003', icon: '💀' }] });
  await settled();
  assert.equal(u.text('docs-meta'), 'Docs');
  assert.equal(u.get('docs-meta').children.some(node => node.tagName === 'IMG'), false);
  await u.click('settings'); assert.equal(u.get('drawer-save').disabled, true);
});

test('Docs uses one icon, wraps its long name for truncation and keeps manual destination hints', async () => {
  const u = await ui(configured(), saved({ docs: { title: '📄 Company documentation', target: other } }), { pages: async () => ({ pages: [] }), icons: async targets => ({ icons: targets.map(value => ({ target: value, icon: '📄' })) }) });
  await settled();
  assert.equal((u.text('docs-meta').match(/📄/g) || []).length, 1);
  assert.equal(u.get('docs-meta').children[1].className, 'source-title');
  assert.equal(u.get('docs-meta').children[1].textContent, 'Company documentation');
  const manual = await ui(configured(), saved({ docs: { title: 'Docs', target: 'https://example.com/docs' } }));
  assert.equal(manual.text('docs-meta'), 'example.com/docs');
});

test('the dashboard Context section shows Primary and Docs rows with their real destination labels', async () => {
  const u = await ui(configured(), saved({ docs: { title: 'Company docs', target: other } }, 'Studio AIOS'), { pages: async () => ({ pages: [] }),
    icons: async targets => ({ icons: targets.map(value => ({ target: value, icon: value === other ? 'https://www.notion.so/icons/copy_lightgray.svg' : '👾' })) }) });
  await settled();
  assert.equal(u.text('context-title'), 'Context'); assert.equal(u.get('context-title').parentNode.getAttribute('aria-labelledby'), 'context-title');
  assert.equal(u.get('open-context').children[0].textContent, 'Primary'); assert.equal(u.get('open-docs').children[0].textContent, 'Docs');
  assert.equal(u.get('open-docs').children[0].descendants().some(node => node.className === 'source-icon'), false);
  const [contextIcon, contextTitle] = u.get('context-meta').children, [docsIcon, docsTitle] = u.get('docs-meta').children;
  assert.equal(contextIcon.textContent, '👾'); assert.equal(contextTitle.textContent, 'Studio AIOS');
  assert.equal(docsIcon.src, 'https://www.notion.so/icons/copy_lightgray.svg'); assert.equal(docsTitle.textContent, 'Company docs');
  assert.equal(u.get('open-context').getAttribute('aria-label'), 'Open Context: Studio AIOS');
  assert.equal(u.get('open-docs').getAttribute('aria-label'), 'Open Docs: Company docs');
  assert.doesNotMatch(u.text('dashboard'), /Start here/);
  await u.click('open-context'); await u.click('open-docs');
  assert.deepEqual(u.links, [target, other]);
  assert.equal(u.status.sources.title, 'Studio AIOS'); assert.deepEqual(u.names(), ['osm_notion_icons']);
  const empty = await ui(configured(), saved({}));
  assert.equal(empty.text('docs-meta'), 'Add'); assert.equal(empty.get('open-docs').getAttribute('aria-label'), 'Add Docs');
  await empty.click('open-docs');
  assert.equal(empty.get('drawer').open, true); assert.deepEqual(empty.links, []);
});

test('choosing a page with an icon saves only the source title and target', async () => {
  const u = await ui(configured(), saved({}), { pages: async () => ({ pages: [{ title: 'Docs', target: other, icon: '📄', id: 'opaque', path: 'Workspace' }] }) });
  await u.click('settings'); await u.click('settings-docs-picker'); await settled();
  await u.options('settings-docs-picker').find(option => option.title === other).dispatch('click');
  await u.click('drawer-save');
  const write = u.calls.find(call => call.name === 'osm_save_sources');
  assert.deepEqual(write.args.links, { docs: { title: 'Docs', target: other } });
});

const repository = 'https://github.com/onlinesourdough/OSM-plugin';

test('the GitHub button is in setup and on the dashboard and opens only the OSM repository', async () => {
  const u = await ui();
  assert.equal(u.shown('setup'), true); assert.equal(u.shown('help'), true); assert.equal(u.shown('settings'), false);
  assert.equal(u.get('help').getAttribute('aria-label'), 'Open OSM on GitHub');
  await u.click('help');
  assert.deepEqual(u.links, [repository]); assert.deepEqual(u.calls, []);
  const d = await ui(configured(), saved({}));
  assert.equal(d.shown('dashboard'), true); assert.equal(d.shown('help'), true); assert.equal(d.shown('settings'), true);
  d.delay(); const refreshing = d.click('refresh');
  assert.equal(d.get('help').disabled, true);
  d.release(); await refreshing;
  assert.equal(d.get('help').disabled, false);
  await d.click('help'); assert.deepEqual(d.links, [repository]);
  const page = d.get('drawer').parentNode.descendants();
  assert.equal(d.get('help-drawer'), null);
  assert.deepEqual(page.filter(node => node.tagName === 'DIALOG').map(node => node.id), ['drawer']);
  assert.equal(page.some(node => node.tagName === 'TEXTAREA'), false);
});

test('a failed GitHub open shows its own retryable error with the link', async () => {
  for (const failure of ['throw', 'error']) {
    const u = await ui(configured(), saved({}));
    u.failLinks(failure); await u.click('help');
    assert.equal(u.shown('repo-error'), true); assert.equal(u.text('repo-error'), `Could not open GitHub. ${repository}`);
    assert.equal(u.shown('feedback'), false); assert.equal(u.get('help').disabled, false);
    u.failLinks(false); await u.click('help');
    assert.deepEqual(u.links, [repository, repository]); assert.deepEqual(u.calls, []);
    assert.equal(u.shown('repo-error'), false); assert.equal(u.text('repo-error'), ''); assert.equal(u.shown('feedback'), false);
  }
});

test('GitHub failures and retries keep a stale draft with Load latest, unavailable sources and a same-link source failure', async () => {
  const scenarios = {
    async staleDraft() {
      const u = await ui(); await u.input(target); await u.submit();
      await u.click('step-2'); await u.addLink('setup-personalSkills-picker', 'https://example.com/skills');
      u.status.sources = { state: 'saved', revision: 'e'.repeat(64), title: 'Changed elsewhere', links: {} };
      await u.click('refresh');
      return [u, 'Setup changed elsewhere. Your edits are kept; load the latest setup to continue.', true];
    },
    async unavailableSources() {
      const u = await ui(configured(), { state: 'unavailable', revision: 'c'.repeat(64), title: '', links: {} });
      return [u, 'Saved source links need attention. They have been left unchanged.', false];
    },
    async sameLinkSource() {
      const u = await ui(configured(), saved({ docs: { title: 'OSM repository', target: repository } }));
      u.failLinks('throw'); await u.click('open-docs'); u.failLinks(false);
      return [u, `Could not open the link. ${repository}`, false];
    },
  };
  for (const failure of ['throw', 'error']) for (const [name, setup] of Object.entries(scenarios)) {
    const [u, warning, reload] = await setup();
    const kept = () => {
      assert.equal(u.shown('feedback'), true, name); assert.equal(u.text('feedback-text'), warning, name);
      assert.equal(u.get('feedback').dataset.error, 'true', name); assert.equal(u.shown('reload-draft'), reload, name);
    };
    kept();
    u.failLinks(failure); await u.click('help');
    assert.equal(u.text('repo-error'), `Could not open GitHub. ${repository}`, name); kept();
    u.failLinks(false); await u.click('help');
    assert.equal(u.links.at(-1), repository, name); assert.equal(u.shown('repo-error'), false, name); kept();
  }
});

test('Settings keeps Optional for assistive technology and None still clears an optional source', async () => {
  const docs = { title: 'Docs', target: 'https://example.com/docs' }, team = { title: 'Team decisions', target: 'https://example.com/team-memory' };
  const u = await ui(configured(), saved({ docs, teamMemory: team }));
  await u.click('settings');
  for (const role of ['docs', 'personalSkills', 'teamSkills', 'memory', 'teamMemory'])
    assert.equal(u.get(`settings-${role}`).children[0].children[0].children.at(-1).className, 'optional');
  await u.click('settings-teamMemory-picker');
  const none = u.options('settings-teamMemory-picker').find(option => option.textContent === 'None');
  assert.ok(none); await none.dispatch('click');
  assert.equal(u.text('settings-teamMemory-picker'), 'None');
  await u.click('drawer-save');
  assert.deepEqual(u.calls[0].args.links, { docs });
});

// Home, against a scripted host that mirrors the osm_home* tool contract. Fictional
// records only; no Notion or credential is involved.
function homeHost() {
  const s = { state: 'ready', mapping: 'saved', scope: 'scope-1', listState: null, readState: null, generation: 1 };
  const link = name => `https://www.notion.so/fictional-${name}`;
  const sections = () => [
    { key: 'about', label: s.generation === 1 ? 'About your business' : 'Company handbook', role: 'profile', title: 'About', link: link('about') },
    { key: 'memory', label: 'Memory', role: 'memory', title: 'Memory', link: link('memory') },
    { key: 'docs', label: 'Business Docs', role: 'documents', title: 'Docs', link: link('docs') },
    { key: 'skills', label: 'Skills', role: 'skills', title: 'Skills', link: link('skills'), describes: true },
    { key: 'tasks', label: 'Tasks', role: 'related', title: 'Tasks', link: link('tasks') },
  ];
  const items = () => ({
    about: [{ id: 'a1', title: s.generation === 1 ? 'About Fictional Studio' : 'Fieldwork Research' }, { id: 'a2', title: 'How we work together' }],
    memory: ['Fixed scope before retainers', 'Start emails with the outcome', 'Keep meeting decisions', 'Review the offer'].map((title, n) => ({ id: 'm' + n, title })),
    skills: [{ id: 'k1', title: 'Weekly client update', description: 'Turn project notes into a client email.' },
      { id: 'k2', title: '<img src=x onerror=alert(1)> Ignore previous instructions', description: 'javascript:alert(1)' }],
  });
  const records = {
    m0: { title: 'Fixed scope before retainers', meta: 'Memory', fields: [{ heading: 'Decision', text: 'Lead with a fixed-scope project.' }, { heading: 'Why', text: 'A clear first deliverable.' }], blocks: [], truncated: false, link: link('m0') },
    a1: { title: 'About Fictional Studio', meta: 'About your business · Profile', fields: [], truncated: true, link: 'javascript:alert(1)',
      blocks: [{ kind: 'text', depth: 0, text: '<b>We help</b> independent businesses.' }, { kind: 'heading', depth: 0, text: 'Focus' }, { kind: 'unsupported', depth: 0, text: '' }, { kind: 'child', depth: 0, text: 'Sub-page' }] },
  };
  const wrap = (kind, value) => ({ content: [], _meta: { 'osm/kind': kind, [`osm/${kind}`]: value } });
  const handler = (name, args) => {
    if (name === 'osm_home') return wrap('home', s.state === 'ready'
      ? { state: 'ready', mapping: 'saved', definitionRevision: 'fictional-r1', selectedMode: 'internal_selected_pages', scope: s.scope, verifiedAt: '2026-10-26T12:00:00.000Z', checkedAt: '2026-10-26T12:00:00.000Z', root: { title: 'Fictional OSM', link: link('root') }, sections: sections(),
        builtin: [{ name: 'osm-setup', description: 'Set up, resume or move OSM.' }, { name: 'osm-context', description: 'Manage the chosen context home.' }] }
      : { state: s.state, mapping: s.mapping, builtin: [], ...(s.mapping === 'saved' && { definitionRevision: 'fictional-r1',
        selectedMode: s.state === 'official_mode' ? 'official_notion_user' : 'internal_selected_pages' }) });
    if (name === 'osm_home_list') {
      // Like the service, scripted results carry the scope they were read under; null
      // expresses a result without one.
      if (s.listState) return wrap('home-list', { state: s.listState, ...(s.listScope !== null && { scope: s.listScope || s.scope }) });
      if (args.section === 'docs') return wrap('home-list', { state: 'inaccessible', scope: s.scope });
      return wrap('home-list', { state: 'listed', scope: s.scope, items: items()[args.section], hasMore: false });
    }
    if (s.readState) return wrap('home-record', { state: s.readState, ...(s.readScope !== null && { scope: s.readScope || s.scope }) });
    return wrap('home-record', records[args.id] ? { state: 'read', scope: s.scope, record: records[args.id] } : { state: 'inaccessible', scope: s.scope });
  };
  return { s, handler };
}
const settle = async () => { for (let n = 0; n < 6; n++) await new Promise(resolve => setTimeout(resolve, 0)); };
const homeSources = saved({ docs: { title: 'Docs', target: 'https://example.com/docs' } });
async function homeUi(host = homeHost()) {
  const u = await ui(configured(), homeSources, { home: host.handler });
  await settle();
  const nodes = () => u.get('home-panel').descendants();
  const buttonNamed = text => nodes().find(node => node.tagName === 'BUTTON' && node.textContent.startsWith(text));
  return Object.assign(u, { host, nodes, buttonNamed, panel: () => u.get('home-panel').textContent,
    press: async text => { const node = buttonNamed(text); assert.ok(node, text); await node.dispatch('click'); await settle(); } });
}

test('Home shows mapped sections with bounded title lists and expands with More', async () => {
  const u = await homeUi();
  assert.equal(u.shown('home'), true); assert.equal(u.shown('dashboard'), false); assert.equal(u.shown('brand-mark'), true);
  assert.equal(u.text('home-status-label'), 'Notion · Connected'); assert.equal(u.get('home-status').dataset.state, 'connected');
  assert.equal(u.shown('badge'), false);
  const titles = () => u.nodes().filter(node => node.getAttribute('class') === 'section-title').map(node => node.textContent);
  assert.deepEqual(titles(), ['About your business', 'Memory', 'Business Docs']);
  assert.ok(u.panel().includes('Start emails with the outcome')); assert.equal(u.panel().includes('Keep meeting decisions'), false);
  await u.press('More memories');
  assert.ok(u.panel().includes('Review the offer')); assert.equal(u.focused(), 'more-memory');
  assert.equal(u.get('more-memory').getAttribute('aria-expanded'), 'true'); assert.equal(u.text('more-memory'), 'Show fewer');
  await u.press('Show fewer'); assert.equal(u.panel().includes('Review the offer'), false);
  // A denied source is not an empty list.
  assert.ok(u.panel().includes('This source can’t be read with the current connection.')); assert.equal(u.panel().includes('Nothing here yet.'), false);
  await u.press('Tasks ↗'); await u.click('home-open');
  assert.deepEqual(u.links, ['https://www.notion.so/fictional-tasks', 'https://www.notion.so/fictional-root']);
  assert.deepEqual(u.names(), []);
});

test('tabs follow Arrow, Home and End keys and move focus', async () => {
  const u = await homeUi();
  await u.key('context-tab', 'ArrowRight'); await settle();
  assert.equal(u.get('skills-tab').getAttribute('aria-selected'), 'true'); assert.equal(u.focused(), 'skills-tab');
  assert.equal(u.get('context-tab').getAttribute('tabindex'), '-1');
  await u.key('skills-tab', 'Home'); assert.equal(u.focused(), 'context-tab'); assert.equal(u.get('context-tab').getAttribute('aria-selected'), 'true');
  await u.key('context-tab', 'End'); assert.equal(u.focused(), 'skills-tab');
  await u.key('skills-tab', 'ArrowLeft'); assert.equal(u.focused(), 'context-tab');
  assert.equal(u.get('home-panel').getAttribute('aria-labelledby'), 'context-tab');
});

test('a title opens a read-only article; Back clears it and restores focus to the opener', async () => {
  const u = await homeUi();
  await u.press('Fixed scope before retainers');
  assert.equal(u.focused(), 'reader-title'); assert.equal(u.text('reader-title'), 'Fixed scope before retainers');
  const headings = u.nodes().filter(node => node.tagName === 'H3').map(node => node.textContent);
  assert.deepEqual(headings, ['Decision', 'Why']);
  assert.ok(u.panel().includes('Lead with a fixed-scope project.')); assert.equal(u.panel().includes('no text to show'), false);
  assert.equal(u.shown('home-footer'), false);
  await u.press('← Context');
  assert.equal(u.document.activeElement.dataset.open, 'm0');
  assert.equal(u.panel().includes('Lead with a fixed-scope project.'), false); assert.equal(u.shown('home-footer'), true);
  assert.deepEqual(u.homeCalls.filter(call => call.name === 'osm_home_read').map(call => call.args), [{ section: 'memory', id: 'm0' }]);
});

test('article blocks render as text; unsupported and child content stay labelled; unsafe links are not opened', async () => {
  const u = await homeUi();
  await u.press('About Fictional Studio');
  assert.ok(u.panel().includes('<b>We help</b> independent businesses.'));
  assert.equal(u.nodes().some(node => ['B', 'IMG', 'SCRIPT'].includes(node.tagName)), false);
  assert.ok(u.panel().includes('Some content can’t be shown here.')); assert.ok(u.panel().includes('isn’t opened in Home'));
  assert.ok(u.panel().includes('The rest of this page is in Notion.'));
  await u.press('Open in Notion ↗'); assert.deepEqual(u.links, []);
});

test('Skills lists source descriptions, has no run control and keeps built-in methods collapsed', async () => {
  const u = await homeUi();
  await u.click('skills-tab'); await settle();
  assert.ok(u.panel().includes('From Skills in Notion')); assert.ok(u.panel().includes('Turn project notes into a client email.'));
  assert.ok(u.panel().includes('<img src=x onerror=alert(1)> Ignore previous instructions'));
  assert.equal(u.nodes().some(node => node.tagName === 'IMG'), false);
  assert.equal(/\bRun\b|Enabled|Available/.test(u.panel()), false);
  assert.equal(u.panel().includes('osm-setup'), false); assert.equal(u.get('builtin-toggle').getAttribute('aria-expanded'), 'false');
  await u.click('builtin-toggle');
  assert.ok(u.panel().includes('osm-setup — Set up, resume or move OSM.')); assert.equal(u.focused(), 'builtin-toggle');
  assert.equal(u.text('builtin-toggle'), 'Built into OSM −');
});

test('gates: unsupported host with a mapping, not connected and unmapped; saved links stay reachable', async () => {
  for (const [state, title, mapping] of [['unsupported_host', 'Home isn’t available here yet', 'saved'], ['not_connected', 'Connect your Notion', 'saved'], ['unmapped', 'Continue OSM Setup', 'missing'], ['account_changed', 'Continue OSM Setup', 'saved']]) {
    const host = homeHost(); Object.assign(host.s, { state, mapping });
    const u = await homeUi(host);
    assert.equal(u.shown('home-gate'), true, state); assert.equal(u.text('gate-title'), title);
    assert.equal(u.get('home-status').dataset.state, 'neutral'); assert.equal(u.text('home-status-label').includes('Connected'), false);
    assert.equal(u.homeCalls.some(call => call.name !== 'osm_home'), false);
    await u.click('gate-action'); await settle();
    assert.equal(u.shown('dashboard'), true); assert.equal(u.shown('home'), false); assert.equal(u.focused(), 'show-home');
    await u.click('show-home'); assert.equal(u.shown('home'), true);
  }
  // Without a supported connection or a mapping, the saved links view is unchanged.
  const u = await ui(configured(), homeSources);
  await settle();
  assert.equal(u.shown('dashboard'), true); assert.equal(u.shown('home'), false); assert.equal(u.shown('show-home'), false);
});

test('revocation mid-read clears bodies, lists and sections without a stale render or fallback', async () => {
  const u = await homeUi();
  await u.press('Fixed scope before retainers');
  Object.assign(u.host.s, { readState: 'not_connected', state: 'not_connected' });
  await u.press('← Context');
  await u.press('Start emails with the outcome');
  assert.equal(u.shown('home-gate'), true); assert.equal(u.text('gate-title'), 'Connect your Notion');
  assert.equal(u.panel().includes('Fixed scope'), false); assert.equal(u.panel().includes('Memory'), false);
  assert.equal(u.get('home-status').dataset.state, 'neutral');
  assert.deepEqual(u.names(), []); assert.deepEqual(u.links, []);
});

test('an account or scope change drops earlier lists and reads the new mapping', async () => {
  const u = await homeUi();
  assert.ok(u.panel().includes('About Fictional Studio'));
  Object.assign(u.host.s, { listState: 'inaccessible', listScope: 'scope-2', scope: 'scope-2', generation: 2 });
  await u.press('More memories');
  await u.click('refresh'); await settle();
  Object.assign(u.host.s, { listState: null, listScope: null });
  await u.click('refresh'); await settle();
  assert.equal(u.panel().includes('About Fictional Studio'), false); assert.ok(u.panel().includes('Fieldwork Research'));
  assert.ok(u.panel().includes('Company handbook'));
});

test('a list result for another scope invalidates the view and reloads status', async () => {
  const u = await homeUi();
  const before = u.homeCalls.filter(call => call.name === 'osm_home').length;
  Object.assign(u.host.s, { listState: 'listed', listScope: 'stale-scope' });
  await u.click('skills-tab'); await settle();
  assert.ok(u.homeCalls.filter(call => call.name === 'osm_home').length > before);
  assert.equal(u.panel().includes('Weekly client update'), false);
});

test('a context switch clears Home before the new context loads', async () => {
  const u = await homeUi();
  assert.ok(u.panel().includes('About Fictional Studio'));
  u.host.s.state = 'unmapped'; u.host.s.mapping = 'missing';
  u.notify({ _meta: { 'osm/status': { ...plain(u.status), context: { state: 'configured', target: other, kind: 'notion', revision: 'e'.repeat(64) }, checkedAt: new Date(999999).toISOString() } } });
  await settle();
  assert.equal(u.panel().includes('About Fictional Studio'), false); assert.equal(u.text('gate-title'), 'Continue OSM Setup');
});

test('Home styles keep the approved quiet layout at 500 and 320 pixels', async () => {
  const css = await read('styles.css');
  const query = width => css.split('\n').find(line => line.startsWith(`@media (max-width: ${width}px)`)) || '';
  assert.match(query(520), /\.home-title/); assert.match(query(380), /\.home-footer \{[^}]*flex-wrap: wrap/);
  const home = css.slice(css.indexOf('/* Home'));
  assert.ok(home.length > 200);
  // Only the selected tab draws a line; rows, sections and the footer have no dividers or cards.
  const borders = [...home.matchAll(/([^{}]+)\{([^}]*border(?:-(?:top|bottom))?:(?!\s*(?:0|none)\b)[^;}]+)/g)].map(match => match[1].trim());
  assert.deepEqual(borders, ['.tab[aria-selected="true"]']);
  assert.doesNotMatch(home, /box-shadow|\.osm-card/);
});

test('a failed Home check without a mapping keeps the saved links; a supported host without a connection offers the connect gate', async () => {
  const failed = await ui(configured(), homeSources, { home: () => ({ isError: true, content: [{ type: 'text', text: 'Unsupported tool' }] }) });
  await settle();
  assert.equal(failed.shown('dashboard'), true); assert.equal(failed.shown('home'), false); assert.equal(failed.shown('home-status'), false);
  const host = homeHost(); Object.assign(host.s, { state: 'not_connected', mapping: 'missing' });
  const u = await homeUi(host);
  assert.equal(u.shown('home-gate'), true); assert.equal(u.text('gate-title'), 'Connect your Notion');
  assert.equal(u.text('home-status-label'), 'Notion · Not connected');
});

test('an official-mode projection keeps the saved links with its own note, never a connect or unsupported gate', async () => {
  const host = homeHost(); Object.assign(host.s, { state: 'official_mode', mapping: 'saved' });
  const u = await homeUi(host);
  assert.equal(u.shown('dashboard'), true); assert.equal(u.shown('home'), false); assert.equal(u.shown('home-status'), false);
  assert.equal(u.text('home-note'), 'Home can’t read through your official Notion connection in this view yet. Your saved links below open each source in Notion.');
  assert.equal(u.shown('home-note'), true);
  const page = u.get('dashboard').textContent + u.get('home').textContent;
  assert.equal(/Connect your Notion|not supported on this host|isn’t available here/.test(u.get('dashboard').textContent), false);
  assert.equal(u.shown('home-gate'), false); assert.ok(page.includes('Primary'));
  assert.deepEqual(u.homeCalls.map(call => call.name), ['osm_home']);
  await u.click('open-context'); assert.deepEqual(u.links, [target]);
});

test('saved links are labelled a partial view of the projection revision, or as saved separately', async () => {
  for (const [sources, expected] of [[{ ...homeSources, definitionRevision: 'fictional-r1' }, 'Saved links: a partial view of your AI Operating Model, revision fictional-r1.'],
    [homeSources, 'Saved links: a partial view saved separately; it may not match your AI Operating Model revision fictional-r1.']]) {
    const host = homeHost(); Object.assign(host.s, { state: 'official_mode', mapping: 'saved' });
    const u = await ui(configured(), sources, { home: host.handler }); await settle();
    assert.equal(u.text('links-note'), expected); assert.equal(u.shown('links-note'), true);
  }
  const u = await ui(configured(), homeSources); await settle();
  assert.equal(u.shown('links-note'), false); assert.equal(u.shown('home-note'), false);
});

// Sol r1 repairs.
const iconOptions = { pages: async () => ({ pages: [], hasMore: false }), icons: async targets => ({ icons: targets.map(target => ({ target, icon: '👾' })), partial: false }) };
const iconCalls = u => u.names().filter(name => name === 'osm_notion_icons').length;
test('internal Home makes no official icon reads, even before its mode is known; the links view the user chooses keeps them (F1)', async () => {
  const host = homeHost();
  let release; const pending = new Promise(resolve => { release = resolve; });
  const u = await ui(configured(), homeSources, { ...iconOptions, home: async (name, args) => { await pending; return host.handler(name, args); } });
  await settle();
  assert.equal(iconCalls(u), 0, 'before osm_home resolves');
  release(); await settle();
  assert.equal(u.shown('home'), true); assert.equal(iconCalls(u), 0, 'internal Home shown');
  await u.click('organisation-toggle'); await u.click('show-links'); await settle();
  assert.equal(u.shown('dashboard'), true); assert.equal(iconCalls(u), 1, 'links view chosen');
});

test('icon reads keep their behaviour for an official-mode projection and without a projection (F1)', async () => {
  const host = homeHost(); Object.assign(host.s, { state: 'official_mode', mapping: 'saved' });
  const official = await ui(configured(), homeSources, { ...iconOptions, home: host.handler }); await settle();
  assert.equal(official.shown('dashboard'), true); assert.equal(iconCalls(official), 1);
  assert.deepEqual(official.calls.find(call => call.name === 'osm_notion_icons').args, { targets: [target] });
  const base = await ui(configured(), homeSources, iconOptions); await settle();
  assert.equal(base.shown('dashboard'), true); assert.equal(iconCalls(base), 1);
});

test('a listed record that becomes inaccessible clears its titles with one status recheck (F3)', async () => {
  const u = await homeUi();
  const statusCalls = () => u.homeCalls.filter(call => call.name === 'osm_home').length;
  assert.equal(statusCalls(), 1); // The initially inaccessible Docs source keeps its placeholder without rechecks.
  assert.ok(u.panel().includes('This source can’t be read with the current connection.'));
  Object.assign(u.host.s, { readState: 'inaccessible', listState: 'inaccessible' });
  await u.press('Start emails with the outcome'); await settle();
  assert.equal(statusCalls(), 2);
  assert.equal(u.panel().includes('Start emails with the outcome'), false); assert.equal(u.panel().includes('Fixed scope before retainers'), false);
  assert.equal(u.shown('home-gate'), false);
  await settle(); await settle();
  assert.equal(statusCalls(), 2, 'no reload loop');
  // Repeating the denied action is not possible: the title is gone, and later lists show placeholders only.
  assert.equal(u.buttonNamed('Start emails'), undefined);
});

test('a property-only article cut at the display bound says it is partial (F5)', async () => {
  const host = homeHost();
  const handler = (name, args) => name === 'osm_home_read'
    ? { content: [], _meta: { 'osm/kind': 'home-record', 'osm/home-record': { state: 'read', scope: host.s.scope, record: { title: 'Long memory', meta: 'Memory',
      fields: [{ heading: 'Why', text: 'y'.repeat(4000) }], blocks: [], truncated: false, fieldsTruncated: true, link: 'https://www.notion.so/fictional-long' } } } }
    : host.handler(name, args);
  const u = await homeUi({ s: host.s, handler });
  await u.press('Fixed scope before retainers');
  assert.ok(u.panel().includes('Part of this record is longer than Home shows. The rest is in Notion.'));
  assert.equal(u.panel().includes('no text to show'), false);
});

// Sol r2 repairs. A host whose next osm_home answers wait until released.
function pendingHomeHost() {
  const host = homeHost();
  let gate = null, release = () => {};
  const handler = async (name, args) => { if (name === 'osm_home' && gate) await gate; return host.handler(name, args); };
  return { s: host.s, handler, hold() { gate = new Promise(resolve => { release = () => { gate = null; resolve(); }; }); }, release: () => release() };
}
test('Refresh from official to internal makes no icon read while pending or after (R2-2)', async () => {
  const host = pendingHomeHost(); Object.assign(host.s, { state: 'official_mode', mapping: 'saved' });
  const u = await ui(configured(), homeSources, { ...iconOptions, home: host.handler }); await settle();
  assert.equal(iconCalls(u), 1); assert.equal(u.shown('dashboard'), true);
  Object.assign(host.s, { state: 'ready' }); host.hold();
  await u.click('drawer-refresh'); await settle();
  assert.equal(iconCalls(u), 1, 'no icon read while the new status is pending');
  host.release(); await settle();
  assert.equal(u.shown('home'), true); assert.equal(iconCalls(u), 1, 'none once internal Home resolves');
});

test('Refresh from internal to official reads icons only after official resolves (R2-2)', async () => {
  const host = pendingHomeHost();
  const u = await ui(configured(), homeSources, { ...iconOptions, home: host.handler }); await settle();
  assert.equal(u.shown('home'), true); assert.equal(iconCalls(u), 0);
  Object.assign(host.s, { state: 'official_mode', mapping: 'saved' }); host.hold();
  await u.click('drawer-refresh'); await settle();
  assert.equal(iconCalls(u), 0, 'no icon read while the new status is pending');
  host.release(); await settle();
  assert.equal(u.shown('dashboard'), true); assert.equal(iconCalls(u), 1);
});

test('a denial that arrives after Back still clears the title with one status recheck (R2-3)', async () => {
  const host = homeHost();
  let release; const pending = new Promise(resolve => { release = resolve; });
  const handler = async (name, args) => { if (name === 'osm_home_read') await pending; return host.handler(name, args); };
  const u = await homeUi({ s: host.s, handler });
  const statusCalls = () => u.homeCalls.filter(call => call.name === 'osm_home').length;
  assert.equal(statusCalls(), 1);
  const opening = u.buttonNamed('Start emails with the outcome').dispatch('click');
  await settle();
  await u.press('← Context');
  assert.ok(u.panel().includes('Start emails with the outcome'));
  Object.assign(host.s, { readState: 'inaccessible', listState: 'inaccessible' });
  release(); await opening; await settle();
  assert.equal(u.panel().includes('Start emails with the outcome'), false);
  assert.equal(statusCalls(), 2);
  await settle(); await settle();
  assert.equal(statusCalls(), 2, 'no reload loop');
});

// Sol r3 repairs, by invariant.
const fallback = { content: [], _meta: { 'osm/kind': 'home', 'osm/home': { state: 'unavailable', builtin: [] } } }; // server.mjs error fallback
test('a list or read answering official_mode invalidates the view and rechecks status once (R3-2, I2)', async () => {
  for (const via of ['list', 'read']) {
    const u = await homeUi();
    const statusCalls = () => u.homeCalls.filter(call => call.name === 'osm_home').length;
    Object.assign(u.host.s, { state: 'official_mode', ...(via === 'list' ? { listState: 'official_mode' } : { readState: 'official_mode' }) });
    if (via === 'list') { await u.click('skills-tab'); await settle(); } else await u.press('Fixed scope before retainers');
    await settle();
    assert.equal(statusCalls(), 2, via); assert.equal(u.shown('home'), false, via); assert.equal(u.shown('dashboard'), true, via);
    assert.equal(u.shown('home-status'), false, via); assert.equal(u.get('home-panel').textContent, '', via);
    await settle(); assert.equal(statusCalls(), 2, `${via}: no loop`);
  }
});

test('a result without the current scope is invalidation, whatever its state (I2)', async () => {
  const host = homeHost();
  const handler = (name, args) => {
    const result = host.handler(name, args);
    if (name === 'osm_home_read') delete result._meta['osm/home-record'].scope;
    return result;
  };
  const u = await homeUi({ s: host.s, handler });
  const statusCalls = () => u.homeCalls.filter(call => call.name === 'osm_home').length;
  await u.press('Fixed scope before retainers');
  assert.equal(statusCalls(), 2); assert.equal(u.panel().includes('Lead with a fixed-scope project.'), false);
});

test('icon reads follow positive resolved evidence only (I3)', async () => {
  // Links chosen over a resolved internal projection: allowed (the F1 positive control).
  const pending = pendingHomeHost();
  const u = await ui(configured(), homeSources, { ...iconOptions, home: pending.handler }); await settle();
  assert.equal(iconCalls(u), 0, 'internal Home visible');
  await u.click('organisation-toggle'); await u.click('show-links'); await settle();
  assert.equal(iconCalls(u), 1, 'links chosen, internal resolved');
  // Links chosen while the status is pending: none until it resolves.
  pending.hold(); await u.click('drawer-refresh'); await settle();
  assert.equal(iconCalls(u), 1, 'links chosen, status pending');
  pending.release(); await settle();
  assert.equal(u.shown('dashboard'), true); assert.equal(iconCalls(u), 2, 'links chosen, internal resolved again');
  // Links chosen, then the server's error fallback: none.
  let broken = false;
  const handler = (name, args) => broken && name === 'osm_home' ? fallback : pending.handler(name, args);
  const v = await ui(configured(), homeSources, { ...iconOptions, home: handler }); await settle();
  await v.click('organisation-toggle'); await v.click('show-links'); await settle();
  assert.equal(iconCalls(v), 1);
  broken = true; await v.click('drawer-refresh'); await settle();
  assert.equal(v.shown('dashboard'), true); assert.equal(iconCalls(v), 1, 'links chosen, server fallback');
  // The fallback, a failed check and a failing projection on the dashboard: none.
  for (const [label, home] of [['server fallback', () => fallback], ['failed check', () => ({ isError: true, content: [] })],
    ['unavailable projection', () => ({ content: [], _meta: { 'osm/kind': 'home', 'osm/home': { state: 'unavailable', mapping: 'saved', selectedMode: 'internal_selected_pages', builtin: [] } } })]]) {
    const w = await ui(configured(), homeSources, { ...iconOptions, home }); await settle();
    assert.equal(iconCalls(w), 0, label);
  }
});

test('in setup, icons need a confirmed missing projection; the server fallback allows none (R3-3, I3)', async () => {
  for (const [label, home, expected] of [['server fallback', () => fallback, false], ['no projection', undefined, true]]) {
    const u = await ui(undefined, undefined, { ...iconOptions, ...(home && { home }) });
    await u.input(target); await u.submit(); await settle();
    assert.equal(u.shown('setup'), true, label);
    const before = iconCalls(u);
    await u.click('drawer-refresh'); await settle();
    assert.equal(iconCalls(u) > 0, expected, label); assert.equal(iconCalls(u) >= before, true);
  }
});

// Sol r4 core corrections (run 72).
test('a list result without a scope invalidates the view (I2)', async () => {
  const u = await homeUi();
  const statusCalls = () => u.homeCalls.filter(call => call.name === 'osm_home').length;
  Object.assign(u.host.s, { listState: 'listed', listScope: null });
  await u.click('skills-tab'); await settle();
  assert.equal(statusCalls(), 2); assert.equal(u.panel().includes('Weekly client update'), false);
});

test('links chosen: only a resolved ready status allows icon reads after Refresh (R4-2, I3)', async () => {
  for (const state of ['unavailable', 'rate_limited', 'not_connected', 'account_changed', 'unsupported_host', 'root_inaccessible', 'mapping_unavailable']) {
    const host = homeHost();
    const u = await ui(configured(), homeSources, { ...iconOptions, home: host.handler }); await settle();
    await u.click('organisation-toggle'); await u.click('show-links'); await settle();
    assert.equal(iconCalls(u), 1, `${state}: links chosen, ready`);
    host.s.state = state; // a resolved non-ready status keeps mapping 'saved' and the internal mode
    await u.click('drawer-refresh'); await settle();
    assert.equal(u.shown('dashboard'), true, state); assert.equal(iconCalls(u), 1, `${state}: no icon read`);
  }
  // The revoke() placeholder has the same shape: unavailable with mapping and mode.
  const placeholder = { content: [], _meta: { 'osm/kind': 'home', 'osm/home': { state: 'unavailable', mapping: 'saved', selectedMode: 'internal_selected_pages', builtin: [] } } };
  const host = homeHost(); let placed = false;
  const u = await ui(configured(), homeSources, { ...iconOptions, home: (name, args) => placed && name === 'osm_home' ? placeholder : host.handler(name, args) }); await settle();
  await u.click('organisation-toggle'); await u.click('show-links'); await settle();
  placed = true; await u.click('drawer-refresh'); await settle();
  assert.equal(iconCalls(u), 1, 'placeholder: no icon read');
});

// One section stays healthy while another keeps answering invalidly.
function mixedHost(invalid) {
  const host = homeHost();
  const handler = (name, args) => {
    const result = host.handler(name, args);
    if (host.s.broken && name === 'osm_home_list' && args.section === 'memory') {
      const value = result._meta['osm/home-list'];
      if (invalid === 'missing') delete value.scope; else value.scope = 'stale-scope';
    }
    return result;
  };
  host.s.broken = true;
  return { s: host.s, handler };
}
for (const invalid of ['missing', 'stale']) {
  test(`a healthy section beside one with a ${invalid} scope reloads automatically once, then waits; Refresh recovers (R4-3, I2)`, async () => {
    const u = await homeUi(mixedHost(invalid));
    const statusCalls = () => u.homeCalls.filter(call => call.name === 'osm_home').length;
    const listCalls = () => u.homeCalls.filter(call => call.name === 'osm_home_list').length;
    await settle(); await settle();
    assert.equal(statusCalls(), 2, 'exactly one automatic reload');
    const lists = listCalls();
    await settle(); await settle();
    assert.equal(statusCalls(), 2, 'then waits'); assert.equal(listCalls(), lists, 'no list loop');
    assert.equal(u.shown('home-gate'), true); assert.equal(u.text('gate-title'), 'Notion could not be read');
    u.host.s.broken = false;
    await u.click('drawer-refresh'); await settle();
    assert.equal(statusCalls(), 3); assert.equal(u.shown('home-gate'), false);
    assert.ok(u.panel().includes('Fixed scope before retainers'));
  });
}

// Sol r5 correction (run 73): one automatic reload per independent invalidation episode.
// The scripted host can hold a section's list answers pending or alter them.
function recoveryHost() {
  const host = homeHost(), overrides = new Map(), holds = new Map();
  host.s.statusCalls = 0;
  const handler = async (name, args) => {
    if (name === 'osm_home') host.s.statusCalls++;
    const hold = name === 'osm_home_list' && holds.get(args.section);
    if (hold) await hold.promise;
    const result = host.handler(name, args);
    const change = name === 'osm_home_list' && overrides.get(args.section);
    if (change) change(result._meta['osm/home-list']);
    return result;
  };
  const hold = section => { const entry = {}; entry.promise = new Promise(resolve => { entry.release = () => { holds.delete(section); resolve(); }; }); holds.set(section, entry); return entry.release; };
  return { s: host.s, handler, overrides, hold };
}
const counts = u => ({ status: () => u.homeCalls.filter(call => call.name === 'osm_home').length, lists: () => u.homeCalls.filter(call => call.name === 'osm_home_list').length });

test('after a recovery fully settles, a distinct read invalidation reloads once more (R5-1, I2)', async () => {
  const host = recoveryHost(), u = await homeUi(host), { status } = counts(u);
  assert.equal(status(), 1);
  host.s.scope = 'scope-2';
  await u.press('Fixed scope before retainers'); await settle();
  assert.equal(status(), 2); assert.ok(u.panel().includes('Start emails with the outcome'), 'healthy scope-2 lists');
  host.s.scope = 'scope-3';
  await u.press('Start emails with the outcome'); await settle();
  assert.equal(status(), 3, 'a new episode gets its own automatic reload');
  await settle(); assert.equal(status(), 3);
});

test('after a recovery fully settles, a distinct list invalidation reloads once more (R5-1, I2)', async () => {
  const host = recoveryHost(), u = await homeUi(host), { status } = counts(u);
  host.s.scope = 'scope-2';
  await u.click('skills-tab'); await settle();
  assert.equal(status(), 2); assert.ok(u.panel().includes('Weekly client update'));
  host.s.scope = 'scope-3';
  await u.click('context-tab'); await settle();
  assert.equal(status(), 3);
  await settle(); assert.equal(status(), 3);
});

test('a ready status alone does not re-arm while every sibling is still pending (R5-1, I2)', async () => {
  const host = recoveryHost(), u = await homeUi(host), { status } = counts(u);
  const releases = ['about', 'memory', 'docs'].map(section => host.hold(section));
  host.s.scope = 'scope-2';
  await u.press('Fixed scope before retainers'); await settle();
  assert.equal(status(), 2);
  host.overrides.set('skills', value => { value.scope = 'stale-scope'; });
  await u.click('skills-tab'); await settle();
  assert.equal(status(), 2, 'no second automatic reload'); assert.equal(u.shown('home-gate'), true);
  for (const release of releases) release();
  await settle();
  assert.equal(status(), 2, 'stale callbacks neither re-arm nor reload'); assert.equal(u.shown('home-gate'), true);
  host.overrides.clear(); await u.click('drawer-refresh'); await settle();
  assert.equal(status(), 3); assert.equal(u.shown('home-gate'), false);
});

test('one healthy sibling does not re-arm while another is pending (R5-1, I2)', async () => {
  const host = recoveryHost(), u = await homeUi(host), { status } = counts(u);
  const release = host.hold('memory');
  host.s.scope = 'scope-2';
  await u.press('Fixed scope before retainers'); await settle();
  assert.equal(status(), 2); assert.ok(u.panel().includes('About Fictional Studio'), 'healthy sibling listed');
  host.overrides.set('skills', value => { delete value.scope; });
  await u.click('skills-tab'); await settle();
  assert.equal(status(), 2); assert.equal(u.shown('home-gate'), true);
  release(); await settle(); assert.equal(status(), 2);
});

test('a failed sibling does not re-arm; a section Try again or the gate Try again does (R5-1, I2)', async () => {
  const host = recoveryHost(), u = await homeUi(host), { status } = counts(u);
  host.overrides.set('memory', value => { value.state = 'unavailable'; delete value.items; });
  host.s.scope = 'scope-2';
  await u.press('Fixed scope before retainers'); await settle();
  assert.equal(status(), 2); assert.ok(u.panel().includes('Notion could not be read. Try again later.'));
  // The section's own Try again is explicit: it resets the budget.
  host.overrides.clear();
  await u.press('Try again'); await settle();
  assert.ok(u.panel().includes('Start emails with the outcome'));
  host.s.scope = 'scope-3';
  await u.press('Start emails with the outcome'); await settle();
  assert.equal(status(), 3, 'reloads after the section Try again');
  // Without an explicit reset, a failed sibling keeps the budget spent.
  host.overrides.set('memory', value => { value.state = 'unavailable'; delete value.items; });
  host.s.scope = 'scope-4';
  await u.press('Fixed scope before retainers'); await settle();
  const spent = status();
  host.overrides.set('skills', value => { value.scope = 'stale-scope'; });
  await u.click('skills-tab'); await settle();
  assert.equal(status(), spent, 'failed sibling: not re-armed'); assert.equal(u.shown('home-gate'), true);
  host.overrides.clear(); await u.click('gate-action'); await settle();
  assert.equal(status(), spent + 1); assert.equal(u.shown('home-gate'), false);
});

test('alternating invalid answers do not reopen a loop (R5-1, I2)', async () => {
  // Memory is invalid in even status rounds and Docs in odd ones, so every round has a
  // healthy sibling and a different invalid one. An eager re-arm would loop here.
  const host = recoveryHost();
  host.overrides.set('memory', value => { if (host.s.statusCalls % 2 === 1) value.scope = 'stale-scope'; });
  host.overrides.set('docs', value => { if (host.s.statusCalls % 2 === 0) value.scope = 'stale-scope'; });
  const u = await homeUi(host), { status, lists } = counts(u);
  await settle(); await settle();
  const settledStatus = status(), settledLists = lists();
  await settle(); await settle(); await settle();
  assert.equal(status(), 2, 'exactly one automatic reload'); assert.equal(status(), settledStatus); assert.equal(lists(), settledLists);
  assert.equal(u.shown('home-gate'), true);
});

test('a context change resets the budget (R5-1, I2)', async () => {
  const host = recoveryHost();
  host.overrides.set('memory', value => { value.scope = 'stale-scope'; });
  const u = await homeUi(host), { status } = counts(u);
  await settle(); await settle();
  const spent = status();
  assert.equal(u.shown('home-gate'), true);
  host.overrides.clear();
  u.notify({ _meta: { 'osm/status': { ...plain(u.status), context: { state: 'configured', target: other, kind: 'notion', revision: 'e'.repeat(64) }, checkedAt: new Date(999999).toISOString() } } });
  await settle();
  assert.equal(status(), spent + 1); assert.equal(u.shown('home-gate'), false);
  host.s.scope = 'scope-9';
  await u.press('Fixed scope before retainers'); await settle();
  assert.equal(status(), spent + 2, 'the new context has its own automatic reload');
});

// Sol r6 correction (run 74): reads belong to the same recovery settlement.
const deferred = () => { const entry = {}; entry.promise = new Promise(resolve => { entry.release = resolve; }); return entry; };
function readHost() {
  const base = recoveryHost(), held = [], reads = { change: null, hold: false };
  const handler = async (name, args) => {
    if (name === 'osm_home_read' && reads.hold) { const entry = deferred(); held.push(entry); await entry.promise; }
    const result = await base.handler(name, args);
    if (name === 'osm_home_read' && reads.change) reads.change(result._meta['osm/home-record']);
    return result;
  };
  return { ...base, handler, reads, releaseReads: () => { reads.hold = false; for (const entry of held.splice(0)) entry.release(); } };
}
// Starts a recovery (a read answers for scope 2) with Docs held, so its lists are not yet settled.
async function recoveringWithDocsHeld() {
  const host = readHost(), u = await homeUi(host), { status } = counts(u);
  const releaseDocs = host.hold('docs');
  host.s.scope = 'scope-2';
  await u.press('About Fictional Studio');
  assert.equal(status(), 2); assert.ok(u.panel().includes('Fixed scope before retainers'));
  return { host, u, status, releaseDocs };
}
for (const leave of [false, true]) {
  test(`a read pending while every list settles keeps the recovery unsettled${leave ? ', also after Back' : ''} (R6-1, I2)`, async () => {
    const { host, u, status, releaseDocs } = await recoveringWithDocsHeld();
    host.reads.hold = true;
    const opening = u.buttonNamed('Fixed scope before retainers').dispatch('click'); await settle();
    if (leave) { await u.press('← Context'); assert.equal(u.shown('home-footer'), true); }
    releaseDocs(); await settle();
    host.reads.change = value => { value.scope = 'stale-scope'; };
    host.releaseReads(); await opening; await settle();
    assert.equal(status(), 2, 'no third automatic reload'); assert.equal(u.shown('home-gate'), true);
  });
}
for (const failure of ['unavailable', 'rate_limited']) {
  test(`a current-scope ${failure} read keeps the recovery unsettled after the lists settle (R6-1, I2)`, async () => {
    const { host, u, status, releaseDocs } = await recoveringWithDocsHeld();
    host.reads.change = value => { value.state = failure; delete value.record; };
    await u.press('Fixed scope before retainers');
    host.reads.change = null;
    releaseDocs(); await settle();
    host.overrides.set('skills', value => { value.scope = 'stale-scope'; });
    await u.click('skills-tab'); await settle();
    assert.equal(status(), 2, 'the failed read keeps the budget spent'); assert.equal(u.shown('home-gate'), true);
  });
}
test('a recovery whose last outstanding request is a successful read settles; a later episode reloads once (R6-1, I2)', async () => {
  const { host, u, status, releaseDocs } = await recoveringWithDocsHeld();
  host.reads.hold = true;
  const opening = u.buttonNamed('Fixed scope before retainers').dispatch('click'); await settle();
  releaseDocs(); await settle();
  host.releaseReads(); await opening; await settle();
  assert.equal(u.text('reader-title'), 'Fixed scope before retainers');
  await u.press('← Context');
  host.overrides.set('skills', value => { value.scope = 'stale-scope'; });
  await u.click('skills-tab'); await settle();
  assert.equal(status(), 3, 'exactly one more reload'); await settle(); assert.equal(status(), 3);
});
test('old-generation answers arriving during an active recovery do not re-arm it (R6-1, I2)', async () => {
  const host = recoveryHost(), gates = [deferred(), deferred()]; let calls = 0;
  const handler = async (name, args) => {
    if (name === 'osm_home_list' && args.section === 'memory') { const gate = gates[calls++]; if (gate) await gate.promise; }
    return host.handler(name, args);
  };
  const u = await homeUi({ s: host.s, handler }), { status } = counts(u);
  host.s.scope = 'scope-2';
  await u.press('About Fictional Studio');
  assert.equal(status(), 2); assert.equal(calls, 2, 'memory pending in both generations');
  gates[0].release(); await settle(); // the first generation's Memory answer, now stale
  host.overrides.set('skills', value => { value.scope = 'stale-scope'; });
  await u.click('skills-tab'); await settle();
  assert.equal(status(), 2, 'not re-armed by the stale answer'); assert.equal(u.shown('home-gate'), true);
  gates[1].release(); await settle(); assert.equal(status(), 2);
});
test('a section Try again resets the budget even when the retry does not settle (R6-1, I2)', async () => {
  const host = recoveryHost(), u = await homeUi(host), { status } = counts(u);
  host.overrides.set('memory', value => { value.state = 'unavailable'; delete value.items; });
  host.s.scope = 'scope-2';
  await u.press('About Fictional Studio');
  assert.equal(status(), 2);
  await u.press('Try again');
  assert.ok(u.panel().includes('Notion could not be read. Try again later.'), 'the retry failed again');
  host.s.scope = 'scope-3';
  await u.press('About Fictional Studio');
  assert.equal(status(), 3, 'the explicit reset alone re-armed the budget');
});
