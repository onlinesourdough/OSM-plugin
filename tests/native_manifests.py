"""Cross-client methods, with one explicitly declared headless Codex Notion tools runtime."""
import json


def validate_native(root, require):
    def read(name):
        return json.loads((root / name).read_text())

    codex = read('.codex-plugin/plugin.json')
    claude = read('.claude-plugin/plugin.json')
    cursor = read('.cursor-plugin/plugin.json')
    gemini = read('gemini-extension.json')
    package = read('package.json')
    common = {'name', 'version', 'description', 'author', 'repository', 'license'}
    # Codex 0.160.1 ignores app bindings when an Agent Plugins root shadows this
    # manifest. Preserve one skills source through each supported native format.
    require(not (root / 'plugin.json').exists(), 'root manifest shadows native app binding')
    require(all(isinstance(codex[k], str) and codex[k] for k in common - {'author'}) and
            codex['author'] == {'name': 'onlinesourdough'}, 'native metadata types')
    require(set(codex) == common | {'skills', 'interface', 'extensions', 'mcpServers'} and
            # Claude display and directory-listing metadata; no component field.
            set(claude) == common | {'skills', 'displayName', 'homepage', 'keywords',
                                     'icon', 'documentationUrl', 'supportUrl'} and
            set(cursor) == {'name', 'version', 'description', 'skills'} and
            set(gemini) == {'name', 'version', 'description'}, 'unexpected native component field')
    require('apps' not in codex and not (root / '.app.json').exists(),
            'Notion must remain a separate plugin, with no embedded app binding')
    require(codex['extensions'] == {'com.openai': {
                'onboardingSkill': './skills/osm-setup/SKILL.md'}},
            'onboarding must use the packaged Setup skill')
    setup = root / 'skills/osm-setup/SKILL.md'
    require(setup.is_file() and not setup.is_symlink(), 'missing packaged Setup skill')
    for native in (codex, claude, cursor, gemini, package):
        require(all(native[k] == codex[k] for k in ('name', 'version', 'description')),
                'native identity/version drift')
    for native in (codex, claude, cursor):
        require((root / native['skills']).resolve() == (root / 'skills').resolve(),
                'native split skill source')
    market = read('.claude-plugin/marketplace.json')
    require(market['name'] == 'online-sourdough' and len(market['plugins']) == 1,
            'Claude marketplace identity')
    entry = market['plugins'][0]
    require(set(entry) == {'name', 'source', 'version', 'description'} and
            entry['source'] == './' and
            all(entry[k] == codex[k] for k in ('name', 'version', 'description')),
            'Claude marketplace source/version')
    require(codex['mcpServers'] == './.codex-plugin/mcp.json' and
            read('.codex-plugin/mcp.json') == {'mcpServers': {'osm': {
                'command': 'node', 'args': ['./runtime/notion/server.cjs'], 'cwd': '.'}}},
            'unexpected Notion tools command or server')
    for name in ('server.cjs', 'THIRD-PARTY-NOTICES.md'):
        require((root / 'runtime/notion' / name).is_file() and
                not (root / 'runtime/notion' / name).is_symlink(), 'missing bundled Notion tools')
    require({p.name for p in (root / 'runtime/notion').iterdir()} ==
            {'server.cjs', 'THIRD-PARTY-NOTICES.md'}, 'extra Notion tools runtime file')
    # The retired dashboard leaves no source or runtime folder behind.
    require(not (root / 'runtime/sidebar').exists() and not (root / 'apps/sidebar').exists(),
            'retired sidebar runtime')
    require(codex['interface']['developerName'] == 'onlinesourdough' and
            read('.agents/plugins/marketplace.json')['interface']['displayName'] == 'onlinesourdough',
            'publisher branding drift')
    for folder, expected in (('.codex-plugin', {'plugin.json', 'mcp.json'}),
                             ('.claude-plugin', {'plugin.json', 'marketplace.json'}),
                             ('.cursor-plugin', {'plugin.json'})):
        require({p.name for p in (root / folder).iterdir()} == expected,
                'extra native metadata file')
    # Clients discover some runtime components even when manifests omit them.
    for name in ('hooks', 'hooks.json', 'agents', 'commands', 'settings.json',
                 '.mcp.json', 'mcp.json', '.lsp.json', 'lsp.json', 'extensions',
                 'output-styles', 'monitors', 'workflows', 'bin', 'themes',
                 '.github/plugin', '.plugin', 'marketplace.json'):
        require(not (root / name).exists(), 'unexpected native runtime: ' + name)
