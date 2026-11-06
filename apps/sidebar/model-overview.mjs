import { classifyTarget } from './target.mjs';
import { notionPageId } from './page-icons.mjs';

// A navigation overview of the selected AI Operating Model, derived only from
// its explicit structure: headings followed by lists of page or database
// references. Policy prose is never interpreted, links are never followed and
// the model text is never kept. Shared by the server and the panel.
export const LIMITS = { content: 256 * 1024, groups: 12, links: 20, total: 60, label: 100, target: 512, sections: 12, section: 300, listed: 24 };
export const outcomes = ['read', 'no_access', 'not_found', 'disconnected'];
const states = ['ready', 'ambiguous', 'unsupported', 'changed', 'no_access', 'not_found', 'disconnected'];
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
const decode = text => text.replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, name) => entities[name]);
export const cleanLabel = (value, max = LIMITS.label) => String(value ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
// Heading text without inline markup: mentions keep their visible text, links their label.
const plain = text => cleanLabel(decode(text.replace(/<([a-z-]+)\b[^>]*\/>/g, '').replace(/<([a-z-]+)\b[^>]*>([^<]*)<\/\1>/g, '$2')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`~]/g, '')));

// Typed references, and the generic <mention url> of current Notion fetches. The
// tag name must end at whitespace, / or >, so mention-user or an unknown suffix
// such as mention-pagex is never read as a document.
const referenceTags = '(?:mention-page|mention-database|mention-data-source|mention|page|database|data-source)(?=[\\s/>])';
const referenceTag = new RegExp(`^<(${referenceTags})([^>]*?)(?:\\/>|>([^<]*)<\\/\\1>)`);
// A reference must open the list item or stand alone on its line.
function leadingReference(text) {
  let match = text.match(referenceTag);
  if (match) {
    const url = match[2].match(/\burl="([^"]*)"/)?.[1];
    return url === undefined ? null : { title: match[3] ?? '', url, rest: text.slice(match[0].length) };
  }
  match = text.match(/^\[([^\]\n]*)\]\(([^)\s]+)\)/);
  return match ? { title: match[1], url: match[2], rest: text.slice(match[0].length) } : null;
}
// Only a short annotation may follow a source reference; running prose makes it an ordinary item.
const annotation = rest => /^\s*$/.test(rest) || /^\s*(?:[—–:·|(]|-\s)/.test(rest);
// An explicitly labelled row: a bold role label with exactly one colon, inside
// or just after the bold, then the reference itself. The label text holds no
// colon, and a reference must follow directly, so any second colon fails. Its
// tail may explain the role in prose; references in that tail are related or
// incidental and never routes. A label of any length is recognized; only its
// displayed name is cut to the usual label bound.
// Current Notion fetches write the same bold label as <b>role:</b> or <b>role</b>:.
const boldLabel = text => {
  const markdown = text.match(/^(\*\*|__)([^*_:\n]+?)(:?)\1(:?)[ \t]*/);
  if (markdown) return { length: markdown[0].length, text: markdown[2], inside: markdown[3], after: markdown[4] };
  const html = text.match(/^<b>([^<>:\n]+?)(:?)<\/b>(:?)[ \t]*/);
  return html && { length: html[0].length, text: html[1], inside: html[2], after: html[3] };
};
function labelledReference(text) {
  const label = boldLabel(text);
  if (!label || label.inside === label.after) return null;
  const role = cleanLabel(decode(label.text));
  const reference = leadingReference(text.slice(label.length));
  return reference && role ? { ...reference, role } : null;
}
// A row that looks like a source but does not fit the grammar: it starts with a
// reference, or with a bold or plain label, and any run of colons, directly
// followed by one. It is never turned into a route; it only marks the overview
// as missing something. A label wrapped in any single HTML element, such as
// <strong>, is reported this way too rather than silently ignored.
const referenceStart = new RegExp(`^(?:<${referenceTags}|\\[[^\\]\\n]*\\]\\()`);
function sourceLike(text) {
  if (referenceStart.test(text)) return true;
  return [/^(\*\*|__)[^\n]+?\1[: \t]*/, /^<([a-z]+)>[^<>\n]*<\/\1>[: \t]*/, /^[^:<>[\]*_\n]+:[: \t]*/]
    .some(label => { const prefix = text.match(label)?.[0]; return Boolean(prefix) && referenceStart.test(text.slice(prefix.length)); });
}

export function safeTarget(url) {
  const route = classifyTarget(decode(String(url)));
  if (!route || route.kind === 'path' || route.target.length > LIMITS.target || /[<>"]/.test(route.target)) return null;
  return route.target;
}
function shortLabel(target) {
  const url = new URL(target);
  return cleanLabel(url.hostname.replace(/^www\./, '') + (url.pathname === '/' ? '' : url.pathname), 60);
}

// The current fetch writes a standalone child page as three lines at one tab
// depth: <page url="…">, its plain title, then </page>. Only that exact shape is
// a reference. Any other block opened this way is counted once and skipped to
// its close at the same depth, the next heading outside a fence, or the end.
// An unclosed tag hides its own section's remainder, never a later section.
const fenceMarker = raw => raw.match(/^(\t*)( {0,3})(`{3,}|~{3,})(.*)$/);
const closesFence = (marker, fence) => marker && marker[1] === fence.depth && marker[3][0] === fence.run[0] && marker[3].length >= fence.run.length && !marker[4].trim();
const opensFence = marker => marker && !(marker[3][0] === '`' && marker[4].includes('`'));
const pageOpen = /^(\t*)<page url="([^"<>]*)">[ \t]*$/;
function childPage(lines, index) {
  const open = lines[index].match(pageOpen);
  if (!open) return null;
  let end = -1, next = index + 1, fence = null;
  for (; next < lines.length; next++) {
    const marker = fenceMarker(lines[next]);
    if (fence) { if (closesFence(marker, fence)) fence = null; continue; }
    if (opensFence(marker)) { fence = { depth: marker[1], run: marker[3] }; continue; }
    if (/^\s*#{1,6}\s/.test(lines[next])) break;
    if (lines[next].replace(/[ \t]+$/, '') === `${open[1]}</page>`) { end = next; break; }
  }
  const title = lines[index + 1]?.trim();
  if (end === index + 2 && title && !/[<>]/.test(title) && !/^(?:`{3,}|~{3,})/.test(title)) return { reference: { title, url: open[2], rest: '' }, next: end };
  return { reference: null, next: end < 0 ? next - 1 : end };
}

function sectionsOf(content) {
  const close = content.lastIndexOf('</content>'), open = content.indexOf('<content>');
  const body = open < 0 ? content : content.slice(open + 9, close > open ? close : undefined);
  const sections = [], stack = [];
  let current = { path: [], refs: [], others: 0, loose: 0 }, fence = null;
  sections.push(current);
  const lines = body.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index], line = raw.trim();
    // Fences are read from the raw line: at most three spaces may precede the
    // marker. Leading tabs are Notion's nesting of child blocks, so a code block
    // closes only at the tab depth it opened with, on a bare run of its own
    // character at least as long as the opening run. Anything else inside it,
    // including a more deeply indented run, is example text.
    const marker = fenceMarker(raw);
    if (fence) {
      if (closesFence(marker, fence)) fence = null;
      continue;
    }
    if (opensFence(marker)) { fence = { depth: marker[1], run: marker[3] }; continue; }
    if (!line || line.startsWith('>')) continue;
    const block = childPage(lines, index);
    if (block) {
      if (block.reference) current.refs.push(block.reference); else current.loose++;
      index = block.next; continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*?)\s*(?:\{[^{}]*\})?$/);
    if (heading) {
      const level = heading[1].length;
      while (stack.length && stack.at(-1).level >= level) stack.pop();
      stack.push({ level, title: plain(heading[2]) || 'Untitled' });
      current = { path: stack.map(item => item.title), refs: [], others: 0, loose: 0 };
      sections.push(current); continue;
    }
    const item = line.match(/^(?:[-*+]|\d+[.)])\s+(.*)$/);
    const entry = item ? item[1].trim() : line;
    const labelled = item ? labelledReference(entry) : null;
    const reference = labelled || leadingReference(entry);
    if (labelled || reference && annotation(reference.rest) && (item || !reference.rest.trim())) current.refs.push(reference);
    else {
      if (item) current.others++;
      if (sourceLike(entry)) current.loose++;
    }
  }
  return { sections: sections.filter(section => section.refs.length || section.others || section.loose), truncated: open >= 0 && close <= open };
}
const keyOf = path => path.join(' › ');

// Deterministic: the same text and selection always produce the same overview.
// Without a selection, every heading whose items are all references, or whose
// references are all role-labelled, becomes a group. A section that mixes
// unlabelled references with other items, or headings that repeat, cannot be
// resolved without the person's one-time section choice.
export function deriveOverview(content, { sections: selection } = {}) {
  if (typeof content !== 'string' || content.length > LIMITS.content) throw new Error('The model text is too large for an overview. Nothing was saved.');
  const parsed = sectionsOf(content);
  const counts = new Map();
  for (const section of parsed.sections) if (section.refs.length) counts.set(keyOf(section.path), (counts.get(keyOf(section.path)) || 0) + 1);
  const candidates = parsed.sections.filter(section => section.refs.length);
  // Other items make a section mixed only beside an unlabelled reference. When
  // every recognized reference carries an explicit role label, the rows say
  // which items are sources, so ordinary notes need no section choice.
  const mixed = section => section.others > 0 && !section.refs.every(reference => reference.role);
  const listed = candidates.slice(0, LIMITS.listed).map(section => ({ key: cleanLabel(keyOf(section.path), LIMITS.section), title: section.path.at(-1) || '', links: section.refs.length, mixed: mixed(section) }));
  let chosen = candidates, missing = [], state = 'ready';
  if (!candidates.length) state = 'unsupported';
  else if (Array.isArray(selection)) {
    const wanted = new Set(selection);
    chosen = candidates.filter(section => wanted.has(keyOf(section.path)) && counts.get(keyOf(section.path)) === 1);
    missing = selection.filter(key => !chosen.some(section => keyOf(section.path) === key));
    if (missing.length) state = 'changed';
  } else if (candidates.some(mixed) || [...counts.values()].some(count => count > 1)) state = 'ambiguous';
  let skipped = 0, total = 0, truncated = parsed.truncated;
  // Source-like rows the grammar cannot use are counted and mark the overview
  // partial; they are never shown. Rows in a section without any usable source
  // always count, so a lone valid section elsewhere cannot look complete.
  const loose = parsed.sections.filter(section => !section.refs.length).reduce((count, section) => count + section.loose, 0);
  if (loose) { skipped += loose; truncated = true; }
  const groups = [];
  if (['ready', 'changed'].includes(state)) for (const section of chosen) {
    if (groups.length >= LIMITS.groups) { truncated = true; break; }
    if (section.loose) { skipped += section.loose; truncated = true; }
    const links = new Map();
    for (const reference of section.refs) {
      const target = safeTarget(reference.url);
      if (!target) { skipped++; continue; }
      const identity = notionPageId(target) || target;
      if (links.has(identity)) continue;
      if (links.size >= LIMITS.links || total >= LIMITS.total) { truncated = true; continue; }
      // A labelled row is named by its role, with the reference's own text when it has any.
      const name = cleanLabel(decode(reference.title));
      const title = reference.role ? cleanLabel(name ? `${reference.role} · ${name}` : reference.role) : name || shortLabel(target);
      // Only here is it known that a title joins a role and a page name. When the
      // two are the same name, record the page name as a shorter display label.
      const label = reference.role && name && title === `${reference.role} · ${name}` && sameName(reference.role, name) ? name : '';
      links.set(identity, label ? { title, target, label } : { title, target }); total++;
    }
    if (!links.size) continue;
    groups.push({ path: section.path, links: [...links.values()] });
  }
  // A repeated last heading, such as Team under both Skills and Memory, keeps its parent.
  const last = groups.map(group => group.path.at(-1) || '');
  return {
    state, sections: listed, missing: missing.map(key => cleanLabel(key, LIMITS.section)), skipped, partial: truncated,
    groups: groups.map((group, index) => ({
      title: cleanLabel(last.filter(title => title === last[index]).length > 1 ? group.path.slice(-2).join(' › ') : last[index]),
      links: group.links,
    })),
  };
}

// Validates a stored or transmitted snapshot against what deriveOverview and a
// save produce. Anything over a bound or malformed, anywhere, rejects it whole;
// nothing is sliced away or repaired.
const text = (value, max, required = false) => typeof value === 'string' && value.length <= max && (!required || Boolean(cleanLabel(value, max)));
const counter = value => Number.isSafeInteger(value) && value >= 0;
const within = (value, max, valid) => Array.isArray(value) && value.length <= max && value.every(valid);
// Targets must already be strings: the URL check below would otherwise coerce
// an array or object into a valid-looking link.
const validTarget = target => text(target, LIMITS.target) && Boolean(safeTarget(target));
// An optional label must be the page-name half of its own title, naming the same
// thing as the role before it; anything else rejects the snapshot. Snapshots
// without labels, including those saved by earlier versions, stay valid.
const validLabel = link => link.label === undefined || text(link.label, LIMITS.label, true)
  && link.title.length > link.label.length + 3 && link.title.endsWith(` · ${link.label}`)
  && sameName(link.title.slice(0, -(link.label.length + 3)), link.label);
const validLink = link => record(link) && text(link.title, LIMITS.label, true) && validTarget(link.target) && validLabel(link);
const validGroup = group => record(group) && text(group.title, LIMITS.label) && Array.isArray(group.links) && group.links.length > 0 && within(group.links, LIMITS.links, validLink);
const validSection = section => record(section) && text(section.key, LIMITS.section) && text(section.title, LIMITS.label) && counter(section.links) && typeof section.mixed === 'boolean';
const validKey = key => text(key, LIMITS.section, true);
export function readOverview(value) {
  if (!record(value) || value.version !== 1 || !states.includes(value.state) || !record(value.model) || !validTarget(value.model.target)) return null;
  const target = safeTarget(value.model.target);
  const linked = ['ready', 'changed'].includes(value.state) ? LIMITS.groups : 0;
  if (classifyTarget(value.model.target)?.kind !== 'notion' || !text(value.model.title, LIMITS.label, true) || typeof value.model.identity !== 'string'
      || typeof value.readAt !== 'string' || Number.isNaN(Date.parse(value.readAt)) || !text(value.revision, LIMITS.label) || typeof value.complete !== 'boolean' || typeof value.partial !== 'boolean'
      || !counter(value.skipped) || !(value.selection === null || within(value.selection, LIMITS.sections, validKey)) || !within(value.missing, LIMITS.sections, validKey)
      || !within(value.sections, LIMITS.listed, validSection) || !(value.changes === null || record(value.changes) && counter(value.changes.added) && counter(value.changes.removed))
      || !within(value.groups, linked, validGroup) || value.groups.reduce((total, group) => total + group.links.length, 0) > LIMITS.total) return null;
  return {
    version: 1, state: value.state, model: { identity: value.model.identity, target, title: cleanLabel(value.model.title) },
    revision: cleanLabel(value.revision), readAt: new Date(value.readAt).toISOString(), complete: value.complete, partial: value.partial,
    selection: value.selection && value.selection.map(key => cleanLabel(key, LIMITS.section)), missing: value.missing.map(key => cleanLabel(key, LIMITS.section)), skipped: value.skipped,
    sections: value.sections.map(section => ({ key: cleanLabel(section.key, LIMITS.section), title: cleanLabel(section.title), links: section.links, mixed: section.mixed })),
    changes: value.changes && { added: value.changes.added, removed: value.changes.removed },
    groups: value.groups.map(group => ({ title: cleanLabel(group.title), links: group.links.map(link => ({ title: cleanLabel(link.title), target: safeTarget(link.target),
      ...(link.label === undefined ? {} : { label: cleanLabel(link.label) }) })) })),
  };
}

const sameTarget = (a, b) => Boolean(a && b) && (notionPageId(a) && notionPageId(b) ? notionPageId(a) === notionPageId(b) : a === b);
const hiddenBy = { not_installed: 'Notion is not installed', plugin_disabled: 'The Notion plugin is disabled', not_connected: 'Notion is not connected', disabled: 'Notion is disabled in Codex', unavailable: 'Notion needs attention' };
const failed = { no_access: 'the account could not access the model', not_found: 'the model was not found', disconnected: 'Notion was disconnected' };

// What the panel may say about the overview. Connected, read and saved are
// separate facts; none of them shows that an agent has loaded the model.
export function overviewView(status) {
  const model = readOverview(status?.model);
  if (!model) return status?.model?.state === 'unavailable' ? { unavailable: true } : null;
  const context = status.context || {};
  const pointer = ['ambiguous', 'unavailable'].includes(context.state) ? 'blocked'
    : context.state !== 'configured' ? 'none' : sameTarget(context.target, model.model.target) ? 'saved' : 'other';
  const hidden = hiddenBy[status.notion?.state];
  const readable = !failed[model.state];
  // notes need attention now; details explain an otherwise usable overview and
  // stay one step away, behind the visible coverage line.
  const notes = [], details = [];
  if (hidden) notes.push(`Overview hidden: ${hidden}. Reconnect, then ask Setup to refresh it.`);
  else if (!readable) notes.push(`The latest refresh could not read the model: ${failed[model.state]}. Its earlier overview was cleared.`);
  else if (model.state === 'ambiguous') notes.push('Some sections mix sources with other items, or repeat a heading. In chat, ask Setup which sections to show; their links stay as the model lists them.');
  else if (model.state === 'unsupported') notes.push('No heading followed by a list of page or database links was found, so nothing is shown. Open the model in Notion to navigate.');
  else if (model.state === 'changed') notes.push(`Chosen sections were not found in the latest read: ${model.missing.join(', ')}. Ask Setup to choose sections again.`);
  if (!hidden && readable && (model.partial || !model.complete)) details.push('Some sources may be missing: the read was incomplete or capped, or some rows did not fit the supported format. Open the model in Notion to see everything.');
  if (!hidden && readable && model.skipped) details.push(`${model.skipped} ${model.skipped === 1 ? 'source row or link was' : 'source rows or links were'} left out because their format or link is not supported.`);
  const unchosen = model.selection ? model.sections.filter(section => !model.selection.includes(section.key)).length : 0;
  if (!hidden && readable && unchosen) details.push(`${unchosen} other ${unchosen === 1 ? 'section with links is' : 'sections with links are'} not shown, as chosen in Setup.`);
  const changes = model.changes && (model.changes.added || model.changes.removed) ? `Since the previous snapshot: ${model.changes.added} added · ${model.changes.removed} removed` : '';
  return {
    title: model.model.title, target: model.model.target, state: model.state, readAt: model.readAt, revision: model.revision,
    // A generic "Operating model" label is only useful when the model's own title does not already say so.
    kind: !comparable(model.model.title).includes('operating model'),
    pointer, readable, hidden: Boolean(hidden), notes, details, changes,
    complete: model.complete, partial: model.partial, skipped: model.skipped,
    // A link shows its recorded label, otherwise its title exactly as stored: a
    // middle dot in a title is never taken as proof of a role and page name.
    groups: hidden || !readable ? [] : model.groups.map(group => ({ title: group.title, links: group.links.map(link => ({ title: link.label ?? link.title, target: link.target })) })),
    sections: !hidden && model.state === 'ambiguous' ? model.sections : [],
  };
}

// Whether a role and a page name are the same name. Conservative: only letter
// case, spacing and emoji shown as pictures (such as 🧠) are ignored. Canonical
// composition is applied, but no compatibility folding, so x² stays apart from
// x2; text symbols such as ® and punctuation such as C++ or C# always count.
const comparable = text => text.normalize('NFC').toLowerCase()
  .replace(/[\p{Emoji_Presentation}\p{Emoji_Modifier}‍️]/gu, '')
  .replace(/\s+/gu, ' ').trim();
const sameName = (a, b) => Boolean(comparable(a)) && comparable(a) === comparable(b);
