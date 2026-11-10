import { createServer } from 'node:http';
import { readFile, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readContextRoute, saveContextRoute } from './context-route.mjs';
import { readSources, saveSources } from './sources.mjs';
import { readNotionSetup } from './codex-status.mjs';
import { previewHome } from './preview-home.mjs';
import { readBuiltinSkill, readBuiltinSkills } from './home-service.mjs';
import { NotionPages } from './notion-pages.mjs';
const port = Number(process.env.PORT || 43195);
const liveNotion = process.env.OSM_PREVIEW_LIVE_NOTION === '1';
const notionPages = new NotionPages();
const examplePages = [
  { icon: '👾', title: 'Studio AIOS', target: 'https://app.notion.com/p/00000000000000000000000000000001' },
  { icon: 'https://www.notion.so/icons/copy_lightgray.svg', title: 'Company docs', target: 'https://app.notion.com/p/00000000000000000000000000000002' },
  { icon: '🤹', title: 'Writing & delivery', target: 'https://app.notion.com/p/00000000000000000000000000000003' },
  { icon: '🧠', title: 'Decisions', target: 'https://app.notion.com/p/00000000000000000000000000000004' },
];
// The preview answers method reads from the real bundled skills; only Notion's data is fictional.
const skillsRoot = fileURLToPath(new URL('../../skills', import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), 'osm-ui-test-'));
const roots = Object.fromEntries(['home','setup','test'].map(key=>[key,join(scratch,key)]));
await Promise.all(Object.values(roots).map(path=>mkdir(path)));
const bridge = await readFile(new URL('../../skills/osm-data-context/assets/bridge.md', import.meta.url), 'utf8');
const version = JSON.parse(await readFile(new URL('./package.json', import.meta.url))).version;
async function reset(codexHome, scenario) {
  await rm(join(codexHome, 'AGENTS.md'), { force: true });
  await rm(join(codexHome, 'aios'), { recursive: true, force: true });
  if ((['existing', 'dashboard', 'team'].includes(scenario) || scenario.startsWith('home-'))) await writeFile(join(codexHome, 'AGENTS.md'), bridge.replace('<verified-notion-root-entry-url>', 'https://app.notion.com/p/00000000000000000000000000000001'));
  if ((['dashboard','team'].includes(scenario) || scenario.startsWith('home-'))) {
    const context = await readContextRoute({ codexHome });
    const current = await readSources(context.target, { codexHome });
    const links = {docs:{title:'Company docs',target:examplePages[1].target},personalSkills:{title:'Writing & delivery',target:examplePages[2].target},memory:{title:'Decisions',target:examplePages[3].target}};
    if (scenario === 'team') Object.assign(links,{teamSkills:{title:'Team playbook',target:'https://example.com/team-skills'},teamMemory:{title:'Team decisions',target:'https://example.com/team-memory'}});
    await saveSources({target:context.target,expectedContextRevision:context.revision,expectedRevision:current.revision,title:'Studio AIOS',links},{codexHome});
  }
  if (scenario === 'ambiguous') await writeFile(join(codexHome, 'AGENTS.md'), '<!-- AIOS:BEGIN -->old instructions');
}
await reset(roots.home,'home-ready');
let lastCheck = 0;
const pages = {'/':['preview','home','home-ready'], '/setup':['preview','setup','new'], '/settings':['preview','home','home-ready'], '/test':['debug','test','new']};
const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET') {
      if (req.url === '/app') {res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(await readFile(new URL('../../runtime/sidebar/index.html',import.meta.url)));}
      const page=pages[req.url]; if (!page) {res.writeHead(404);return res.end();}
      const body=(await readFile(new URL('./fixture.html',import.meta.url),'utf8')).replace('/*HOST_MODE*/',page[0]).replace('/*HOST_WORKSPACE*/',page[1]).replace('/*HOST_SCENARIO*/',page[2]).replace('/*HOST_VIEW*/',req.url==='/settings'?'settings':'home')
        .replace('Preview · sample workspace',liveNotion ? 'Preview · live Notion · setup saved only here' : 'Preview · sample workspace');
      res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(body);
    }
    if (req.method !== 'POST' || req.url !== '/rpc' || req.headers.origin !== `http://127.0.0.1:${port}`) { res.writeHead(403); return res.end(); }
    let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 16384) throw new Error('Too large'); }
    const { action, args, scenario, workspace } = JSON.parse(body);
    if (!Object.hasOwn(roots,workspace)) throw new Error('Unknown preview');
    const codexHome=roots[workspace];
    if (action === 'home') {
      res.setHeader('Content-Type','application/json');
      if (args.name === 'osm_builtin_read') return res.end(JSON.stringify({ content: [], _meta: { 'osm/kind': 'builtin-record', 'osm/builtin-record': await readBuiltinSkill(skillsRoot, args.arguments?.name) } }));
      const value = previewHome(args.name, args.arguments || {}, scenario);
      if (args.name === 'osm_home' && value._meta['osm/home'].builtin) value._meta['osm/home'].builtin = await readBuiltinSkills(skillsRoot);
      return res.end(JSON.stringify(value));
    }
    if (action === 'icons') {
      const data = liveNotion ? await notionPages.icons(args.targets) : { icons: args.targets.map(target => ({ target, icon: examplePages.find(page => page.target === target)?.icon || null })), partial: false };
      res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ content: [], _meta: { 'osm/kind': 'icons', 'osm/icons': data } }));
    }
    if (action === 'pages') {
      const data = liveNotion ? await notionPages.list(args?.query || '') : { pages: examplePages.filter(page=>page.title.toLowerCase().includes((args?.query || '').toLowerCase())), hasMore: false };
      res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ content: [], _meta: { 'osm/kind': 'pages', 'osm/pages': data } }));
    }
    if (action === 'reset') await reset(codexHome,scenario);
    else if (action === 'save') await saveContextRoute(args, { codexHome, bridge });
    else if (action === 'sources') await saveSources(args, { codexHome });
    else if (action !== 'status') throw new Error('Unsupported test operation');
    lastCheck = Math.max(lastCheck + 1, Date.now());
    const state = ({ missing: 'not_installed', disconnected: 'not_connected', disabled: 'plugin_disabled', unknown: 'unknown' })[scenario] || 'connected';
    const context = await readContextRoute({ codexHome });
    const sources = context.state === 'configured' ? await readSources(context.target, { codexHome }) : {state:'missing', title:'', links:{}};
    const notion = liveNotion ? await readNotionSetup() : { state };
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ content: [], _meta: { 'osm/status': { version, features: { notionPages: true, notionIcons: true }, notion, context, sources, checkedAt: new Date(lastCheck).toISOString() } } }));
  } catch (error) { res.writeHead(400); res.end(JSON.stringify({ error: error.message })); }
}).listen(port, '127.0.0.1', () => console.log(`OSM preview (sample workspace): http://127.0.0.1:${port}/ — /setup — /settings`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { await notionPages.close(); await rm(scratch, { recursive: true, force: true }); process.exit(0); }));
