#!/usr/bin/env python3
"""Author-only Claude manifest proof; opt in to a disposable install rehearsal.

No model session, authentication, or real user configuration reads or installs.
The optional lifecycle installs only in a new CLAUDE_CONFIG_DIR fixture.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[1]
PLUGIN_ID = "osm@online-sourdough"
VERSION = json.loads((ROOT / "package.json").read_text())["version"]
EXPECTED = {p.parent.name for p in (ROOT / "skills").glob("*/SKILL.md")}
NEXT_VERSION = "99.0.0-rehearsal"
DISPLAY_NAME = "OSM"
ICON = "assets/icon.png"


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def read_json(path):
    return json.loads(path.read_text())


def payload_hashes(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted((root / "skills").rglob("*")) if p.is_file()}


def check_contract():
    plugin = read_json(ROOT / ".claude-plugin/plugin.json")
    market = read_json(ROOT / ".claude-plugin/marketplace.json")
    require(set(plugin) == {"name", "displayName", "version", "description", "author",
                            "homepage", "skills", "repository", "license", "keywords",
                            "icon", "documentationUrl", "supportUrl"},
            "Unexpected plugin fields")
    require(plugin["name"] == "osm" and plugin["version"] == VERSION,
            "Expected current OSM version")
    require(plugin["skills"] == "./skills/", "Canonical root skills required")
    # Claude Code reads the display fields; only Anthropic's directory listing
    # reads icon, documentationUrl and supportUrl.
    require(plugin["displayName"] == DISPLAY_NAME, "Display name")
    require(set(plugin["author"]) == {"name", "url"}, "Unexpected author fields")
    links = [plugin[key] for key in ("homepage", "repository", "documentationUrl",
                                     "supportUrl")] + [plugin["author"]["url"]]
    require(all(isinstance(link, str) and link.startswith("https://") for link in links),
            "Listing links must be https URLs")
    keywords = plugin["keywords"]
    require(isinstance(keywords, list) and keywords and
            all(isinstance(word, str) and word for word in keywords) and
            len(set(keywords)) == len(keywords), "Keywords must be distinct tags")
    require(plugin["icon"] == "./" + ICON and (ROOT / ICON).is_file() and
            not (ROOT / ICON).is_symlink(), "Listing icon must be the packaged file")
    require(set(market) == {"name", "owner", "metadata", "plugins"},
            "Unexpected marketplace fields")
    require(market["name"] == "online-sourdough", "Marketplace identity")
    require(market["owner"] == plugin["author"],
            "Marketplace owner differs from plugin author")
    require(len(market["plugins"]) == 1, "One plugin required")
    entry = market["plugins"][0]
    require(set(entry) == {"name", "source", "version", "description"},
            "Marketplace must not redefine components")
    # A display field set on the entry would override plugin.json; the entry sets
    # only these, so the rest of the listing comes from the one manifest.
    require(entry["source"] == "./" and
            all(entry[key] == plugin[key] for key in ("name", "version", "description")),
            "Marketplace source/version/description")
    skills = sorted((ROOT / "skills").glob("*/SKILL.md"))
    require({p.parent.name for p in skills} == EXPECTED, "Expected canonical skills")
    for skill in skills:
        require(re.search(r"^name: " + re.escape(skill.parent.name) + r"$",
                          skill.read_text(), re.M), "Skill name/path mismatch")
    for subtree in (ROOT / "skills", ROOT / ".claude-plugin"):
        require(not subtree.is_symlink() and
                not any(p.is_symlink() for p in subtree.rglob("*")), "No symlinks")
    require({p.name for p in (ROOT / ".claude-plugin").iterdir()} ==
            {"plugin.json", "marketplace.json"}, "Metadata-only .claude-plugin")
    # Copilot prefers a lead-owned Agent Plugins 1.0 root manifest when present.
    # That schema discovers the same skills/ by convention, without path fields.
    if (ROOT / "plugin.json").exists():
        portable = read_json(ROOT / "plugin.json")
        require(portable.get("$schema") ==
                "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
                "Unexpected higher-precedence Copilot manifest schema")
        require(set(portable) == (set(plugin) - {"skills"}) | {"$schema"},
                "Higher-precedence manifest must remain metadata-only")
        require(all(portable[key] == value for key, value in plugin.items() if key != "skills"),
                "Higher-precedence manifest metadata differs")
    # Both clients also discover default components absent from the manifest.
    for name in ("agents", "commands", "hooks", "hooks.json", "settings.json",
                 ".mcp.json", "mcp.json", ".github/mcp.json", ".lsp.json",
                 "lsp.json", ".github/lsp.json", "output-styles", "monitors",
                 "workflows", "bin", "themes", ".plugin/plugin.json",
                 ".github/plugin/plugin.json", "marketplace.json", "com.github.copilot",
                 ".plugin/marketplace.json", ".github/plugin/marketplace.json"):
        require(not (ROOT / name).exists(), "Unexpected native component: " + name)
    print("PASS: metadata-only package, source ./, declared canonical skills, no extra components")
    return [p.parent.name for p in skills]


def rehearse(base, claude, install, names):
    config, work = base / "config", base / "work"
    config.mkdir()
    work.mkdir()
    # Allowlist environment variables; preserve HOME exactly, never read/copy
    # credentials, provider variables, or real harness settings into this fixture.
    env = {key: os.environ[key] for key in ("HOME", "PATH", "TMPDIR", "LANG", "LC_ALL")
           if key in os.environ}
    env.update(CLAUDE_CONFIG_DIR=str(config),
               CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1", DISABLE_AUTOUPDATER="1")

    def run(*args, rejected=False):
        command = [claude, "--setting-sources", "user", *map(str, args)]
        result = subprocess.run(command, cwd=work, env=env,
                                stdin=subprocess.DEVNULL, capture_output=True,
                                text=True, timeout=45)
        output = result.stdout + result.stderr
        display = output.replace(str(ROOT), "<repo>").replace(str(base), "<fixture>")
        print("claude --setting-sources user " + " ".join(map(str, args)).replace(str(ROOT), "<repo>")
              .replace(str(base), "<fixture>") + f" [exit {result.returncode}]")
        print(display.strip())
        require((result.returncode != 0) if rejected else (result.returncode == 0),
                "Unexpected native command result")
        return result.stdout

    run("--version")
    for name in ("plugin.json", "marketplace.json"):
        run("plugin", "validate", ROOT / ".claude-plugin" / name)
    invalid = base / "invalid" / ".claude-plugin"
    invalid.mkdir(parents=True)
    (invalid / "plugin.json").write_text('{"name":"invalid","skills":42}\n')
    run("plugin", "validate", invalid / "plugin.json", rejected=True)
    print("PASS: native manifests accepted; invalid skills type rejected")

    def inspect_details(details):
        for label, count in (("Skills", len(EXPECTED)), ("Agents", 0), ("Hooks", 0), ("MCP servers", 0)):
            require(f"{label} ({count})" in details, "Unexpected native inventory: " + label)
        for name in names:
            require(re.search(r"(?<![\w-])" + re.escape(name) + r"(?![\w-])", details),
                    "Native details missing skill: " + name)

    inline = run("--plugin-dir", ROOT, "plugin", "details", "osm")
    require("osm@inline" in inline and f"{DISPLAY_NAME} (osm) {VERSION}" in inline,
            "Inline display name/identity/version")
    inspect_details(inline)
    print("PASS: native inline discovery reports declared skills and zero agents/hooks/MCP servers")
    if not install:
        print("Isolated state files:", json.dumps(sorted(str(p.relative_to(config))
              for p in config.rglob("*") if p.is_file())))
        print("NOT RUN: marketplace install/list/details/update/uninstall (use --install-lifecycle)")
        return

    source = base / "source"
    source.mkdir()
    for name in (".claude-plugin", "skills"):
        shutil.copytree(ROOT / name, source / name)
    (source / ICON).parent.mkdir()
    shutil.copy2(ROOT / ICON, source / ICON)
    overview = source / "docs/osm.md"
    overview.parent.mkdir(parents=True)
    shutil.copy2(ROOT / "docs/osm.md", overview)
    sentinel = config / "skills" / "fixture-sentinel" / "SKILL.md"
    sentinel.parent.mkdir(parents=True)
    sentinel.write_text("---\nname: fixture-sentinel\ndescription: Fixture only.\n---\nFixture.\n")
    sentinel_bytes = sentinel.read_bytes()
    settings = config / "settings.json"
    settings.write_text('{"alwaysThinkingEnabled":true}\n')

    def preserved():
        require(read_json(settings)["alwaysThinkingEnabled"] is True,
                "Unrelated fixture setting changed")
        require(sentinel.read_bytes() == sentinel_bytes, "Unrelated fixture skill changed")

    def installed(version):
        listing = json.loads(run("plugin", "list", "--json"))
        require(len(listing) == 1, "Expected exactly one installed plugin")
        row = listing[0]
        require(row["id"] == PLUGIN_ID and row["version"] == version and row["enabled"],
                "Installed identity/version/enablement")
        cache = Path(row["installPath"]).resolve()
        require(cache.is_relative_to(config.resolve()), "Cache escaped isolated config")
        require(payload_hashes(cache) == payload_hashes(source), "Cached skill bytes differ")
        require((cache / "docs/osm.md").read_bytes() == overview.read_bytes(),
                "Cached documentation differs")
        require((cache / ICON).read_bytes() == (ROOT / ICON).read_bytes(),
                "Cached listing icon differs")
        require(f"OSM version: {version}\n" in overview.read_text(),
                "Installed documentation version differs")
        details = run("plugin", "details", PLUGIN_ID)
        require(f"{DISPLAY_NAME} (osm) {version}" in details,
                "Installed display name/identity/version")
        inspect_details(details)
        preserved()

    require(json.loads(run("plugin", "list", "--json")) == [], "Fixture not empty")
    run("plugin", "marketplace", "add", source)
    run("plugin", "install", PLUGIN_ID, "--scope", "user")
    installed(VERSION)
    # Version-transition proof only in the disposable source; not a product release.
    for name in ("plugin.json", "marketplace.json"):
        path = source / ".claude-plugin" / name
        data = read_json(path)
        (data if name == "plugin.json" else data["plugins"][0])["version"] = NEXT_VERSION
        path.write_text(json.dumps(data, indent=2) + "\n")
    overview.write_text(overview.read_text().replace(f"OSM version: {VERSION}\n",
                                                    f"OSM version: {NEXT_VERSION}\n"))
    run("plugin", "marketplace", "update", "online-sourdough")
    run("plugin", "update", PLUGIN_ID, "--scope", "user")
    installed(NEXT_VERSION)
    run("plugin", "uninstall", PLUGIN_ID, "--scope", "user")
    require(json.loads(run("plugin", "list", "--json")) == [], "Uninstall left registration")
    run("plugin", "marketplace", "remove", "online-sourdough")
    preserved()
    print("PASS: isolated install, cached bytes, details, version update, uninstall, coexistence")
    print("Fixture effects:", json.dumps(sorted(str(p.relative_to(base)) for p in
          config.rglob("*") if p.is_file())))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--install-lifecycle", action="store_true",
                        help="Install only beneath ../portability-research/claude-fixture")
    args = parser.parse_args()
    names = check_contract()
    claude = shutil.which("claude")
    require(claude is not None, "Claude CLI unavailable; native schema proof missing")
    if args.install_lifecycle:
        parent = ROOT.parent / "portability-research" / "claude-fixture"
        require(not parent.is_symlink(), "Fixture root must not be a symlink")
        parent.mkdir(parents=True, exist_ok=True)
        base = Path(tempfile.mkdtemp(prefix="run-", dir=parent))
        print("Lifecycle fixture retained beneath ../portability-research/claude-fixture")
        rehearse(base, claude, True, names)
    else:
        with tempfile.TemporaryDirectory(prefix="osm-claude-schema-") as directory:
            rehearse(Path(directory), claude, False, names)


if __name__ == "__main__":
    try:
        main()
    except PermissionError:
        print("BLOCKED: sandbox denied fixture creation/access; native install lifecycle unverified",
              file=sys.stderr)
        sys.exit(2)
