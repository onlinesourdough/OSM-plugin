import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);
export const keychainService = 'com.onlinesourdough.osm.notion';

// `security` exits with the low byte of the OSStatus it hit. These are the statuses that
// mean the store is locked, the OS prompt was declined or authentication failed
// (errSecInteractionNotAllowed, errSecAuthFailed, errSecUserCanceled). Anything else
// stays a plain failure; no OS text is ever read.
const blockedStatuses = new Set([36, 51, 128]);

// The caller says whether the owner turned this route on for the selected context
// (`enabled`, from OSM's own non-secret configuration); `OSM_NOTION_KEYCHAIN=1` in the
// server's environment is the earlier explicit pilot opt-in and still works. Without
// either, nothing is requested, so an upgrade never reads another connection or opens an
// unexpected Keychain prompt. Only OSM's dedicated item is ever requested.
export async function hostCredential({ platform = process.platform, env = process.env, run = execute, enabled = false } = {}) {
  if (platform !== 'darwin') return { state: 'unsupported_host' };
  if (!enabled && env.OSM_NOTION_KEYCHAIN !== '1') return { state: 'not_enabled' };
  try {
    const { stdout } = await run('/usr/bin/security', ['find-generic-password', '-s', keychainService, '-a', 'osm', '-w'],
      { timeout: 5000, maxBuffer: 8192, encoding: 'utf8' });
    const token = stdout.trim();
    return token && token.length <= 4096 && !/\s/.test(token) ? { state: 'available', token } : { state: 'not_connected' };
  } catch (error) {
    // Never forward stderr, argv or provider text. A missing item, a locked or declined
    // store, a timeout and any other failure are four different states.
    if (error?.code === 44) return { state: 'not_connected' };
    if (error?.killed || error?.signal || error?.code === 'ETIMEDOUT') return { state: 'keychain_timeout' };
    return { state: blockedStatuses.has(error?.code) ? 'keychain_blocked' : 'unavailable' };
  }
}
