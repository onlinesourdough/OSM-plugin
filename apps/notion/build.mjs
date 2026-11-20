import { build } from 'esbuild';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const source = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(source, '../..');
const version = JSON.parse(await readFile(join(root, '.codex-plugin/plugin.json'), 'utf8')).version;
const author = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
const lock = JSON.parse(await readFile(join(source, 'package-lock.json'), 'utf8'));
if ([author.version, lock.version, lock.packages[''].version].some(value => value !== version)) throw new Error('Notion tools version drift');
const out = resolve(process.argv[2] || join(root, 'runtime/notion'));
await mkdir(out, { recursive: true });
const guide = JSON.parse(await readFile(join(root, 'docs-publisher/public-guide.json'), 'utf8'));
if (guide.format !== 'osm-public-guide/1' || !guide.pages?.[guide.root]) throw new Error('Missing public guide');
const glyph = await readFile(join(root, 'assets/branding/osm-icon-glyph.svg'), 'utf8');
const icons = [['light', '#625B55'], ['dark', '#C2BCB5']].map(([theme, color]) => ({
  src: 'data:image/svg+xml;base64,' + Buffer.from(glyph.replaceAll('currentColor', color)).toString('base64'),
  mimeType: 'image/svg+xml', sizes: ['24x24'], theme,
}));
// MCP clients must support PNG; keep a raster fallback after the themed vectors.
icons.push({ src: 'data:image/png;base64,' + (await readFile(join(root, 'assets/icon.png'))).toString('base64'),
  mimeType: 'image/png', sizes: ['512x512'] });
const architecture = await readFile(join(root, 'assets/diagrams/osm-architecture.html'), 'utf8');
const diagram = '<style>' + architecture.match(/<style>([\s\S]*?)<\/style>/)[1].replaceAll('body{', ':host{') +
  '</style>' + architecture.match(/<main>[\s\S]*<\/main>/)[0];
const defines = { __OSM_VERSION__: JSON.stringify(version), __OSM_PUBLIC_GUIDE__: JSON.stringify(guide),
  __OSM_ARCHITECTURE__: JSON.stringify(diagram), __OSM_GUIDE_ICONS__: JSON.stringify(icons) };
const client = await build({ absWorkingDir: source, bundle: true, minify: true, metafile: true, define: defines,
  entryPoints: ['guide/app.mjs'], platform: 'browser', format: 'iife', target: 'es2022', write: false });
const template = await readFile(join(source, 'guide/index.html'), 'utf8');
await writeFile(join(out, 'guide.html'), template.replace('__GUIDE_SCRIPT__', () => client.outputFiles[0].text.replaceAll('</script', '<\\/script')));
const server = await build({ absWorkingDir: source, bundle: true, minify: true, metafile: true, define: defines,
  entryPoints: ['server.mjs'], platform: 'node', format: 'cjs', target: 'node22', outfile: join(out, 'server.cjs') });

const packageRoots = new Set();
for (const input of Object.keys({ ...server.metafile.inputs, ...client.metafile.inputs })) {
  const parts = input.split('/'); const index = parts.lastIndexOf('node_modules');
  if (index >= 0) packageRoots.add(parts.slice(0, index + (parts[index + 1].startsWith('@') ? 3 : 2)).join('/'));
}
let notices = '# Third-party notices\n\nThe public guide and optional Notion tools include these open-source packages.\n';
for (const path of [...packageRoots].sort()) {
  const folder = join(source, path);
  const info = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'));
  const licenses = (await readdir(folder)).filter(name => /^(license|copying)(\..*)?$/i.test(name)).sort();
  if (!licenses.length) throw new Error('Missing license: ' + info.name);
  notices += '\n## ' + info.name + ' ' + info.version + '\n\n' + await readFile(join(folder, licenses[0]), 'utf8') + '\n';
}
await writeFile(join(out, 'THIRD-PARTY-NOTICES.md'), notices);
console.log('Built OSM ' + version + ' public guide and optional Notion tools.');
