import { open, lstat, mkdir, rename, unlink, readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { classifyTarget } from './target.mjs';

const LIMIT = 64 * 1024;
const defaultHome = () => process.env.CODEX_HOME || join(homedir(), '.codex');
const revision = (text) => createHash('sha256').update(text === null ? 'missing' : 'file:' + text).digest('hex');
export function parseContextRoute(text) {
  text = text.replace(/^\uFEFF/, '');
  const starts = [...text.matchAll(/<!-- AIOS:BEGIN -->/g)];
  const ends = [...text.matchAll(/<!-- AIOS:END -->/g)];
  if (!starts.length && !ends.length) return { state: 'missing' };
  if (starts.length !== 1 || ends.length !== 1 || starts[0].index >= ends[0].index) return { state: 'ambiguous' };
  if (!/^<!-- AIOS:BEGIN -->\r?$/m.test(text) || !/^<!-- AIOS:END -->\r?$/m.test(text)) return { state: 'ambiguous' };
  const block = text.slice(starts[0].index + starts[0][0].length, ends[0].index);
  const routes = [...block.matchAll(/^Context:[ \t]*(.*)$/gm)];
  if (routes.length !== 1) return { state: 'ambiguous' };
  const route = classifyTarget(routes[0][1].trim().replace(/\.$/, ''));
  return route ? { state: 'configured', ...route } : { state: 'ambiguous' };
}
async function snapshot(codexHome) {
  let handle;
  try {
    const path = join(codexHome, 'AGENTS.md');
    const info = await lstat(path);
    if (!info.isFile() || info.size > LIMIT || info.nlink !== 1) throw new Error('unsupported');
    handle = await open(path, 'r');
    const opened = await handle.stat();
    if (info.ino !== opened.ino || info.dev !== opened.dev) throw new Error('changed');
    const buffer = Buffer.alloc(LIMIT + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > LIMIT) throw new Error('too large');
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, bytesRead));
    return { text, revision: revision(text), mode: info.mode & 0o777 };
  } catch (error) {
    if (error.code === 'ENOENT') return { text: null, revision: revision(null), mode: 0o600 };
    throw new Error('Context instructions are unavailable. No changes were made.');
  } finally { await handle?.close(); }
}
export async function readContextRoute({ codexHome = defaultHome() } = {}) {
  try {
    const value = await snapshot(codexHome);
    return { ...parseContextRoute(value.text || ''), revision: value.revision };
  } catch { return { state: 'unavailable' }; }
}
export function replaceContext(text, target, bridge) {
  const route = classifyTarget(target);
  if (!route || /[<>]/.test(route.target)) throw new Error('Enter an HTTPS context link or an absolute folder path.');
  const current = parseContextRoute(text || '');
  if (current.state === 'ambiguous') throw new Error('Existing context instructions need attention. They have been left unchanged.');
  if (current.target === route.target) return text;
  const original = text || '';
  if (current.state === 'configured') {
    // Preserve every rule; replace only the owned location inside the single routing block.
    const next = original.replace(/<!-- AIOS:BEGIN -->[\s\S]*?<!-- AIOS:END -->/, (block) =>
      block.replace(/^Context:[^\r\n]*/m, () => `Context: ${route.target}.`));
    if (parseContextRoute(next).target !== route.target) throw new Error('Existing context instructions need attention. They have been left unchanged.');
    return next;
  }
  const addition = bridge.replace('<verified-notion-root-entry-url>', () => route.target);
  if (parseContextRoute(addition).target !== route.target) throw new Error('Invalid packaged context template.');
  return original + (original && !original.endsWith('\n') ? '\n\n' : original ? '\n' : '') + addition;
}
export async function saveContextRoute({ target, expectedRevision }, { codexHome = defaultHome(), bridge } = {}) {
  await mkdir(codexHome, { recursive: true, mode: 0o700 });
  const path = join(codexHome, 'AGENTS.md');
  const lockPath = path + '.aios-lock';
  let lock, temporary;
  try {
    try { lock = await open(lockPath, 'wx', 0o600); }
    catch { throw new Error('Another context update is in progress. Try again when it finishes.'); }
    const before = await snapshot(codexHome);
    if (before.revision !== expectedRevision) throw new Error('Context instructions changed. Refresh before saving again.');
    const next = replaceContext(before.text, target, bridge);
    if (next === before.text) return readContextRoute({ codexHome });
    if (Buffer.byteLength(next) > LIMIT) throw new Error('Context instructions are too large. No changes were made.');
    if (before.text !== null) {
      const backupDir = join(codexHome, 'backups', 'aios-context');
      await mkdir(backupDir, { recursive: true, mode: 0o700 });
      const backupPath = join(backupDir, before.revision + '.md');
      let backup;
      try { backup = await open(backupPath, 'wx', 0o600); await backup.writeFile(before.text); await backup.sync(); }
      catch (error) {
        if (error.code !== 'EEXIST' || await readFile(backupPath, 'utf8') !== before.text) throw new Error('Could not preserve existing instructions. No changes were made.');
      } finally { await backup?.close(); }
    }
    temporary = path + '.' + randomUUID() + '.tmp';
    const output = await open(temporary, 'wx', before.mode);
    try { await output.writeFile(next); await output.sync(); } finally { await output.close(); }
    if ((await snapshot(codexHome)).revision !== before.revision) throw new Error('Context instructions changed. Refresh before saving again.');
    await rename(temporary, path); temporary = undefined;
    const result = await readContextRoute({ codexHome });
    if (result.revision !== revision(next)) throw new Error('The saved context changed again. Refresh to inspect it.');
    return result;
  } finally {
    if (temporary) await unlink(temporary).catch(() => {});
    if (lock) { await lock.close(); await unlink(lockPath); }
  }
}
