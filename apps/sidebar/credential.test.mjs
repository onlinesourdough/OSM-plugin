import test from 'node:test';
import assert from 'node:assert/strict';
import { hostCredential, keychainService } from './credential.mjs';

test('OSM credential access is opt-in, bounded and limited to its own Keychain item', async () => {
  let calls = 0;
  const run = async (file, args, options) => {
    calls++;
    assert.equal(file, '/usr/bin/security');
    assert.deepEqual(args, ['find-generic-password', '-s', keychainService, '-a', 'osm', '-w']);
    assert.equal(options.timeout, 5000);
    return { stdout: 'fictional-test-value\n' };
  };
  // Another OS is unsupported whatever is set; a Mac without an opt-in is a different state.
  // Neither requests the item.
  for (const [platform, env, enabled, state] of [['linux', { OSM_NOTION_KEYCHAIN: '1' }, true, 'unsupported_host'], ['win32', {}, true, 'unsupported_host'],
    ['darwin', {}, false, 'not_enabled'], ['darwin', { OSM_NOTION_KEYCHAIN: '0' }, false, 'not_enabled']]) {
    assert.deepEqual(await hostCredential({ platform, env, run, enabled }), { state });
  }
  assert.equal(calls, 0);
  // Either opt-in works: the owner's saved route for the selected context, or the earlier
  // explicit environment variable.
  for (const options of [{ env: { OSM_NOTION_KEYCHAIN: '1' } }, { env: {}, enabled: true }]) {
    assert.deepEqual(await hostCredential({ platform: 'darwin', run, ...options }), { state: 'available', token: 'fictional-test-value' });
  }
  assert.equal(calls, 2);
});

test('a Keychain failure is reported as one distinct state and never forwards OS text', async () => {
  const fail = error => hostCredential({ platform: 'darwin', env: {}, enabled: true, run: async () => { throw Object.assign(new Error('fictional secret in OS error'), error); } });
  const cases = [[{ code: 44 }, 'not_connected'], [{ code: 36 }, 'keychain_blocked'], [{ code: 51 }, 'keychain_blocked'], [{ code: 128 }, 'keychain_blocked'],
    [{ code: null, killed: true, signal: 'SIGTERM' }, 'keychain_timeout'], [{ code: 'ETIMEDOUT' }, 'keychain_timeout'], [{ code: 1 }, 'unavailable'], [{ code: 'ENOENT' }, 'unavailable']];
  for (const [error, state] of cases) assert.deepEqual(await fail({ stderr: 'fictional secret on stderr', ...error }), { state });
  for (const stdout of ['', '   \n', 'two words', 'x'.repeat(4097)]) {
    assert.deepEqual(await hostCredential({ platform: 'darwin', env: {}, enabled: true, run: async () => ({ stdout }) }), { state: 'not_connected' });
  }
});
