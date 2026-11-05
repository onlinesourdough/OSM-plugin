#!/usr/bin/env python3
"""Static responsibility and caller-graph rehearsal for the Notion-only core (#88).

Checks source text and links only; it proves no native discovery or model behavior.
"""

from pathlib import Path
import re
import shutil
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"
EXPECTED = {
    "osm", "osm-build-work", "osm-clarify", "osm-create-project", "osm-data-context",
    "osm-human-writing", "osm-interview", "osm-manage-data-context", "osm-manage-skills",
    "osm-orchestrate-workers", "osm-review-work", "osm-risky-changes", "osm-setup",
    "osm-ship-work", "osm-spec-work", "osm-triage-improvement", "osm-write-code",
}
RETIRED = {"osm-check", "osm-update", "osm-select-model", "osm-context",
           "osm-maintain-context", "content", "diffusion-studio"}
# One owner per operation; each caller must link to it.
OWNERS = {
    "conduct onboarding": ("osm-setup/SKILL.md", ["osm/SKILL.md"]),
    "engineer the Notion home": ("osm-data-context/SKILL.md", ["osm/SKILL.md", "osm-setup/SKILL.md"]),
    "retrieve and curate context": ("osm-manage-data-context/SKILL.md", ["osm/SKILL.md", "osm-setup/SKILL.md"]),
    "skill lifecycle": ("osm-manage-skills/SKILL.md", ["osm/SKILL.md", "osm-manage-data-context/SKILL.md"]),
    "read-only check": ("osm/references/check.md", ["osm/SKILL.md", "osm-manage-skills/SKILL.md"]),
    "update and rollback": ("osm/references/update.md", ["osm/SKILL.md", "osm-setup/references/legacy-parity.md"]),
    "model advice": ("osm/references/model-advice.md",
                     ["osm/SKILL.md", "osm-spec-work/SKILL.md", "osm-build-work/SKILL.md",
                      "osm-orchestrate-workers/SKILL.md"]),
    "personal-skill lifecycle": ("osm-manage-skills/references/owner-skills.md", ["osm-setup/SKILL.md"]),
}
CHAIN = {"osm-setup", "osm-data-context", "osm-manage-data-context", "osm-manage-skills"}
# Files that may still name retired things, because they explain the retirement.
HISTORY = {"osm/SKILL.md", "osm/references/update.md", "osm/references/check.md",
           "osm-setup/references/migration.md", "osm-setup/references/legacy-parity.md",
           "osm-setup/references/setup.md", "osm-setup/references/setup-scenarios.md",
           "osm-setup/references/adapters.md", "osm-manage-skills/references/owner-skills.md",
           "osm-manage-data-context/SKILL.md", "osm-manage-data-context/references/curation.md",
           "osm-data-context/SKILL.md", "osm-data-context/references/architecture.md",
           "osm-setup/SKILL.md"}
# Never allowed in any shipped skill text, history files included. Whitespace is normalized
# first so a line break cannot hide a phrase. Nothing needs an exemption today.
DENY_EVERYWHERE = ("~/.AIOS", "~/AIOS", "managed file")
# One pin per refinement rule: (name, file, normalized phrase). Each has a deletion control.
PINS = (
    ("relation basis", "osm-data-context/references/notion/schema-and-templates.md",
     "only with a stated meaning (what it asserts), its evidence"),
    ("import is not evidence time", "osm-data-context/references/architecture.md",
     "an import time is never the comparable evidence time"),
    ("readback before checkpoint", "osm-manage-data-context/SKILL.md",
     "only after reading back the saved result"),
    ("source-only class", "osm-manage-data-context/SKILL.md",
     "copy nothing and create no record"),
    ("flagged results", "osm-manage-data-context/SKILL.md",
     "are not merged: keep both and return them as flagged results"),
    ("items without a record", "osm-manage-data-context/SKILL.md",
     "go to a labelled line on the maintenance or control record the definition names"),
    ("classification in the contract", "osm-data-context/references/architecture.md",
     "classified durable, provisional or source-only"),
    ("no call back into Setup", "osm-setup/SKILL.md", "nothing calls back"),
)
ACTIVE_DENY = ("AIOS_ROOT", "provider selection", "existing-home", "Use a folder or other link",
               "file bridge", "legacy-file-home")


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def normalized(path):
    return " ".join(path.read_text().split())


def links(path):
    for target in re.findall(r"\]\(([^)\s]+)\)", path.read_text()):
        if re.match(r"[a-z]+:", target) or target.startswith("#"):
            continue
        yield (path.parent / target.split("#", 1)[0]).resolve()


def has_cycle(graph):
    state = {}
    def visit(node):
        state[node] = 1
        for nxt in graph.get(node, ()):
            if state.get(nxt) == 1 or (nxt not in state and visit(nxt)):
                return True
        state[node] = 2
        return False
    return any(node not in state and visit(node) for node in list(graph))


def check(root=ROOT):
    skills = root / "skills"
    names = {p.parent.name for p in skills.glob("*/SKILL.md")}
    require(names == EXPECTED, "skill inventory")
    require(not (names & RETIRED) and not any((skills / n).exists() for n in RETIRED),
            "retired name kept as a skill or alias directory")
    require(not list((root / "docs").rglob("SKILL.md")), "draft method is discoverable")

    for operation, (owner, callers) in OWNERS.items():
        target = (skills / owner).resolve()
        require(target.is_file(), f"owner missing: {operation}")
        for caller in callers:
            require(target in set(links(skills / caller)), f"{caller} does not call the {operation} owner")

    # Delegation graph between the context skills: from SKILL.md files only.
    graph = {name: set() for name in CHAIN}
    for name in CHAIN:
        for target in links(skills / name / "SKILL.md"):
            try:
                other = target.relative_to(skills.resolve()).parts[0]
            except ValueError:
                continue
            if other in CHAIN and other != name and target.name == "SKILL.md":
                graph[name].add(other)
    require(not has_cycle(graph), f"delegation loop: {graph}")
    require(not any("osm-setup" in graph[name] for name in CHAIN - {"osm-setup"}),
            "something calls back into Setup")
    require("osm-manage-data-context" not in graph["osm-data-context"] and
            "osm-data-context" not in graph["osm-manage-skills"], "unexpected reverse delegation")
    require(graph["osm-manage-data-context"] <= {"osm-data-context", "osm-manage-skills"} and
            graph["osm-setup"] == {"osm-data-context", "osm-manage-data-context", "osm-manage-skills"},
            f"unexpected delegation edges: {graph}")

    for path in skills.rglob("*.md"):
        relative = path.relative_to(skills).as_posix()
        for target in links(path):
            require(target.exists(), f"broken link: {relative}")
            require("legacy-file-home" not in target.as_posix() and "content-drafts" not in target.as_posix(),
                    f"shipped skill links a non-shipped record: {relative}")
        flat = normalized(path)
        for phrase in DENY_EVERYWHERE:
            require(phrase not in flat, f"shipped text names {phrase!r}: {relative}")
        if relative not in HISTORY:
            text = path.read_text()
            for phrase in ACTIVE_DENY:
                require(phrase not in text, f"active flow names retired {phrase!r}: {relative}")

    for name, relative, phrase in PINS:
        require(phrase in normalized(skills / relative), f"rule text missing: {name}")
    require("osm-setup" not in {t.parent.name for t in links(skills / "osm-manage-data-context/references/curation.md")},
            "curation links back to Setup")
    skills_doc = root / "docs/skills.md"
    if skills_doc.exists():
        listed = normalized(skills_doc)
        for operation, (owner, _callers) in OWNERS.items():
            shown = owner if owner.endswith("SKILL.md") or owner.startswith("osm/references/") \
                else owner.split("/")[0] + "/SKILL.md"
            require(f"skills/{shown}" in listed, f"docs/skills.md omits the owner of {operation}")

    setup = (skills / "osm-setup/SKILL.md").read_text()
    data = (skills / "osm-data-context/SKILL.md").read_text()
    require("Setup never creates Content" in setup and "Never create Content" in data,
            "Content creation boundary")
    router = (skills / "osm/SKILL.md").read_text()
    for old in ("osm-context", "osm-maintain-context", "osm-check", "osm-update",
                "osm-select-model", "content", "diffusion-studio"):
        require(f"`{old}`" in router, f"retired name not routed: {old}")
    manage = (skills / "osm-manage-data-context/SKILL.md").read_text()
    require("## Classify what comes in" in manage and "needs-attention list" in manage and
            "reuses the same record identity" in manage and "no global truth, health or freshness score" in manage,
            "intake classes, needs-attention list or checkpoint rule missing")
    require("(../../osm-manage-data-context/SKILL.md#classify-what-comes-in)" in
            (skills / "osm-setup/references/setup.md").read_text(), "Setup intake does not point at the classes")
    for path in skills.rglob("*.md"):
        require(not re.search(r"\bHealthy\b", path.read_text()), f"global health verdict wording: {path.name}")
    update = (skills / "osm/references/update.md").read_text()
    require("## Retired names and the scheduled caller" in update and
            "does not read or edit any\nschedule" in update and
            "## Legacy file and vault homes" in update, "scheduled-caller and legacy guidance")


def rejected(mutate, expected):
    with tempfile.TemporaryDirectory(prefix="osm-responsibility-") as temporary:
        copy = Path(temporary) / "repo"
        copy.mkdir()
        shutil.copytree(ROOT / "skills", copy / "skills")
        (copy / "docs").mkdir()
        shutil.copy2(ROOT / "docs/osm.md", copy / "docs/osm.md")
        shutil.copy2(ROOT / "docs/skills.md", copy / "docs/skills.md")
        shutil.copytree(ROOT / ".codex-plugin", copy / ".codex-plugin")
        mutate(copy)
        try:
            check(copy)
        except AssertionError as error:
            require(expected in str(error), f"wrong rejection: {error}")
        else:
            raise AssertionError(f"accepted regression: {expected}")


def negative_controls():
    def call_back(root):
        path = root / "skills/osm-manage-skills/SKILL.md"
        path.write_text(path.read_text() + "\nSee [Setup](../osm-setup/SKILL.md).\n")

    def reverse_edge(root):
        path = root / "skills/osm-data-context/SKILL.md"
        path.write_text(path.read_text() + "\nSee [Manage](../osm-manage-data-context/SKILL.md).\n")

    def alias(root):
        (root / "skills/osm-check").mkdir()
        (root / "skills/osm-check/SKILL.md").write_text("---\nname: osm-check\n---\n")

    def file_home_route(root):
        path = root / "skills/osm-spec-work/SKILL.md"
        path.write_text(path.read_text() + "\nUse the file bridge.\n")

    def unrouted_old_name(root):
        path = root / "skills/osm/SKILL.md"
        path.write_text(path.read_text().replace("`osm-select-model`", "`other`"))

    def health_verdict(root):
        path = root / "skills/osm/references/check.md"
        path.write_text(path.read_text() + "\nReport Healthy or Needs decision.\n")

    def default_home(root):
        path = root / "skills/osm-setup/SKILL.md"
        path.write_text(path.read_text().replace("Setup offers no\n  file or vault option.", "New homes use ~/.AIOS."))

    def line_broken_phrase(root):
        path = root / "skills/osm-data-context/references/home-contract.md"
        path.write_text(path.read_text() + "\nAn existing managed\nfile bridge can continue.\n")

    def history_exempt_file(root):
        path = root / "skills/osm-setup/references/setup-scenarios.md"
        path.write_text(path.read_text() + "\n| New home | none | New home uses ~/AIOS |\n")

    def link_back(root):
        path = root / "skills/osm-manage-data-context/references/curation.md"
        path.write_text(path.read_text() + "\nSee [Setup](../../osm-setup/SKILL.md).\n")

    def dropped_owner_row(root):
        path = root / "docs/skills.md"
        path.write_text(path.read_text().replace("skills/osm/references/model-advice.md", "skills/osm/references/gone.md"))

    def delete_rule(name, relative, phrase):
        def mutate(root):
            path = root / "skills" / relative
            pattern = r"\s+".join(re.escape(word) for word in phrase.split())
            text, count = re.subn(pattern, "", path.read_text(), count=1)
            require(count == 1, f"control could not delete {name}")
            path.write_text(text)
        return mutate

    rejected(health_verdict, "global health verdict wording")
    rejected(default_home, "shipped text names")
    rejected(line_broken_phrase, "shipped text names")
    rejected(history_exempt_file, "shipped text names")
    rejected(link_back, "curation links back to Setup")
    rejected(dropped_owner_row, "docs/skills.md omits the owner")
    for name, relative, phrase in PINS:
        rejected(delete_rule(name, relative, phrase), f"rule text missing: {name}")
    rejected(call_back, "delegation loop")
    rejected(reverse_edge, "delegation loop")
    rejected(alias, "skill inventory")
    rejected(file_home_route, "active flow names retired")
    rejected(unrouted_old_name, "retired name not routed")


def main():
    check()
    negative_controls()
    print("PASS: 17 owners, one owner per operation, acyclic context delegation, no active file-home route")


if __name__ == "__main__":
    main()
