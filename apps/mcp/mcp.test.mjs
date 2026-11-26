import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildBundle, renderBundleSource } from './build.mjs';
import { OSM_BUNDLE } from './bundle.generated.mjs';
import { handleHttpRequest, handleJsonRpcMessage } from './core.mjs';
import { startHttpServer } from './http.mjs';
import worker from './worker.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

test('generated bundle matches deterministic rebuild byte-for-byte', () => {
  const rebuilt = buildBundle(REPO_ROOT);
  const rendered = renderBundleSource(rebuilt);
  const checkedIn = readFileSync(resolve(HERE, 'bundle.generated.mjs'), 'utf8');
  assert.equal(checkedIn, rendered);
  assert.equal(rebuilt.skill_count, 8);
  assert.equal(rebuilt.version, JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8')).version);
});

test('every bundled file matches disk bytes and SHA-256', () => {
  for (const [relPath, entry] of Object.entries(OSM_BUNDLE.files)) {
    const disk = readFileSync(resolve(REPO_ROOT, relPath), 'utf8');
    const digest = createHash('sha256').update(disk, 'utf8').digest('hex');
    assert.equal(entry.content, disk, `content drift: ${relPath}`);
    assert.equal(entry.sha256, digest, `sha256 drift: ${relPath}`);
  }
});

test('MCP initialize, ping, tools/list, tools/call, resources, and prompts work', () => {
  const init = handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } },
  });
  assert.equal(init.result.protocolVersion, '2025-03-26');
  assert.equal(init.result.serverInfo.name, 'osm-mcp');
  assert.equal(init.result.serverInfo.version, OSM_BUNDLE.version);

  assert.equal(
    handleJsonRpcMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    null,
  );

  const ping = handleJsonRpcMessage({ jsonrpc: '2.0', id: 2, method: 'ping' });
  assert.deepEqual(ping.result, {});

  const list = handleJsonRpcMessage({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
  assert.deepEqual(
    list.result.tools.map((t) => t.name),
    ['osm_get_setup_guide', 'osm_list_skills', 'osm_get_skill', 'osm_get_reference', 'osm_version'],
  );

  const listedSkills = handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: { name: 'osm_list_skills', arguments: {} },
  });
  assert.equal(listedSkills.result.structuredContent.skills.length, 8);
  assert.equal(listedSkills.result.structuredContent.privacy.auth, 'none');
  assert.equal(listedSkills.result.structuredContent.privacy.logs_user_data, false);

  const setup = handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: { name: 'osm_get_setup_guide', arguments: {} },
  });
  assert.match(setup.result.content[0].text, /# OSM:setup/);
  assert.match(setup.result.content[0].text, /Use OSM Prime when relevant context is missing/);

  const prime = handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: { name: 'osm_get_skill', arguments: { name: 'osm-prime' } },
  });
  assert.equal(prime.result.structuredContent.name, 'osm-prime');
  assert.match(prime.result.content[0].text, /# OSM:prime/);

  const ref = handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: { name: 'osm_get_reference', arguments: { path: 'docs/osm.md' } },
  });
  assert.equal(ref.result.structuredContent.path, 'docs/osm.md');
  assert.match(ref.result.content[0].text, new RegExp(`OSM version: ${OSM_BUNDLE.version}`));

  const version = handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 8,
    method: 'tools/call',
    params: { name: 'osm_version', arguments: {} },
  });
  assert.equal(version.result.structuredContent.bundle_sha256, OSM_BUNDLE.bundle_sha256);

  const resources = handleJsonRpcMessage({ jsonrpc: '2.0', id: 9, method: 'resources/list' });
  assert.ok(resources.result.resources.some((r) => r.uri === 'osm://skill/osm-setup'));

  const readRes = handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 10,
    method: 'resources/read',
    params: { uri: 'osm://overview' },
  });
  assert.match(readRes.result.contents[0].text, /The Onlinesourdough Method/);

  const prompts = handleJsonRpcMessage({ jsonrpc: '2.0', id: 11, method: 'prompts/list' });
  assert.equal(prompts.result.prompts[0].name, 'osm-setup');

  const getPrompt = handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 12,
    method: 'prompts/get',
    params: { name: 'osm-setup' },
  });
  assert.match(getPrompt.result.messages[0].content.text, /# OSM:setup/);
});

test('path traversal and unknown skills are rejected cleanly', () => {
  for (const badPath of ['../package.json', '../../etc/passwd', 'package.json', 'skills/../README.md', '__proto__']) {
    const res = handleJsonRpcMessage({
      jsonrpc: '2.0',
      id: 20,
      method: 'tools/call',
      params: { name: 'osm_get_reference', arguments: { path: badPath } },
    });
    assert.equal(res.result.isError, true, `should reject: ${badPath}`);
  }

  const badSkill = handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 21,
    method: 'tools/call',
    params: { name: 'osm_get_skill', arguments: { name: 'nonexistent' } },
  });
  assert.equal(badSkill.result.isError, true);
});

test('HTTP and Cloudflare Worker enforce no-auth, pinned version routes, and Streamable HTTP semantics', async () => {
  // Reject Authorization and Cookie headers so credentials are never accepted.
  const authRes = await worker.fetch(
    new Request('https://mcp.onlinesourdough.com/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer secret-token' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    }),
  );
  assert.equal(authRes.status, 400);

  const cookieRes = await handleHttpRequest(
    new Request('https://mcp.onlinesourdough.com/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'session=abc' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    }),
  );
  assert.equal(cookieRes.status, 400);

  // Health endpoint
  const health = await worker.fetch(new Request('https://mcp.onlinesourdough.com/health'));
  assert.equal(health.status, 200);
  const healthJson = await health.json();
  assert.equal(healthJson.version, OSM_BUNDLE.version);
  assert.equal(healthJson.privacy.auth, 'none');

  // Pinned version endpoint matches current version
  const pinnedOk = await worker.fetch(
    new Request(`https://mcp.onlinesourdough.com/v${OSM_BUNDLE.version}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    }),
  );
  assert.equal(pinnedOk.status, 200);
  assert.deepEqual((await pinnedOk.json()).result, {});

  // Wrong pinned version returns 404 (never silently serves mismatched prompt version)
  const pinnedMiss = await worker.fetch(
    new Request('https://mcp.onlinesourdough.com/v0.0.1/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    }),
  );
  assert.equal(pinnedMiss.status, 404);

  // GET /mcp returns 405 (stateless Streamable HTTP)
  const getMcp = await worker.fetch(new Request('https://mcp.onlinesourdough.com/mcp'));
  assert.equal(getMcp.status, 405);

  // Notification returns 202 Accepted
  const notif = await worker.fetch(
    new Request('https://mcp.onlinesourdough.com/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    }),
  );
  assert.equal(notif.status, 202);
});

test('local stdio subprocess serves MCP requests offline', async () => {
  const child = spawn(process.execPath, [resolve(HERE, 'stdio.mjs')], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const outputPromise = new Promise((resolvePromise, rejectPromise) => {
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
      if (stdout.trim().split('\n').length >= 2) {
        child.stdin.end();
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code !== 0) {
        rejectPromise(new Error(`stdio exited with ${code}: ${stderr}`));
      } else {
        resolvePromise(stdout.trim().split('\n').map((line) => JSON.parse(line)));
      }
    });
  });

  child.stdin.write(
    `${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } })}\n`,
  );
  child.stdin.write(
    `${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'osm_version', arguments: {} } })}\n`,
  );

  const lines = await outputPromise;
  assert.equal(lines.length, 2);
  assert.equal(lines[0].result.serverInfo.name, 'osm-mcp');
  assert.equal(lines[1].result.structuredContent.version, OSM_BUNDLE.version);
});

test('local HTTP runner serves live Streamable HTTP requests', async () => {
  const { server, host, port } = await startHttpServer({ host: '127.0.0.1', port: 0 });
  try {
    const res = await fetch(`http://${host}:${port}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'osm_list_skills', arguments: {} },
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.result.structuredContent.skills.length, 8);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
