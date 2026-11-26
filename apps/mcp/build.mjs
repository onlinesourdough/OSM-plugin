#!/usr/bin/env node
/**
 * Build the deterministic, zero-dependency OSM method bundle for apps/mcp.
 *
 * Reads only the reviewed repository method files (skills/, docs/osm.md,
 * package.json) and writes bundle.generated.mjs with per-file SHA-256 digests.
 * No network calls, no customer data, no credentials.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const OUTPUT_PATH = resolve(HERE, 'bundle.generated.mjs');

const ALLOWED_EXTENSIONS = new Set(['.md', '.json', '.yaml', '.svg']);
const REPOSITORY_URL = 'https://github.com/onlinesourdough/OSM-plugin';

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function walkSorted(dir) {
  const results = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = resolve(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkSorted(full));
    } else if (stat.isFile()) {
      const ext = entry.includes('.') ? entry.slice(entry.lastIndexOf('.')) : '';
      if (ALLOWED_EXTENSIONS.has(ext)) {
        results.push(full);
      }
    }
  }
  return results;
}

function parseSkillFrontmatter(text, relPath) {
  if (!text.startsWith('---\n') || !text.includes('\n---\n', 4)) {
    throw new Error(`Missing YAML frontmatter in ${relPath}`);
  }
  const header = text.slice(4, text.indexOf('\n---\n', 4));
  let name = '';
  let description = '';
  let version = '';
  for (const line of header.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const nameMatch = line.match(/^name:\s*(.+)$/);
    if (nameMatch) {
      name = unquote(nameMatch[1]);
      continue;
    }
    const descMatch = line.match(/^description:\s*(.+)$/);
    if (descMatch) {
      description = unquote(descMatch[1]);
      continue;
    }
    const verMatch = line.match(/^  version:\s*(.+)$/);
    if (verMatch) {
      version = unquote(verMatch[1]);
    }
  }
  if (!name || !description || !version) {
    throw new Error(`Incomplete skill frontmatter in ${relPath}`);
  }
  return { name, description, version };
}

function unquote(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return JSON.parse(trimmed);
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

export function buildBundle(repoRoot = REPO_ROOT) {
  const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
  const skillsDir = resolve(repoRoot, 'skills');
  const overviewPath = resolve(repoRoot, 'docs/osm.md');

  const files = {};
  const addFile = (fullPath) => {
    const rel = relative(repoRoot, fullPath).split('\\').join(posix.sep);
    const content = readFileSync(fullPath, 'utf8');
    files[rel] = {
      sha256: sha256(content),
      bytes: Buffer.byteLength(content, 'utf8'),
      content,
    };
    return rel;
  };

  addFile(overviewPath);
  for (const filePath of walkSorted(skillsDir)) {
    addFile(filePath);
  }

  const skills = [];
  const referenceFolders = [];

  for (const entry of readdirSync(skillsDir).sort()) {
    const folder = resolve(skillsDir, entry);
    if (!statSync(folder).isDirectory()) continue;
    const skillRel = `skills/${entry}/SKILL.md`;
    const folderPrefix = `skills/${entry}/`;
    const supporting = Object.keys(files)
      .filter((key) => key.startsWith(folderPrefix) && key !== skillRel)
      .sort();

    if (files[skillRel]) {
      const meta = parseSkillFrontmatter(files[skillRel].content, skillRel);
      skills.push({
        name: meta.name,
        description: meta.description,
        version: meta.version,
        path: skillRel,
        sha256: files[skillRel].sha256,
        bytes: files[skillRel].bytes,
        references: supporting,
      });
    } else if (files[`skills/${entry}/index.md`]) {
      referenceFolders.push({
        name: entry,
        index: `skills/${entry}/index.md`,
        files: supporting,
      });
    }
  }

  const orderedFileKeys = Object.keys(files).sort();
  const orderedFiles = {};
  for (const key of orderedFileKeys) {
    orderedFiles[key] = files[key];
  }

  const manifestDigestInput = orderedFileKeys
    .map((key) => `${key}:${orderedFiles[key].sha256}`)
    .join('\n');

  const releaseTag = `v${pkg.version}`;

  return {
    name: pkg.name,
    version: pkg.version,
    release_tag: releaseTag,
    description: pkg.description,
    license: pkg.license,
    repository: REPOSITORY_URL,
    release_url: `${REPOSITORY_URL}/releases/tag/${releaseTag}`,
    bundle_sha256: sha256(manifestDigestInput),
    skill_count: skills.length,
    file_count: orderedFileKeys.length,
    skills,
    reference_folders: referenceFolders,
    files: orderedFiles,
  };
}

export function renderBundleSource(bundle) {
  return (
    '// Generated by apps/mcp/build.mjs from reviewed repository method files.\n' +
    '// Do not edit by hand. Re-run: node apps/mcp/build.mjs\n' +
    `export const OSM_BUNDLE = ${JSON.stringify(bundle, null, 2)};\n`
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bundle = buildBundle();
  writeFileSync(OUTPUT_PATH, renderBundleSource(bundle), 'utf8');
  console.log(
    `Built apps/mcp/bundle.generated.mjs (OSM ${bundle.version}, ` +
      `${bundle.skill_count} skills, ${bundle.file_count} files, sha256=${bundle.bundle_sha256.slice(0, 12)})`,
  );
}
