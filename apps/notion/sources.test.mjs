import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm, symlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readContextRoute, saveContextRoute } from './context-route.mjs';
import { readSources, saveSources, contextIdentity } from './sources.mjs';
import { readConnectionRoute, saveConnectionRoute, routeFormat, routeMode } from './connection-route.mjs';
const bridge = await readFile(new URL('../../skills/osm-data-context/assets/bridge.md', import.meta.url), 'utf8');
const target = 'https://app.notion.com/p/00000000000000000000000000000001';
const links = { docs: { title: 'Documents', target: 'https://example.com/docs' }, personalSkills: { title: 'My skills', target: 'https://example.com/skills' }, memory: { title: 'Decisions', target: 'https://example.com/memory' } };
async function fixture(t) {
  const codexHome = await mkdtemp(join(tmpdir(), 'osm-sources-test-')); t.after(() => rm(codexHome,{recursive:true,force:true}));
  const options = { codexHome, bridge };
  const before = await readContextRoute(options);
  const context = await saveContextRoute({target,expectedRevision:before.revision},options);
  const sources = await readSources(target,options);
  return { options, context, args: { target, expectedContextRevision: context.revision, expectedRevision: sources.revision, title: 'Our AIOS', links } };
}
test('source links persist independently of instructions and repeating the save is a no-op', async t => {
  const {options,args}=await fixture(t), before=await readFile(join(options.codexHome,'AGENTS.md'));
  const saved=await saveSources(args,options);
  assert.deepEqual(saved.links,links); assert.deepEqual(await readSources(target,options),saved);
  assert.deepEqual(await readFile(join(options.codexHome,'AGENTS.md')),before);
  assert.deepEqual(await saveSources({...args,expectedRevision:saved.revision},options),saved);
  assert.equal((await readdir(join(options.codexHome,'context-state'))).length,1);
});
test('links saved under CODEX_HOME/context-state load cleanly', async t => {
  const {options}=await fixture(t), identity=contextIdentity(target);
  const name=createHash('sha256').update(identity).digest('hex')+'.json';
  await mkdir(join(options.codexHome,'context-state'),{recursive:true});
  await writeFile(join(options.codexHome,'context-state',name),JSON.stringify({version:1,contextIdentity:identity,title:'Our Context',links},null,2)+'\n');
  const read=await readSources(target,options);
  assert.equal(read.state,'saved'); assert.equal(read.title,'Our Context'); assert.deepEqual(read.links,links);
  assert.deepEqual((await readdir(options.codexHome)).sort(),['AGENTS.md','context-state']);
});
test('different contexts cannot inherit sources; copied Notion URLs preserve page identity', async t => {
  const {options,args,context}=await fixture(t); await saveSources(args,options);
  assert.equal(contextIdentity(target),contextIdentity(target+'?source=copy_link'));
  assert.deepEqual((await readSources(target+'?source=copy_link',options)).links,links);
  const another='https://app.notion.com/p/00000000000000000000000000000099';
  await saveContextRoute({target:another,expectedRevision:context.revision},options);
  assert.equal((await readSources(another,options)).state,'missing');
  await assert.rejects(saveSources(args,options),/context changed/);
  assert.deepEqual((await readSources(target,options)).links,links);
});
test('concurrent writes and stale revisions preserve the winner and backup earlier links', async t => {
  const {options,args}=await fixture(t);
  const results=await Promise.allSettled([saveSources(args,options),saveSources({...args,title:'Other title'},options)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const saved=await readSources(target,options);
  await assert.rejects(saveSources(args,options),/changed/);
  const after=await saveSources({...args,expectedRevision:saved.revision,links:{...links,teamSkills:{title:'Team',target:'https://example.com/team'}}},options);
  assert.ok(after.links.teamSkills);
  const names=await readdir(join(options.codexHome,'context-state'));
  const backup=JSON.parse(await readFile(join(options.codexHome,'context-state',names.find(n=>n.endsWith('.bak'))),'utf8'));
  assert.deepEqual(backup.links,saved.links);
});
test('missing roles stay empty, never become a fake source; unsafe input is rejected', async t => {
  const {options,args}=await fixture(t);
  const saved=await saveSources({...args,links:{}},options); assert.deepEqual(saved.links,{});
  for (const value of ['javascript:alert(1)','https://user:pass@example.com','/tmp/<!-- OSM:END -->']) {
    await assert.rejects(saveSources({...args,expectedRevision:saved.revision,links:{memory:{title:'Memory',target:value}}},options));
  }
  await assert.rejects(saveSources({...args,links:{password:{title:'No',target:'https://example.com'}}},options));
});
test('corrupt files and symlinked state directories stop writes without replacing data', async t => {
  const {options,args}=await fixture(t); await saveSources(args,options);
  const dir=join(options.codexHome,'context-state'), path=join(dir,(await readdir(dir))[0]);
  await writeFile(path,'invalid json'); assert.equal((await readSources(target,options)).state,'unavailable');
  await assert.rejects(saveSources(args,options)); assert.equal(await readFile(path,'utf8'),'invalid json');
  await rm(dir,{recursive:true}); await symlink(options.codexHome,dir);
  assert.equal((await readSources(target,options)).state,'unavailable');
  await assert.rejects(saveSources(args,options));
});

test('optional team memory can be added without changing personal memory or instructions', async t => {
  const {options,args}=await fixture(t);
  const before=await readFile(join(options.codexHome,'AGENTS.md'));
  const personal=await saveSources(args,options);
  const team={title:'Team decisions',target:'https://example.com/team-memory'};
  const both=await saveSources({...args,expectedRevision:personal.revision,links:{...personal.links,teamMemory:team}},options);
  assert.deepEqual(both.links.memory,links.memory);
  assert.deepEqual((await readSources(target,options)).links.teamMemory,team);
  const removed=await saveSources({...args,expectedRevision:both.revision},options);
  assert.equal(removed.links.teamMemory,undefined);
  assert.deepEqual(removed.links.memory,links.memory);
  assert.deepEqual(await readFile(join(options.codexHome,'AGENTS.md')),before);
});

test('existing CODEX_HOME/aios/panel and osm/panel state stay readable and writes migrate cleanly to context-state', async t => {
  const {options,context,args}=await fixture(t), identity=contextIdentity(target);
  const hash=createHash('sha256').update(identity).digest('hex');
  const legacyDir=join(options.codexHome,'aios/panel');
  await mkdir(legacyDir,{recursive:true});
  const legacyLinks=JSON.stringify({version:1,contextIdentity:identity,title:'Legacy Context',links},null,2)+'\n';
  await writeFile(join(legacyDir,hash+'.json'),legacyLinks);
  await writeFile(join(legacyDir,hash+'.connection.json'),JSON.stringify({
    format:routeFormat,contextIdentity:identity,route:'macos-keychain',mode:routeMode,enabled:true,
  },null,2)+'\n');

  const read=await readSources(target,options);
  assert.equal(read.state,'saved'); assert.equal(read.title,'Legacy Context'); assert.deepEqual(read.links,links);
  const route=await readConnectionRoute(target,options);
  assert.equal(route.state,'saved'); assert.equal(route.enabled,true);

  const updated=await saveSources({...args,expectedRevision:read.revision,title:'Migrated Context'},options);
  assert.equal(updated.title,'Migrated Context');
  assert.equal((await readSources(target,options)).title,'Migrated Context');
  assert.equal(await readFile(join(legacyDir,hash+'.json'),'utf8'),legacyLinks);
  const stateFiles=await readdir(join(options.codexHome,'context-state'));
  assert.ok(stateFiles.includes(hash+'.json'));
  assert.ok(stateFiles.some(name=>name.endsWith('.bak')));

  const disabled=await saveConnectionRoute({
    target,expectedContextRevision:context.revision,expectedRevision:route.revision,
    selectedMode:routeMode,enabled:false,
  },options);
  assert.equal(disabled.enabled,false);
  assert.equal((await readConnectionRoute(target,options)).enabled,false);
});
