import { build } from 'esbuild';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const source = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(source, '../..');
const version = JSON.parse(await readFile(join(root, '.codex-plugin/plugin.json'), 'utf8')).version;
const author = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
const lock = JSON.parse(await readFile(join(source, 'package-lock.json'), 'utf8'));
if ([author.version, lock.version, lock.packages[''].version].some((value) => value !== version)) throw new Error('Sidebar version drift');
const out = resolve(process.argv[2] || join(root, 'runtime/sidebar'));
await mkdir(out, { recursive: true });
const options = { absWorkingDir: source, bundle: true, minify: true, metafile: true, define: { __OSM_VERSION__: JSON.stringify(version) } };
const app = await build({ ...options, entryPoints: ['app.mjs'], platform: 'browser', format: 'esm', write: false });
const css = await build({ ...options, entryPoints: ['styles.css'], loader: { '.woff2': 'dataurl' }, write: false });
const server = await build({ ...options, entryPoints: ['server.mjs'], platform: 'node', format: 'cjs', loader: { '.svg': 'text' }, target: 'node22', outfile: join(out, 'server.cjs') });
const template = await readFile(join(source, 'index.html'), 'utf8');
const brandGlyph = (await readFile(join(root, 'assets/branding/osm-icon-glyph.svg'), 'utf8')).trim();
await writeFile(join(out, 'index.html'), template
  .replace('<!--BRAND_GLYPH-->', () => brandGlyph.replace('width="24" height="24"', 'width="29" height="29"'))
  .replace('/*APP_CSS*/', () => css.outputFiles[0].text)
  .replace('/*APP_JS*/', () => app.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')));

const packageRoots = new Set();
for (const meta of [app.metafile, css.metafile, server.metafile]) for (const input of Object.keys(meta.inputs)) {
  const parts = input.split('/'); const index = parts.lastIndexOf('node_modules');
  if (index >= 0) packageRoots.add(parts.slice(0, index + (parts[index + 1].startsWith('@') ? 3 : 2)).join('/'));
}
let notices = '# Third-party notices\n\nThe bundled sidebar includes the following open-source packages.\n';
notices += '\n## Geist Pixel Square\n\n' + await readFile(join(source, 'licenses/geist-OFL.txt'), 'utf8');
for (const path of [...packageRoots].sort()) {
  const folder = join(source, path);
  const info = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'));
  const licenseFiles = (await readdir(folder)).filter((name) => /^(license|copying)(\..*)?$/i.test(name)).sort();
  let license;
  if (licenseFiles.length) license = await readFile(join(folder, licenseFiles[0]), 'utf8');
  else if (info.name === '@cfworker/json-schema') license = await readFile(join(source, 'licenses/cfworker-json-schema-LICENSE'), 'utf8');
  else throw new Error(`Missing license: ${info.name}`);
  notices += `\n## ${info.name} ${info.version}\n\n${license}\n`;
}
await writeFile(join(out, 'THIRD-PARTY-NOTICES.md'), notices);
console.log(`Built OSM ${version} sidebar (no consumer npm install).`);
