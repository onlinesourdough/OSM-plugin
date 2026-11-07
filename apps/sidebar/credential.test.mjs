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
  for (const [platform, env] of [['linux', { OSM_NOTION_KEYCHAIN: '1' }], ['darwin', {}]]) {
    assert.deepEqual(await hostCredential({ platform, env, run }), { state: 'unsupported_host' });
  }
  assert.equal(calls, 0);
  assert.deepEqual(await hostCredential({ platform: 'darwin', env: { OSM_NOTION_KEYCHAIN: '1' }, run }),
    { state: 'available', token: 'fictional-test-value' });
  for (const code of [44, 36, 'ETIMEDOUT']) {
    const result = await hostCredential({ platform: 'darwin', env: { OSM_NOTION_KEYCHAIN: '1' }, run: async () => {
      throw Object.assign(new Error('fictional secret in OS error'), { code });
    } });
    assert.deepEqual(result, { state: code === 44 ? 'not_connected' : 'unavailable' });
  }
});
