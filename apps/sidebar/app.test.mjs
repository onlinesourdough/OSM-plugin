import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { classifyTarget, connectionCopy } from './ui-model.mjs';
import { overviewView, deriveOverview } from './model-overview.mjs';
import { ownerModel, mixedModel, modelTarget } from './model-fixtures.mjs';
import { createDocument } from './test-dom.mjs';
// The browser modules share one VM realm with a small DOM; imports become globals.
// Modules not concatenated below, such as the real overview helper, are injected.
const read = name => readFile(new URL(name, import.meta.url), 'utf8');
const source = (await Promise.all(['page-icons.mjs', 'source-label.mjs', 'setup-state.mjs', 'picker.mjs', 'app.mjs'].map(read)))
  .map(text => text.replace(/^import .*;\n/gm, '').replace(/^export /gm, '')).join('\n');
const template = await read('index.html');
const target = 'https://app.notion.com/p/00000000000000000000000000000001';
const other = 'https://app.notion.com/p/00000000000000000000000000000002';
const configured = (revision = 'a') => ({ state: 'configured', target, kind: 'notion', revision: revision.repeat(64) });
const saved = (links, title = 'Our AIOS') => ({ state: 'saved', revision: 'c'.repeat(64), title, links });
const plain = value => JSON.parse(JSON.stringify(value));

async function ui(context = { state: 'missing', revision: 'a'.repeat(64) }, sources = { state: 'missing', revision: 'c'.repeat(64), title: '', links: {} }, options = {}) {
  let time = 100000, host, fail = Boolean(options.initialFailure), delay, release, revision = 0, linkFailure = false, malformed = false;
  const calls = [], links = [], document = createDocument(template);
  const status = { features: { notionPages: Boolean(options.pages), notionIcons: Boolean(options.icons) }, notion: { state: options.notion || 'connected' }, context, sources, checkedAt: new Date(time).toISOString() };
  if (options.model) Object.assign(status, { model: options.model, features: { ...status.features, modelOverview: true } });
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
      calls.push({ name, args: plain(args) }); if (delay) await delay;
      if (fail) throw new Error('Request failed');
      if (malformed && name === 'osm_status') return {};
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
  const sandbox = { App, classifyTarget, connectionCopy, overviewView, __OSM_VERSION__: 'test', applyDocumentTheme() {}, applyHostStyleVariables() {},
    document, URL, structuredClone, setTimeout, clearTimeout, Date: class extends Date { static now() { return time; } } };
  await vm.runInNewContext(`(async () => {${source}})()`, sandbox);
  const get = id => document.getElementById(id);
  const u = {
    get, calls, links, status, names: () => calls.map(call => call.name), focused: () => document.activeElement?.id,
    text: id => get(id).textContent, shown: id => !get(id).hidden,
    notify: value => host.ontoolresult(value), fail: value => { fail = value; }, failLinks: value => { linkFailure = value; },
    malformed: value => { malformed = value; },
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

// Operating-model overview (#58). Snapshots are derived by the real deriveOverview
// from invented connector-shaped models and rendered by the real overviewView.
const modelSnapshot = (content = ownerModel, overrides = {}) => ({ version: 1, model: { identity: 'notion:' + modelTarget.slice(-32), target: modelTarget, title: 'AI Operating Model' },
  revision: '2026-10-19T09:00:00.000Z', readAt: '2026-10-19T09:01:00.000Z', complete: true, selection: null, changes: null, ...deriveOverview(content), ...overrides });
const derivedGroups = content => deriveOverview(content).groups.map(group => [group.title, group.links.map(link => link.title)]);
const overviewRows = u => u.get('overview-groups').descendants().filter(node => node.tagName === 'BUTTON');
const facts = u => u.get('overview-facts').children.map(item => [item.children[0].textContent, item.children[1].textContent]);
const fact = (u, label) => facts(u).find(([name]) => name === label)?.[1];

test('a model snapshot previews its own groups; browsing, opening and choosing a page never write or fetch destinations', async () => {
  const requested = [];
  const u = await ui(undefined, undefined, { model: modelSnapshot(),
    pages: async () => ({ pages: [{ title: 'AI Operating Model', target: modelTarget }], hasMore: false }),
    icons: async targets => { requested.push(...targets); return { icons: [] }; } });
  assert.equal(u.shown('overview'), true); assert.equal(u.shown('setup'), true);
  assert.equal(u.text('model-meta'), 'AI Operating Model');
  const shown = u.get('overview-groups').children.map(section => [section.children[0].textContent, section.children.slice(1).map(row => row.textContent)]);
  assert.deepEqual(shown, derivedGroups(ownerModel));
  assert.deepEqual(shown, [['Context sources', ['Soul', 'About', 'Memory', 'Skills']], ['Work and outputs', ['Tasks', 'Projects', 'Repository']]]);
  // Connection, pointer, the source's revision, the snapshot's save time and coverage are
  // separate facts; nothing claims a fresh read, agent loading or activation.
  assert.deepEqual(facts(u).map(([label]) => label), ['Notion', 'Host pointer', 'Source revision', 'Snapshot saved', 'Coverage']);
  assert.equal(fact(u, 'Notion'), 'Connected'); assert.ok(fact(u, 'Snapshot saved'));
  assert.equal(fact(u, 'Source revision'), '2026-10-19T09:00:00.000Z'); assert.equal(fact(u, 'Host pointer'), 'Not saved');
  assert.equal(fact(u, 'Coverage'), 'Complete as reported');
  assert.doesNotMatch(u.text('overview'), /loaded|enabled|activated|Ready/);
  assert.equal(u.shown('save-pointer'), true); assert.match(u.text('pointer-text'), /Other instructions stay unchanged/);
  await u.click('open-model');
  for (const row of overviewRows(u)) await row.dispatch('click');
  const targets = deriveOverview(ownerModel).groups.flatMap(group => group.links.map(link => link.target));
  assert.deepEqual(u.links, [modelTarget, ...targets]);
  assert.deepEqual(u.calls, [], 'reviewing and opening navigation calls no tool');
  await u.click('setup-context-picker'); await settled();
  await u.options('setup-context-picker').find(option => option.textContent.startsWith('AI Operating Model')).dispatch('click');
  await settled();
  assert.equal(u.get('target').value, modelTarget);
  assert.equal(u.names().some(name => name.startsWith('osm_save_')), false, 'selecting a page writes nothing');
  assert.ok(requested.every(value => value === modelTarget), 'icons are read only for the selected page, never for overview destinations');
  assert.equal(fact(u, 'Host pointer'), 'Not saved');
});

test('only Save pointer writes the pointer, with the read revision, and it does not claim the agent loaded it', async () => {
  const u = await ui(undefined, undefined, { model: modelSnapshot() });
  await u.click('refresh');
  assert.deepEqual(u.names(), ['osm_status'], 'refreshing the panel writes nothing');
  const revision = u.status.context.revision;
  await u.click('save-pointer');
  assert.deepEqual(u.names(), ['osm_status', 'osm_save_context']);
  assert.deepEqual(u.calls[1].args, { target: modelTarget, expectedRevision: revision });
  assert.equal(u.shown('dashboard'), true); assert.equal(u.text('heading'), 'OSM');
  assert.equal(fact(u, 'Host pointer'), 'Saved'); assert.equal(fact(u, 'Notion'), 'Connected');
  assert.equal(u.shown('pointer-change'), false);
  assert.equal(u.text('feedback-text'), 'Pointer saved. This does not show that a running agent has loaded the model.');
  assert.equal(u.shown('open-context'), false, 'the overview names the saved model; no duplicate Primary row');
  assert.equal(u.shown('shortcuts-title'), false, 'no empty Saved shortcuts heading for a new setup');
  await u.click('save-pointer');
  assert.equal(u.names().length, 2, 'an already saved pointer offers no second write');
});

test('the Context step names its write, and Save pointer asks before discarding source edits', async () => {
  const u = await ui(undefined, undefined, { model: modelSnapshot() });
  await u.input(target);
  assert.equal(u.text('continue-1'), 'Save pointer');
  await u.submit();
  assert.deepEqual(u.names(), ['osm_save_context']);
  assert.equal(u.text('continue-1'), 'Continue');
  assert.equal(fact(u, 'Host pointer'), 'Points to another context');
  assert.match(u.text('pointer-text'), /replaces only the Context line/);
  await u.addLink('setup-docs-picker', 'https://example.com/docs');
  const revision = u.status.context.revision;
  await u.click('save-pointer');
  assert.deepEqual(u.names(), ['osm_save_context']);
  assert.equal(u.text('save-pointer'), 'Discard edits and save pointer');
  assert.equal(u.text('feedback-text'), 'Unsaved source changes will be discarded.');
  await u.click('save-pointer');
  assert.deepEqual(u.names(), ['osm_save_context', 'osm_save_context']);
  assert.deepEqual(u.calls[1].args, { target: modelTarget, expectedRevision: revision });
  assert.equal(u.shown('dashboard'), true); assert.equal(fact(u, 'Host pointer'), 'Saved');
});

test('earlier links stay as editable Saved shortcuts beside the saved model', async () => {
  const docs = { title: 'Company docs', target: 'https://example.com/docs' }, memory = { title: 'Decisions', target: 'https://example.com/memory' };
  const u = await ui({ ...configured(), target: modelTarget }, saved({ docs, memory }), { model: modelSnapshot() });
  assert.equal(u.shown('dashboard'), true); assert.equal(fact(u, 'Host pointer'), 'Saved'); assert.equal(u.shown('pointer-change'), false);
  assert.equal(u.shown('shortcuts-title'), true); assert.equal(u.text('shortcuts-title'), 'More links');
  assert.equal(u.shown('open-context'), false);
  assert.deepEqual(['docs', 'personalSkills', 'teamSkills', 'memory', 'teamMemory'].filter(role => u.shown('open-' + role)), ['docs', 'memory']);
  assert.equal(u.get('skills-title').parentNode.hidden, true);
  assert.equal(u.text('docs-meta'), 'Company docs');
  // Beside the saved model the populated shortcuts are a compact visible row, each named by its role.
  assert.equal(u.shown('shortcuts-list'), true);
  assert.deepEqual(['docs', 'memory'].map(role => u.get('open-' + role).children[0].textContent), ['Docs', 'Memory']);
  await u.click('open-docs'); assert.deepEqual(u.links, [docs.target]);
  await u.click('settings'); await u.addLink('settings-teamSkills-picker', 'https://example.com/team', 'Team methods');
  await u.click('drawer-save');
  assert.deepEqual(u.names(), ['osm_save_sources']);
  assert.equal(u.calls[0].args.target, modelTarget);
  assert.deepEqual(u.calls[0].args.links, { docs, teamSkills: { title: 'Team methods', target: 'https://example.com/team' }, memory });
  assert.equal(u.shown('open-teamSkills'), true); assert.equal(u.get('skills-title').parentNode.hidden, false);
});

test('an ambiguous model lists its sections for a choice in Setup and shows no guessed links', async () => {
  const u = await ui(undefined, undefined, { model: modelSnapshot(mixedModel) });
  assert.equal(overviewRows(u).length, 0);
  assert.deepEqual(u.get('overview-groups').children[0].children.map(item => item.textContent), ['Sources · 1 link · mixed with other items', 'Team · 1 link']);
  assert.match(u.text('overview-notes'), /ask Setup which sections to show/);
  assert.deepEqual(u.calls, []);
});

test('disconnection, a failed read and late snapshots cannot resurrect overview navigation', async () => {
  const u = await ui({ ...configured(), target: modelTarget }, saved({}), { model: modelSnapshot() });
  const ready = plain(u.status);
  assert.equal(overviewRows(u).length, 7);
  u.status.notion = { state: 'not_connected' }; await u.click('refresh');
  assert.equal(overviewRows(u).length, 0); assert.equal(fact(u, 'Notion'), 'Not connected');
  assert.match(u.text('overview-notes'), /Notion is not connected/);
  u.notify({ _meta: { 'osm/status': { ...ready, checkedAt: new Date(100005).toISOString() } } });
  assert.equal(overviewRows(u).length, 0, 'a late connected snapshot is ignored');
  u.status.notion = { state: 'connected' }; u.status.model = modelSnapshot(ownerModel, { state: 'no_access', groups: [], sections: [] });
  await u.click('refresh');
  assert.equal(overviewRows(u).length, 0); assert.ok(fact(u, 'Refresh recorded')); assert.equal(fact(u, 'Coverage'), undefined);
  assert.match(u.text('overview-notes'), /could not access the model/);
  u.notify({ _meta: { 'osm/status': { ...ready, checkedAt: new Date(100015).toISOString() } } });
  assert.equal(overviewRows(u).length, 0, 'a late earlier read cannot restore cleared links');
  u.status.model = { state: 'unavailable' }; await u.click('refresh');
  assert.equal(u.text('model-meta'), 'Overview unavailable'); assert.equal(u.get('open-model').disabled, true);
  assert.equal(overviewRows(u).length, 0);
  assert.equal(u.names().some(name => name.startsWith('osm_save_')), false);
});

test('after a definite disconnect, failed, malformed or unverified checks keep overview links hidden until Connected returns', async () => {
  const u = await ui({ ...configured(), target: modelTarget }, saved({}), { model: modelSnapshot() });
  const targets = new Set(deriveOverview(ownerModel).groups.flatMap(group => group.links.map(link => link.target)));
  const hidden = step => {
    assert.equal(overviewRows(u).length, 0, `${step}: no overview link actions`);
    assert.equal(u.links.some(link => targets.has(link)), false, `${step}: no overview link opened`);
    assert.equal(u.names().some(name => name.startsWith('osm_save_')), false, `${step}: no pointer or source save`);
  };
  assert.equal(overviewRows(u).length, 7);
  u.status.notion = { state: 'not_connected' }; await u.click('refresh');
  hidden('disconnected');
  u.fail(true); await u.click('refresh'); u.fail(false);
  assert.equal(u.text('connection-label'), 'Could not verify');
  hidden('failed refresh');
  assert.match(u.text('overview-notes'), /not been confirmed since/);
  u.status.notion = { state: 'connected' }; u.malformed(true); await u.click('refresh'); u.malformed(false);
  assert.equal(u.text('connection-label'), 'Could not verify');
  hidden('malformed refresh');
  u.notify({ _meta: { 'osm/status': { notion: { state: 'connected' }, context: { state: 'configured' }, checkedAt: new Date(200000).toISOString() } } });
  hidden('malformed tool result');
  u.status.notion = { state: 'unknown' }; await u.click('refresh');
  hidden('unverified status');
  u.notify({ _meta: { 'osm/status': { ...plain(u.status), notion: { state: 'connected' }, checkedAt: new Date(100000).toISOString() } } });
  hidden('late connected snapshot');
  u.status.notion = { state: 'connected' }; await u.click('refresh');
  assert.equal(u.text('connection-label'), '✓ Connected');
  assert.equal(overviewRows(u).length, 7, 'a fresh Connected status restores the readable snapshot');
  assert.doesNotMatch(u.text('overview-notes'), /not been confirmed since/);
  u.status.model = modelSnapshot(ownerModel, { state: 'no_access', groups: [], sections: [] }); await u.click('refresh');
  u.fail(true); await u.click('refresh'); u.fail(false);
  assert.equal(overviewRows(u).length, 0, 'a failed refresh keeps a no-access result cleared');
});

// Another person's model with its own title and headings (invented, inline so
// this file needs nothing new from the modules it tests).
const pageUrl = n => `https://app.notion.com/p/${String(n).padStart(32, '0')}`;
const otherTarget = pageUrl(200);
const otherModel = ['## Daily work', `- **Planner:** <mention-page url="${pageUrl(201)}"/> plans the week.`,
  `- **Notes:** <mention-page url="${pageUrl(202)}">Notes</mention-page>`, '- Keep this list short.',
  '## Reference', `- **Docs:** [Handbook](${pageUrl(203)})`, `- [Archive](${pageUrl(204)})`,
  '## Team', `- **Studio:** <mention-page url="${pageUrl(205)}">Studio</mention-page>`,
  `- Owner: <mention-page url="${pageUrl(206)}"/> approves changes.`].join('\n');
const otherSnapshot = (overrides = {}) => modelSnapshot(otherModel,
  { model: { identity: 'notion:' + otherTarget.slice(-32), target: otherTarget, title: 'Workspace guide' }, ...overrides });
const cards = u => u.get('overview-groups').children.filter(node => node.tagName === 'SECTION')
  .map(section => [section.children[0].textContent, section.children.slice(1).map(row => [row.textContent, row.title])]);

test('any model shows its own title once and its own sections as cards, naming an equivalent role and page once', async () => {
  const u = await ui({ ...configured(), target: otherTarget }, saved({}), { model: otherSnapshot() });
  assert.equal(u.text('overview-title'), 'Workspace guide');
  assert.equal((u.text('overview').match(/Workspace guide/g) || []).length, 1, 'the title appears once');
  assert.equal(u.shown('overview-kind'), true, 'a title that does not say what it is gets a quiet label');
  assert.equal(u.text('open-model'), 'Open in Notion');
  assert.deepEqual(cards(u), [
    ['Daily work', [['Planner', pageUrl(201)], ['Notes', pageUrl(202)]]],
    ['Reference', [['Docs · Handbook', pageUrl(203)], ['Archive', pageUrl(204)]]],
    ['Team', [['Studio', pageUrl(205)]]]]);
  assert.ok(u.get('overview-groups').children.every(node => node.className === 'overview-card'), 'each section is its own card');
  for (const row of overviewRows(u)) await row.dispatch('click');
  assert.deepEqual(u.links, [201, 202, 203, 204, 205].map(pageUrl), 'exact targets open unchanged');
  assert.deepEqual(u.calls, []);
  const titled = await ui(undefined, undefined, { model: modelSnapshot() });
  assert.equal(titled.shown('overview-kind'), false);
  assert.equal((titled.text('overview').match(/AI Operating Model/g) || []).length, 1, 'no generic heading repeats a model already titled so');
});

test('a snapshot saved by the earlier version keeps its stored names exactly; a resave of the same text shows equivalent names once', async () => {
  const persisted = otherSnapshot({ groups: [{ title: 'Home', links: [{ title: 'AIOS · AIOS', target: pageUrl(211) },
    { title: 'Notes · Notes', target: pageUrl(212) }, { title: 'Plans · Plans 2026', target: pageUrl(213) }] }] });
  const u = await ui({ ...configured(), target: otherTarget }, saved({}), { model: persisted });
  assert.deepEqual(cards(u), [['Home', [['AIOS · AIOS', pageUrl(211)], ['Notes · Notes', pageUrl(212)], ['Plans · Plans 2026', pageUrl(213)]]]],
    'an older snapshot does not record which titles join a role and a page, so none is shortened');
  assert.deepEqual(u.calls, [], 'the older snapshot stays usable without a save or refresh');
  const resaved = await ui({ ...configured(), target: otherTarget }, saved({}),
    { model: otherSnapshot({ ...deriveOverview(`## Home\n- **AIOS:** <mention-page url="${pageUrl(211)}">AIOS</mention-page>\n- [Notes · Notes](${pageUrl(212)})`) }) });
  assert.deepEqual(cards(resaved), [['Home', [['AIOS', pageUrl(211)], ['Notes · Notes', pageUrl(212)]]]],
    'the labelled row is shortened; a page literally titled with a middle dot is not');
});

test('the source revision and the snapshot save time stay separate, and partial coverage stays visible', async () => {
  const u = await ui({ ...configured(), target: otherTarget }, saved({}),
    { model: otherSnapshot({ revision: '2026-10-18T09:00:00.000Z', readAt: '2026-10-20T08:30:00.000Z', complete: false }) });
  assert.equal(fact(u, 'Source revision'), '2026-10-18T09:00:00.000Z');
  assert.ok(fact(u, 'Snapshot saved')); assert.notEqual(fact(u, 'Snapshot saved'), fact(u, 'Source revision'));
  assert.ok(facts(u).every(([label, value]) => !/\bread\b/i.test(`${label} ${value}`)), 'saving a snapshot is not presented as reading the model');
  assert.equal(fact(u, 'Coverage'), 'Partial · 1 left out');
  assert.equal(u.shown('overview-more'), true);
  assert.match(u.text('overview-details'), /1 source row or link was left out/);
  assert.match(u.text('overview-details'), /Some sources may be missing/);
  assert.doesNotMatch(u.text('overview-notes'), /left out|may be missing/, 'explanations do not crowd the urgent notes');
  const unknown = await ui({ ...configured(), target: otherTarget }, saved({}),
    { model: otherSnapshot({ revision: '', complete: false, partial: false, skipped: 0 }) });
  assert.equal(fact(unknown, 'Source revision'), 'Not reported');
  assert.equal(fact(unknown, 'Coverage'), 'Completeness unknown');
  assert.match(unknown.text('overview-details'), /Some sources may be missing/);
});

// The main view is navigation; routine facts are in one closed About this overview surface.
const mainText = u => u.get('overview').children.filter(node => node.id !== 'overview-more' && !node.hidden).map(node => node.textContent).join(' ');

test('the main view leads with navigation; connection, pointer, revision, save time and coverage sit in About this overview', async () => {
  const u = await ui({ ...configured(), target: modelTarget }, saved({}), { model: modelSnapshot() });
  assert.equal(overviewRows(u).length, 7);
  for (const routine of ['Host pointer', 'Source revision', 'Snapshot saved', 'Coverage', 'Connected', '2026-10-19T09:00:00.000Z'])
    assert.ok(!mainText(u).includes(routine), `${routine} is not in the main view`);
  assert.equal(u.shown('overview-partial'), false, 'a complete overview carries no notice');
  assert.equal(u.text('overview-notes'), '');
  assert.equal(u.shown('overview-more'), true); assert.equal(u.get('overview-more').open, false);
  assert.equal(u.text('overview-more-summary'), 'About this overview');
  assert.equal(u.get('overview-facts').parentNode.id, 'overview-more');
  assert.equal(fact(u, 'Notion'), 'Connected'); assert.equal(fact(u, 'Host pointer'), 'Saved');
  assert.equal(fact(u, 'Source revision'), '2026-10-19T09:00:00.000Z'); assert.equal(fact(u, 'Coverage'), 'Complete as reported');
  assert.equal(u.shown('shortcuts-title'), false, 'no empty More links block');
  assert.ok(u.get('dashboard').querySelectorAll('section').every(section => section.hidden));
});

test('partial or unknown links carry one short notice whose Details opens the specifics; actionable problems stay visible', async () => {
  const u = await ui({ ...configured(), target: otherTarget }, saved({}), { model: otherSnapshot({ complete: false }) });
  assert.equal(u.shown('overview-partial'), true); assert.match(u.text('overview-partial'), /^Some links may be missing\./);
  assert.doesNotMatch(mainText(u), /left out|Coverage|Partial/, 'counts and coverage are not in the main view');
  assert.equal(u.get('overview-more').open, false);
  await u.click('overview-why');
  assert.equal(u.get('overview-more').open, true); assert.equal(u.focused(), 'overview-more-summary');
  assert.equal(fact(u, 'Coverage'), 'Partial · 1 left out');
  assert.match(u.text('overview-details'), /1 source row or link was left out/);
  const unknown = await ui({ ...configured(), target: otherTarget }, saved({}), { model: otherSnapshot({ complete: false, partial: false, skipped: 0 }) });
  assert.equal(unknown.shown('overview-partial'), true, 'unknown completeness is not shown as complete');
  assert.equal(fact(unknown, 'Coverage'), 'Completeness unknown');
  const off = await ui({ ...configured(), target: otherTarget }, saved({}), { model: otherSnapshot({ complete: false }), notion: 'not_connected' });
  assert.equal(overviewRows(off).length, 0); assert.match(off.text('overview-notes'), /Notion is not connected/);
  assert.equal(off.shown('notice'), true); assert.equal(off.shown('notice-connect'), true);
  assert.equal(off.shown('overview-partial'), false, 'the disconnect note replaces the partial notice');
  const denied = await ui({ ...configured(), target: otherTarget }, saved({}), { model: otherSnapshot({ state: 'no_access', groups: [], sections: [] }) });
  assert.match(denied.text('overview-notes'), /could not access the model/); assert.equal(denied.shown('overview-partial'), false);
});

test('a saved link to the same destination as a model link is not shown again; same-named or other pages stay; stored links are unchanged', async () => {
  const soul = deriveOverview(ownerModel).groups[0].links[0].target;
  const docs = { title: 'Soul page', target: soul + '?source=copy_link' }, memory = { title: 'Soul', target: 'https://example.com/soul' };
  const u = await ui({ ...configured(), target: modelTarget }, saved({ docs, memory }), { model: modelSnapshot() });
  assert.equal(u.shown('open-docs'), false, 'the same Notion page as a model card');
  assert.equal(u.shown('open-memory'), true, 'the same name but a different page stays');
  assert.equal(u.shown('shortcuts-title'), true);
  await u.click('open-memory'); assert.deepEqual(u.links, [memory.target]);
  assert.deepEqual(u.calls, []); assert.deepEqual(plain(u.status.sources.links), { docs, memory }, 'nothing is deleted or migrated');
  await u.click('settings');
  assert.ok(u.get('settings-docs-picker').textContent.includes('Soul page'), 'the repeated shortcut stays manageable in Settings');
  const only = await ui({ ...configured(), target: modelTarget }, saved({ docs }), { model: modelSnapshot() });
  assert.equal(only.shown('shortcuts-title'), false, 'no block when every shortcut repeats a model link');
  const offline = await ui({ ...configured(), target: modelTarget }, saved({ docs }), { model: modelSnapshot(), notion: 'not_connected' });
  assert.equal(offline.shown('open-docs'), true, 'while model links are hidden, the shortcut remains reachable');
});

// A saved link is hidden only when it opens exactly the destination of a model
// card, apart from Notion's copied-link decoration. Database views, blocks and
// any unknown query keep it visible. Each case renders one real model card.
const destinationPage = 'https://app.notion.com/p/00000000000000000000000000000011';
const blockA = '11111111111111111111111111111111', blockB = '22222222222222222222222222222222';
for (const [name, card, link, visible] of [
  ['a Notion block fragment is a different destination from its page', destinationPage, `${destinationPage}#${blockA}`, true],
  ['different Notion database views stay distinct', `${destinationPage}?v=${blockA}`, `${destinationPage}?v=${blockB}`, true],
  ['different Notion block anchors stay distinct', `${destinationPage}#${blockA}`, `${destinationPage}#${blockB}`, true],
  ['an unknown Notion query keeps a link distinct', destinationPage, `${destinationPage}?mode=print`, true],
  ['a different view with copied-link decoration stays distinct', `${destinationPage}?v=${blockA}`, `${destinationPage}?v=${blockB}&source=copy_link`, true],
  ['the same view with copied-link decoration is the same destination', `${destinationPage}?v=${blockA}`, `${destinationPage}?v=${blockA}&source=copy_link`, false],
  ['non-Notion links with different queries stay distinct', 'https://example.com/docs?view=one#intro', 'https://example.com/docs?view=two#intro', true],
  ['an identical destination is not repeated', destinationPage, destinationPage, false],
  ['Notion copied-link decoration alone is the same destination', destinationPage, `${destinationPage}?source=copy_link`, false],
  ['the same block with copied-link decoration is the same destination', `${destinationPage}#${blockA}`, `${destinationPage}?source=copy_link#${blockA}`, false],
]) test(`More links: ${name}`, async () => {
  const docs = { title: 'Roadmap', target: link };
  const u = await ui({ ...configured(), target: modelTarget }, saved({ docs }), { model: modelSnapshot(`## Destinations\n- [Roadmap](${card})`) });
  assert.equal(overviewRows(u).length, 1); assert.equal(overviewRows(u)[0].title, card, 'the card keeps its exact target');
  assert.equal(u.shown('open-docs'), visible);
  assert.equal(u.shown('shortcuts-title'), visible, visible ? 'More links shows the distinct destination' : 'no block when nothing distinct remains');
  if (visible) { await u.click('open-docs'); assert.deepEqual(u.links, [link], 'the saved link opens exactly as stored'); }
  assert.deepEqual(plain(u.status.sources.links), { docs }); assert.deepEqual(u.calls, []);
  await u.click('settings'); assert.ok(u.get('settings-docs-picker').textContent.includes('Roadmap'), 'still managed in Settings');
});

// Removing the copied-link marker leaves the rest of the query exactly as written.
for (const [name, card, link, visible] of [
  ['a bare unknown field differs from an explicit empty value', `${destinationPage}?flag=`, `${destinationPage}?flag&source=copy_link`, true],
  ['the same raw unknown query plus only the marker is the same destination', `${destinationPage}?flag=`, `${destinationPage}?flag=&source=copy_link`, false],
  ['the same bare unknown field plus only the marker is the same destination', `${destinationPage}?flag`, `${destinationPage}?flag&source=copy_link`, false],
  ['percent-encoded and plus-encoded values stay distinct', `${destinationPage}?q=a%20b`, `${destinationPage}?q=a+b&source=copy_link`, true],
  ['the same percent-encoded value plus only the marker is the same destination', `${destinationPage}?q=a%20b`, `${destinationPage}?q=a%20b&source=copy_link`, false],
]) test(`More links: ${name}`, async () => {
  const docs = { title: 'Roadmap', target: link };
  const u = await ui({ ...configured(), target: modelTarget }, saved({ docs }), { model: modelSnapshot(`## Destinations\n- [Roadmap](${card})`) });
  assert.equal(overviewRows(u).length, 1); assert.equal(overviewRows(u)[0].title, card, 'the card keeps its exact target');
  assert.equal(u.get('open-docs').title, link, 'the saved link keeps its exact target');
  assert.equal(u.shown('open-docs'), visible);
  if (visible) { await u.click('open-docs'); assert.deepEqual(u.links, [link], 'the saved link opens exactly as stored'); }
  assert.deepEqual(plain(u.status.sources.links), { docs }); assert.deepEqual(u.calls, []);
  await u.click('settings'); assert.ok(u.get('settings-docs-picker').textContent.includes('Roadmap'), 'still managed in Settings');
});

// A link without a qualified marker is compared exactly as classified, empty
// delimiters included; an encoded second source field leaves the marker in place.
for (const [name, card, link, visible] of [
  ['an empty query delimiter is not erased', destinationPage, `${destinationPage}?`, true],
  ['an empty fragment delimiter is not erased', destinationPage, `${destinationPage}#`, true],
  ['an encoded second source field keeps the marker', `${destinationPage}?%73ource=other`, `${destinationPage}?source=copy_link&%73ource=other`, true],
]) test(`More links: ${name}`, async () => {
  const docs = { title: 'Roadmap', target: link };
  const u = await ui({ ...configured(), target: modelTarget }, saved({ docs }), { model: modelSnapshot(`## Destinations\n- [Roadmap](${card})`) });
  assert.equal(overviewRows(u).length, 1); assert.equal(overviewRows(u)[0].title, card, 'the card keeps its exact target');
  assert.equal(u.get('open-docs').title, link, 'the saved link keeps its exact target');
  assert.equal(u.shown('feedback'), false, 'no render error');
  assert.equal(u.shown('open-docs'), visible);
  if (visible) { await u.click('open-docs'); assert.deepEqual(u.links, [link], 'the saved link opens exactly as stored'); }
  assert.deepEqual(plain(u.status.sources.links), { docs }); assert.deepEqual(u.calls, []);
  await u.click('settings'); assert.ok(u.get('settings-docs-picker').textContent.includes('Roadmap'), 'still managed in Settings');
});

test('absolute path sources stay usable beside the saved model', async () => {
  const docs = { title: 'Project reference', target: '/synthetic/project/reference' };
  const u = await ui({ ...configured(), target: modelTarget }, saved({ docs }), { model: modelSnapshot() });
  assert.equal(u.shown('feedback'), false, 'a valid saved absolute-path source must not cause a refresh/render error');
  assert.equal(u.shown('open-docs'), true);
  await u.click('open-docs');
  // A folder path is never sent to the host link route; the panel shows its location, as before.
  assert.deepEqual(u.links, []);
  assert.equal(u.text('feedback-text'), docs.target); assert.equal(u.get('feedback').dataset.error, 'false');
  assert.deepEqual(u.calls, []);
});

test('without a model, or for a folder context, shortcuts stay a plain open list with no toggle', async () => {
  const docs = { title: 'Handbook', target: 'https://example.com/docs' };
  const u = await ui({ state: 'configured', target: '/work/context', kind: 'path', revision: 'a'.repeat(64) }, saved({ docs }));
  assert.equal(u.shown('overview'), false);
  assert.equal(u.shown('shortcuts-title'), false); assert.equal(u.shown('shortcuts-list'), true);
  assert.equal(u.shown('open-context'), true); assert.equal(u.shown('open-docs'), true);
  await u.click('open-docs'); assert.deepEqual(u.links, [docs.target]);
  assert.deepEqual(u.calls, []);
});
