import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { fetchIcon, readPageIcon } from './notion-icons.mjs';
import { pageIcon } from './page-icons.mjs';

test('page icon variants use their metadata URL, keep bytes ephemeral and fall back on failure', async () => {
  const inline = 'data:image/png;base64,aWNvbg==';
  assert.equal(await readPageIcon({ type: 'emoji', emoji: '🧠' }), '🧠');
  for (const type of ['external', 'file', 'custom_emoji']) {
    const url = `https://example.com/${type}.png?fictional-signature=1`;
    assert.equal(await readPageIcon({ type, [type]: { url } }, async actual => { assert.equal(actual, url); return inline; }), inline);
    assert.equal(await readPageIcon({ type, [type]: { url } }, async () => { throw new Error('provider text'); }), null);
  }
  assert.equal(pageIcon(inline), inline);
  assert.equal(pageIcon('data:image/svg+xml;base64,PHN2Zz4='), null);
});

test('remote image boundary blocks private destinations and pins a public address without credentials', async () => {
  let calls = 0;
  const get = (url, options, receive) => {
    calls++;
    assert.equal(url.origin, 'https://example.com');
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.family, 4);
    options.lookup('example.com', {}, (_error, ip, family) => { assert.equal(ip, '93.184.216.34'); assert.equal(family, 4); });
    const req = new EventEmitter();
    req.end = () => {
      const res = Readable.from([Buffer.from('fictional-image')]);
      res.headers = { 'content-type': 'image/png' }; res.statusCode = 200;
      receive(res); res.on('end', () => req.emit('close'));
    };
    req.destroy = error => { req.emit('error', error); req.emit('close'); };
    return req;
  };
  for (const address of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1']) {
    await assert.rejects(fetchIcon('https://example.com/a.png', { resolve: async () => [{ address }], get }));
  }
  assert.equal(calls, 0);
  const result = await fetchIcon('https://example.com/a.png', { resolve: async () => [{ address: '93.184.216.34' }], get });
  assert.equal(result, 'data:image/png;base64,' + Buffer.from('fictional-image').toString('base64'));
  assert.equal(calls, 1);
});


test('image redirects, unsupported content and oversize bodies fail without following another URL', async () => {
  for (const [status, mime, size] of [[302, 'image/png', 1], [200, 'text/html', 1], [200, 'image/png', 65537]]) {
    let calls = 0;
    const get = (_url, _options, receive) => {
      calls++; const req = new EventEmitter();
      req.end = () => {
        const res = Readable.from([Buffer.alloc(size)]);
        res.statusCode = status; res.headers = { 'content-type': mime, location: 'http://127.0.0.1/private' };
        receive(res); res.on('close', () => req.emit('close')); res.on('end', () => req.emit('close'));
      };
      req.destroy = error => { req.emit('error', error); req.emit('close'); };
      return req;
    };
    await assert.rejects(fetchIcon('https://example.com/icon', { resolve: async () => [{ address: '93.184.216.34' }], get }));
    assert.equal(calls, 1);
  }
});
