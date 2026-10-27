import { App, applyDocumentTheme, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';
import { classifyTarget, connectionCopy } from './ui-model.mjs';
import { sourceRoles, roleLabels, readStatus, draftFrom, isDirty, isCurrent, setLink, linksPayload, linkFromInput, shortTarget } from './setup-state.mjs';
import { createPicker } from './picker.mjs';
import { pageIcon, notionPageId } from './page-icons.mjs';
import { sourceLabel } from './source-label.mjs';
import { createHome } from './home.mjs';

const app = new App({ name: 'osm', version: __OSM_VERSION__ }, { availableDisplayModes: ['fullscreen'] });
const $ = id => document.getElementById(id);
const connectUrl = 'https://chatgpt.com/apps/notion/asdk_app_69c18c28f1188191bf5b8445c4ab0a2e';
const repositoryUrl = 'https://github.com/onlinesourdough/OSM-plugin';
const slotLabels = { docs: 'Docs', personalSkills: 'Personal', teamSkills: 'Team', memory: 'Personal', teamMemory: 'Team' };
const stepRoles = [[], ['docs'], ['personalSkills', 'teamSkills'], ['memory', 'teamMemory']];
const connectable = ['not_connected', 'disabled', 'unavailable'];
// status is the latest accepted snapshot. draft holds pending source edits with
// the revisions they were read from; only an explicit reload replaces edits.
let status, draft, checkedAt = -Infinity, firstStatus = true, saving = false, refreshing = false, stale = false;
let onboarding = false, openStep = 0, other = false, confirmSwitch = false, settingsOpen = false, discardPrompt = false;
let message = { text: '', error: false };
let selectedContext = null;
const canBrowse = () => Boolean(status?.features?.notionPages && status.notion.state === 'connected');
// Icons decorate navigation only. Keep them in this panel, never in company
// context or source-map revisions. Missing metadata cannot block setup.
const icons = new Map(), requestedIcons = new Set();
let loadingIcons = false, iconGeneration = 0;
const displayed = link => link ? { ...link, icon: icons.get(notionPageId(link.target)) ?? pageIcon(link.icon) } : link;
async function loadSelectedIcons(dashboard) {
  if (!canBrowse() || !status.features.notionIcons || loadingIcons || refreshing || !home.iconsAllowed(dashboard)) return;
  const links = [{ target: status.context.target }, { target: draft.contextTarget }, selectedContext, ...Object.values(draft.links), ...Object.values(status.sources.links)];
  const targets = [...new Map(links.filter(Boolean).filter(link => notionPageId(link.target)).map(link => [notionPageId(link.target), link.target])).entries()]
    .filter(([id]) => !icons.has(id) && !requestedIcons.has(id)).slice(0, 6);
  if (!targets.length) return;
  for (const [id] of targets) requestedIcons.add(id);
  loadingIcons = true;
  const generation = iconGeneration;
  try {
    const result = await app.callServerTool({ name: 'osm_notion_icons', arguments: { targets: targets.map(([, target]) => target) } });
    const values = result?._meta?.['osm/icons']?.icons;
    if (generation !== iconGeneration || result?.isError || !Array.isArray(values)) return;
    for (const item of values) {
      const id = notionPageId(item.target);
      if (targets.some(([expected]) => expected === id)) icons.set(id, pageIcon(item.icon));
    }
  } catch { /* Keep saved navigation usable. Refresh retries icon metadata. */ }
  finally { loadingIcons = false; render(); }
}
async function loadPages(query) {
  const result = await app.callServerTool({ name: 'osm_notion_pages', arguments: { query } });
  const data = result?._meta?.['osm/pages'];
  if (result?.isError) throw new Error(result.content?.find(item => item.type === 'text')?.text || 'Could not load Notion pages.');
  if (!Array.isArray(data?.pages)) throw new Error('Could not load Notion pages.');
  const pages = data.pages.filter(page => typeof page.title === 'string' && page.title.length <= 100 && classifyTarget(page.target)?.kind === 'notion');
  for (const page of pages) if (Object.hasOwn(page, 'icon')) icons.set(notionPageId(page.target), pageIcon(page.icon));
  return { pages, hasMore: Boolean(data.hasMore), partial: Boolean(data.partial) };
}

function sourcePicker(id, role) {
  return createPicker({ id, label: slotLabels[role], loadOptions: loadPages,
    onEdit: () => { feedback(''); render(); },
    onSelect: link => { setLink(draft, role, link); feedback(''); render(); },
    onApply: ({ target, name }) => {
      try { setLink(draft, role, linkFromInput(role, target, name, draft.saved[role])); } catch (error) { return error.message; }
      feedback(''); render();
    } });
}
const setupPickers = {}, settingsPickers = {};
for (const role of sourceRoles) {
  setupPickers[role] = sourcePicker(`setup-${role}-picker`, role); $(`setup-${role}`).append(setupPickers[role].root);
  settingsPickers[role] = sourcePicker(`settings-${role}-picker`, role); $(`settings-${role}`).append(settingsPickers[role].root);
}
const contextPicker = createPicker({ id: 'settings-context-picker', label: 'Context', optional: false, menuLabel: 'Current context',
  loadOptions: loadPages, confirmSelection: true,
  editText: ['Switch context…', 'Switch context…'], applyText: 'Switch context', nameField: false,
  placeholder: 'https://notion.so/… or /path/to/context', onSelect() {}, onEdit: () => render(), onApply: ({ target, name }) => switchContext(target, name) });
$('settings-context').append(contextPicker.root);
const setupContextPicker = createPicker({ id: 'setup-context-picker', label: 'Page', optional: false, loadOptions: loadPages,
  nameField: false, onSelect: link => {
    selectedContext = link.placeholder ? null : link; $('target').value = link.target; confirmSwitch = false; feedback(''); render();
  }, onApply: ({ target }) => {
    const route = classifyTarget(target);
    if (route?.kind !== 'notion') return 'Enter a Notion page link.';
    selectedContext = null; $('target').value = route.target; confirmSwitch = false; feedback(''); render();
  }, onEdit: () => render() });
$('setup-context').append(setupContextPicker.root);
// Home reads only through OSM's own tools; it never uses the page picker's connection.
const home = createHome({ $, call: (name, args) => app.callServerTool({ name, arguments: args }), open: target => open(target), changed: () => render(),
  linksRevision: () => status?.sources?.definitionRevision });

function feedback(text, error = false) { message = { text, error }; paintFeedback(); }
function paintFeedback() {
  for (const [box, text, reload, active] of [['feedback', 'feedback-text', 'reload-draft', !settingsOpen], ['drawer-feedback', 'drawer-feedback-text', 'drawer-reload', settingsOpen]]) {
    $(box).hidden = !active || !message.text; $(box).dataset.error = String(message.error);
    $(text).textContent = active ? message.text : ''; $(reload).hidden = !stale;
  }
}
function theme(context) {
  if (context?.theme) applyDocumentTheme(context.theme);
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
}
function fillDraft() {
  draft = draftFrom(status); stale = false; confirmSwitch = false;
  for (const picker of [setupContextPicker, contextPicker, ...Object.values(setupPickers), ...Object.values(settingsPickers)]) picker.reset();
  selectedContext = status.context.target && status.sources.title ? { title: status.sources.title, target: status.context.target } : null;
  $('target').value = status.context.target || '';
  if (status.context.kind) other = status.context.kind !== 'notion';
}
const contextInput = () => classifyTarget($('target').value)?.target ?? $('target').value.trim();
const contextEdited = () => onboarding && contextInput() !== draft.contextTarget;
const unfinishedSources = () => [...Object.values(setupPickers), ...Object.values(settingsPickers)].some(picker => picker.hasEdits());
const sourceChanges = () => isDirty(draft) || unfinishedSources();
const pending = () => sourceChanges() || contextEdited() || contextPicker.hasEdits() || setupContextPicker.hasEdits();
const blocked = () => !status.context.revision || ['ambiguous', 'unavailable'].includes(status.context.state) || status.sources.state === 'unavailable';
const sourcesReady = () => status.context.state === 'configured' && draft.contextTarget === status.context.target
  && status.sources.state !== 'unavailable' && !contextEdited();

function render() {
  $('retry-load').hidden = Boolean(status) || refreshing;
  $('help').disabled = saving || refreshing;
  if (!status) { $('loading').hidden = !refreshing; return; }
  const dashboard = status.context.state === 'configured' && !onboarding;
  const locked = saving || refreshing;
  $('loading').hidden = true;
  $('heading').textContent = dashboard ? 'OSM' : 'Get started';
  home.sync(status.context.state === 'configured' ? status.context.target : null);
  const homeView = dashboard && home.shown();
  $('setup').hidden = dashboard; $('dashboard').hidden = !dashboard || homeView;
  $('settings').hidden = !dashboard; $('settings').disabled = locked;
  $('version').textContent = `v${__OSM_VERSION__}`;
  renderConnection(dashboard && !homeView, locked);
  home.render(locked, dashboard);
  if (dashboard) renderDashboard(locked); else renderSetup(locked);
  if (settingsOpen) renderSettings(locked);
  paintFeedback();
  void loadSelectedIcons(dashboard);
}
function renderConnection(dashboard, locked) {
  const state = status.notion.state, label = refreshing ? 'Checking…' : connectionCopy[state];
  const help = state === 'not_installed' ? 'Install Notion in Codex → Plugins, then refresh.' : state === 'plugin_disabled' ? 'Enable Notion in Codex → Plugins, then refresh.' : '';
  for (const [text, hint, refresh, connect] of [['connection-label', 'connection-help', 'refresh', 'connect'], ['drawer-connection', 'drawer-help', 'drawer-refresh', 'drawer-connect']]) {
    $(text).textContent = label; $(text).dataset.state = refreshing ? 'unknown' : state;
    $(hint).textContent = help; $(hint).hidden = !help;
    $(refresh).disabled = locked; $(connect).disabled = locked;
    $(connect).hidden = !connectable.includes(state) || connect === 'connect' && other;
  }
  const notion = status.context.kind === 'notion';
  $('badge').hidden = !dashboard || !notion || refreshing || state !== 'connected';
  $('notice').hidden = !dashboard || !notion || refreshing || state === 'connected';
  $('notice-text').textContent = help || `Notion · ${label}`;
  $('notice-connect').hidden = !connectable.includes(state); $('notice-connect').disabled = locked;
}
function summary(step) {
  if (step === 0) return other ? 'Not needed' : refreshing ? 'Checking…' : connectionCopy[status.notion.state].replace('✓ ', '');
  const roles = stepRoles[step];
  if (step === 1) {
    if (contextEdited() && contextInput() || isDirty(draft, roles)) return draft.contextTarget ? 'Edited' : 'Not saved';
    return draft.contextTarget ? draft.title || 'Saved' : 'Not set';
  }
  if (isDirty(draft, roles)) return 'Edited';
  return roles.filter(role => draft.links[role]).map(role => slotLabels[role]).join(' · ') || 'None';
}
function renderSetup(locked) {
  const ready = sourcesReady(), stop = blocked();
  const reason = status.sources.state === 'unavailable' ? 'Saved source links need attention.' : 'Sources are saved per context. Save the context first.';
  for (let step = 0; step < 4; step++) {
    $(`step-${step}`).setAttribute('aria-expanded', String(openStep === step));
    $(`step-${step}`).setAttribute('aria-disabled', String(openStep === step));
    $(`step-${step}`).disabled = saving;
    $(`panel-${step}`).hidden = openStep !== step;
    $(`summary-${step}`).textContent = summary(step);
    const next = $(`continue-${step}`);
    next.disabled = locked || step > 0 && stop;
    next.textContent = saving && openStep === step ? 'Saving…' : step === 3 ? 'Finish' : step === 1 && confirmSwitch ? 'Discard and continue' : 'Continue';
    if (step) {
      $(`reason-${step}`).hidden = ready;
      $(`reason-${step}`).textContent = step === 1 && status.sources.state !== 'unavailable' ? 'Continue to save the context, then add Docs.' : reason;
    }
  }
  $('target-label').textContent = other ? 'Context link or folder' : 'Context link';
  $('target').placeholder = other ? 'https://… or /path/to/context' : 'https://notion.so/…';
  $('provider').textContent = other ? 'Use Notion' : 'Use a folder or other link';
  $('target').disabled = locked; $('provider').disabled = locked;
  const nativePicker = Boolean(status.features?.notionPages && !other);
  $('setup-context').hidden = !nativePicker; $('context-link-field').hidden = nativePicker;
  const notionTarget = classifyTarget(contextInput())?.kind === 'notion' ? contextInput() : null;
  const selected = notionTarget ? selectedContext?.target === notionTarget ? selectedContext : { title: 'Selected page', target: notionTarget, placeholder: true } : null;
  setupContextPicker.render({ value: displayed(selected), choices: [], browse: canBrowse(), disabled: locked });
  for (const role of sourceRoles) setupPickers[role].render({ value: displayed(draft.links[role]), choices: [displayed(draft.saved[role])], browse: canBrowse() && !other, disabled: locked || !ready });
}
// Primary is the context page itself; the row label never renames that page.
function renderDashboard(locked) {
  const context = status.sources.title || 'Context';
  sourceLabel($('context-meta'), displayed({ title: context, target: status.context.target }));
  $('open-context').title = status.context.target;
  $('open-context').disabled = locked;
  $('open-context').setAttribute('aria-label', `Open Context: ${context}`);
  for (const role of sourceRoles) {
    const link = status.sources.links[role], row = $(`open-${role}`);
    sourceLabel($(`${role}-meta`), link ? { ...displayed(link), title: link.title === roleLabels[role] && !notionPageId(link.target) ? shortTarget(link.target) : link.title } : { title: 'Add' });
    row.title = link?.target || '';
    row.dataset.empty = String(!link);
    row.disabled = locked || status.sources.state === 'unavailable';
    row.setAttribute('aria-label', link ? `Open ${roleLabels[role]}: ${link.title}` : `Add ${roleLabels[role]}`);
  }
}
function renderSettings(locked) {
  const dirty = isDirty(draft);
  const ready = status.context.state === 'configured' && draft.contextTarget === status.context.target && status.sources.state !== 'unavailable';
  const current = { title: draft.title || 'Context', target: draft.contextTarget };
  contextPicker.render({ value: displayed(current), choices: [displayed(current)], browse: canBrowse(), disabled: locked,
    applyText: sourceChanges() ? 'Discard and switch' : 'Switch context', note: sourceChanges() ? 'Unsaved source changes will be discarded.' : '' });
  for (const role of sourceRoles) settingsPickers[role].render({ value: displayed(draft.links[role]), choices: [displayed(draft.saved[role])], browse: canBrowse(), disabled: locked || !ready });
  $('drawer-save').disabled = locked || !dirty || !ready;
  $('drawer-save').textContent = saving ? 'Saving…' : 'Save';
  $('drawer-cancel').disabled = saving; $('drawer-close').disabled = saving;
  $('foot-edit').hidden = discardPrompt; $('foot-discard').hidden = !discardPrompt;
}

function apply(result) {
  if (result?.isError) throw new Error(result.content?.find(c => c.type === 'text')?.text || 'Could not complete the request.');
  const value = result?._meta?.['osm/status'], timestamp = readStatus(value);
  if (timestamp === null) throw new Error('Could not read setup. Refresh to try again.');
  if (timestamp < checkedAt) return false;
  checkedAt = timestamp; status = value;
  if (status.context.state !== 'configured') onboarding = true;
  if (firstStatus) { firstStatus = false; openStep = status.notion.state === 'connected' ? 1 : 0; }
  // A draft without pending edits follows the latest snapshot; pending edits never do.
  if (!draft || !saving && !pending()) fillDraft();
  else if (!saving && !isCurrent(draft, status)) {
    stale = true;
    feedback('Setup changed elsewhere. Your edits are kept; load the latest setup to continue.', true);
  }
  if (settingsOpen && status.context.state !== 'configured') closeSettings();
  render();
  if (['ambiguous', 'unavailable'].includes(status.context.state)) feedback('Existing context instructions need attention. They have been left unchanged.', true);
  else if (status.sources.state === 'unavailable') feedback('Saved source links need attention. They have been left unchanged.', true);
  return true;
}
async function open(target) {
  const route = classifyTarget(target);
  if (!route) return;
  if (route.kind === 'path') { feedback(route.target); return; }
  try { const result = await app.openLink({ url: route.target }); if (result?.isError) throw new Error(); }
  catch { feedback('Could not open the link. ' + route.target, true); }
}
async function refresh() {
  if (refreshing || saving) return;
  ++iconGeneration; icons.clear(); requestedIcons.clear();
  refreshing = true; feedback(''); render();
  try {
    apply(await app.callServerTool({ name: 'osm_status', arguments: {} }));
    if (status.context.state === 'configured') void home.reload();
  } catch {
    checkedAt = Math.max(checkedAt + 1, Date.now());
    if (status) status = { ...status, notion: { state: 'unknown' } };
    feedback('Could not check the connection. Try refreshing again.', true);
  } finally { refreshing = false; render(); }
}

// Writes never rebase a draft read from older revisions. Before a context
// exists there are no source edits to lose, so the typed link is kept instead.
function current() {
  if (isCurrent(draft, status)) return true;
  if (status.context.state !== 'configured' && !isDirty(draft)) {
    const value = $('target').value, provider = other;
    fillDraft(); $('target').value = value; other = provider;
    feedback('Setup changed. Review your context link and continue again.', true);
  } else { stale = true; feedback('Setup changed elsewhere. Your edits are kept; load the latest setup to continue.', true); }
  render(); return false;
}
async function writeContext(target, title) {
  const result = await app.callServerTool({ name: 'osm_save_context', arguments: { target, expectedRevision: draft.contextRevision } });
  if (!apply(result)) throw new Error('Your context changed. Refresh before trying again.');
  fillDraft(); // The new context's own map; earlier source edits never carry over.
  if (title && !draft.title) {
    try {
      const named = await app.callServerTool({ name: 'osm_save_sources', arguments: {
        target: draft.contextTarget, expectedContextRevision: draft.contextRevision,
        expectedRevision: draft.sourcesRevision, title, links: linksPayload(draft),
      } });
      if (!apply(named)) throw new Error();
      fillDraft();
    } catch { return 'Context saved, but its name could not be saved. Refresh to check the setup.'; }
  }
}
async function saveDraft() {
  if (unfinishedSources()) { feedback('Apply or cancel the open link first.'); return false; }
  if (!current()) return false;
  saving = true; feedback(''); render();
  try {
    const result = await app.callServerTool({ name: 'osm_save_sources', arguments: {
      target: draft.contextTarget, expectedContextRevision: draft.contextRevision,
      expectedRevision: draft.sourcesRevision, title: draft.title, links: linksPayload(draft),
    } });
    if (!apply(result)) throw new Error('Your setup changed. Refresh before saving again.');
    fillDraft(); return true;
  } catch (error) { feedback(error.message || 'Could not save. Try again.', true); return false; }
  finally { saving = false; render(); }
}

function focusStep(step, docs = false) {
  const first = docs ? 'setup-docs-picker' : ['refresh', status.features?.notionPages && !other ? 'setup-context-picker' : 'target', 'setup-personalSkills-picker', 'setup-memory-picker'][step];
  ($(first).disabled ? $(`continue-${step}`) : $(first)).focus();
}
function goTo(step) { openStep = step; confirmSwitch = false; render(); focusStep(step); }
async function saveContext(target) {
  if (!current()) return;
  if (sourceChanges() && !confirmSwitch) { confirmSwitch = true; feedback('Unsaved source changes for this context will be discarded.', true); render(); return; }
  let saved = false;
  saving = true; feedback(''); render();
  try {
    const warning = await writeContext(target, selectedContext?.target === target ? selectedContext.title : undefined);
    saved = true; feedback(warning || (status.sources.state === 'saved' ? 'Context saved. Its saved sources are loaded.' : 'Context saved.'), Boolean(warning));
  }
  catch (error) { feedback(error.message || 'Could not save the context. Try again.', true); }
  finally { saving = false; render(); if (saved) focusStep(1, true); }
}
async function continueStep() {
  if (saving || refreshing || !status) return;
  if (openStep === 0) return goTo(1);
  if (blocked()) return;
  if (openStep === 1) {
    if (setupContextPicker.hasEdits()) { feedback('Apply or cancel the open link first.'); return; }
    const route = classifyTarget($('target').value);
    if (!route || /[<>]/.test(route.target) || (!other && route.kind !== 'notion')) {
      const picker = status.features?.notionPages && !other;
      feedback(other ? 'Enter an HTTPS link or an absolute folder path.' : picker ? 'Choose a Notion page.' : 'Enter a Notion link, or use a folder or other link.', true);
      (picker ? setupContextPicker.button : $('target')).focus(); return;
    }
    if (route.target !== draft.contextTarget || status.context.state !== 'configured') return saveContext(route.target);
  } else if (!sourcesReady()) {
    if (openStep === 2 && !isDirty(draft)) return goTo(3);
    if (!isCurrent(draft, status)) return void current();
    feedback('Save the context first.'); return goTo(1);
  }
  if (unfinishedSources()) { feedback('Apply or cancel the open link first.'); return; }
  if (isDirty(draft) && !await saveDraft()) return;
  if (openStep < 3) return goTo(openStep + 1);
  onboarding = false; openStep = 0; feedback(''); render(); $('heading').focus();
}

function openSettings(role) {
  if (!status || saving || refreshing || settingsOpen || onboarding || status.context.state !== 'configured') return;
  fillDraft(); settingsOpen = true; discardPrompt = false;
  feedback(status.sources.state === 'unavailable' ? 'Saved source links need attention. They have been left unchanged.' : '', status.sources.state === 'unavailable');
  $('drawer').showModal(); render();
  if (role && status.sources.state !== 'unavailable') {
    if (canBrowse()) settingsPickers[role].open(); else settingsPickers[role].openEditor();
  } else $('drawer-title').focus();
}
function requestClose() {
  if (saving) return;
  if (!pending()) return closeSettings();
  discardPrompt = true; render(); $('keep-editing').focus();
}
function keepEditing() {
  discardPrompt = false; render();
  const editing = [contextPicker, ...Object.values(settingsPickers)].find(picker => picker.hasEdits());
  if (editing) editing.focusEditor();
  else ($('drawer-save').disabled ? $('drawer-title') : $('drawer-save')).focus();
}
function closeSettings() {
  if (!settingsOpen) return;
  settingsOpen = false; discardPrompt = false;
  for (const picker of [contextPicker, ...Object.values(settingsPickers)]) picker.reset();
  if ($('drawer').open) $('drawer').close();
  fillDraft(); feedback(''); render(); $('settings').focus();
}
async function saveSettings() {
  if (saving || refreshing || !isDirty(draft)) return;
  if (await saveDraft()) closeSettings();
}
async function switchContext(value, title) {
  const route = classifyTarget(value);
  if (!route || /[<>]/.test(route.target)) return 'Enter a Notion or HTTPS link, or an absolute folder path.';
  if (route.target === draft.contextTarget) return;
  if (saving || refreshing) return 'Wait for the current request to finish.';
  if (draft.contextRevision !== status.context.revision) {
    stale = true; feedback('Setup changed elsewhere. Load the latest setup to continue.', true); render();
    return 'Setup changed elsewhere.';
  }
  saving = true; feedback(''); render();
  try { const warning = await writeContext(route.target, title); feedback(warning || 'Switched context. Showing its saved sources.', Boolean(warning)); }
  catch (error) { return error.message || 'Could not switch context. Try again.'; }
  finally { saving = false; render(); }
}
function reload() { fillDraft(); feedback(''); render(); }

app.ontoolresult = result => {
  if (result?._meta?.['osm/pages'] || ['pages', 'icons', 'home', 'home-list', 'home-record'].includes(result?._meta?.['osm/kind'])) return;
  try { apply(result); if (result?._meta?.['osm/view'] === 'settings') openSettings(); }
  catch (error) {
    checkedAt = Math.max(checkedAt + 1, Date.now());
    status = { ...(status || { context: { state: 'unavailable' }, sources: { state: 'unavailable', links: {} } }), notion: { state: 'unknown' } };
    if (!draft) fillDraft();
    render(); feedback(error.message, true);
  }
};
app.onhostcontextchanged = theme;
for (const id of ['refresh', 'drawer-refresh', 'retry-load']) $(id).addEventListener('click', refresh);
for (const id of ['connect', 'drawer-connect', 'notice-connect']) $(id).addEventListener('click', () => open(connectUrl));
for (const id of ['reload-draft', 'drawer-reload']) $(id).addEventListener('click', reload);
$('open-context').addEventListener('click', () => open(status.context.target));
for (const role of sourceRoles) $(`open-${role}`).addEventListener('click', () => {
  const link = status.sources.links[role];
  return link ? open(link.target) : openSettings(role);
});
// One step is always open, so Continue is always reachable.
for (let step = 0; step < 4; step++) $(`step-${step}`).addEventListener('click', () => {
  if (openStep === step) return;
  if (confirmSwitch) feedback('');
  openStep = step; confirmSwitch = false; render();
});
$('provider').addEventListener('click', () => { setupContextPicker.reset(); other = !other; render(); });
$('target').addEventListener('input', () => { if (confirmSwitch) feedback(''); confirmSwitch = false; render(); });
$('setup').addEventListener('submit', event => { event.preventDefault(); return continueStep(); });
$('settings').addEventListener('click', () => openSettings());
$('drawer-close').addEventListener('click', requestClose);
$('drawer-cancel').addEventListener('click', requestClose);
$('keep-editing').addEventListener('click', keepEditing);
$('discard').addEventListener('click', closeSettings);
$('drawer-save').addEventListener('click', saveSettings);
// Escape closes an open menu first (the picker stops it), then asks before discarding.
$('drawer').addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  if (discardPrompt) keepEditing(); else requestClose();
});
$('drawer').addEventListener('cancel', event => { event.preventDefault(); if (!discardPrompt) requestClose(); });
$('drawer').addEventListener('close', closeSettings);
// The GitHub button reports only in its own line, apart from setup/source
// feedback and Load latest, so neither a failure nor a retry can hide them.
$('help').addEventListener('click', async () => {
  const error = $('repo-error');
  error.hidden = true; error.textContent = '';
  try { const result = await app.openLink({ url: repositoryUrl }); if (result?.isError) throw new Error(); }
  catch { error.textContent = `Could not open GitHub. ${repositoryUrl}`; error.hidden = false; }
});
try {
  await app.connect(undefined, { timeout: 12000 }); theme(app.getHostContext());
  if (!status) await refresh();
  const context = app.getHostContext();
  if (context?.displayMode === 'inline' && context.availableDisplayModes?.includes('fullscreen')) {
    try { await app.requestDisplayMode({ mode: 'fullscreen' }); } catch { /* Host owns placement. */ }
  }
} catch { $('loading').hidden = true; feedback('Open OSM from the Codex sidebar.', true); }
