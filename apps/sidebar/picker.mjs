import { shortTarget } from './setup-state.mjs';
import { classifyTarget } from './ui-model.mjs';
import { sourceLabel } from './source-label.mjs';

// Saved choices work offline. When enabled, the same picker browses navigation
// metadata from the existing Notion connector; it never loads page bodies.
function node(tag, props = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'role' || key.startsWith('aria-')) element.setAttribute(key, value);
    else element[key] = value;
  }
  element.append(...children.flat().filter(child => child !== '' && child != null));
  return element;
}
function linkKey(link) {
  const route = classifyTarget(link?.target);
  if (route?.kind === 'notion') {
    const id = new URL(route.target).pathname.replace(/-/g, '').match(/[a-f0-9]{32}$/i)?.[0];
    if (id) return `notion:${id.toLowerCase()}`;
  }
  return link?.target;
}
const sameLink = (a, b) => linkKey(a) === linkKey(b);

export function createPicker({ id, label, optional = true, menuLabel = 'Saved sources', editText = ['Add link…', 'Edit link…'],
  applyText = 'Apply', nameField = true, placeholder = 'https://… or /path/to/folder', loadOptions, exclude = () => false, confirmSelection = false,
  onSelect, onApply, onEdit = () => {} }) {
  const value = node('span', { className: 'picker-value' });
  const button = node('button', { type: 'button', id, className: 'picker', role: 'combobox', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-controls': `${id}-list` }, value);
  const list = node('div', { id: `${id}-list`, className: 'picker-options', role: 'listbox', 'aria-label': label });
  const search = node('input', { id: `${id}-search`, className: 'form-control picker-search', type: 'search', maxLength: 160,
    autocomplete: 'off', placeholder: 'Search pages…', role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false',
    'aria-label': `Search Notion pages for ${label}`, 'aria-controls': list.id });
  const searchStatus = node('div', { className: 'menu-label', role: 'status' });
  const retry = node('button', { type: 'button', className: 'btn btn-ghost', hidden: true }, 'Retry');
  const menu = node('div', { className: 'menu', hidden: true }, search, list, searchStatus, retry);
  const link = node('input', { id: `${id}-link`, className: 'form-control', type: 'text', maxLength: 2048, autocomplete: 'off', placeholder });
  const name = node('input', { id: `${id}-name`, className: 'form-control', type: 'text', maxLength: 100, autocomplete: 'off', placeholder: 'Shown in OSM' });
  const note = node('p', { className: 'editor-note', hidden: true });
  const error = node('p', { className: 'editor-error', hidden: true });
  const cancel = node('button', { type: 'button', className: 'btn btn-ghost' }, 'Cancel');
  const apply = node('button', { type: 'button', id: `${id}-apply`, className: 'btn btn-secondary' }, applyText);
  const fields = node('div', {}, node('label', { className: 'field-label', htmlFor: link.id }, 'Link'), link,
    nameField ? [node('label', { className: 'field-label', htmlFor: name.id }, 'Name', node('span', { className: 'optional' }, 'Optional')), name] : [],
  );
  const confirmation = node('p', { className: 'editor-note', hidden: true });
  const editor = node('div', { className: 'editor', hidden: true }, fields, confirmation, note, error, node('div', { className: 'editor-actions' }, cancel, apply));
  const root = node('div', { className: 'field' },
    node('label', { className: 'field-label', htmlFor: id }, label, optional ? node('span', { className: 'optional' }, 'Optional') : ''),
    node('div', { className: 'picker-wrap' }, button, menu), editor);
  let state = { value: null, choices: [], disabled: false }, options = [], items = [], active = 0, expanded = false, spaceKey = false, busy = false;
  let fetched = [], loading = false, failure = false, more = false, partial = false, request = 0, debounce, selectedConfirmation = false;
  let inFlight = false, queued = false;
  const browsing = () => Boolean(loadOptions && state.browse);

  function optionList() {
    let choices = state.choices.filter(Boolean);
    if (state.value && !choices.some(choice => sameLink(choice, state.value))) choices.push(state.value);
    if (browsing()) {
      choices = choices.filter(choice => !search.value.trim() || choice.title.toLowerCase().includes(search.value.trim().toLowerCase()));
      const unique = new Map();
      // exclude() is asked on every paint, so a page it leaves out goes at once and the search stays.
      for (const choice of [...choices, ...fetched.filter(page => !exclude(page))]) {
        const previous = unique.get(linkKey(choice));
        if (!previous || previous.placeholder) unique.set(linkKey(choice), choice);
        else if (Object.hasOwn(choice, 'icon')) unique.set(linkKey(choice), { ...previous, icon: choice.icon });
      }
      choices = [...unique.values()];
    }
    return [...choices.map(choice => ({ link: choice })), ...(optional ? [{ none: true }] : []), { edit: true }];
  }
  function paint() {
    const selected = options.findIndex(option => option.link ? sameLink(option.link, state.value) : option.none && !state.value);
    items = options.map((option, index) => {
      const title = node('span', { className: 'option-title' });
      if (option.link) sourceLabel(title, option.link);
      const item = node('div', { id: `${id}-opt-${index}`, role: 'option', title: option.link?.target || '', className: option.edit ? 'option option-action' : 'option', 'aria-selected': String(index === selected) },
        option.link ? [title, node('span', { className: 'option-meta' }, option.link.path || shortTarget(option.link.target))]
          : option.none ? 'None' : editText[state.value ? 1 : 0]);
      item.addEventListener('mousedown', event => event.preventDefault());
      item.addEventListener('click', () => choose(index));
      return item;
    });
    const saved = items.filter((_, index) => options[index].link);
    const groupLabel = browsing() ? 'Notion pages' : menuLabel;
    list.replaceChildren(...(saved.length ? [node('div', { role: 'group', 'aria-label': groupLabel }, node('div', { className: 'menu-label', 'aria-hidden': 'true' }, groupLabel), saved)] : []),
      ...items.filter((_, index) => !options[index].link));
    search.hidden = !browsing(); searchStatus.hidden = !browsing(); retry.hidden = !failure || !browsing();
    searchStatus.textContent = loading ? 'Loading pages…' : failure || (partial ? 'Some pages could not load. Search by name.'
      : !fetched.length && !saved.length ? 'No pages found.' : more ? (search.value.trim() ? 'Refine your search for more pages.' : 'Search to find other pages.') : '');
    return selected;
  }
  function setActive(index) {
    active = Math.max(0, Math.min(index, options.length - 1));
    items.forEach((item, position) => { item.dataset.active = String(position === active); });
    button.setAttribute('aria-activedescendant', items[active].id);
    if (browsing()) search.setAttribute('aria-activedescendant', items[active].id);
    items[active].scrollIntoView?.({ block: 'nearest' });
  }
  function outside(event) { if (!root.contains(event.target)) close(); }
  function open() {
    if (state.disabled || expanded) return;
    expanded = true; fetched = []; search.value = ''; failure = false; loading = browsing();
    options = optionList(); menu.hidden = false; button.setAttribute('aria-expanded', 'true');
    search.setAttribute('aria-expanded', 'true');
    const selected = Math.max(paint(), 0);
    // Open upward when the drawer footer would cover the menu.
    const bounds = button.getBoundingClientRect?.();
    const container = root.closest?.('.drawer-body')?.getBoundingClientRect();
    if (bounds) {
      const height = browsing() ? 340 : Math.min(menu.getBoundingClientRect().height, 340);
      const bottom = container?.bottom ?? document.documentElement.clientHeight;
      menu.dataset.side = bottom - bounds.bottom < height + 4 && bounds.top - (container?.top ?? 0) >= height + 4 ? 'up' : 'down';
    }
    setActive(selected);
    document.addEventListener('pointerdown', outside, true);
    if (browsing()) { search.focus(); void load(); }
  }
  async function load() {
    // Coalesce typing during a slow search into the latest query. Dropped UI
    // results must not create an unbounded queue of connector requests.
    if (inFlight) { queued = true; return; }
    inFlight = true; queued = false;
    const version = ++request, query = search.value;
    loading = true; failure = false; fetched = []; options = optionList(); paint();
    try {
      const result = await loadOptions(query);
      if (version !== request || !expanded || !browsing()) return;
      fetched = result.pages; more = result.hasMore; partial = result.partial; loading = false;
      options = optionList(); paint(); setActive(0);
    } catch (error) {
      if (version !== request || !expanded) return;
      loading = false; failure = error.message || 'Could not load pages.'; options = optionList(); paint(); setActive(0);
    } finally {
      inFlight = false;
      if (queued && expanded && browsing()) void load();
    }
  }
  function close() {
    if (!expanded) return;
    expanded = false; queued = false; ++request; clearTimeout(debounce); menu.hidden = true; button.setAttribute('aria-expanded', 'false'); button.removeAttribute('aria-activedescendant');
    search.setAttribute('aria-expanded', 'false');
    search.removeAttribute('aria-activedescendant'); fetched = [];
    document.removeEventListener('pointerdown', outside, true);
  }
  function choose(index) {
    const option = options[index];
    close();
    if (option.edit) return openEditor();
    if (confirmSelection && option.link && !sameLink(option.link, state.value)) return openEditor(option.link);
    onSelect(option.link || null); button.focus();
  }
  function openEditor(selected) {
    if (state.disabled) return;
    close();
    selectedConfirmation = Boolean(selected);
    link.value = (selected || state.value)?.target || ''; name.value = (selected || state.value)?.title || '';
    fields.hidden = selectedConfirmation; confirmation.hidden = !selectedConfirmation;
    confirmation.textContent = selected ? `Switch to ${selected.title}?` : '';
    error.hidden = true; editor.hidden = false; note.hidden = !state.note;
    (selectedConfirmation ? apply : link).focus();
  }
  function reset() { close(); editor.hidden = true; error.hidden = true; selectedConfirmation = false; }
  function closeEditor() { reset(); onEdit(); button.focus(); }
  function hasEdits() {
    return !editor.hidden && (link.value !== (state.value?.target || '') || nameField && name.value !== (state.value?.title || ''));
  }
  async function submit() {
    if (busy || state.disabled) return;
    busy = true;
    try {
      const message = await onApply({ target: link.value, name: nameField || selectedConfirmation ? name.value : '' });
      if (message) { error.textContent = message; error.hidden = false; (selectedConfirmation ? apply : link).focus(); }
      else closeEditor();
    } finally { busy = false; }
  }

  button.addEventListener('click', () => expanded ? close() : open());
  button.addEventListener('keydown', event => {
    if (!expanded) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(); }
      return;
    }
    const moves = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: options.length - 1 };
    if (Object.hasOwn(moves, event.key)) { event.preventDefault(); setActive(moves[event.key]); }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); spaceKey = event.key === ' '; choose(active); }
    else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    else if (event.key === 'Tab') close();
  });
  // Space activates buttons on keyup; stop that click from reopening the menu.
  button.addEventListener('keyup', event => { if (event.key === ' ' && spaceKey) { event.preventDefault(); spaceKey = false; } });
  search.addEventListener('input', () => {
    ++request; clearTimeout(debounce); fetched = []; loading = true; failure = false; options = optionList(); paint();
    search.removeAttribute('aria-activedescendant'); debounce = setTimeout(() => void load(), 300);
  });
  search.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); button.focus(); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive(event.key === 'ArrowDown' ? active + 1 : active - 1); }
    else if (event.key === 'Enter') { event.preventDefault(); if (!loading) choose(active); }
    else if (event.key === 'Tab') close();
  });
  retry.addEventListener('click', () => { search.focus(); void load(); });
  editor.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeEditor(); }
    else if (event.key === 'Enter' && event.target.tagName === 'INPUT') { event.preventDefault(); submit(); }
  });
  cancel.addEventListener('click', closeEditor);
  apply.addEventListener('click', submit);
  for (const input of [link, name]) input.addEventListener('input', onEdit);

  function render(next) {
    state = next;
    sourceLabel(value, next.value || { title: browsing() ? 'Choose a page' : optional ? 'None' : 'Not set' });
    button.dataset.empty = String(!next.value);
    button.disabled = next.disabled;
    for (const control of [link, name, cancel, apply]) control.disabled = next.disabled;
    apply.textContent = next.applyText || applyText;
    note.textContent = next.note || ''; note.hidden = !next.note || editor.hidden;
    // A pending switch confirmation keeps its choice; its question shows only while exclude() allows it.
    if (selectedConfirmation) confirmation.hidden = exclude({ target: link.value });
    if (next.disabled) close();
    else if (expanded) { options = optionList(); paint(); setActive(active); }
  }
  return { root, button, render, open, close, openEditor, reset, hasEdits, focusEditor: () => (selectedConfirmation ? apply : link).focus() };
}
