import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);
export const keychainService = 'com.onlinesourdough.osm.notion';

// Explicit opt-in prevents an upgrade from reading another connection or opening
// an unexpected Keychain prompt. Only OSM's dedicated item is ever requested.
export async function hostCredential({ platform = process.platform, env = process.env, run = execute } = {}) {
  if (platform !== 'darwin' || env.OSM_NOTION_KEYCHAIN !== '1') return { state: 'unsupported_host' };
  try {
    const { stdout } = await run('/usr/bin/security', ['find-generic-password', '-s', keychainService, '-a', 'osm', '-w'],
      { timeout: 5000, maxBuffer: 8192, encoding: 'utf8' });
    const token = stdout.trim();
    return token && token.length <= 4096 && !/\s/.test(token) ? { state: 'available', token } : { state: 'not_connected' };
  } catch (error) {
    // Never forward stderr, argv or provider text. Missing item is distinct from
    // a locked store, denied OS prompt, timeout or failed executable.
    return { state: error.code === 44 ? 'not_connected' : 'unavailable' };
  }
}
