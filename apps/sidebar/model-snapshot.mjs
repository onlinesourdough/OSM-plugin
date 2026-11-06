import { open, lstat, mkdir, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { classifyTarget } from './target.mjs';
import { contextIdentity } from './sources.mjs';
import { LIMITS, outcomes, cleanLabel, deriveOverview, readOverview } from './model-overview.mjs';

// One derived snapshot for the most recently read model, replaced by each
// refresh. It holds labels, groups and links only, never the model text, and
// is not routing authority: the model in Notion stays canonical.
const LIMIT = 128 * 1024;
const home = () => process.env.CODEX_HOME || join(homedir(), '.codex');
const unavailable = 'The saved overview needs attention. It has been left unchanged.';
async function location(codexHome, create = false) {
  let folder = codexHome;
  for (const name of ['aios', 'overview']) {
    folder = join(folder, name);
    if (create) await mkdir(folder, { mode: 0o700 }).catch(error => { if (error.code !== 'EEXIST') throw error; });
    try { if (!(await lstat(folder)).isDirectory()) throw new Error(unavailable); }
    catch (error) { if (error.code !== 'ENOENT' || create) throw new Error(unavailable); }
  }
  return join(folder, 'model.json');
}
async function snapshot(path) {
  let handle;
  try {
    const info = await lstat(path);
    if (!info.isFile() || info.nlink !== 1 || info.size > LIMIT) throw new Error(unavailable);
    handle = await open(path, 'r');
    const opened = await handle.stat();
    if (opened.ino !== info.ino || opened.dev !== info.dev) throw new Error(unavailable);
    const buffer = Buffer.alloc(LIMIT + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > LIMIT) throw new Error(unavailable);
    const value = readOverview(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, bytesRead))));
    if (!value) throw new Error(unavailable);
    return value;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error(unavailable);
  } finally { await handle?.close(); }
}
export async function readModelOverview({ codexHome = home() } = {}) {
  try { return (await snapshot(await location(codexHome))) || { state: 'missing' }; }
  catch { return { state: 'unavailable' }; }
}

function input({ target, title, revision = '', outcome = 'read', content = '', complete = true, sections }) {
  const route = classifyTarget(target);
  if (route?.kind !== 'notion' || /[<>"]/.test(route.target) || route.target.length > LIMITS.target) throw new Error('Use the Notion link of the selected AI Operating Model.');
  const name = cleanLabel(title);
  if (!name || typeof title !== 'string' || title.length > LIMITS.label) throw new Error('Use the model’s page title, up to 100 characters.');
  if (typeof revision !== 'string' || revision.length > LIMITS.label) throw new Error('Use a revision label of up to 100 characters.');
  if (!outcomes.includes(outcome)) throw new Error('Unknown read outcome.');
  if (typeof content !== 'string' || content.length > LIMITS.content) throw new Error('The model text is too large for an overview. Nothing was saved.');
  if (outcome === 'read' && !content.trim()) throw new Error('Pass the model text exactly as the Notion fetch returned it.');
  if (sections !== undefined && (!Array.isArray(sections) || sections.length > LIMITS.sections || new Set(sections).size !== sections.length
      || sections.some(key => typeof key !== 'string' || !key.trim() || key.length > LIMITS.section || /[\x00-\x1f\x7f]/.test(key)))) throw new Error('Choose up to 12 listed sections by their exact names.');
  return { target: route.target, identity: contextIdentity(route.target), title: name, revision: cleanLabel(revision), outcome, content, complete: complete !== false, sections };
}
const targets = value => new Set(value?.groups?.flatMap(group => group.links.map(link => link.target)) ?? []);

// Called only during a refresh the person asked for in Setup or Settings. A
// failed read replaces the earlier overview, so stale links are not presented.
export async function saveModelOverview(args, { codexHome = home(), now = () => new Date() } = {}) {
  const value = input(args);
  const path = await location(codexHome, true);
  let lock, temporary;
  try {
    try { lock = await open(path + '.lock', 'wx', 0o600); }
    catch { throw new Error('Another overview update is in progress. Try again when it finishes.'); }
    const previous = await snapshot(path);
    const same = previous?.model.identity === value.identity;
    // The person's one-time section choice carries over to later refreshes of
    // the same model; an empty list clears it.
    const selection = value.sections === undefined ? (same ? previous.selection : null) : value.sections.length ? value.sections : null;
    const derived = value.outcome === 'read' ? deriveOverview(value.content, { sections: selection ?? undefined })
      : { state: value.outcome, groups: [], sections: [], missing: [], skipped: 0, partial: false };
    const before = targets(same ? previous : null), after = targets(derived);
    const changes = same && value.outcome === 'read' && !failedState(previous.state)
      ? { added: [...after].filter(target => !before.has(target)).length, removed: [...before].filter(target => !after.has(target)).length } : null;
    const saved = readOverview({ version: 1, model: { identity: value.identity, target: value.target, title: value.title }, revision: value.revision,
      readAt: now().toISOString(), complete: value.complete, selection, changes, ...derived });
    if (!saved) throw new Error('The overview could not be prepared. Nothing was saved.');
    const text = JSON.stringify(saved, null, 2) + '\n';
    if (Buffer.byteLength(text) > LIMIT) throw new Error('The overview is too large. Nothing was saved.');
    temporary = path + '.' + randomUUID() + '.tmp';
    const file = await open(temporary, 'wx', 0o600);
    try { await file.writeFile(text); await file.sync(); } finally { await file.close(); }
    await rename(temporary, path); temporary = undefined;
    const result = await readModelOverview({ codexHome });
    if (result.readAt !== saved.readAt) throw new Error('The overview changed again. Refresh to inspect it.');
    return result;
  } finally {
    if (temporary) await unlink(temporary).catch(() => {});
    if (lock) { await lock.close(); await unlink(path + '.lock'); }
  }
}
const failedState = state => ['no_access', 'not_found', 'disconnected'].includes(state);
