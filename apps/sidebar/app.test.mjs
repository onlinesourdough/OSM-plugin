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
  const messages = [], calls = [], homeCalls = [], links = [], document = createDocument(template);
  // Most legacy interaction cases begin with Browse already opened.

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
    async sendMessage(args) {
      messages.push(args);
      if (options.sendMessage) return options.sendMessage(args);
      return {};
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
        if (name === 'osm_home_page') {
          homeCalls.push({ name, args: plain(args) });
          const state = options.home ? (await options.home('osm_home', {}))?._meta?.['osm/home'] : null;
          return { _meta: { 'osm/home-page': { state: 'read', scope: state?.scope, record: { title: 'Fictional Data & Context', meta: '', fields: [], blocks: [], link: target } } } };
        }
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
  const mediaListeners = new Set(), media = { matches: Boolean(options.wide), addEventListener: (type, listener) => { if (type === 'change') mediaListeners.add(listener); } };
  const sandbox = { App, classifyTarget, connectionCopy, __OSM_VERSION__: 'test', applyDocumentTheme() {}, applyHostStyleVariables() {},
    navigator: { clipboard: { writeText: options.writeText || (async () => { throw new Error('Clipboard unavailable'); }) } },
    matchMedia: () => media, document, URL, structuredClone, setTimeout, clearTimeout, Date: class extends Date { static now() { return time; } } };
  await vm.runInNewContext(`(async () => {${source}})()`, sandbox);
  const get = id => document.getElementById(id);
  const u = {
    resize: wide => { media.matches = wide; for (const listener of mediaListeners) listener(); },
    advance: ms => { time += ms; }, get, calls, homeCalls, links, messages, status, document, names: () => calls.map(call => call.name), focused: () => document.activeElement?.id,
    text: id => get(id).textContent, shown: id => !get(id).hidden,
    notify: value => host.ontoolresult(value), fail: value => { fail = value; }, failLinks: value => { linkFailure = value; },
    delay() { delay = new Promise(resolve => { release = resolve; }); }, release() { release(); delay = undefined; },
    click: id => get(id).dispatch('click'),
    key: (id, key) => get(id).dispatch('keydown', { key }),
    input: value => { get('target').value = value; return get('target').dispatch('input'); },
    submit: () => get('setup').dispatch('submit'),
    options: picker => get(`${picker}-list`).descendants().filter(node => node.getAttribute('role') === 'option'),
    async choose(picker, label) {
      if (picker.startsWith('settings-') && picker !== 'settings-context-picker' && get('saved-links').hidden) await u.click('saved-links-toggle');
      await u.click(picker);
      const option = u.options(picker).find(node => node.textContent.startsWith(label));
      assert.ok(option, `${label} in ${picker}`); return option.dispatch('click');
    },
    async addLink(picker, link, name = '') {
      await u.choose(picker, get(picker).dataset.empty === 'true' ? 'Paste a link…' : 'Change link…');
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
  await u.click('settings'); await u.click('saved-links-toggle'); await u.addLink('settings-memory-picker', 'https://example.com/memory');
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
  assert.deepEqual(u.options('settings-memory-picker').map(node => node.textContent), ['Decisionsexample.com/memory', 'None', 'Change link…']);
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
  await u.click('settings'); await u.choose('settings-memory-picker', 'Paste a link…');
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
  await u.click('settings'); await u.choose('settings-memory-picker', 'Paste a link…');
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

test('no sidebar surface suggests a folder or an alternative link', async () => {
  for (const file of ['app.mjs', 'index.html']) {
    const text = await read(file);
    assert.equal(text.includes('/path/to/context'), false, file);
    assert.equal(text.includes('Use a folder or other link'), false, file);
  }
});
test('a configured folder or other link shows one read-only notice; a Notion context shows none', async () => {
  const legacy = await ui({ state: 'configured', target: '/work/legacy', kind: 'path', revision: 'f'.repeat(64) }, saved({}));
  assert.equal(legacy.shown('legacy-route'), true);
  assert.match(legacy.text('legacy-route'), /Only a Notion home is supported/);
  assert.match(legacy.text('legacy-route'), /Legacy file and vault homes/);
  assert.equal(legacy.get('settings-context-picker') !== null, true);
  const current = await ui(configured(), saved({}));
  assert.equal(current.shown('legacy-route'), false);
});

test('setup accepts only a Notion context; ambiguous instructions cannot be saved', async () => {
  const u = await ui(undefined, undefined, { initial: 'none' }); await u.click('retry-load');
  u.status.notion = { state: 'not_connected' }; await u.click('refresh');
  assert.equal(u.shown('connect'), true);
  assert.equal(u.get('provider'), null, 'no folder or alternative-link toggle');
  await u.click('step-1');
  for (const value of ['/work/my vault', 'https://example.com/context']) {
    const calls = u.calls.length;
    await u.input(value); await u.submit();
    assert.equal(u.calls.length, calls, 'a folder or non-Notion link is not saved');
    assert.match(u.text('feedback-text'), /Notion/);
  }
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
  await u.click('settings'); await u.click('saved-links-toggle'); await u.addLink('settings-memory-picker', 'https://example.com/a-memory');
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
  assert.equal(u.get('settings-context-picker').getAttribute('aria-label'),'Change Client B');
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
  assert.deepEqual(page.filter(node => node.tagName === 'DIALOG').map(node => node.id), ['connection-dialog', 'drawer']);
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
        builtin: [{ name: 'osm-setup', description: 'Set up or resume OSM.' }, { name: 'osm-data-context', description: 'Engineer the Notion home.' }] }
      : { state: s.state, mapping: s.mapping, builtin: [], ...(s.mapping === 'saved' && { definitionRevision: 'fictional-r1',
        selectedMode: s.state === 'official_mode' ? 'official_notion_user' : 'internal_selected_pages' }) });
    if (name === 'osm_home_list') {
      // Like the service, scripted results carry the scope they were read under; null
      // expresses a result without one.
      if (s.listState) return wrap('home-list', { state: s.listState, ...(s.listScope !== null && { scope: s.listScope || s.scope }) });
      if (args.section === 'docs') return wrap('home-list', { state: 'inaccessible', scope: s.scope });
      return wrap('home-list', { state: 'listed', scope: s.scope, items: items()[args.section], hasMore: true, cursor: 'next' });
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

async function nextSourcePage(u, key) {
  const panel = u.get('home-panel');
  const named = text => panel.descendants().find(node => node.tagName === 'BUTTON' && node.textContent.startsWith(text));
  if (u.get('home-page').hidden && named('‹')) { await named('‹').dispatch('click'); await settle(); }
  await u.click('source-' + key); await settle();
  const more = named('Load more from '); assert.ok(more, 'paginated source action');
  await more.dispatch('click'); await settle();
  if (!u.get('home-gate').hidden) return;
  const back = named('‹'); if (back) { await back.dispatch('click'); await settle(); }
}
test('Home previews three titles in stable definition order and opens a named source list', async () => {
  const u = await homeUi();
  assert.equal(u.shown('home-status'), false); assert.equal(u.shown('dashboard'), false);
  const titles = u.nodes().filter(node => node.getAttribute('class') === 'source-head').map(node => node.textContent);
  assert.deepEqual(titles, ['About your business', 'Memory', 'Business Docs', 'Skills']);
  assert.ok(u.panel().includes('Keep meeting decisions')); assert.equal(u.panel().includes('Review the offer'), false);
  await u.press('Open Memory'); assert.ok(u.panel().includes('Review the offer'));
  assert.ok(u.panel().includes('Load more from Memory')); await u.press('‹');
  assert.equal(u.focused(), 'source-memory');
  assert.ok(u.panel().includes('OSM’s connection can’t read Business Docs.'));
  await u.press('Tasks ↗'); assert.deepEqual(u.links, ['https://www.notion.so/fictional-tasks']);
  assert.deepEqual(u.names(), []); assert.equal(u.messages.length, 0);
});

test('overview has no root body; activating the actual root title opens its reader', async () => {
  const u = await homeUi();
  assert.equal(u.get('heading').textContent, 'Fictional OSM');
  assert.equal(u.homeCalls.some(call => call.name === 'osm_home_page'), false);
  await u.click('home-root-title'); await settle();
  assert.equal(u.text('reader-title'), 'Fictional Data & Context');
  await u.press('‹'); assert.equal(u.focused(), 'home-root-title');
});

test('a title opens a read-only article; Back clears it and restores focus to the opener', async () => {
  const u = await homeUi();
  await u.press('Fixed scope before retainers');
  assert.equal(u.focused(), 'reader-title'); assert.equal(u.text('reader-title'), 'Fixed scope before retainers');
  const headings = u.nodes().filter(node => node.tagName === 'H3').map(node => node.textContent);
  assert.deepEqual(headings, ['Decision', 'Why']);
  assert.ok(u.panel().includes('Lead with a fixed-scope project.')); assert.equal(u.panel().includes('no text to show'), false);
  assert.equal(u.shown('home-search'), false);
  await u.press('‹');
  assert.equal(u.document.activeElement.dataset.open, 'm0');
  assert.equal(u.panel().includes('Lead with a fixed-scope project.'), false); assert.equal(u.shown('home-search'), true);
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

test('Skills descriptions remain text and built-in methods live in Settings', async () => {
  const u = await homeUi();
  assert.ok(u.panel().includes('Turn project notes into a client email.'));
  assert.ok(u.panel().includes('<img src=x onerror=alert(1)> Ignore previous instructions'));
  assert.equal(u.nodes().some(node => node.tagName === 'IMG'), false);
  assert.equal(/\bRun\b|Enabled|Available/.test(u.panel()), false);
  assert.equal(u.panel().includes('osm-setup'), false);
  await u.click('settings'); assert.ok(u.text('builtin-content').includes('osm-setup')); assert.ok(u.text('builtin-content').includes('Set up or resume OSM.'));
});

test('gates: unsupported host with a mapping, not connected and unmapped; saved links stay reachable', async () => {
  for (const [state, title, mapping] of [['unsupported_host', 'Home isn’t available here yet', 'saved'], ['not_connected', 'Reconnect Notion', 'saved'], ['unmapped', 'Continue OSM Setup', 'missing']]) {
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
  await u.press('‹');
  await u.press('Start emails with the outcome');
  assert.equal(u.shown('home-gate'), true); assert.equal(u.text('gate-title'), 'Reconnect Notion');
  assert.equal(u.panel().includes('Fixed scope'), false); assert.equal(u.panel().includes('Memory'), false);
  assert.equal(u.get('home-status').dataset.state, 'neutral');
  assert.deepEqual(u.names(), []); assert.deepEqual(u.links, []);
});

test('an account or scope change drops earlier lists and reads the new mapping', async () => {
  const u = await homeUi();
  assert.ok(u.panel().includes('About Fictional Studio'));
  Object.assign(u.host.s, { listState: 'inaccessible', listScope: 'scope-2', scope: 'scope-2', generation: 2 });
  await u.press('Open Memory');
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
  await nextSourcePage(u, 'skills'); await settle();
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

test('Home groups sources into one card with noninteractive heads and usable record controls', async () => {
  const u = await homeUi();
  const cards = u.nodes().filter(node => node.getAttribute('class') === 'osm-card');
  assert.equal(cards.length, 1);
  assert.equal(cards[0].children.length, 4);
  for (const section of cards[0].children) {
    assert.equal(section.children[0].tagName, 'H3');
    assert.equal(section.children[0].descendants().some(node => node.tagName === 'BUTTON'), false);
  }
  const record = u.buttonNamed('Fixed scope before retainers');
  assert.ok(record); record.focus(); await record.dispatch('keydown', { key: 'ArrowDown' });
  assert.equal(u.document.activeElement.dataset.open, 'm1');
  await u.document.activeElement.dispatch('keydown', { key: 'ArrowUp' });
  assert.equal(u.document.activeElement.dataset.open, 'm0');
  await u.document.activeElement.dispatch('click'); await settle();
  assert.equal(u.text('reader-title'), 'Fixed scope before retainers');
});

test('a failed Home check without a mapping keeps the saved links; a supported host without a connection offers the connect gate', async () => {
  const failed = await ui(configured(), homeSources, { home: () => ({ isError: true, content: [{ type: 'text', text: 'Unsupported tool' }] }) });
  await settle();
  assert.equal(failed.shown('dashboard'), true); assert.equal(failed.shown('home'), false); assert.equal(failed.shown('home-status'), false);
  const host = homeHost(); Object.assign(host.s, { state: 'not_connected', mapping: 'missing' });
  const u = await homeUi(host);
  assert.equal(u.shown('home-gate'), true); assert.equal(u.text('gate-title'), 'Reconnect Notion');
  assert.equal(u.text('home-status-label'), 'Notion · Not connected');
});

test('an official-mode projection keeps the saved links with its own note, never a connect or unsupported gate', async () => {
  const host = homeHost(); Object.assign(host.s, { state: 'official_mode', mapping: 'saved' });
  const u = await homeUi(host);
  assert.equal(u.shown('dashboard'), true); assert.equal(u.shown('home'), false); assert.equal(u.shown('home-status'), false);
  assert.equal(u.text('home-note'), 'Home can’t read through your official Notion connection in this view yet. Your saved links below open each source in Notion.');
  assert.equal(u.shown('home-note'), true);
  const page = u.get('dashboard').textContent + u.get('home').textContent;
  assert.equal(/Reconnect Notion|not supported on this host|isn’t available here/.test(u.get('dashboard').textContent), false);
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
  await u.click('saved-links-toggle'); await u.click('show-links'); await settle();
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
  assert.ok(u.panel().includes('OSM’s connection can’t read Business Docs.'));
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
  await u.press('‹');
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
    if (via === 'list') { await nextSourcePage(u, 'skills'); await settle(); } else await u.press('Fixed scope before retainers');
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
  await u.click('saved-links-toggle'); await u.click('show-links'); await settle();
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
  await v.click('saved-links-toggle'); await v.click('show-links'); await settle();
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
  await nextSourcePage(u, 'skills'); await settle();
  assert.equal(statusCalls(), 2); assert.equal(u.panel().includes('Weekly client update'), false);
});

test('links chosen: only a resolved ready status allows icon reads after Refresh (R4-2, I3)', async () => {
  for (const state of ['unavailable', 'rate_limited', 'not_connected', 'unsupported_host', 'root_inaccessible', 'mapping_unavailable']) {
    const host = homeHost();
    const u = await ui(configured(), homeSources, { ...iconOptions, home: host.handler }); await settle();
    await u.click('saved-links-toggle'); await u.click('show-links'); await settle();
    assert.equal(iconCalls(u), 1, `${state}: links chosen, ready`);
    host.s.state = state; // a resolved non-ready status keeps mapping 'saved' and the internal mode
    await u.click('drawer-refresh'); await settle();
    assert.equal(u.shown('dashboard'), true, state); assert.equal(iconCalls(u), 1, `${state}: no icon read`);
  }
  // The revoke() placeholder has the same shape: unavailable with mapping and mode.
  const placeholder = { content: [], _meta: { 'osm/kind': 'home', 'osm/home': { state: 'unavailable', mapping: 'saved', selectedMode: 'internal_selected_pages', builtin: [] } } };
  const host = homeHost(); let placed = false;
  const u = await ui(configured(), homeSources, { ...iconOptions, home: (name, args) => placed && name === 'osm_home' ? placeholder : host.handler(name, args) }); await settle();
  await u.click('saved-links-toggle'); await u.click('show-links'); await settle();
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
  await nextSourcePage(u, 'skills'); await settle();
  assert.equal(status(), 2); assert.ok(u.panel().includes('Weekly client update'));
  host.s.scope = 'scope-3';
  await nextSourcePage(u, 'about'); await settle();
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
  await nextSourcePage(u, 'skills'); await settle();
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
  await nextSourcePage(u, 'skills'); await settle();
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
  await nextSourcePage(u, 'skills'); await settle();
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
    if (leave) { await u.press('‹'); assert.equal(u.shown('home-search'), true); }
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
    await nextSourcePage(u, 'skills'); await settle();
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
  await u.press('‹');
  host.overrides.set('skills', value => { value.scope = 'stale-scope'; });
  await nextSourcePage(u, 'skills'); await settle();
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
  await nextSourcePage(u, 'skills'); await settle();
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

// Sol r8 corrections (run 80).
const priorSources = saved({
  docs: { title: 'Fictional prior handbook', target: 'https://example.com/prior-docs' },
  personalSkills: { title: 'Fictional prior writing skills', target: 'https://example.com/prior-skills' },
  teamSkills: { title: 'Fictional prior team skills', target: 'https://example.com/prior-team-skills' },
  memory: { title: 'Fictional prior decisions', target: 'https://example.com/prior-memory' },
  teamMemory: { title: 'Fictional prior team decisions', target: 'https://example.com/prior-team-memory' },
});
test('a changed account offers no saved links and opens no saved target; the saved bytes stay and return once reconciled (R8-1)', async () => {
  const { createHash } = await import('node:crypto');
  const host = homeHost(); Object.assign(host.s, { state: 'account_changed', mapping: 'saved' });
  const u = await ui(configured(), structuredClone(priorSources), { ...iconOptions, home: host.handler });
  await settle();
  const titles = Object.values(priorSources.links).map(link => link.title);
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const sourcesBefore = hash(u.status.sources), homeBefore = hash(host.s);
  assert.equal(u.shown('home-gate'), true); assert.equal(u.text('gate-title'), 'Continue OSM Setup');
  assert.equal(u.text('gate-copy'), 'This Home was set up for a different Notion connection, so nothing from it is shown. Ask OSM Setup in chat to map it again.');
  assert.equal(u.get('home-status').dataset.state, 'neutral'); assert.equal(u.text('home-status-label').includes('Connected'), false);
  assert.equal(u.shown('gate-action'), false, 'no Show saved links action');
  // Activating every saved-links path anyway reveals and opens nothing.
  for (const id of ['gate-action', 'show-links', 'open-docs', 'open-personalSkills', 'open-teamSkills', 'open-memory', 'open-teamMemory']) { await u.click(id); await settle(); }
  assert.equal(u.shown('dashboard'), false); assert.equal(u.shown('home'), true); assert.equal(u.shown('home-gate'), true);
  for (const title of titles) assert.equal(u.get('home').textContent.includes(title), false, title);
  assert.deepEqual(u.links, []);
  assert.deepEqual(u.homeCalls.map(call => call.name).filter(name => name !== 'osm_home'), []); assert.equal(iconCalls(u), 0);
  assert.deepEqual(u.names(), [], 'no write, status or icon call');
  assert.equal(hash(u.status.sources), sourcesBefore); assert.equal(hash(host.s), homeBefore);
  // Setup saves a reconciled mapping for the current connection; the same saved links return.
  host.s.state = 'ready';
  await u.click('refresh'); await settle();
  assert.equal(u.shown('home'), true); assert.equal(u.shown('home-gate'), false);
  await u.click('saved-links-toggle'); await u.click('show-links'); await settle();
  assert.equal(u.shown('dashboard'), true);
  for (const title of titles) assert.ok(u.get('dashboard').textContent.includes(title), title);
  await u.click('open-docs'); assert.deepEqual(u.links, ['https://example.com/prior-docs']);
  assert.equal(hash(u.status.sources), sourcesBefore, 'the same saved bytes');
});
test('the reader shows only its own request: an older read of the same record never replaces the newer article (R8-2)', async () => {
  const host = homeHost(), held = [];
  let reads = 0;
  const handler = async (name, args) => {
    if (name !== 'osm_home_read') return host.handler(name, args);
    const n = ++reads, entry = deferred(); held.push(entry); await entry.promise;
    const result = host.handler(name, args), value = result._meta['osm/home-record'];
    value.record = { ...value.record, title: n === 1 ? 'Fictional older answer' : 'Fictional newer answer', fields: [{ heading: '', text: `Fictional answer ${n}` }] };
    return result;
  };
  const u = await homeUi({ s: host.s, handler });
  const first = u.buttonNamed('Fixed scope before retainers').dispatch('click'); await settle();
  await u.press('‹');
  const second = u.buttonNamed('Fixed scope before retainers').dispatch('click'); await settle();
  held[1].release(); await second; await settle();
  assert.equal(u.text('reader-title'), 'Fictional newer answer');
  held[0].release(); await first; await settle();
  assert.equal(u.text('reader-title'), 'Fictional newer answer', 'the older answer is ignored');
  assert.ok(u.panel().includes('Fictional answer 2')); assert.equal(u.panel().includes('Fictional answer 1'), false);
});
test('a cut block text shows the partial-content notice in the article (R8-3)', async () => {
  const { readBlocks } = await import('./notion-internal.mjs');
  for (const rich_text of [Array.from({ length: 11 }, (_, n) => ({ type: 'text', plain_text: String(n % 10).repeat(2000) })),
    Array.from({ length: 201 }, () => ({ type: 'text', plain_text: 'x' }))]) {
    const client = { children: async () => ({ results: [{ object: 'block', id: '00000000-0000-0000-0000-000000000320', type: 'paragraph', paragraph: { rich_text }, has_children: false }], has_more: false }) };
    const { blocks, truncated } = await readBlocks(client, '0'.repeat(32));
    const host = homeHost(), base = host.handler;
    const handler = (name, args) => {
      const result = base(name, args);
      if (name === 'osm_home_read') Object.assign(result._meta['osm/home-record'].record, { fields: [], blocks, truncated });
      return result;
    };
    const u = await homeUi({ s: host.s, handler });
    await u.press('Fixed scope before retainers');
    assert.ok(u.panel().includes('The rest of this page is in Notion.'), `${rich_text.length} items`);
  }
});

test('links chosen, then a Refresh into account_changed hides them and reads no icons until reconciled (R8-1, R4-2)', async () => {
  const { createHash } = await import('node:crypto');
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const host = homeHost(), title = 'Fictional prior handbook';
  const u = await ui(configured(), saved({ docs: { title, target: 'https://example.com/prior-docs' } }), { ...iconOptions, home: host.handler }); await settle();
  await u.click('saved-links-toggle'); await u.click('show-links'); await settle();
  assert.equal(u.shown('dashboard'), true); assert.equal(iconCalls(u), 1, 'links chosen, ready');
  const sourcesBefore = hash(u.status.sources), from = u.homeCalls.length;
  host.s.state = 'account_changed'; // a resolved status that keeps mapping 'saved' and the internal mode
  const homeBefore = hash(host.s);
  await u.click('drawer-refresh'); await settle();
  assert.equal(u.shown('dashboard'), false, 'the chosen links are hidden'); assert.equal(u.shown('home-gate'), true);
  assert.equal(u.text('gate-title'), 'Continue OSM Setup'); assert.equal(u.shown('gate-action'), false, 'no Show saved links action');
  assert.equal(u.get('home-status').dataset.state, 'neutral'); assert.equal(u.text('home-status-label').includes('Connected'), false);
  for (const id of ['gate-action', 'show-links', 'open-docs']) { await u.click(id); await settle(); }
  assert.equal(u.shown('dashboard'), false); assert.equal(u.get('home').textContent.includes(title), false); assert.deepEqual(u.links, []);
  assert.equal(iconCalls(u), 1, 'no icon read'); assert.equal(u.names().some(name => name.startsWith('osm_save')), false);
  assert.deepEqual(u.homeCalls.slice(from).map(call => call.name).filter(name => name !== 'osm_home'), []);
  assert.equal(hash(u.status.sources), sourcesBefore); assert.equal(hash(host.s), homeBefore);
  // Setup saves a reconciled mapping for the current connection; the links the user chose return.
  host.s.state = 'ready';
  await u.click('drawer-refresh'); await settle();
  assert.equal(u.shown('dashboard'), true); assert.ok(u.get('dashboard').textContent.includes(title));
  assert.equal(iconCalls(u), 2, 'ready again: the chosen links allow icons');
  await u.click('open-docs'); assert.deepEqual(u.links, ['https://example.com/prior-docs']);
  assert.equal(hash(u.status.sources), sourcesBefore, 'the same saved bytes');
});

// R8-1 P2: saved sources in Settings and setup after an observed account change.
const p2Sources = () => saved({ docs: { title: 'Fictional prior handbook', target: 'https://example.com/prior-docs' },
  memory: { title: 'Fictional prior decisions', target: 'https://example.com/prior-memory' } }, 'Fictional prior studio');
const p2Roles = ['docs', 'personalSkills', 'teamSkills', 'memory', 'teamMemory'];
const p2Hash = async value => (await import('node:crypto')).createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('an open Settings drawer keeps the draft and an unfinished link but shows and saves no saved source after an account change; reconcile restores them (R8-1, P2)', async () => {
  const host = homeHost();
  const u = await ui(configured(), p2Sources(), { home: host.handler }); await settle();
  await u.click('settings');
  await u.addLink('settings-teamMemory-picker', 'https://example.com/fictional-team-memory', 'Fictional pending team memory');
  await u.click('settings-memory-picker');
  assert.ok(u.options('settings-memory-picker').some(node => node.textContent.startsWith('Fictional prior decisions')));
  const stale = u.options('settings-memory-picker').find(node => node.textContent === 'None');
  await u.click('settings-memory-picker');
  await u.choose('settings-teamSkills-picker', 'Paste a link…');
  u.get('settings-teamSkills-picker-link').value = 'https://example.com/fictional-unfinished';
  u.get('settings-teamSkills-picker-name').value = 'Fictional unfinished name';
  assert.ok(u.get('settings-context-picker').getAttribute('aria-label').includes('Fictional OSM')); assert.equal(u.focused(), 'settings-teamSkills-picker-link');
  const before = await p2Hash(u.status.sources);
  host.s.state = 'account_changed';
  await u.click('drawer-refresh'); await settle();
  assert.equal(u.get('drawer').open, true); assert.equal(u.shown('settings'), true); assert.equal(u.get('drawer-refresh').disabled, false);
  for (const role of p2Roles) assert.equal(u.shown(`settings-${role}`), false, `${role} hidden`);
  assert.equal(u.get('settings-context-picker').getAttribute('aria-label').includes('Fictional prior studio'), false); assert.ok(u.get('settings-context-picker').getAttribute('aria-label').includes('Context'));
  assert.equal(u.get('drawer-save').disabled, true); assert.equal(u.focused(), 'drawer-title');
  // Stale handlers change and save nothing.
  await stale.dispatch('click'); await u.click('settings-teamSkills-picker-apply'); await u.click('drawer-save'); await settle();
  assert.equal(u.text('drawer-feedback-text'), 'Saved source links need attention. They have been left unchanged.');
  assert.equal(u.names().some(name => name.startsWith('osm_save')), false); assert.equal(await p2Hash(u.status.sources), before);
  // Setup saves a reconciled mapping for the current connection; the draft and the unfinished link return.
  host.s.state = 'ready';
  await u.click('drawer-refresh'); await settle();
  for (const role of p2Roles) assert.equal(u.shown(`settings-${role}`), true, `${role} shown`);
  assert.ok(u.get('settings-context-picker').getAttribute('aria-label').includes('Fictional OSM'));
  assert.ok(u.text('settings-docs-picker').includes('Fictional prior handbook')); assert.ok(u.text('settings-memory-picker').includes('Fictional prior decisions'));
  assert.ok(u.text('settings-teamMemory-picker').includes('Fictional pending team memory'));
  assert.equal(u.get('settings-teamSkills-picker-link').value, 'https://example.com/fictional-unfinished'); assert.equal(u.get('settings-teamSkills-picker-link').disabled, false);
  assert.equal(u.get('settings-teamSkills-picker-name').value, 'Fictional unfinished name');
  assert.equal(await p2Hash(u.status.sources), before, 'the same saved bytes');
  await u.click('settings-teamSkills-picker-apply'); await u.click('drawer-save'); await settle();
  assert.deepEqual(u.names().filter(name => name.startsWith('osm_save')), ['osm_save_sources']);
  assert.deepEqual(u.calls.at(-1).args.links, { docs: { title: 'Fictional prior handbook', target: 'https://example.com/prior-docs' },
    teamSkills: { title: 'Fictional unfinished name', target: 'https://example.com/fictional-unfinished' },
    memory: { title: 'Fictional prior decisions', target: 'https://example.com/prior-memory' },
    teamMemory: { title: 'Fictional pending team memory', target: 'https://example.com/fictional-team-memory' } });
});
test('Settings opened after an account change shows no saved source and opens no source picker (R8-1, P2)', async () => {
  const host = homeHost(); Object.assign(host.s, { state: 'account_changed', mapping: 'saved' });
  const u = await ui(configured(), p2Sources(), { home: host.handler }); await settle();
  for (const opener of ['settings', 'open-teamMemory']) {
    await u.click(opener); await settle();
    assert.equal(u.get('drawer').open, true, opener); assert.equal(u.focused(), 'drawer-title', opener);
    for (const role of p2Roles) assert.equal(u.shown(`settings-${role}`), false, `${opener}: ${role} hidden`);
    assert.equal(u.get('settings-teamMemory-picker').getAttribute('aria-expanded'), 'false', opener);
    assert.equal(u.get('settings-context-picker').getAttribute('aria-label').includes('Fictional prior studio'), false, opener);
    await u.click('drawer-close'); assert.equal(u.get('drawer').open, false, opener);
  }
  const second = homeHost(); Object.assign(second.s, { state: 'account_changed', mapping: 'saved' });
  const w = await ui(configured(), p2Sources(), { home: second.handler, view: 'settings' }); await settle();
  assert.equal(w.get('drawer').open, true, 'host view');
  for (const role of p2Roles) assert.equal(w.shown(`settings-${role}`), false, `host view: ${role} hidden`);
  assert.equal(w.get('settings-context-picker').getAttribute('aria-label').includes('Fictional prior studio'), false, 'host view');
  for (const view of [u, w]) assert.equal(view.names().some(name => name.startsWith('osm_save')), false);
});
test('onboarding after an account change keeps the draft but shows and saves no saved source until reconciled (R8-1, P2)', async () => {
  const first = homeHost(); Object.assign(first.s, { state: 'account_changed', mapping: 'saved' });
  const w = await ui(undefined, undefined, { home: first.handler, recoveredSources: p2Sources() });
  await w.input(target); await w.submit(); await settle();
  assert.equal(w.text('summary-1'), 'Saved');
  for (const role of p2Roles) assert.equal(w.shown(`setup-${role}`), false, `${role} hidden at once`);
  assert.deepEqual(w.names(), ['osm_save_context']);
  const host = homeHost();
  const u = await ui(undefined, undefined, { home: host.handler, recoveredSources: p2Sources() });
  await u.input(target); await u.submit(); await settle();
  assert.ok(u.text('summary-1').includes('Fictional prior studio'));
  await u.addLink('setup-docs-picker', 'https://example.com/fictional-new-docs', 'Fictional new docs');
  const before = await p2Hash(u.status.sources);
  host.s.state = 'account_changed';
  await u.click('refresh'); await settle();
  for (const role of p2Roles) assert.equal(u.shown(`setup-${role}`), false, `${role} hidden`);
  assert.equal(u.focused(), 'continue-1');
  await u.submit(); await settle();
  assert.equal(u.text('feedback-text'), 'Saved source links need attention. They have been left unchanged.');
  assert.deepEqual(u.names(), ['osm_save_context', 'osm_status']); assert.equal(await p2Hash(u.status.sources), before);
  host.s.state = 'ready';
  await u.click('refresh'); await settle();
  for (const role of p2Roles) assert.equal(u.shown(`setup-${role}`), true, `${role} shown`);
  assert.ok(u.text('setup-docs-picker').includes('Fictional new docs'));
  await u.submit(); await settle();
  assert.deepEqual(u.names().filter(name => name.startsWith('osm_save')), ['osm_save_context', 'osm_save_sources']);
  assert.deepEqual(u.calls.at(-1).args.links, { docs: { title: 'Fictional new docs', target: 'https://example.com/fictional-new-docs' },
    memory: { title: 'Fictional prior decisions', target: 'https://example.com/prior-memory' } });
});

test('onboarding with the Notion page picker after an account change shows the context without its saved name and keeps an unfinished link (R8-1, P2, F-S1)', async () => {
  const pages = async () => ({ pages: [], hasMore: false });
  const first = homeHost(); Object.assign(first.s, { state: 'account_changed', mapping: 'saved' });
  const w = await ui(undefined, undefined, { home: first.handler, pages, recoveredSources: p2Sources() });
  await w.input(target); await w.submit(); await settle();
  assert.equal(w.shown('setup-context'), true, 'the page picker is shown');
  assert.equal(w.text('setup-context-picker').includes('Fictional prior studio'), false, 'no saved name at once');
  assert.equal(w.text('setup-context-picker'), 'Selected page');
  const host = homeHost();
  const u = await ui(undefined, undefined, { home: host.handler, pages, recoveredSources: p2Sources() });
  await u.input(target); await u.submit(); await settle();
  assert.equal(u.text('setup-context-picker'), 'Fictional prior studio', 'shown while ready');
  await u.choose('setup-context-picker', 'Change link…');
  u.get('setup-context-picker-link').value = other;
  host.s.state = 'account_changed';
  await u.click('refresh'); await settle();
  assert.equal(u.text('setup-context-picker'), 'Selected page', 'no saved name after the change');
  for (const role of p2Roles) assert.equal(u.shown(`setup-${role}`), false, `${role} hidden`);
  assert.equal(u.get('setup-context-picker-link').value, other, 'the unfinished link stays');
  assert.equal(u.get('setup-context-picker-link').disabled, false);
  // Setup saves a reconciled mapping for the current connection; the saved name returns.
  host.s.state = 'ready';
  await u.click('refresh'); await settle();
  assert.equal(u.text('setup-context-picker'), 'Fictional prior studio', 'the saved name returns');
  assert.equal(u.get('setup-context-picker-link').value, other, 'the unfinished link is still there');
  for (const view of [u, w]) assert.deepEqual(view.names().filter(name => name.startsWith('osm_save')), ['osm_save_context']);
});

// Sol r9 corrections: how long an account change holds, live context results, placeholder selection.
const r9Page = n => 'https://app.notion.com/p/' + String(n).padStart(32, '0');
const r9Sources = () => saved({ docs: { title: 'Fictional prior handbook', target: r9Page(3) } }, 'Fictional prior studio');
const r9Pages = async () => ({ pages: [{ title: 'Fictional prior studio', target }, { title: 'Fictional prior handbook', target: r9Page(3) },
  { title: 'Fictional other page', target: r9Page(4) }], hasMore: false });
const r9Titles = (u, picker) => u.options(picker).map(node => node.textContent);
const r9Requests = u => u.names().filter(name => name === 'osm_notion_pages').length;
test('an observed account change stays suppressed through failed, pending, mapping-less and transient checks until a ready status (R8-1, R9-1)', async () => {
  for (const mode of ['fail', 'pending', 'fallback', 'unavailable', 'rate_limited']) {
    const host = homeHost(), held = deferred();
    let check = null;
    const handler = async (name, args) => {
      if (name === 'osm_home' && check === 'pending') { await held.promise; throw new Error('Fictional failure'); }
      if (name === 'osm_home' && check === 'fail') throw new Error('Fictional failure');
      if (name === 'osm_home' && check === 'fallback') return fallback;
      return host.handler(name, args);
    };
    const u = await ui(configured(), p2Sources(), { ...iconOptions, home: handler }); await settle();
    await u.click('saved-links-toggle'); await u.click('show-links'); await settle();
    assert.equal(u.shown('dashboard'), true, `${mode}: links chosen`); assert.equal(iconCalls(u), 1, `${mode}: icons while ready`);
    host.s.state = 'account_changed';
    await u.click('drawer-refresh'); await settle();
    assert.equal(u.shown('dashboard'), false, `${mode}: hidden after the change`);
    if (['fail', 'pending', 'fallback'].includes(mode)) check = mode; else host.s.state = mode;
    await u.click('drawer-refresh'); await settle();
    if (mode === 'pending') { assert.equal(u.shown('dashboard'), false, 'pending: hidden while the check is pending'); held.release(); await settle(); }
    assert.equal(u.shown('dashboard'), false, `${mode}: still hidden`);
    assert.equal(u.shown('gate-action'), true, `${mode}: Try again offered`); assert.equal(u.text('gate-action'), 'Try again');
    await u.click('open-docs'); assert.deepEqual(u.links, [], `${mode}: no saved target`);
    await u.click('settings'); await settle();
    for (const role of p2Roles) assert.equal(u.shown(`settings-${role}`), false, `${mode}: ${role} hidden`);
    await u.click('drawer-close');
    assert.equal(iconCalls(u), 1, `${mode}: no icon read`);
    // Setup saves a reconciled mapping for the current connection; the links the user chose return.
    check = null; host.s.state = 'ready';
    await u.click('drawer-refresh'); await settle();
    assert.equal(u.shown('dashboard'), true, `${mode}: the chosen links return`); assert.equal(iconCalls(u), 2, `${mode}: icons once ready`);
    await u.click('open-docs'); assert.deepEqual(u.links, ['https://example.com/prior-docs'], `${mode}: saved target once ready`);
  }
});
test('a list or read that reports an account change suppresses saved links at once, also through a failed recovery check (R8-1, R9-1)', async () => {
  for (const kind of ['list', 'read']) {
    const host = homeHost(); let fail = false;
    const handler = (name, args) => { if (fail && name === 'osm_home') throw new Error('Fictional failure'); return host.handler(name, args); };
    const u = await homeUi({ s: host.s, handler });
    const statusCalls = () => u.homeCalls.filter(call => call.name === 'osm_home').length;
    fail = true;
    if (kind === 'list') { Object.assign(host.s, { listState: 'account_changed', listScope: null }); await nextSourcePage(u, 'skills'); await settle(); }
    else { Object.assign(host.s, { readState: 'account_changed', readScope: null }); await u.press('Fixed scope before retainers'); }
    await u.click('settings'); await settle();
    assert.equal(u.shown('settings-docs'), false, `${kind}: docs field hidden`);
    await u.click('drawer-close');
    await u.click('open-docs'); assert.deepEqual(u.links, [], `${kind}: no saved target`);
    assert.equal(u.shown('home-gate'), true, kind); assert.equal(u.text('gate-action'), 'Try again', kind);
    const before = statusCalls();
    await u.click('gate-action'); await settle();
    assert.equal(statusCalls(), before + 1, `${kind}: Try again rechecks status`); assert.deepEqual(u.links, [], `${kind}: still no saved target`);
    // Setup saves a reconciled mapping for the current connection.
    fail = false; Object.assign(host.s, { listState: null, readState: null, listScope: undefined, readScope: undefined });
    await u.click('gate-action'); await settle();
    await u.click('settings'); await settle();
    assert.equal(u.shown('settings-docs'), true, `${kind}: docs field back once ready`);
    await u.click('drawer-close');
    await u.click('open-docs'); assert.deepEqual(u.links, ['https://example.com/docs'], `${kind}: saved target once ready`);
  }
});
test('an official-mode, missing-projection or disconnected status keeps a held account change until ready; a context change resets it (R8-1, R9-1)', async () => {
  for (const [state, mapping] of [['official_mode', 'saved'], ['unsupported_host', 'missing'], ['not_connected', 'saved']]) {
    const host = homeHost();
    const u = await ui(configured(), p2Sources(), { ...iconOptions, home: host.handler }); await settle();
    await u.click('saved-links-toggle'); await u.click('show-links'); await settle();
    assert.equal(iconCalls(u), 1, `${state}: icons while ready`);
    host.s.state = 'account_changed';
    await u.click('drawer-refresh'); await settle();
    Object.assign(host.s, { state, mapping });
    await u.click('drawer-refresh'); await settle();
    assert.equal(u.shown('dashboard'), false, `${state}: still hidden`); assert.equal(u.shown('home-gate'), true, state);
    assert.equal(u.text('gate-title'), 'Continue OSM Setup', state);
    assert.equal(u.text('gate-copy'), 'This Home was set up for a different Notion connection, so nothing from it is shown. Ask OSM Setup in chat to map it again.', state);
    assert.equal(u.shown('gate-action'), false, `${state}: no action`); assert.equal(u.text('home-status-label'), 'Notion · Different connection', state);
    for (const id of ['gate-action', 'show-links', 'open-docs']) { await u.click(id); await settle(); }
    assert.equal(u.shown('dashboard'), false, state); assert.deepEqual(u.links, [], `${state}: no saved target`);
    await u.click('settings'); await settle();
    for (const role of p2Roles) assert.equal(u.shown(`settings-${role}`), false, `${state}: ${role} hidden`);
    await u.click('drawer-close');
    assert.equal(iconCalls(u), 1, `${state}: no icon read`);
    // Setup saves a reconciled mapping for the current connection; the links the user chose return.
    Object.assign(host.s, { state: 'ready', mapping: 'saved' });
    await u.click('drawer-refresh'); await settle();
    assert.equal(u.shown('dashboard'), true, `${state}: the chosen links return`); assert.equal(iconCalls(u), 2, `${state}: icons once ready`);
    await u.click('open-docs'); assert.deepEqual(u.links, ['https://example.com/prior-docs'], `${state}: saved target once ready`);
  }
  // Onboarding reads no page icon either while the change holds under an official-mode status.
  const third = homeHost();
  const w = await ui(undefined, undefined, { ...iconOptions, home: third.handler, recoveredSources: p2Sources() });
  await w.input(target); await w.submit(); await settle();
  third.s.state = 'account_changed'; await w.click('refresh'); await settle();
  third.s.state = 'official_mode'; await w.click('refresh'); await settle();
  for (const role of p2Roles) assert.equal(w.shown(`setup-${role}`), false, `onboarding: ${role} hidden`);
  assert.equal(iconCalls(w), 0, 'onboarding: no icon read');
  // Control: a context change ends a held change for the new context.
  const fourth = homeHost(); let fail = false;
  const handler = (name, args) => { if (fail && name === 'osm_home') throw new Error('Fictional failure'); return fourth.handler(name, args); };
  const v = await ui(configured(), p2Sources(), { home: handler }); await settle();
  fourth.s.state = 'account_changed';
  await v.click('drawer-refresh'); await settle();
  fail = true; await v.click('drawer-refresh'); await settle();
  await v.click('settings'); await settle();
  assert.equal(v.shown('settings-docs'), false, 'held for this context');
  fail = false; Object.assign(fourth.s, { state: 'unmapped', mapping: 'missing' });
  await v.choose('settings-context-picker', 'Switch context…');
  v.get('settings-context-picker-link').value = other;
  await v.click('settings-context-picker-apply'); await settle();
  assert.equal(v.get('drawer').open, true);
  for (const role of p2Roles) assert.equal(v.shown(`settings-${role}`), true, `${role} shown for the new context`);
});
test('while an account change holds, the context lists never show a saved page, also when searched (R8-1, R9-2)', async () => {
  const first = homeHost(); Object.assign(first.s, { state: 'account_changed', mapping: 'saved' });
  const w = await ui(undefined, undefined, { home: first.handler, pages: r9Pages, recoveredSources: r9Sources() });
  await w.input(target); await w.submit(); await settle();
  await w.click('setup-context-picker'); await settle();
  assert.equal(r9Titles(w, 'setup-context-picker').some(text => text.includes('Fictional prior')), false, 'setup: no saved page listed');
  assert.ok(r9Titles(w, 'setup-context-picker').some(text => text.startsWith('Fictional other page')), 'setup: other live pages stay');
  const host = homeHost(); Object.assign(host.s, { state: 'account_changed', mapping: 'saved' });
  const u = await ui(configured(), r9Sources(), { home: host.handler, pages: r9Pages }); await settle();
  await u.click('settings'); await u.click('settings-context-picker'); await settle();
  assert.equal(r9Titles(u, 'settings-context-picker').some(text => text.includes('Fictional prior')), false, 'settings: no saved page listed');
  const search = u.get('settings-context-picker-search'); search.value = 'Fictional prior'; await search.dispatch('input');
  await new Promise(resolve => setTimeout(resolve, 320)); await settle();
  assert.equal(r9Titles(u, 'settings-context-picker').some(text => text.includes('Fictional prior')), false, 'settings search: no saved page listed');
  assert.ok(r9Titles(u, 'settings-context-picker').some(text => text.startsWith('Fictional other page')), 'settings search: other live pages stay');
});
test('a context list open when the change arrives keeps its search and leaves saved pages out at once, with no new page request (R8-1, R9-2)', async () => {
  const host = homeHost();
  const u = await ui(configured(), r9Sources(), { home: host.handler, pages: r9Pages }); await settle();
  await u.click('settings'); await u.click('settings-context-picker'); await settle();
  assert.ok(r9Titles(u, 'settings-context-picker').some(text => text.startsWith('Fictional OSM')), 'ready: the verified context is named');
  const search = u.get('settings-context-picker-search'); search.value = 'Fictional'; await search.dispatch('input');
  await new Promise(resolve => setTimeout(resolve, 320)); await settle();
  assert.ok(r9Titles(u, 'settings-context-picker').some(text => text.startsWith('Fictional prior handbook')), 'ready: saved pages are listed');
  const requests = r9Requests(u);
  // A list reports the change while the context list is open.
  Object.assign(host.s, { state: 'account_changed', listState: 'account_changed', listScope: null });
  await nextSourcePage(u, 'skills'); await settle();
  assert.equal(u.get('settings-context-picker').getAttribute('aria-expanded'), 'true', 'the open list stays open');
  assert.equal(search.value, 'Fictional', 'the typed search is kept');
  assert.equal(r9Titles(u, 'settings-context-picker').some(text => text.includes('Fictional prior')), false, 'no saved page listed at once');
  assert.ok(r9Titles(u, 'settings-context-picker').some(text => text.startsWith('Fictional other page')), 'other live pages stay');
  assert.equal(r9Requests(u), requests, 'no new page request');
  // Refresh keeps its existing behaviour: it closes the list, and the next open starts without the search.
  Object.assign(host.s, { state: 'ready', listState: null, listScope: undefined });
  await u.click('drawer-refresh'); await settle();
  assert.equal(u.get('settings-context-picker').getAttribute('aria-expanded'), 'false', 'Refresh closes the list, as before');
  await u.click('settings-context-picker'); await settle();
  assert.equal(search.value, '', 'the next open starts without the search, as before');
  assert.ok(r9Titles(u, 'settings-context-picker').some(text => text.startsWith('Fictional prior handbook')), 'saved pages listed again once ready');
});
test('a context switch confirmation that names a saved page keeps the choice but hides its question while the change holds (R8-1, R9-2)', async () => {
  const host = homeHost();
  const u = await ui(configured(), r9Sources(), { home: host.handler, pages: r9Pages }); await settle();
  await u.click('settings'); await u.click('settings-context-picker'); await settle();
  await u.options('settings-context-picker').find(node => node.textContent.startsWith('Fictional prior handbook')).dispatch('click');
  const question = () => u.get('settings-context').descendants().find(node => node.tagName === 'P' && node.textContent === 'Switch to Fictional prior handbook?');
  assert.equal(question()?.hidden, false, 'ready: the question names the page');
  Object.assign(host.s, { state: 'account_changed', listState: 'account_changed', listScope: null });
  await nextSourcePage(u, 'skills'); await settle();
  assert.equal(question()?.hidden, true, 'the question is hidden while the change holds');
  // Setup saves a reconciled mapping for the current connection; the question returns and the kept choice applies.
  Object.assign(host.s, { state: 'ready', listState: null, listScope: undefined });
  await u.click('drawer-refresh'); await settle();
  assert.equal(question()?.hidden, false, 'the question returns once ready');
  await u.click('settings-context-picker-apply'); await settle();
  assert.equal(u.calls.find(call => call.name === 'osm_save_context')?.args.target, r9Page(3), 'the kept choice switches the context');
  assert.equal(u.calls.at(-1).name, 'osm_save_sources'); assert.equal(u.calls.at(-1).args.title, 'Fictional prior handbook');
});
test('choosing the placeholder of a pending page selection keeps its title through the account change (R8-1, R9-3)', async () => {
  let listed = [{ title: 'Fictional studio A', target }, { title: 'Fictional page B', target: other }];
  const host = homeHost();
  const u = await ui(undefined, undefined, { home: host.handler, pages: async () => ({ pages: listed, hasMore: false }) });
  await u.input(target); await u.submit(); await settle();
  await u.click('setup-context-picker'); await settle();
  await u.options('setup-context-picker').find(node => node.textContent.startsWith('Fictional page B')).dispatch('click');
  assert.equal(u.text('setup-context-picker'), 'Fictional page B', 'the pending selection');
  host.s.state = 'account_changed';
  await u.click('refresh'); await settle();
  assert.equal(u.text('setup-context-picker'), 'Selected page', 'masked while the change holds');
  listed = [];
  await u.click('setup-context-picker'); await settle();
  await u.options('setup-context-picker').find(node => node.textContent.startsWith('Selected page')).dispatch('click');
  host.s.state = 'ready';
  await u.click('refresh'); await settle();
  assert.equal(u.text('setup-context-picker'), 'Fictional page B', 'the selection keeps its title');
  await u.submit(); await settle();
  assert.equal(u.calls.at(-1).name, 'osm_save_sources'); assert.equal(u.calls.at(-1).args.title, 'Fictional page B');
});

// L-2: Home applies a status only to the context it was read for.
const l2Host = () => {
  const host = homeHost(), route = { target };
  const handler = async (name, args) => {
    const result = await host.handler(name, args);
    if (name === 'osm_home') result._meta['osm/home'] = { ...result._meta['osm/home'], context: route.target };
    return result;
  };
  return { s: host.s, handler, route };
};
test('a status read for another context never ends a held account change; one for this context does (R8-1, L2-1)', async () => {
  const host = l2Host();
  const u = await ui(configured(), p2Sources(), { home: host.handler }); await settle();
  host.s.state = 'account_changed';
  await u.click('drawer-refresh'); await settle();
  host.s.state = 'unavailable';
  await u.click('drawer-refresh'); await settle();
  assert.equal(u.text('gate-action'), 'Try again', 'held, with Try again');
  // The route changes outside this panel, to a context whose Home is ready for the current connection.
  host.s.state = 'ready'; host.route.target = other;
  await u.click('gate-action'); await settle();
  assert.equal(u.shown('home-gate'), true, 'another context: still held');
  assert.equal(u.shown('gate-action'), true); assert.equal(u.text('gate-action'), 'Try again');
  await u.click('open-docs'); assert.deepEqual(u.links, [], 'another context: no saved target');
  await u.click('settings'); await settle();
  for (const role of p2Roles) assert.equal(u.shown(`settings-${role}`), false, `another context: ${role} hidden`);
  await u.click('drawer-close');
  // The route names this context again, and its Home is ready for the current connection.
  host.route.target = target;
  await u.click('gate-action'); await settle();
  assert.equal(u.shown('home-gate'), false, 'this context: the hold ends');
  await u.click('open-docs'); assert.deepEqual(u.links, ['https://example.com/prior-docs'], 'this context: saved target');
});
test('a recovery status read for another context is not applied, so its sections never show (R8-1, L2-2)', async () => {
  const host = l2Host();
  const u = await homeUi({ s: host.s, handler: host.handler });
  assert.ok(u.panel().includes('About your business'), 'this context is shown');
  // The route changes outside this panel; a section answer without a scope starts the recovery.
  Object.assign(host.s, { generation: 2, listState: 'unavailable', listScope: null }); host.route.target = other;
  await nextSourcePage(u, 'skills'); await settle();
  assert.equal(u.get('home').textContent.includes('Company handbook'), false, 'no other-context section');
  assert.equal(u.shown('home-gate'), true); assert.equal(u.text('gate-title'), 'Notion could not be read');
  assert.equal(u.text('gate-action'), 'Try again');
  // Refresh reads this panel's context again.
  Object.assign(host.s, { generation: 1, listState: null, listScope: undefined }); host.route.target = target;
  await u.click('drawer-refresh'); await settle();
  await nextSourcePage(u, 'about'); await settle();
  assert.equal(u.shown('home-gate'), false); assert.ok(u.panel().includes('About your business'), 'this context again');
  assert.equal(u.get('home').textContent.includes('Company handbook'), false, 'still no other-context section');
});


test('agent setup sends one fixed instruction and reports rejection without saving setup', async () => {
  for (const outcome of ['success', 'rejected', 'unsupported']) {
    const u = await ui(undefined, undefined, { sendMessage: async () => {
      if (outcome === 'unsupported') throw new Error('untrusted error');
      return outcome === 'rejected' ? { isError: true } : {};
    } });
    assert.equal(u.messages.length, 0, 'no model turn on open');
    await u.click('agent-setup');
    assert.equal(u.messages.length, 1);
    assert.equal(u.messages[0].role, 'user');
    assert.match(u.messages[0].content[0].text, /osm_connection/);
    assert.equal(u.calls.length, 0, 'handoff cannot save navigation or grant access');
    assert.match(u.text('feedback-text'), outcome === 'success' ? /Continue in chat/ : /could not start the chat/);
    assert.equal(u.text('feedback-text').includes('untrusted error'), false);
  }
});


test('human connection guide checks OSM explicitly and cancels without changing setup', async () => {
  const u = await ui();
  await u.click('connect-osm');
  assert.equal(u.get('connection-dialog').open, true);
  assert.equal(u.calls.length, 0, 'opening guide does not read credentials or start a model');
  await u.click('connection-check');
  assert.deepEqual(u.names(), ['osm_connection']);
  assert.match(u.text('connection-state'), /could not be checked/);
  await u.click('connection-close');
  assert.equal(u.get('connection-dialog').open, false);
  assert.equal(u.messages.length, 0);
  assert.equal(u.status.context.state, 'missing');
});


test('overview requests mapped title lists without fetching root blocks', async () => {
  const u = await homeUi();
  assert.equal(u.homeCalls.filter(call => call.name === 'osm_home_list').length, 4);
  assert.equal(u.get('heading').textContent, 'Fictional OSM');
  assert.equal(u.messages.length, 0);
});

const enterHomeSearch = async (u, query) => { const input = u.get('home-search'); input.value = query; await input.dispatch('input'); await new Promise(resolve => setTimeout(resolve, 320)); await settle(); };
function searchableHost() {
  const base = homeHost();
  return { ...base, handler: (name, args) => {
    if (name === 'osm_home_search') {
      const value = base.handler('osm_home_list', args)._meta['osm/home-list'];
      return { _meta: { 'osm/home-list': { ...value, items: value.items?.filter(item => item.title.toLowerCase().includes(args.query.trim().toLowerCase())).slice(0, 5) } } };
    }
    if (name === 'osm_home_locate') return { _meta: { 'osm/home-location': { state: 'outside', scope: base.s.scope } } };
    return base.handler(name, args);
  } };
}
test('search restores its query and opener on Back, names failures and clears on Esc', async () => {
  const u = await homeUi(searchableHost());
  await enterHomeSearch(u, 'scope');
  assert.ok(u.panel().includes('Fixed scope before retainers')); assert.ok(u.panel().includes('Business Docs couldn’t be searched right now'));
  await u.press('Fixed scope before retainers'); await u.press('‹');
  assert.equal(u.get('home-search').value, 'scope'); assert.equal(u.document.activeElement.dataset.open, 'm0');
  await enterHomeSearch(u, 'unmatched'); assert.equal(u.panel().includes('No titles in this home match'), false, 'a denied source prevents a global no-match claim');
  await u.key('home-search', 'Escape'); assert.equal(u.get('home-search').value, ''); assert.ok(u.panel().includes('Weekly client update'));
  assert.equal(u.names().some(name => name === 'osm_notion_pages'), false); assert.equal(u.messages.length, 0);
});
test('pasted outside link never opens a reader or discloses metadata', async () => {
  const u = await homeUi(searchableHost()); await enterHomeSearch(u, other);
  assert.ok(u.panel().includes('This page isn’t part of your Data & Context home'));
  assert.equal(u.homeCalls.some(call => call.name === 'osm_home_read'), false); assert.equal(u.names().length, 0);
});
test('Copy link announces success or selects an honest manual URL fallback', async () => {
  for (const refused of [false, true]) {
    const copied = [], base = homeHost();
    const u = await ui(configured(), homeSources, { home: base.handler, writeText: async value => { if (refused) throw new Error('Denied'); copied.push(value); } }); await settle();
    const buttons = () => u.get('home-panel').descendants().filter(node => node.tagName === 'BUTTON');
    await buttons().find(node => node.textContent.startsWith('Fixed scope before retainers')).dispatch('click'); await settle();
    await buttons().find(node => node.textContent === 'Copy link').dispatch('click');
    if (refused) { const input = u.document.activeElement; assert.equal(input.value, 'https://www.notion.so/fictional-m0'); assert.equal(input.selectionEnd, input.value.length); assert.equal(u.text('home-panel').includes('Link copied'), false); }
    else { assert.deepEqual(copied, ['https://www.notion.so/fictional-m0']); assert.ok(u.text('home-panel').includes('Link copied')); }
  }
});
test('visibility refresh is event-driven, throttled to 30 seconds, and keeps old content while checking', async () => {
  const host = pendingHomeHost(), u = await homeUi(host), count = () => u.homeCalls.filter(call => call.name === 'osm_home').length;
  const visibility = async state => { u.document.visibilityState = state; await u.get('home').dispatch('visibilitychange'); await settle(); };
  assert.equal(count(), 1); await visibility('visible'); assert.equal(count(), 1);
  host.hold(); await visibility('hidden'); await visibility('visible'); assert.equal(count(), 2);
  assert.ok(u.panel().includes('Fixed scope before retainers')); assert.equal(u.shown('home-checking'), true);
  host.release(); await settle(); await visibility('hidden'); await visibility('visible'); assert.equal(count(), 2);
  u.advance(30000); await visibility('hidden'); await visibility('visible'); assert.equal(count(), 3);
  await settle(); assert.equal(count(), 3);
});
test('compact and wide preview three rows and Open Memory reveals all four even without a cursor', async () => {
  for (const wide of [false, true]) {
    const base = homeHost();
    const handler = (name, args) => { const result = base.handler(name, args); if (name === 'osm_home_list') result._meta['osm/home-list'].hasMore = false; return result; };
    const u = await ui(configured(), homeSources, { home: handler, wide }); await settle();
    const panel = () => u.get('home-panel').textContent;
    assert.ok(panel().includes('Keep meeting decisions')); assert.equal(panel().includes('Review the offer'), false);
    const before = u.homeCalls.length;
    assert.ok(u.get('source-about'), 'listed two-row source still has Open');
    assert.equal(u.get('source-docs'), null, 'denied source has no Open');
    await u.click('source-memory'); await settle();
    assert.ok(panel().includes('Review the offer')); assert.equal(panel().includes('Load more from Memory'), false);
    assert.equal(u.homeCalls.length, before, 'opening a source uses its existing verified list');
    const back = u.get('home-panel').descendants().find(node => node.tagName === 'BUTTON' && node.textContent === '‹');
    await back.dispatch('click'); await settle(); assert.equal(u.focused(), 'source-memory');
  }
});

test('in-flight title searches coalesce to the newest query and stale text never replaces it', async () => {
  const base = searchableHost(), held = deferred(); let waiting = true;
  const handler = async (name, args) => { if (name === 'osm_home_search' && waiting) await held.promise; return base.handler(name, args); };
  const u = await homeUi({ s: base.s, handler });
  await enterHomeSearch(u, 'scope'); await enterHomeSearch(u, 'Weekly');
  assert.equal(u.homeCalls.filter(call => call.name === 'osm_home_search').length, 4, 'one batch in flight');
  waiting = false; held.release(); await settle();
  const calls = u.homeCalls.filter(call => call.name === 'osm_home_search');
  assert.deepEqual(calls.map(call => call.args.query), ['scope', 'scope', 'scope', 'scope', 'Weekly', 'Weekly', 'Weekly', 'Weekly']);
  assert.equal(u.panel().includes('Fixed scope before retainers'), false); assert.ok(u.panel().includes('Weekly client update'));
  assert.equal(u.names().length, 0);
});

test('a denied search-only record invalidates its title without another connector', async () => {
  const base = homeHost();
  const handler = (name, args) => name === 'osm_home_search'
    ? { _meta: { 'osm/home-list': { state: 'listed', scope: base.s.scope, items: [{ id: 'search-only', title: 'Previously readable sample title' }] } } }
    : base.handler(name, args);
  const u = await homeUi({ s: base.s, handler }); await enterHomeSearch(u, 'Previously');
  Object.assign(base.s, { readState: 'inaccessible', listState: 'inaccessible' });
  await u.press('Previously readable sample title');
  assert.equal(u.panel().includes('Previously readable sample title'), false);
  assert.equal(u.homeCalls.filter(call => call.name === 'osm_home').length, 2);
  assert.equal(u.names().length, 0); assert.equal(u.messages.length, 0);
});

test('reader replaces overview chrome and root breadcrumb clears a search-origin query', async () => {
  const u = await homeUi(searchableHost());
  const query = '  scope  ';
  await enterHomeSearch(u, query); await u.press('Fixed scope before retainers');
  assert.equal(u.shown('page-header'), false);
  assert.equal(u.buttonNamed('‹').getAttribute('aria-label'), 'Back to search results');
  assert.ok(u.buttonNamed('Open in Notion ↗'));
  const bar = u.nodes().find(node => node.getAttribute('class') === 'reader-bar');
  assert.ok(bar); assert.equal(bar.children[0].children[0].textContent, '‹');
  await u.press('‹'); assert.equal(u.get('home-search').value, query);
  assert.equal(u.document.activeElement.dataset.open, 'm0'); assert.equal(u.shown('page-header'), true);
  await u.press('Fixed scope before retainers'); await u.press('Fictional OSM');
  assert.equal(u.get('home-search').value, ''); assert.equal(u.shown('home-search'), true);
  assert.equal(u.shown('home-page'), true); assert.ok(u.panel().includes('Weekly client update'));
  assert.equal(u.panel().includes('Copy link'), false);
});

test('connected Settings shows verified home value, minute check time and only the navigation row for Saved links', async () => {
  const base = homeHost();
  const u = await homeUi({ ...base, handler: (name, args) => {
    const result = base.handler(name, args);
    if (name === 'osm_home') Object.assign(result._meta['osm/home'], { workspaceName: 'Sample workspace', root: { title: 'Verified sample home', icon: '📚', link: target } });
    return result;
  } });
  await u.click('settings');
  assert.equal(u.text('osm-workspace'), 'Connected · Sample workspace');
  assert.equal(u.get('osm-workspace').dataset.state, 'connected');
  assert.match(u.text('osm-checked'), /^Checked at \d{2}:\d{2} when Home opened$/);
  for (const id of ['settings-connection', 'connection-provisioning', 'organisation-copy', 'saved-links', 'settings-footer']) assert.equal(u.shown(id), false, id);
  for (const id of ['manage-access', 'home-recheck', 'settings-main']) assert.equal(u.shown(id), true, id);
  assert.equal(u.get('settings-context-picker').children[0].children[1].textContent, 'Verified sample home');
  assert.equal(u.text('settings-context-picker'), '📚Verified sample home');
  assert.match(u.text('home-definition'), /^Definition revision fictional-r1 routes Home to 4 sources\. It routes; access comes from OSM’s connection\.$/);
});

test('Saved links is a separate view with five clear labels; Back, Escape, Cancel and Save preserve draft rules', async () => {
  const u = await ui(configured(), saved({}));
  await u.click('settings'); await u.click('saved-links-toggle');
  assert.equal(u.shown('settings-main'), false); assert.equal(u.text('drawer-title'), 'Saved links');
  assert.equal(u.shown('settings-back'), true); assert.equal(u.shown('settings-footer'), true);
  const labels = ['docs', 'personalSkills', 'teamSkills', 'memory', 'teamMemory'].map(role => u.get(`settings-${role}`).children[0].children[0].textContent);
  assert.deepEqual(labels, ['DocsOptional', 'Personal skillsOptional', 'Team skillsOptional', 'MemoryOptional', 'Team memoryOptional']);
  await u.click('settings-back'); assert.equal(u.shown('settings-footer'), false); assert.equal(u.focused(), 'saved-links-toggle');
  await u.click('saved-links-toggle'); await u.addLink('settings-memory-picker', 'https://example.com/sample-memory');
  await u.click('settings-back'); assert.equal(u.shown('foot-discard'), true); assert.equal(u.get('drawer').open, true);
  await u.click('keep-editing'); assert.equal(u.shown('saved-links'), true);
  await u.key('drawer', 'Escape'); assert.equal(u.shown('foot-discard'), true);
  await u.key('drawer', 'Escape'); assert.equal(u.shown('foot-edit'), true);
  await u.click('drawer-cancel'); assert.equal(u.shown('foot-discard'), true);
  await u.click('keep-editing'); await u.click('settings-back'); await u.click('discard');
  assert.equal(u.shown('settings-main'), true); assert.equal(u.get('drawer').open, true); assert.equal(u.calls.length, 0);
  await u.click('saved-links-toggle'); assert.equal(u.text('settings-memory-picker'), 'None');
  await u.addLink('settings-memory-picker', 'https://example.com/sample-memory'); await u.click('drawer-save');
  assert.equal(u.get('drawer').open, false); assert.deepEqual(u.names(), ['osm_save_sources']);
});

test('root-denied gate uses neutral copy and selected URL, never unverified returned root metadata', async () => {
  const base = homeHost(); base.s.state = 'root_inaccessible';
  const u = await homeUi({ ...base, handler: (name, args) => {
    const result = base.handler(name, args);
    if (name === 'osm_home') result._meta['osm/home'].root = { title: 'Unverified hidden title', link: other };
    return result;
  } });
  assert.equal(u.text('gate-title'), 'Your home page can’t be read');
  assert.equal(u.text('gate-copy'), 'OSM’s connection can’t read your home. In Notion, open the page’s ••• menu → Connections and add OSM.');
  assert.equal(u.shown('gate-connect'), false); assert.equal(u.shown('gate-notion'), true);
  assert.equal(u.text('gate-action'), 'Check again'); assert.equal(u.text('gate-setup'), 'Get help from your agent');
  assert.equal(u.text('home-definition').includes('Unverified'), false); assert.equal(u.panel(), '');
  await u.click('gate-notion'); assert.deepEqual(u.links, [target]);
  assert.equal(u.homeCalls.some(call => call.name !== 'osm_home'), false);
});

test('not-connected Settings keeps honest provisioning and Connect Notion outside the connected state', async () => {
  const base = homeHost(); base.s.state = 'not_connected';
  const u = await homeUi(base); await u.click('settings');
  assert.equal(u.text('settings-connection'), 'Connect Notion');
  assert.equal(u.shown('settings-connection'), true); assert.equal(u.shown('connection-provisioning'), true);
  assert.equal(u.shown('osm-checked'), false); assert.equal(u.shown('manage-access'), false);
  await u.click('settings-connection'); assert.equal(u.get('connection-dialog').open, true); assert.equal(u.messages.length, 0);
});

test('global no-match requires every searchable source to finish completely and successfully', async () => {
  for (const failure of [null, 'unavailable', 'inaccessible', 'partial']) {
    const base = homeHost();
    const u = await homeUi({ ...base, handler: (name, args) => name === 'osm_home_search'
      ? { _meta: { 'osm/home-list': { state: args.section === 'memory' && failure && failure !== 'partial' ? failure : 'empty', scope: base.s.scope, items: [], partial: args.section === 'memory' && failure === 'partial' } } }
      : base.handler(name, args) });
    await enterHomeSearch(u, 'unmatched');
    assert.equal(u.panel().includes('No titles in this home match “unmatched”.'), failure === null, String(failure));
    if (failure === 'unavailable') assert.ok(u.panel().includes('Memory couldn’t be searched right now'));
    if (failure === 'partial') assert.ok(u.panel().includes('Memory couldn’t be searched completely'));
    if (failure === 'inaccessible') assert.equal(u.homeCalls.filter(call => call.name === 'osm_home').length, 2, 'denial of a previously listed source invalidates Home and rechecks once');
  }
});

// Bounded final repairs: accepted F1–F3, LINK-BACK and INCOMPLETE-SEARCH.
function locatedHost({ state = 'read', held, id = 'located-only', resultScope, locateKey = 'memory' } = {}) {
  const base = homeHost(); let attempts = 0;
  return { ...base, get attempts() { return attempts; }, handler: async (name, args) => {
    if (name === 'osm_home_locate') return { _meta: { 'osm/home-location': { state: 'located', scope: base.s.scope, key: locateKey, id, title: 'Unverified locate title', icon: '🚫' } } };
    if (name === 'osm_home_read') {
      ++attempts;
      if (held) await held.promise;
      return { _meta: { 'osm/home-record': { state: base.s.readState || state, scope: resultScope === undefined ? base.s.scope : resultScope,
        record: { title: 'Verified located sample', icon: '📗', fields: [{ heading: 'Private field', text: 'Ephemeral field content' }], blocks: [{ kind: 'text', text: 'Ephemeral body content' }], meta: 'Ephemeral meta content', link: other } } } };
    }
    const result = base.handler(name, args);
    if (name === 'osm_home_list' && args.section === 'memory') result._meta['osm/home-list'].source = { title: 'Verified source', icon: '📚' };
    return result;
  } };
}
const linkQuery = '  https://www.notion.so/00000000000000000000000000000003  ';
const searchRows = u => u.nodes().filter(node => node.getAttribute('role') === 'option');

test('located-link Back restores one verified Q01 row, original URL and focus; crumbs preserve search history', async () => {
  const host = locatedHost(), u = await homeUi(host);
  await enterHomeSearch(u, linkQuery);
  assert.ok(u.panel().includes('Ephemeral body content'));
  assert.ok(u.panel().includes('Fictional OSMVerified sourceVerified located sample'));
  assert.equal(u.panel().includes('Unverified locate title'), false);
  await u.press('‹');
  assert.equal(u.get('home-search').value, linkQuery);
  assert.equal(searchRows(u).length, 1); assert.equal(searchRows(u)[0].textContent, '📗Verified located sample');
  assert.equal(u.document.activeElement, searchRows(u)[0]);
  assert.ok(u.panel().includes('📚Verified source'));
  assert.doesNotMatch(u.panel(), /Searching|Ephemeral|Private field|Copy link|Open in Notion/);
  assert.equal(host.attempts, 1); assert.equal(u.homeCalls.filter(call => call.name === 'osm_home_locate').length, 1);
  await u.press('📗Verified located sample'); assert.equal(host.attempts, 2);
  await u.press('Verified source');
  assert.equal(u.shown('page-header'), false);
  assert.equal(u.buttonNamed('‹').getAttribute('aria-label'), 'Back to search results');
  assert.ok(u.nodes().some(node => node.getAttribute('class') === 'reader-leading'));
  await u.press('‹'); assert.equal(u.get('home-search').value, linkQuery); assert.equal(u.document.activeElement, searchRows(u)[0]);
  assert.equal(host.attempts, 2);
  await u.press('📗Verified located sample'); await u.press('Fictional OSM');
  assert.equal(u.get('home-search').value, ''); assert.equal(searchRows(u).length, 0);
  assert.equal(u.shown('page-header'), true);
});

test('source list reuses the reader bar with a named Home back action and inline title icon gap', async () => {
  const u = await homeUi(locatedHost()); await u.press('Open Verified source');
  const bar = u.nodes().find(node => node.getAttribute('class') === 'reader-bar');
  assert.equal(bar.children[0].getAttribute('class'), 'reader-leading');
  assert.equal(bar.children[0].children[0].getAttribute('aria-label'), 'Back to Home');
  assert.equal(u.shown('page-header'), false);
  const title = u.get('home-panel').children.find(node => node.tagName === 'H2');
  assert.equal(title.getAttribute('class'), 'source-title-h');
  assert.equal(title.children[0].className, 'source-icon');
  assert.equal(title.children[1].textContent, 'Verified source');
  await u.press('‹'); assert.equal(u.shown('page-header'), true);
});

test('pending located read settles after Back without reopening; failures expose only approved recovery', async () => {
  for (const state of ['read', 'inaccessible', 'unsupported', 'unavailable', 'rate_limited']) {
    const held = deferred(), host = locatedHost({ state, held }), u = await homeUi(host);
    await enterHomeSearch(u, linkQuery); await u.press('‹');
    assert.ok(u.panel().includes('Searching…'), state); assert.equal(u.focused(), 'home-search');
    held.release(); await settle();
    assert.equal(u.panel().includes('Searching…'), false, state);
    assert.equal(u.panel().includes('Unverified locate title'), false);
    assert.doesNotMatch(u.panel(), /Ephemeral|Private field/);
    if (state === 'read') {
      assert.equal(searchRows(u).length, 1); assert.equal(u.document.activeElement, searchRows(u)[0]);
    } else {
      assert.equal(searchRows(u).length, 0); assert.equal(u.focused(), 'home-search');
      assert.equal(u.panel().includes('Verified located sample'), false);
      if (['inaccessible', 'unsupported'].includes(state)) {
        assert.ok(u.panel().includes('OSM can’t open this page here')); await u.press('Open in Notion'); assert.deepEqual(u.links, [linkQuery.trim()]);
      } else {
        assert.ok(u.panel().includes('Verified source couldn’t be searched right now'));
        await u.press('Try again');
        assert.equal(u.homeCalls.filter(call => call.name === 'osm_home_locate').length, 2, 'retry explicitly locates again');
      }
    }
    assert.equal(host.attempts, ['unavailable', 'rate_limited'].includes(state) ? 2 : 1);
  }
});

test('located-link failures after reader Back do not remain Searching or leak response metadata', async () => {
  for (const state of ['unsupported', 'unavailable', 'rate_limited', 'inaccessible']) {
    const u = await homeUi(locatedHost({ state })); await enterHomeSearch(u, linkQuery); await u.press('‹');
    assert.doesNotMatch(u.panel(), /Searching|Ephemeral|Verified located sample|Unverified locate/);
    assert.equal(searchRows(u).length, 0);
    assert.ok(u.panel().includes(['unsupported', 'inaccessible'].includes(state) ? 'OSM can’t open this page here' : 'couldn’t be searched right now'));
  }
});

test('located rows clear on edit, Esc and explicit recheck; pending old answers cannot restore them', async () => {
  for (const event of ['edit', 'escape', 'recheck', 'context']) {
    const held = deferred(), u = await homeUi(locatedHost({ held }));
    await enterHomeSearch(u, linkQuery); await u.press('‹');
    if (event === 'edit') { u.get('home-search').value = 'new query'; await u.get('home-search').dispatch('input'); }
    if (event === 'escape') await u.key('home-search', 'Escape');
    if (event === 'recheck') await u.click('home-recheck');
    if (event === 'context') u.notify({ _meta: { 'osm/status': { ...plain(u.status), context: { state: 'configured', target: other, kind: 'notion', revision: 'e'.repeat(64) }, checkedAt: new Date(999999).toISOString() } } });
    await settle(); held.release(); await settle();
    assert.doesNotMatch(u.panel(), /Verified located sample|Ephemeral|Unverified locate/);
    assert.equal(u.get('home-search').value, event === 'edit' ? 'new query' : '', event);
    if (event === 'edit') { await u.key('home-search', 'Escape'); }
    assert.equal(searchRows(u).length, 0);
  }
  const u = await homeUi(locatedHost()); await enterHomeSearch(u, linkQuery); await u.press('‹');
  await u.click('home-recheck'); assert.equal(u.get('home-search').value, ''); assert.equal(searchRows(u).length, 0);
  assert.equal(u.panel().includes('Verified located sample'), false);
});

test('located read invalidation after Back precedes metadata use for scope, account, revocation and known-page denial', async () => {
  for (const failure of ['stale-scope', 'missing-scope', 'account_changed', 'not_connected', 'inaccessible']) {
    const held = deferred(), host = locatedHost({ held, ...(failure === 'inaccessible' && { id: 'm0' }),
      ...(failure === 'stale-scope' && { resultScope: 'old' }), ...(failure === 'missing-scope' && { resultScope: null }) });
    const u = await homeUi(host); await enterHomeSearch(u, linkQuery); await u.press('‹');
    if (failure === 'account_changed' || failure === 'not_connected') host.s.state = failure;
    if (!failure.endsWith('scope')) host.s.readState = failure;
    held.release(); await settle();
    assert.equal(u.homeCalls.filter(call => call.name === 'osm_home').length, 2, failure);
    assert.doesNotMatch(u.panel(), /Verified located sample|Ephemeral|Unverified locate|Searching/);
    assert.equal(u.get('home-search').value, '');
  }
  // A restored, search-only Q01 row is also previously listed evidence on the next read.
  const host = locatedHost(), u = await homeUi(host); await enterHomeSearch(u, linkQuery); await u.press('‹');
  host.s.readState = 'inaccessible'; await u.press('📗Verified located sample');
  assert.equal(u.homeCalls.filter(call => call.name === 'osm_home').length, 2);
  assert.equal(u.panel().includes('Verified located sample'), false);
});

test('locate never requests an unmapped or related source and never displays its metadata', async () => {
  for (const locateKey of ['outside', 'tasks']) {
    const u = await homeUi(locatedHost({ locateKey })); await enterHomeSearch(u, linkQuery);
    assert.equal(u.homeCalls.some(call => call.name === 'osm_home_read'), false);
    assert.doesNotMatch(u.panel(), /Unverified locate|Verified located sample/); assert.ok(u.panel().includes('This page isn’t part'));
  }
});

test('zero-hit incomplete searches retain headings and ordered notes, with source-open winning over retry', async () => {
  for (const flags of [{ hasMore: true }, { partial: true }, { withheld: 2 }, { hasMore: true, partial: true, withheld: 2 }]) {
    const base = homeHost(), u = await homeUi({ ...base, handler: (name, args) => name === 'osm_home_search'
      ? { _meta: { 'osm/home-list': { state: 'listed', scope: base.s.scope, items: [], ...(args.section === 'memory' && { source: { title: 'Verified memory', icon: '📚' }, ...flags }) } } }
      : base.handler(name, args) });
    await enterHomeSearch(u, 'scope');
    assert.doesNotMatch(u.panel(), /No titles|Searching/); assert.ok(u.panel().startsWith('📚Verified memory'));
    if (flags.hasMore || flags.partial) assert.ok(u.panel().includes('Verified memory couldn’t be searched completely'));
    if (flags.withheld) assert.ok(u.panel().includes('2 pages here can’t be read with OSM’s connection.'));
    if (flags.hasMore) {
      assert.equal(Boolean(u.buttonNamed('Try again')), false); const before = u.homeCalls.length;
      await u.press('Open Verified memory'); assert.equal(u.shown('home-search'), false); assert.equal(u.homeCalls.length, before, 'H03 uses the existing read-only list');
      assert.equal(u.buttonNamed('‹').getAttribute('aria-label'), 'Back to search results');
      await u.press('‹'); assert.equal(u.get('home-search').value, 'scope');
    } else assert.equal(Boolean(u.buttonNamed('Try again')), Boolean(flags.partial));
    if (flags.partial && flags.withheld) assert.ok(u.panel().indexOf('searched completely') < u.panel().indexOf('2 pages'));
  }
});

test('missing search answers show Searching only while pending and never assert global no-match', async () => {
  const base = homeHost(), held = deferred();
  const u = await homeUi({ ...base, handler: async (name, args) => {
    if (name !== 'osm_home_search') return base.handler(name, args);
    if (args.section === 'memory') await held.promise;
    return { _meta: { 'osm/home-list': { state: 'empty', scope: base.s.scope } } };
  } });
  await enterHomeSearch(u, 'missing'); assert.ok(u.panel().includes('Searching…')); assert.equal(u.panel().includes('No titles'), false);
  held.release(); await settle(); assert.equal(u.panel().includes('Searching…'), false); assert.ok(u.panel().includes('No titles'));
  assert.ok(u.panel().includes('Searched About your business, Memory, Business Docs, Skills.'));
});

test('recheck clears the query and its debounce, and media changes retain three previews without reads', async () => {
  const u = await homeUi(); await enterHomeSearch(u, 'scope'); await u.click('home-recheck');
  assert.equal(u.get('home-search').value, ''); assert.ok(u.panel().includes('Weekly client update'));
  const before = u.homeCalls.length;
  u.resize(true); assert.equal(u.panel().includes('Review the offer'), false); u.resize(false); assert.equal(u.panel().includes('Review the offer'), false);
  assert.equal(u.homeCalls.length, before);
  u.get('home-search').value = 'cancelled'; await u.get('home-search').dispatch('input'); await u.click('home-recheck');
  const searches = u.homeCalls.filter(call => call.name === 'osm_home_search').length;
  await new Promise(resolve => setTimeout(resolve, 320)); await settle();
  assert.equal(u.homeCalls.filter(call => call.name === 'osm_home_search').length, searches); assert.equal(u.get('home-search').value, '');
});

test('connection-ended gate is human-first with one primary; organisation copy is hidden for every status', async () => {
  for (const state of ['not_connected', 'ready', 'unsupported_host', 'unmapped', 'account_changed', 'root_inaccessible', 'mapping_unavailable', 'rate_limited', 'unavailable', 'official_mode']) {
    const base = homeHost(); base.s.state = state; const u = await homeUi(base);
    assert.equal(u.shown('organisation-copy'), false, state);
    assert.equal(u.shown('connection-provisioning'), state === 'not_connected', state);
    if (state === 'not_connected') {
      assert.equal(u.text('gate-copy'), 'OSM isn’t connected to Notion, or its connection was removed, so nothing from your home is shown.');
      assert.equal(u.text('gate-connect'), 'Open connection settings');
      assert.equal(u.get('gate-connect').getAttribute('class'), 'btn btn-primary');
      for (const id of ['gate-action', 'gate-setup']) assert.equal(u.get(id).getAttribute('class'), 'btn btn-ghost');
      assert.equal(u.text('gate-action'), 'Show saved links'); assert.equal(u.text('gate-setup'), 'Get help from your agent');
      assert.equal(u.get('settings-connection').getAttribute('class'), 'btn btn-primary');
      assert.equal(u.messages.length, 0);
    }
  }
});

test('thrown located reads settle Back into explicit locate retry instead of stuck Searching', async () => {
  const host = locatedHost(), u = await homeUi({ ...host, handler: (name, args) => {
    if (name === 'osm_home_read') throw new Error('Synthetic transport failure');
    return host.handler(name, args);
  } });
  await enterHomeSearch(u, linkQuery); await u.press('‹');
  assert.doesNotMatch(u.panel(), /Searching|Verified located sample/);
  assert.ok(u.panel().includes('couldn’t be searched right now'));
  await u.press('Try again'); assert.equal(u.homeCalls.filter(call => call.name === 'osm_home_locate').length, 2);
  assert.equal(u.homeCalls.filter(call => call.name === 'osm_home').length, 1, 'transport failure does not fabricate an access revocation');
});

test('an older located read cannot replace the current query version row', async () => {
  const base = locatedHost(), first = deferred(); let reads = 0;
  const u = await homeUi({ ...base, handler: async (name, args) => {
    if (name !== 'osm_home_read') return base.handler(name, args);
    const n = ++reads; if (n === 1) await first.promise;
    const result = await base.handler(name, args); result._meta['osm/home-record'].record.title = n === 1 ? 'Older verified answer' : 'Newest verified answer'; return result;
  } });
  await enterHomeSearch(u, linkQuery); await u.press('‹');
  await enterHomeSearch(u, linkQuery.trim()); await u.press('‹');
  first.release(); await settle();
  assert.ok(u.panel().includes('Newest verified answer')); assert.equal(u.panel().includes('Older verified answer'), false);
  assert.equal(u.homeCalls.filter(call => call.name === 'osm_home_locate').length, 2); assert.equal(reads, 2);
});

test('failed searched-source answers never provide a title or icon for a heading', async () => {
  const base = homeHost(), u = await homeUi({ ...base, handler: (name, args) => name === 'osm_home_search'
    ? { _meta: { 'osm/home-list': { state: args.section === 'docs' ? 'inaccessible' : 'empty', scope: base.s.scope, source: { title: 'Denied metadata title', icon: '🚫' } } } }
    : base.handler(name, args) });
  await enterHomeSearch(u, 'unmatched');
  assert.ok(u.panel().includes('Business Docs couldn’t be searched right now'));
  assert.doesNotMatch(u.panel(), /Denied metadata title|🚫|No titles|Searching/);
});


test('Built into OSM expands and collapses locally with metadata and no execution claims', async () => {
  const u = await homeUi(); await u.click('settings');
  const calls = plain(u.homeCalls), names = u.names(), messages = u.messages.length;
  assert.equal(u.text('builtin-summary'), '2 methods');
  assert.equal(u.get('builtin-toggle').getAttribute('aria-expanded'), 'false');
  assert.equal(u.get('builtin-toggle').getAttribute('aria-controls'), 'builtin-panel');
  assert.equal(u.shown('builtin-panel'), false);
  u.get('builtin-toggle').focus(); await u.click('builtin-toggle');
  assert.equal(u.get('builtin-toggle').getAttribute('aria-expanded'), 'true');
  assert.equal(u.shown('builtin-panel'), true);
  assert.equal(u.focused(), 'builtin-toggle');
  assert.ok(u.text('builtin-content').includes('osm-setup'));
  assert.ok(u.text('builtin-content').includes('Set up or resume OSM.'));
  assert.ok(u.text('builtin-panel').includes('Reading a method here doesn’t run it.'));
  assert.doesNotMatch(u.text('builtin-content'), /Enabled|Available|Run/);
  assert.equal(u.get('settings-main').descendants().some(node => node.tagName === 'DETAILS'), false);
  assert.equal(u.text('saved-links-summary'), 'Docs');
  await u.click('builtin-toggle');
  assert.equal(u.get('builtin-toggle').getAttribute('aria-expanded'), 'false');
  assert.equal(u.shown('builtin-panel'), false);
  assert.deepEqual(plain(u.homeCalls), calls); assert.deepEqual(u.names(), names); assert.equal(u.messages.length, messages);
});

test('Built into OSM summary counts methods with the correct singular and still expands one entry', async () => {
  for (const [builtin, label] of [[[{ name: 'osm-write-code', description: 'Write and verify code.' }], '1 method'], [[], '0 methods']]) {
    const base = homeHost();
    const u = await homeUi({ ...base, handler: (name, args) => {
      const result = base.handler(name, args);
      if (name === 'osm_home') result._meta['osm/home'].builtin = builtin;
      return result;
    } });
    await u.click('settings');
    assert.equal(u.text('builtin-summary'), label);
    await u.click('builtin-toggle');
    assert.equal(u.get('builtin-toggle').getAttribute('aria-expanded'), 'true');
    assert.equal(u.text('builtin-content').includes('osm-write-code'), builtin.length === 1);
  }
});

test('header uses verified root icon and title and removes both after account change or root denial', async () => {
  for (const state of ['account_changed', 'root_inaccessible']) {
    const base = homeHost();
    const u = await homeUi({ ...base, handler: (name, args) => {
      const result = base.handler(name, args);
      // Even a bad failure answer must not supply header metadata.
      if (name === 'osm_home') result._meta['osm/home'].root = { title: 'Verified sample home', icon: '📚', link: target };
      return result;
    } });
    assert.equal(u.text('heading'), 'Verified sample home'); assert.equal(u.text('brand-mark'), '📚');
    assert.equal(u.get('heading').children[0].id, 'home-root-title');
    assert.equal(u.text('home-page'), '');
    base.s.state = state; await u.click('home-recheck'); await settle();
    assert.equal(u.text('heading'), u.text('gate-title'));
    assert.equal(u.text('heading').includes('Verified sample home'), false);
    assert.equal(u.text('brand-mark'), ''); assert.equal(u.shown('brand-mark'), false);
    assert.equal(u.get('heading').descendants().some(node => node.id === 'home-root-title'), false);
    const ids = u.get('home').parentNode.descendants().map(node => node.id).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length, 'all mounted IDs remain unique');
  }
});

test('empty and denied sources retain their truthful state and have no source Open action', async () => {
  const base = homeHost();
  const u = await homeUi({ ...base, handler: (name, args) => name === 'osm_home_list' && args.section === 'memory'
    ? { _meta: { 'osm/home-list': { state: 'empty', scope: base.s.scope, source: { title: 'Actual decisions', icon: '📒' }, items: [] } } }
    : base.handler(name, args) });
  assert.ok(u.panel().includes('Actual decisions')); assert.ok(u.panel().includes('Nothing here yet.'));
  assert.equal(u.buttonNamed('Open Actual decisions'), undefined);
  assert.equal(u.buttonNamed('Open Business Docs'), undefined);
  assert.ok(u.panel().includes('OSM’s connection can’t read Business Docs.'));
  assert.ok(u.buttonNamed('How to share it ›'));
});

test('long real source titles reach the heading, Open caption, source list and Load more in full and are never replaced', async () => {
  const titles = {
    about: 'Northwind customer research, pricing history and long-term account planning notes (sample)',
    memory: 'NorthwindSampleDecisionLogWithAnUnbrokenTitleTokenThatHasNoNaturalBreakpointAtNarrowWidths2026',
    skills: 'Reusable weekly client update and project kickoff methods for every sample engagement',
  };
  const base = homeHost();
  const u = await homeUi({ ...base, handler: (name, args) => {
    const result = base.handler(name, args);
    const list = result._meta['osm/home-list'];
    if (name === 'osm_home_list' && titles[args.section] && list?.state === 'listed') list.source = { title: titles[args.section], icon: '📚' };
    return result;
  } });
  const heads = u.nodes().filter(node => node.getAttribute('class') === 'source-head').map(node => node.textContent);
  for (const title of Object.values(titles)) assert.ok(heads.some(head => head === '📚' + title), 'heading keeps the whole title after its icon: ' + title);
  // Each full title is also the Open caption's accessible name; nothing is shortened or generic.
  for (const [key, title] of Object.entries(titles)) {
    const open = u.get('source-' + key);
    assert.equal(open.textContent, 'Open ' + title); assert.equal(open.tagName, 'BUTTON');
    assert.equal(open.getAttribute('aria-label'), null, 'no separate generic accessible name');
    assert.equal(open.hidden, false);
  }
  // Open still works and the source list keeps the title in its heading and Load more caption.
  await u.click('source-memory'); await settle();
  const heading = u.get('home-panel').children.find(node => node.tagName === 'H2');
  assert.equal(heading.textContent, '📚' + titles.memory);
  assert.ok(u.buttonNamed('Load more from ' + titles.memory), 'Load more names the whole source title');
  assert.equal(u.buttonNamed('Load more from ' + titles.memory).textContent, 'Load more from ' + titles.memory);
});

test('Saved links summary names each populated category once, in Docs, Skills, Memory order', async () => {
  const link = name => ({ title: name, target: 'https://example.com/' + name });
  const cases = [
    [{ teamMemory: link('t-memory'), memory: link('p-memory'), teamSkills: link('t-skills'), personalSkills: link('p-skills'), docs: link('docs') }, 'Docs · Skills · Memory'],
    [{ memory: link('p-memory'), teamMemory: link('t-memory') }, 'Memory'],
    [{ teamSkills: link('t-skills'), teamMemory: link('t-memory') }, 'Skills · Memory'],
    [{ personalSkills: link('p-skills'), teamSkills: link('t-skills') }, 'Skills'],
    [{}, 'None'],
  ];
  for (const [links, expected] of cases) {
    const host = homeHost(), u = await ui(configured(), saved(links), { home: host.handler }); await settle();
    await u.click('settings');
    assert.equal(u.text('saved-links-summary'), expected, Object.keys(links).join(','));
  }
});

test('Saved links summary stays None while an observed account change hides the saved links', async () => {
  const host = homeHost(); Object.assign(host.s, { state: 'account_changed', mapping: 'saved' });
  const u = await ui(configured(), saved({ docs: { title: 'Docs', target: 'https://example.com/docs' }, memory: { title: 'Memory', target: 'https://example.com/memory' } }), { home: host.handler });
  await settle(); await u.click('settings');
  assert.equal(u.text('saved-links-summary'), 'None');
});
