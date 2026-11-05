import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync, chmodSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { externalPath, parseArguments, resolveProductionProject, runDapi, inspectCheckout } from '../../skills/diffusion-studio/scripts/diffusion-studio.mjs';
import { loadAndValidate, validateGraph } from '../../skills/content/scripts/check-content-graph.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const launcher = path.join(root, 'skills/diffusion-studio/scripts/diffusion-studio.mjs');
const validator = path.join(root, 'skills/content/scripts/check-content-graph.mjs');
const fixture = fileURLToPath(new URL('./fixtures/content-graph', import.meta.url));
const hash = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
function scratch(t) {
  const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'content paths with spaces-')));
  t.after(() => {
    const writable = current => { chmodSync(current, 0o755); for (const e of readdirSync(current, {withFileTypes:true})) if (e.isDirectory()) writable(path.join(current,e.name)); };
    if (existsSync(dir)) writable(dir);
    rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}
function snapshot(dir) {
  const files = {};
  function visit(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const candidate = path.join(current, entry.name);
      if (entry.isDirectory()) visit(candidate);
      else files[path.relative(dir, candidate)] = hash(readFileSync(candidate));
    }
  }
  visit(dir);
  return files;
}

test('open requires an explicit absolute production root and validates before checkout access', t => {
  const temp = scratch(t);
  const cases = [
    [['open', 'project'], /requires --production-root/],
    [['open', '--production-root', 'relative', 'project'], /absolute external path/],
    [['open', '--production-root', root, 'project'], /immutable skill package/],
    [['open', '--production-root', temp, '../escape'], /Project must stay within/],
    [['setup', 'unexpected'], /does not accept/],
    [['status', '--production-root', temp], /does not accept/],
  ];
  for (const [args, message] of cases) {
    const result = spawnSync(process.execPath, [launcher, ...args], { cwd: temp, encoding: 'utf8' });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, message);
    assert.doesNotMatch(result.stderr, /checkout is missing|git check failed/);
  }
  assert.equal(parseArguments(['open', '--production-root', temp, 'a project']).productionRoot, temp);
});

test('external work cannot overlap the package through a parent path or symlink', t => {
  const temp = scratch(t);
  assert.throws(() => externalPath(path.dirname(root), 'Work'), /immutable skill package/);
  const alias = path.join(temp, 'package-alias');
  symlinkSync(root, alias, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => externalPath(path.join(alias, 'future-cache'), 'Cache'), /immutable skill package/);
  assert.throws(() => resolveProductionProject('.', alias), /immutable skill package/);
});

test('project is relative to explicit work root and DAPI subprocess receives canonical argv and external cwd', t => {
  const temp = scratch(t);
  const production = path.join(temp, 'production');
  const project = path.join(production, 'a project');
  const checkout = path.join(temp, 'external editor');
  mkdirSync(project, { recursive: true });
  mkdirSync(path.join(checkout, 'apps/cli/dist'), { recursive: true });
  writeFileSync(path.join(project, 'package.json'), '{"projectId":"external-project"}');
  writeFileSync(path.join(project, 'proof.txt'), 'real project bytes');
  writeFileSync(path.join(checkout, 'apps/cli/dist/index.js'), `
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
fs.mkdirSync('.runtime-cache', {recursive:true});
fs.writeFileSync('.runtime-cache/receipt.txt', 'external');
console.log(JSON.stringify({args, cwd:process.cwd(), bytes:fs.readFileSync(path.join(args[1], 'proof.txt'), 'utf8')}));
`);
  const selected = resolveProductionProject('a project', production);
  assert.equal(selected, realpathSync(project));
  const result = JSON.parse(runDapi(checkout, ['browser', selected]));
  assert.deepEqual(result, { args: ['browser', selected], cwd: realpathSync(checkout), bytes: 'real project bytes' });
  assert.equal(readFileSync(path.join(checkout, '.runtime-cache/receipt.txt'), 'utf8'), 'external');
  assert.equal(existsSync(path.join(root, '.runtime-cache')), false);
});

test('relocated read-only skill runs actual subprocess paths without package data or ACS checkout', t => {
  const temp = scratch(t);
  const installed = path.join(temp, 'immutable plugin');
  cpSync(path.join(root, 'skills/diffusion-studio'), path.join(installed, 'skills/diffusion-studio'), { recursive: true });
  cpSync(path.join(root, 'skills/content'), path.join(installed, 'skills/content'), { recursive: true });
  const before = snapshot(installed);
  const makeReadonly = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) makeReadonly(p); else chmodSync(p, 0o444);
    }
    chmodSync(dir, 0o555);
  };
  // Restore directory permissions for cross-platform temporary cleanup.
  t.after(() => {
    const writable = dir => { chmodSync(dir, 0o755); for (const e of readdirSync(dir, {withFileTypes:true})) if (e.isDirectory()) writable(path.join(dir,e.name)); };
    if (existsSync(installed)) writable(installed);
  });
  makeReadonly(installed);
  const work = path.join(temp, 'external work');
  cpSync(fixture, work, { recursive: true });
  const result = execFileSync(process.execPath, [path.join(installed, 'skills/content/scripts/check-content-graph.mjs'), path.join(work, 'content-graph.json'), path.join(work, 'publisher-handoff.json')], { cwd: installed, encoding: 'utf8' });
  assert.match(result, /PASS content graph and supervised publisher handoff/);
  const movedLauncher = path.join(installed, 'skills/diffusion-studio/scripts/diffusion-studio.mjs');
  const described = JSON.parse(execFileSync(process.execPath, [movedLauncher, 'describe', '--platform', 'win32'], { cwd: work, encoding: 'utf8' }));
  assert.equal(described.platform, 'win32');
  const project = path.join(work, 'project with spaces');
  mkdirSync(project);
  writeFileSync(path.join(project, 'package.json'), '{}');
  const checkout = path.join(temp, 'editor');
  mkdirSync(path.join(checkout, 'apps/cli/dist'), {recursive:true});
  writeFileSync(path.join(checkout, 'apps/cli/dist/index.js'), 'console.log(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)}))');
  const script = `import {resolveProductionProject,runDapi} from ${JSON.stringify(pathToFileURL(movedLauncher).href)}; console.log(runDapi(process.argv[1],['browser',resolveProductionProject('project with spaces',process.argv[2])]))`;
  const output = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script, checkout, work], {cwd:installed, encoding:'utf8'}));
  assert.deepEqual(output, {cwd:realpathSync(checkout), args:['browser',realpathSync(project)]});
  assert.deepEqual(snapshot(installed), before);
});

test('checkout inspection refuses a real mismatched Git checkout without mutating it', t => {
  const temp = scratch(t);
  const checkout = path.join(temp, 'wrong-editor');
  mkdirSync(checkout);
  execFileSync('git', ['init', checkout], {stdio:'pipe'});
  writeFileSync(path.join(checkout, 'owner-state.txt'), 'preserve');
  const before = snapshot(checkout);
  const result = inspectCheckout(checkout, {includeLive:false, requireBuild:false});
  assert.equal(result.ok, false);
  assert.deepEqual(snapshot(checkout), before);
});

test('graph CLI runs outside the package and catches changed bytes and stale handoff bindings', t => {
  const temp = scratch(t);
  const production = path.join(temp, 'content outcome');
  cpSync(fixture, production, {recursive:true});
  const gp = path.join(production, 'content-graph.json');
  const hp = path.join(production, 'publisher-handoff.json');
  assert.deepEqual(loadAndValidate(gp,hp), []);
  const graph = JSON.parse(readFileSync(gp));
  const node = graph.nodes.find(n => n.id === 'node-master');
  writeFileSync(path.join(production, node.path), 'changed bytes');
  let result = spawnSync(process.execPath,[validator,gp,hp],{cwd:temp,encoding:'utf8'});
  assert.equal(result.status,1);
  assert.match(result.stderr,/does not match/);
  node.version += 1;
  node.sha256 = hash('changed bytes');
  node.review = {status:'in_review', reviewer:null, reference:null};
  graph.family.version += 1;
  writeFileSync(gp,JSON.stringify(graph));
  const errors = loadAndValidate(gp,hp);
  for (const pattern of [/graph_version/, /graph_sha256/, /version must match/, /without that node's own approval/]) assert.ok(errors.some(e=>pattern.test(e)), errors.join('\n'));
});

test('graph rejects path traversal and symlink escapes while allowing one real node', t => {
  const temp = scratch(t);
  cpSync(fixture,path.join(temp,'work'),{recursive:true});
  const production=path.join(temp,'work');
  const graph=JSON.parse(readFileSync(path.join(production,'content-graph.json')));
  graph.nodes=graph.nodes.slice(0,1); graph.edges=[];
  assert.deepEqual(validateGraph(graph,production),[]);
  for (const candidate of ['../outside.txt', '/absolute.txt', 'C:\\escape.txt', 'x/../source.txt']) {
    const altered=structuredClone(graph); altered.nodes[0].path=candidate;
    assert.ok(validateGraph(altered,production).some(e=>e.includes('normalized relative')));
  }
  writeFileSync(path.join(temp,'outside.txt'),'outside');
  symlinkSync(path.join(temp,'outside.txt'),path.join(production,'escape.txt'));
  graph.nodes[0].path='escape.txt'; graph.nodes[0].sha256=hash('outside');
  assert.ok(validateGraph(graph,production).some(e=>e.includes('outside the graph directory')));
});

test('empty graph and handoff templates cannot be mistaken for completed content', t => {
  const temp=scratch(t);
  const graph=JSON.parse(readFileSync(path.join(root,'skills/content/assets/templates/content-graph.json')));
  assert.ok(validateGraph(graph,temp).some(e=>e.includes('non-empty')));
});
