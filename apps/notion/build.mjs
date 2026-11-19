import { build } from 'esbuild';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const source = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(source, '../..');
const version = JSON.parse(await readFile(join(root, '.codex-plugin/plugin.json'), 'utf8')).version;
const author = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
const lock = JSON.parse(await readFile(join(source, 'package-lock.json'), 'utf8'));
if ([author.version, lock.version, lock.packages[''].version].some((value) => value !== version)) throw new Error('Notion tools version drift');
const out = resolve(process.argv[2] || join(root, 'runtime/notion'));
await mkdir(out, { recursive: true });
const server = await build({ absWorkingDir: source, bundle: true, minify: true, metafile: true, define: { __OSM_VERSION__: JSON.stringify(version) },
  entryPoints: ['server.mjs'], platform: 'node', format: 'cjs', target: 'node22', outfile: join(out, 'server.cjs') });

const packageRoots = new Set();
for (const input of Object.keys(server.metafile.inputs)) {
  const parts = input.split('/'); const index = parts.lastIndexOf('node_modules');
  if (index >= 0) packageRoots.add(parts.slice(0, index + (parts[index + 1].startsWith('@') ? 3 : 2)).join('/'));
}
let notices = '# Third-party notices\n\nThe bundled Notion tools server includes the following open-source packages.\n';
for (const path of [...packageRoots].sort()) {
  const folder = join(source, path);
  const info = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'));
  const licenseFiles = (await readdir(folder)).filter((name) => /^(license|copying)(\..*)?$/i.test(name)).sort();
  if (!licenseFiles.length) throw new Error(`Missing license: ${info.name}`);
  notices += `\n## ${info.name} ${info.version}\n\n${await readFile(join(folder, licenseFiles[0]), 'utf8')}\n`;
}
await writeFile(join(out, 'THIRD-PARTY-NOTICES.md'), notices);
console.log(`Built OSM ${version} Notion tools (no consumer npm install).`);
