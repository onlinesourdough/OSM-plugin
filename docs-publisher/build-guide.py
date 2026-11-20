#!/usr/bin/env python3
"""Build the public reading surface from bound guide originals and exact Git skills.

No network, credentials, private context or recursive page discovery. This is not
publication to Notion. Supplements keep their separate, explicitly frozen edition.
"""
import json
from pathlib import Path
import posixpath
import re
import sys

import publisher as pub

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = 'https://gustavanderson.notion.site/'
GIT = 'https://github.com/onlinesourdough/OSM-plugin/blob/'


def skill_source_drift(source, pinned):
    current, bound = source.files('skills/'), pinned.files('skills/')
    return sorted(path for path in set(current) | set(bound) if current.get(path) != bound.get(path))


def skill_body(text, path, ref):
    body = re.sub(r'\A---\n.*?\n---\n', '', text, count=1, flags=re.S).strip()
    def link(match):
        target = match[1]
        if target.startswith(('#', '/')) or re.match(r'[a-zA-Z][a-zA-Z0-9+.-]*:', target):
            return match[0]
        file, sep, anchor = target.partition('#')
        resolved = posixpath.normpath(posixpath.join(posixpath.dirname(path), file))
        if resolved.startswith('../'):
            raise pub.SetupError('A skill link leaves its source repository')
        return '](' + GIT + ref + '/' + resolved + (sep + anchor if sep else '') + ')'
    return re.sub(r'\]\(([^)\s]+)\)', link, body)


def build(root=ROOT):
    manifest = pub.load_manifest(root / 'docs-publisher/manifest.json')
    config = manifest['reading_export']
    source = pub.DirSource(root)
    ref = config['skill_source']
    if not re.fullmatch(r'[0-9a-f]{40}', ref):
        raise pub.SetupError('The reader needs an exact skill source commit')
    git = pub.GitSource(root, ref)
    drift = skill_source_drift(source, git)
    if drift:
        raise pub.SetupError('The public reader skill source differs from packaged instructions/resources: ' + ', '.join(drift))
    pages = {}
    def add(id, title, body, **meta):
        if not re.fullmatch(r'[0-9a-f]{32}', id) or id in pages:
            raise pub.SetupError('Invalid or duplicate public page identity')
        pages[id] = dict(id=id, title=title, body=body, url=PUBLIC + id, **meta)
    for key, artifact in pub.guide_pages(manifest).items():
        outcome, detail = pub.original_state(artifact, source)
        if outcome != pub.REFUSED_NOTION or not artifact.get('original'):
            raise pub.SetupError(f'{key}: {detail}')
        bound = artifact['original']
        add(artifact['notion'], artifact['title'], (root / pub.frozen_path(key)).read_text(),
            source_revision=bound['revision'], source_read_at=bound['read_at'])
    for extra in config.get('supplements', []):
        path = extra['path']
        if not path.startswith(pub.ORIGINALS + '/') or '..' in path.split('/'):
            raise pub.SetupError('A supplement must be an explicitly frozen public original')
        body = (root / path).read_text()
        if pub.sha256(body) != extra.get('sha256') or not extra.get('edition'):
            raise pub.SetupError('The optional supplement needs an explicit hash and edition')
        add(extra['id'], extra['title'], body, edition=extra['edition'])
    links = []
    for artifact in manifest['artifacts']:
        if artifact['class'] != 'A' or not artifact.get('notion'):
            continue
        name = artifact['key'].split('.')[-1]
        path = f'skills/{name}/SKILL.md'
        files = git.files(path)
        if list(files) != [path]:
            raise pub.SetupError(f'{name}: the bound skill source is missing')
        text = files[path].decode()
        title = 'OSM:' + name.removeprefix('osm-')
        body = skill_body(text, path, ref)
        intro = f'[Exact instruction source]({GIT}{ref}/{path}) · commit `{ref[:12]}`. Use the instructions supplied with your installed version.\n\n'
        add(artifact['notion'], title, intro + body + '\n', source_revision=ref)
        links.append(f'- [{title}]({PUBLIC}{artifact["notion"]})')
    add(config['catalogue'], 'OSM skills',
        'Shared methods for the context module. Setup conducts onboarding in the conversation. '
        'Prime, Log and Dreaming maintain context; Interview, Human Writing and Council help when relevant.\n\n'
        + '\n'.join(links) + '\n\nThe source links identify the exact instruction edition. Personal skills belong in your own Data & Context home.\n')
    result = {'format': 'osm-public-guide/1', 'root': config['root'], 'source': PUBLIC + config['root'],
              'reader': 'bound-public-originals-and-exact-git-skills', 'pages': pages}
    if config['root'] not in pages or len(pages) > 80 or len(json.dumps(result).encode()) > 512 * 1024:
        raise pub.SetupError('Public guide exceeds its runtime contract')
    if pub.SECRET.search(json.dumps(result)):
        raise pub.SetupError('Secret-like text is refused in a public guide')
    return result


if __name__ == '__main__':
    target = ROOT / 'docs-publisher/public-guide.json'
    target.write_text(json.dumps(build(), ensure_ascii=False, indent=2) + '\n')
    print('Built the public guide from explicit public originals and exact skill source.')
