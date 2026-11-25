"""Fast source checks for the instruction package; no runtime or model claims."""

from pathlib import Path
import argparse
from skill_metadata import RENAMED_SKILLS, parse_frontmatter, skill_version, validate_baseline
from unslop_contract import check as validate_unslop
from native_manifests import validate_native
import json
import re
import shutil
import struct
import tempfile
from package_documentation import check as validate_documentation


ROOT = Path(__file__).resolve().parents[1]
SKILL_NAMES = {
    "osm-council", "osm-dreaming", "osm-human-writing", "osm-interview",
    "osm-log", "osm-prime", "osm-setup", "unslop",
}
REFERENCE_ONLY = {"osm", "osm-data-context", "osm-manage-data-context", "osm-manage-skills"}
RELEASE_ARCHIVE = "https://github.com/onlinesourdough/OSM-plugin/blob/v0.33.0/skills/"
LEGACY_ROUTE_TARGETS = {
    "aios": ("../../osm/index.md", "../SKILL.md", "../../osm/references/check.md",
             "../../osm-manage-data-context/index.md", "../../osm/references/update.md"),
    "aios-build-work": (RELEASE_ARCHIVE + "osm-build-work/SKILL.md",),
    "aios-create-project": (RELEASE_ARCHIVE + "osm-create-project/SKILL.md",),
    "aios-create-system": ("../../osm-manage-skills/index.md",
                           RELEASE_ARCHIVE + "osm-create-project/SKILL.md"),
    "aios-evaluate-completeness": (RELEASE_ARCHIVE + "osm-review-work/SKILL.md",
                                   RELEASE_ARCHIVE + "osm-review-work/references/completeness.md"),
    "aios-evaluate-publish-safety": (RELEASE_ARCHIVE + "osm-ship-work/SKILL.md",
                                     RELEASE_ARCHIVE + "osm-ship-work/references/publish-safety.md"),
    "aios-evaluate-spec-work": (RELEASE_ARCHIVE + "osm-spec-work/SKILL.md",
                                RELEASE_ARCHIVE + "osm-spec-work/references/readiness.md"),
    "aios-onboard": ("../SKILL.md",),
    "aios-review-work": (RELEASE_ARCHIVE + "osm-review-work/SKILL.md",),
    "aios-route-agentic-content-system": ("../../osm/index.md",
                                           "../../osm/references/routing.md"),
    "aios-route-agentic-design-system": ("../../osm/index.md",
                                          "../../osm/references/routing.md"),
    "aios-route-business-constraint": ("../../osm/index.md",
                                       "../../osm/references/routing.md"),
    "aios-ship-work": (RELEASE_ARCHIVE + "osm-ship-work/SKILL.md",),
    "aios-spec-work": (RELEASE_ARCHIVE + "osm-spec-work/SKILL.md",),
    "aios-sync": ("../../osm-manage-data-context/index.md",
                  "../../osm/references/update.md"),
    "aios-triage-improvement": (RELEASE_ARCHIVE + "osm-triage-improvement/SKILL.md",),
    "aios-update": ("../../osm/references/update.md", "migration.md"),
}
LEGACY_EXTERNAL_TARGETS = {
    "clarify": "](" + RELEASE_ARCHIVE + "osm-clarify/SKILL.md)",
    "manage-skills": "](../../osm-manage-skills/index.md)",
    "orchestrate-workers": "](../../osm-council/SKILL.md)",
    "route-models": "historical change `8b81375`",
    "shape-offer": "Retained in the public Global Skills archive",
}
# Core routes methods; domain details stay in the selected domain skill.
FORBIDDEN_BOUNDARY_TEXT = {
    "skills/osm/references/routing.md": (
        "ACS", "OpenPencil", "DESIGN.md", "HANDOFF.md", ".op",
    ),
    "skills/osm-manage-skills/index.md": ("skills.sh", "npx skills"),
}
FORBIDDEN_SHIPPED_PATTERNS = (r"\bnpx skills\b", r"\bskills\.sh\b")
PRODUCT_PATHS = (".codex-plugin", ".claude-plugin", ".cursor-plugin",
                 "gemini-extension.json", "skills", "assets/icon.png", "LICENSE",
                 "docs/osm.md", "runtime/notion")
FORBIDDEN_KEYS = {"scripts", "dependencies", "devDependencies", "peerDependencies"}
SECRET_PATTERNS = (
    r"AKIA[0-9A-Z]{16}",
    r"-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----",
    r"gh[pousr]_[A-Za-z0-9_]{30,}",
    r"sk-[A-Za-z0-9_-]{20,}",
    r"xox[baprs]-[A-Za-z0-9-]{10,}",
)


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def frontmatter(path):
    try:
        return parse_frontmatter(path.read_text())
    except AssertionError as error:
        raise AssertionError(f"frontmatter: {path}: {error}") from error


def link_targets(path, boundary=None):
    for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", path.read_text()):
        if re.match(r"[a-z]+:", target) or target.startswith("#"):
            continue
        resolved = (path.parent / target.split("#", 1)[0]).resolve()
        if boundary:
            require(resolved.is_relative_to(boundary.resolve()),
                    f"product link escapes package: {path} -> {target}")
        require(resolved.exists(), f"broken link: {path} -> {target}")
        yield resolved


def copy_product(root, destination):
    for relative in PRODUCT_PATHS:
        source = root / relative
        require(source.exists() and not source.is_symlink(), f"product path: {relative}")
        target = destination / relative
        if source.is_dir():
            shutil.copytree(source, target)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)


def setup_guide_bridge(root):
    setup_guide = (root / "docs-publisher/originals/notion.guide.setup.md").read_text()
    section = re.search(
        r"^## Short agent instructions\n(.*?)(?=^## |\Z)",
        setup_guide,
        flags=re.M | re.S,
    )
    require(section is not None, "setup guide short agent instructions section")
    block = re.search(r"```txt\n(.*?)\n```", section.group(1), flags=re.S)
    require(block is not None, "setup guide short agent instructions code block")
    return block.group(1).replace(
        "[your verified Notion Data & Context URL]",
        "<verified-notion-root-entry-url>",
    ).strip()


def validate(root=ROOT, release_tag=None):
    validate_native(root, require)
    validate_unslop(root)
    try:
        validate_documentation(root, release_tag)
    except ValueError as error:
        raise AssertionError(str(error)) from error
    manifest = json.loads((root / ".codex-plugin/plugin.json").read_text())
    package = json.loads((root / "package.json").read_text())
    marketplace = json.loads((root / ".agents/plugins/marketplace.json").read_text())

    require(manifest["name"] == package["name"] == "osm", "package identity")
    require(manifest["version"] == package["version"], "version mismatch")
    require(re.fullmatch(r"\d+\.\d+\.\d+", manifest["version"]), "invalid version")
    require(not (FORBIDDEN_KEYS & package.keys()), "consumer script or dependency")
    require(set(package["files"]) == set(PRODUCT_PATHS) | {"README.md"},
            "package inventory")
    require(set(package["pi"]) == {"skills"} and len(package["pi"]["skills"]) == 1,
            "Pi declaration")
    require('hooks' not in manifest, "unexpected plugin hooks")

    skill_root = (root / manifest["skills"]).resolve()
    require(skill_root == (root / package["pi"]["skills"][0]).resolve(),
            "Codex and Pi use different skill sources")
    require(skill_root == (root / "skills").resolve(), "noncanonical skill root")

    entry = marketplace["plugins"]
    require(len(entry) == 1, "marketplace entry count")
    entry = entry[0]
    require(entry["name"] == "osm", "marketplace identity")
    require((root / entry["source"]["path"]).resolve() == root.resolve(),
            "marketplace source")
    require(entry["policy"] == {"installation": "AVAILABLE", "authentication": "ON_INSTALL"},
            "marketplace policy")

    skill_files = sorted(skill_root.glob("*/SKILL.md"))
    require({path.parent.name for path in skill_files} == SKILL_NAMES, "skill inventory")

    # Retired names have no alias, wrapper or copied body anywhere in the package,
    # and nothing discoverable ships outside skills/.
    require(set(skill_root.rglob("SKILL.md")) == set(skill_files),
            "nested skill inventory")
    require({path.name for path in skill_root.iterdir()} == SKILL_NAMES | REFERENCE_ONLY,
            "skill root inventory")
    for name in REFERENCE_ONLY:
        folder = skill_root / name
        require((folder / "index.md").is_file() and not (folder / "agents").exists(),
                f"reference-only route missing or still advertised: {name}")
    require(not list((root / "docs").rglob("SKILL.md")), "non-shipped drafts discoverable")
    # Repository authoring does not duplicate the shipped skills. No local aliases,
    # wrappers or copied bodies may silently become a second discovery source.
    local_skills = list((root / ".agents/skills").rglob("SKILL.md"))
    for local in local_skills:
        require(local.parent.name not in SKILL_NAMES and
                not re.fullmatch(r"(?:spec|build|review|ship|audit)-(?:project|solution)|choose-technology",
                                 local.parent.name),
                "duplicate generic repository skill payload")
    for caller in (root / "AGENTS.md", root / "README.md"):
        require(not re.search(r"\.agents/skills/(?:spec|build|review|ship|audit)-(?:project|solution)/|"
                              r"\.agents/skills/choose-technology/", caller.read_text()),
                "removed local phase caller")
    for path in skill_files:
        fields = frontmatter(path)
        try:
            skill_version(fields)
        except AssertionError as error:
            raise AssertionError(f"skill version: {path}: {error}") from error
        require(fields.get("name") == path.parent.name, f"skill name: {path}")
        require(0 < len(fields.get("description", "")) <= 1024,
                f"skill description: {path}")
        require("disable-model-invocation" not in fields, f"implicit invocation: {path}")

    procedure_index = skill_root / "osm/index.md"
    primary_targets = set(link_targets(procedure_index))
    retired_routes = {"osm-build-work", "osm-create-project", "osm-spec-work",
                      "osm-write-code", "osm-review-work", "osm-risky-changes",
                      "osm-ship-work", "osm-triage-improvement", "osm-clarify"}
    procedure_text = procedure_index.read_text()
    require(all(f"`{name}`" in procedure_text and not (skill_root / name).exists()
                for name in retired_routes), "retired work skill route")
    for name in ("osm-human-writing", "osm-interview", "osm-setup", "osm-dreaming"):
        require((skill_root / name / "SKILL.md").resolve() in primary_targets,
                f"built-in method route missing: {name}")
    for name in ("osm-data-context", "osm-manage-data-context", "osm-manage-skills"):
        require((skill_root / name / "index.md").resolve() in primary_targets,
                f"built-in reference route missing: {name}")
    require(not (skill_root / "osm-project-foundation").exists(),
            "retired engineering-foundation skill shipped")
    for name in ("osm-prime", "osm-log", "osm-dreaming"):
        require((skill_root / "osm-manage-data-context/index.md").resolve() in
                set(link_targets(skill_root / name / "SKILL.md")),
                f"shared context route missing: {name}")
    primary = (skill_root / "osm/index.md").read_text()
    lifecycle = (skill_root / "osm/references/lifecycle.md").read_text()
    require("persistent-goal request boundary" in primary and
            re.search(r"If activation requires an explicit request and none\s+exists", lifecycle) and
            re.search(r"do\s+not silently substitute a note", lifecycle) and
            re.search(r"genuinely\s+has no native goal controls", lifecycle) and
            "The lead's default model remains the user's configured choice." in lifecycle,
            "native goal request boundary")
    recovery = (skill_root / "osm/references/recovery.md").read_text()
    require("## Native-state deadlock" in recovery and
            "standing owner fallback policy" in recovery and
            "native resumption\nis unavailable" in recovery and
            "same truthful logical contract, session, worker and concise todo" in recovery and
            "not a claim that the native goal was reactivated" in recovery and
            "Do not hunt for a different worker session, delete a worker goal" in recovery and
            "unresolved external, user-action or security blocker still stops" in recovery and
            "explicitly requires native-only continuation" in recovery,
            "native-state deadlock")
    workflow_scenarios = (skill_root / "osm/references/workflow-scenarios.md").read_text()
    require("| Native-state deadlock |" in workflow_scenarios and
            "| Native-only continuation |" in workflow_scenarios and
            "| No native task list |" in workflow_scenarios and
            "without hunting a session, deleting, reactivating, replacing or duplicating a goal or worker" in workflow_scenarios,
            "native-state deadlock scenario")
    onboard = (skill_root / "osm-setup/SKILL.md").read_text()
    manage_skills = (skill_root / "osm-manage-skills/index.md").read_text()
    require("[Manage Skills](../osm-manage-skills/index.md)" in onboard and
            re.search(r"normal setup does not\s+depend on an optional guard implementation", onboard, re.I) and
            "setup-guardrails" in manage_skills and
            "[protection coverage](../osm-setup/references/harness-protection.md)" in manage_skills and
            "archived, not a preferred active installation" in manage_skills and
            "setup-agent-guardrails" not in manage_skills and
            "not an OSM prerequisite or package dependency" in manage_skills and
            all(term in manage_skills for term in ("source identity", "installation state",
                                                   "trust/configuration state", "native-active observation")) and
            "| Optional autonomous-use guardrails |" in workflow_scenarios and
            "setup-guardrails" not in SKILL_NAMES,
            "optional guardrails route boundary")
    # Ownership and portability invariants; behavior needs independent model rehearsal.
    selection = skill_root / "osm/references/model-advice.md"
    require(selection.resolve() in set(link_targets(skill_root / "osm-council/SKILL.md")),
            "Council model-selection reference missing")
    for source in (selection, skill_root / "osm-council/SKILL.md"):
        require(not re.search(r"\b(?:gpt-\d|claude-\d|gemini-\d)", source.read_text()),
                f"nonportable model default: {source}")
    require(not (skill_root / "osm-setup/assets").exists(),
            "file-home owner template shipped")
    # Folder-home Sync is retired from the active flow; its text stays as a
    # non-shipped legacy record that must keep its safety rules.
    sync = (root / "docs/legacy-file-home/sync.md").read_text()
    require(not (skill_root / "osm-manage-data-context/references/sync.md").exists() and
            "never `git add .`" in sync and
            "user-owned personal-skill folder identified" in sync and
            "shared\nplugin/library tree or an unrecorded folder" in sync and
            "symlink or nested Git repository" in sync and
            "every reachable commit\nand ref" in sync and
            "never silently rewrite, force-push" in sync and
            "source machine's absolute owner root or standing push approval" in sync and
            "verification candidates with `ask`" in sync and
            "initialize a fresh local Git registration" in sync and
            "Never copy\nthe source or temporary staging checkout's `.git`, config, hooks" in sync,
            "legacy sync record")
    maintain = (skill_root / "osm-manage-data-context/index.md").read_text()
    require("Keep the record lifecycle" in maintain and
            "Skill or method changes go through" in maintain and
            "creates or edits a\nschedule" in maintain and
            "fallback applies only to an\nalready verified goal state" in lifecycle,
            "sync missing-home and native-goal gate ordering")
    canonical_sources = skill_root / "osm/references/canonical-sources.md"
    require(canonical_sources.is_file(), "missing canonical source route")
    canonical_text = canonical_sources.read_text()
    require(canonical_sources.resolve() in primary_targets and
            "fact is missing from the accepted input and loaded package" in canonical_text and
            "one relevant source" in canonical_text and
            re.search(r"do not copy or sync", canonical_text) and
            "already-authorized native account" in canonical_text and
            "Never inspect, copy, transport, or ask for credentials" in canonical_text and
            "never change\nvisibility or publish" in canonical_text,
            "canonical source isolation")
    curation = (skill_root / "osm-manage-data-context/references/curation.md").read_text()
    require("Keep facts in one canonical source" in curation and
            "A read of Memory alone neither invokes this procedure nor grants write authority" in curation and
            "recorded or standing authority" in curation,
            "memory read/write separation")
    continuation = skill_root / "osm/references/continuation.md"
    require(continuation.is_file() and
            not (skill_root / "osm-select-model/references/continuation.md").exists() and
            continuation.resolve() in set(link_targets(skill_root / "osm/references/lifecycle.md")) and
            (skill_root / "osm-manage-data-context/references/curation.md").resolve()
            in set(link_targets(skill_root / "osm-setup/references/setup.md")),
            "single continuation and context framework owners")

    overview = root / "docs/osm.md"
    require(overview.is_file(), "missing local OSM overview")
    overview_text = overview.read_text()
    require("portable context and skills" in overview_text and
            "Shared method, owner context" in overview_text and
            "Customer documentation stays in its\nsource system" in overview_text and
            "Install it separately in each app you choose" in overview_text and
            "never paste credentials into a chat" in overview_text and
            "Native package updates are separate from owner context" in overview_text,
            "local overview boundaries")
    distribution = (root / "docs/distribution.md").read_text()
    require("docs/osm.md" in distribution and
            "## Local documentation" in distribution and
            "## Release and adoption" in distribution,
            "local documentation and release contract")

    manager = skill_root / "osm-manage-skills"
    owner_lifecycle = manager / "references/owner-skills.md"
    require(owner_lifecycle.is_file(), "missing personal-skill owner")
    require(not (skill_root / "osm-manage-data-context/references/owner-skills.md").exists(),
            "duplicate personal-skill owner")
    caller_targets = set()
    for relative in (
        "skills/osm/index.md",
        "skills/osm-setup/SKILL.md",
        "skills/osm/references/check.md",
        "skills/osm-manage-data-context/references/curation.md",
    ):
        caller_targets.update(link_targets(root / relative))
    require((manager / "index.md").resolve() in caller_targets, "Manage Skills not routed")
    require(owner_lifecycle.resolve() in caller_targets, "personal-skill procedure not routed")

    bridge = (skill_root / "osm-data-context/assets/bridge.md").read_text()
    require(len(bridge.splitlines()) <= 14 and "<verified-notion-root-entry-url>" in bridge,
            "bridge scope")

    # The packaged host bridge is plain instruction prose (no HTML comment wrappers)
    # and stays aligned 1:1 with the bound public Setup guide.
    require(not any(path.parent.name.startswith("aios") or path.parent.name in RENAMED_SKILLS.values()
                    for path in skill_files),
            "retired package skill name")
    lines = bridge.splitlines()
    require(not re.search(r"<!--|-->", bridge),
            "bridge wrapper markers")
    require(lines[0:3] == [
        "Use OSM Prime when relevant context is missing at the start or after resuming.",
        "Data and Context: <verified-notion-root-entry-url>",
        "Always run OSM Log at meaningful checkpoints or when asked.",
    ],
            "new bridge route")
    require(bridge.strip() == setup_guide_bridge(root),
            "bridge parity with public setup guide")
    require("OSM Context and AIOS Context." in (skill_root / "osm-data-context/index.md").read_text(),
            "retained context names")
    identity = (skill_root / "osm-setup/references/migration.md").read_text()
    require(all(row in identity for row in (
                "| Package `osm` 0.31.0 or later", "| Package `aios` 0.29.x or earlier",
                "| Package `osm` 0.1.x, or `osm-onboard` |",
                "| A skill named `aios`, `aios-*`, `osm` or `osm-*` without proved provenance |")) and
            "never a reason to remove a current 0.30.0+ registration" in identity and
            "neither update needs a Notion migration" in identity and
            "never rewrites owner data" in identity,
            "package identity classification")

    # The bundled Notion page is new-customer product copy; existing pages keep theirs.
    root_template = (skill_root / "osm-data-context/assets/data-and-context-root.md").read_text()
    require("\n# AI operating model\n" in root_template, "context root title")
    root_body = root_template.split("\n# AI operating model\n", 1)[1].lstrip()
    require(root_body.startswith("## Data and Context Definition\n\n```yaml\n"),
            "context root starts with definition")
    require(root_body.rstrip().endswith("\n```"), "context root ends with definition")
    notion_page = skill_root / "osm-data-context/assets/notion-osm.md"
    require(notion_page.is_file() and not (skill_root / "osm-data-context/assets/notion-aios.md").exists(),
            "new Notion page template")
    page = notion_page.read_text()
    require(page.startswith("# Adapting the OSM page\n") and "\n# OSM\n" in page and
            "The Onlinesourdough Method" in page and "\n# AIOS\n" not in page and
            not re.search(r"operating\s+system", page, re.I),
            "new Notion page template")
    # One effective source during acceptance: disable aios before the fresh session.
    switch = identity.split("### Switch from aios to osm", 1)
    require(len(switch) == 2 and all(step in switch[1] for step in (
                "Disable `aios` through the app's supported control before acceptance",
                "`claude plugin disable aios@online-sourdough --scope user`",
                '`plugins."aios@online-sourdough".enabled` to `false`',
                "`config/value/write`", "keeping the tested rollback source",
                "only when no other active session, workspace or profile",
                "disable `osm` the same way, re-enable `aios`")),
            "aios to osm switch procedure")
    for relative in ("README.md", "CHANGELOG.md", "docs/osm.md", "docs/native-installation.md",
                     "skills/osm-setup/references/migration.md", "skills/osm/references/update.md",
                     "skills/osm-setup/references/adapter-codex.md",
                     "skills/osm-setup/references/adapter-claude.md"):
        current = (root / relative).read_text()
        if relative == "CHANGELOG.md":
            current = current.split("\n## ", 2)[1]
        require(not re.search(r"then\s+remove\s+`aios|both\s+are\s+active|codex\s+plugin\s+disable",
                              current, re.I),
                f"aios to osm switch procedure: {relative}")

    parity = (skill_root / "osm-setup/references/legacy-parity.md").read_text()
    parity_rows = {}
    parity_names = []
    for line in parity.splitlines():
        match = re.match(r"^\| (aios[^ ]*) \|", line)
        if match:
            legacy_name = match.group(1)
            parity_names.append(legacy_name)
            parity_rows[legacy_name] = line
    require(len(parity_names) == len(set(parity_names)) == len(LEGACY_ROUTE_TARGETS)
            and set(parity_rows) == set(LEGACY_ROUTE_TARGETS),
            "legacy behavior map")
    for legacy_name, targets in LEGACY_ROUTE_TARGETS.items():
        require(all(f"]({target})" in parity_rows[legacy_name] for target in targets),
                f"legacy route target: {legacy_name}")
    require("ca1ba807716d1a992889f02d41cddf94fdee9f32" in parity,
            "legacy inventory identity")
    for external_name, target in LEGACY_EXTERNAL_TARGETS.items():
        require(f"| `{external_name}` |" in parity and target in parity,
                f"legacy external disposition: {external_name}")

    for relative, forbidden_values in FORBIDDEN_BOUNDARY_TEXT.items():
        boundary_text = (root / relative).read_text()
        require(not any(value in boundary_text for value in forbidden_values),
                f"external owner coupling: {relative}")

    shipped_text = sorted((root / "skills").rglob("*.md"))
    shipped_text += sorted((root / "docs").rglob("*.md"))
    for path in shipped_text:
        text = path.read_text()
        require(not any(re.search(pattern, text, re.I)
                        for pattern in FORBIDDEN_SHIPPED_PATTERNS),
                f"external owner coupling: {path.relative_to(root)}")

    icon = (root / "assets/icon.png").read_bytes()
    require(icon[:8] == b"\x89PNG\r\n\x1a\n" and icon[12:16] == b"IHDR", "icon format")
    width, height = struct.unpack(">II", icon[16:24])
    require(width == height and 256 <= width <= 2048, "icon dimensions")
    interface = manifest["interface"]
    require(interface["composerIcon"] == interface["logo"] == "./assets/icon.png",
            "icon declaration")

    for relative in PRODUCT_PATHS:
        product = root / relative
        members = product.rglob("*") if product.is_dir() else [product]
        for path in members:
            require(not path.is_symlink(), f"product symlink: {path}")
            if path.is_file():
                parts = path.relative_to(root).parts
                ui = (len(parts) == 4 and parts[0] == "skills" and
                      parts[1] in SKILL_NAMES and parts[2] == "agents" and
                      path.name == "openai.yaml")
                notion = path.relative_to(root).as_posix() in {
                    'runtime/notion/server.cjs', 'runtime/notion/guide.html', 'runtime/notion/THIRD-PARTY-NOTICES.md'}
                allowed = (path.suffix in {".md", ".json"} or ui or notion or
                           path.name == "LICENSE" or
                           path == root / "assets/icon.png" or
                           path == root / "skills/osm-data-context/assets/ai-operating-model.svg")
                require(allowed, f"unexpected product file: {path}")

    documents = [root / "README.md", root / "AGENTS.md", root / "CHANGELOG.md"]
    for folder in (root / "docs", root / "skills", root / ".agents/skills"):
        documents.extend(folder.rglob("*.md"))
    for path in documents:
        list(link_targets(path))
        text = path.read_text()
        require(not re.search(r"/(?:Users|home)/[\w.-]+/", text),
                f"personal machine path: {path}")
        require(not any(re.search(pattern, text) for pattern in SECRET_PATTERNS),
                f"secret-like content: {path}")

    with tempfile.TemporaryDirectory(prefix="osm-package-") as temporary:
        staged = Path(temporary) / "osm"
        copy_product(root, staged)
        require(not any((staged / name).exists() for name in (".agents", "tests", "AGENTS.md")),
                "author content in product")
        require({p.relative_to(staged).as_posix() for p in (staged / "docs").rglob("*")
                 if p.is_file()} == {"docs/osm.md"},
                "unapproved documentation in product")
        require(not any((staged / "skills" / name).exists()
                        for name in ("setup-guardrails", "shape-offer")),
                "optional global capability shipped")
        require((staged / "skills/osm-human-writing/SKILL.md").is_file(), "built-in writing capability missing")
        for path in staged.rglob("*.md"):
            list(link_targets(path, staged))


def rejected(mutator, expected):
    with tempfile.TemporaryDirectory(prefix="osm-negative-") as temporary:
        copy = Path(temporary) / "repo"
        shutil.copytree(ROOT, copy, ignore=shutil.ignore_patterns(".git", ".tmp", "node_modules"))
        mutator(copy)
        try:
            validate(copy)
        except AssertionError as error:
            require(expected in str(error), f"wrong rejection: {error}")
        else:
            raise AssertionError(f"accepted regression: {expected}")


def negative_controls():
    def missing_skill_version(root):
        path = root / "skills/osm-setup/SKILL.md"
        path.write_text(re.sub(r'^  version: [^\n]*\n', '', path.read_text(), count=1, flags=re.M))

    def unquoted_skill_version(root):
        path = root / "skills/osm-setup/SKILL.md"
        path.write_text(re.sub(r'^  version: [^\n]*', '  version: 1.0.0',
                               path.read_text(), count=1, flags=re.M))

    def missing_domain_route(root):
        path = root / "skills/osm/index.md"
        path.write_text(path.read_text().replace(
            "](../osm-data-context/index.md)", "](../osm-human-writing/SKILL.md)"))

    def alias_skill(root):
        folder = root / "skills/osm-check"
        folder.mkdir()
        (folder / "SKILL.md").write_text("---\nname: osm-check\ndescription: Alias.\n---\n")

    def discoverable_draft(root):
        folder = root / "docs/content-drafts/skills/content"
        (folder / "SKILL.md").write_text("---\nname: content\ndescription: Draft.\n---\n")

    def shipped_owner_template(root):
        (root / "skills/osm-setup/assets").mkdir()

    def split_source(root):
        package = json.loads((root / "package.json").read_text())
        package["pi"]["skills"] = ["./copied-skills"]
        (root / "package.json").write_text(json.dumps(package))

    def install_script(root):
        package = json.loads((root / "package.json").read_text())
        package["scripts"] = {"postinstall": "echo unexpected"}
        (root / "package.json").write_text(json.dumps(package))

    def duplicate_owner(root):
        path = root / "skills/osm-manage-data-context/references/owner-skills.md"
        path.write_text("# Duplicate owner\n")

    def runtime_script(root):
        (root / "skills/osm/unsafe.sh").write_text("echo unexpected\n")

    def coupled_system_tool(root):
        path = root / "skills/osm/references/routing.md"
        path.write_text(path.read_text() + "\nUse OpenPencil for design.\n")

    def missing_legacy_route(root):
        path = root / "skills/osm-setup/references/legacy-parity.md"
        path.write_text(path.read_text().replace(
            "](" + RELEASE_ARCHIVE + "osm-triage-improvement/SKILL.md)", "](missing-triage.md)", 1))

    def duplicate_legacy_route(root):
        path = root / "skills/osm-setup/references/legacy-parity.md"
        duplicate = next(line for line in path.read_text().splitlines()
                         if line.startswith("| aios-build-work |"))
        path.write_text(path.read_text() + duplicate + "\n")

    def local_phase_copy(root):
        folder = root / ".agents/skills/spec-project"
        folder.mkdir(parents=True)
        shutil.copyfile(root / "skills/osm-setup/SKILL.md", folder / "SKILL.md")

    def local_phase_wrapper(root):
        folder = root / ".agents/skills/build-project"
        folder.mkdir(parents=True)
        (folder / "SKILL.md").write_text("---\nname: build-project\ndescription: Use shared Build.\n---\nInvoke osm-build-work.\n")

    def native_version_drift(root):
        path = root / 'gemini-extension.json'
        data = json.loads(path.read_text())
        data['version'] = '99.0.0'
        path.write_text(json.dumps(data))

    def native_split_source(root):
        path = root / '.cursor-plugin/plugin.json'
        data = json.loads(path.read_text())
        data['skills'] = './copied-skills'
        path.write_text(json.dumps(data))

    def implicit_hook(root):
        (root / 'hooks').mkdir()
        (root / 'hooks/hooks.json').write_text('{}')

    def retired_skill_copy(root):
        folder = root / "skills/osm-build-work"
        folder.mkdir()
        (folder / "SKILL.md").write_text("---\nname: osm-build-work\ndescription: Retired.\n---\n")

    def wrapped_bridge_markers(root):
        path = root / "skills/osm-data-context/assets/bridge.md"
        path.write_text("<!-- OSM:BEGIN -->\n" + path.read_text() + "<!-- OSM:END -->\n")

    def bridge_guide_drift(root):
        path = root / "skills/osm-data-context/assets/bridge.md"
        path.write_text(path.read_text().replace("built-in tools can't do the work.", "built-in tools are unavailable."))

    def dropped_retained_context_names(root):
        path = root / "skills/osm-data-context/index.md"
        path.write_text(path.read_text().replace("OSM Context and AIOS Context.", ""))

    def dropped_log_trigger(root):
        path = root / "skills/osm-data-context/assets/bridge.md"
        path.write_text(path.read_text().replace("Always run OSM Log", "Consider writing a note"))

    def prefix_only_classification(root):
        path = root / "skills/osm-setup/references/migration.md"
        path.write_text(path.read_text().replace(
            "never a reason to remove a current 0.30.0+ registration", "a legacy package"))

    def retired_brand_template(root):
        path = root / "skills/osm-data-context/assets/notion-osm.md"
        path.write_text(path.read_text().replace("\n# OSM\n", "\n# OSM\n\nYour AI operating system.\n"))

    def introduction_before_definition(root):
        path = root / "skills/osm-data-context/assets/data-and-context-root.md"
        path.write_text(path.read_text().replace("\n# AI operating model\n",
                                               "\n# AI operating model\n\nIntroduction.\n", 1))

    def overlapping_acceptance(root):
        path = root / "docs/osm.md"
        path.write_text(path.read_text() + "\nInstall osm, start a fresh chat, then remove `aios`.\n")

    def disable_after_acceptance(root):
        path = root / "skills/osm-setup/references/migration.md"
        path.write_text(path.read_text().replace(
            "Disable `aios` through the app's supported control before acceptance", "Later, remove `aios`"))

    rejected(retired_brand_template, "new Notion page template")
    rejected(introduction_before_definition, "context root starts with definition")
    rejected(overlapping_acceptance, "aios to osm switch procedure: docs/osm.md")
    rejected(disable_after_acceptance, "aios to osm switch procedure")
    rejected(retired_skill_copy, "skill inventory")
    rejected(wrapped_bridge_markers, "bridge wrapper markers")
    rejected(bridge_guide_drift, "bridge parity with public setup guide")
    rejected(dropped_retained_context_names, "retained context names")
    rejected(dropped_log_trigger, "new bridge route")
    rejected(prefix_only_classification, "package identity classification")
    rejected(native_version_drift, 'native identity/version drift')
    rejected(native_split_source, 'native split skill source')
    rejected(implicit_hook, 'unexpected native runtime')

    rejected(missing_domain_route, "built-in reference route missing")
    rejected(alias_skill, "skill inventory")
    rejected(discoverable_draft, "non-shipped drafts discoverable")
    rejected(shipped_owner_template, "file-home owner template shipped")
    rejected(split_source, "different skill sources")
    rejected(install_script, "consumer script or dependency")
    rejected(duplicate_owner, "duplicate personal-skill owner")
    rejected(runtime_script, "unexpected product file")
    rejected(coupled_system_tool, "external owner coupling")
    rejected(missing_legacy_route, "legacy route target")
    rejected(duplicate_legacy_route, "legacy behavior map")
    rejected(local_phase_copy, "duplicate generic repository skill payload")
    rejected(local_phase_wrapper, "duplicate generic repository skill payload")
    rejected(missing_skill_version, "missing metadata.version")
    rejected(unquoted_skill_version, "metadata values must be quoted strings")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", help="local Git release/commit for per-skill SemVer maintenance")
    parser.add_argument("--release-tag", help="version tag being promoted to a GitHub Release")
    args = parser.parse_args()
    validate(release_tag=args.release_tag)
    negative_controls()
    if args.baseline:
        commit = validate_baseline(ROOT, args.baseline, SKILL_NAMES)
        print(f"PASS: per-skill version maintenance against {commit}")
    print(f"PASS: package declarations, {len(SKILL_NAMES)} versioned skill frontmatters, complete legacy routes, links, isolation, and security checks")
    print("PASS: discovery contracts and external-owner coupling boundaries")
    print("PASS: rejects split sources, install hooks, misplaced helpers, inherited instructions, and duplicate ownership")
