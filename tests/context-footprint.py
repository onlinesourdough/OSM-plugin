#!/usr/bin/env python3
"""Static selected-read benchmark; not native-runtime token telemetry."""

import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "tests/fixtures/context-footprint-legacy.json"
MAX_SKILL_BODY_BYTES = 8192
MAX_DESCRIPTION_BYTES = 240
JOB_PREFIXES = {
    "osm-clarify": "Explain ",
    "osm-human-writing": "Draft ",
    "osm-write-code": "Write ",
    "osm": "Explain ",
    "osm-build-work": "Implement ",
    "osm-create-project": "Start ",
    "osm-manage-data-context": "Retrieve ",
    "osm-manage-skills": "Manage ",
    "osm-dreaming": "Reflect ",
    "osm-setup": "Set up or resume ",
    "osm-data-context": "Engineer ",
    "osm-interview": "Interview ",
    "osm-orchestrate-workers": "Prepare, launch, coordinate and recover ",
    "osm-risky-changes": "Assess ",
    "osm-review-work": "Review ",
    "osm-ship-work": "Deliver ",
    "osm-spec-work": "Specify or revise ",
    "osm-triage-improvement": "Triage ",
}
# The Notion-only flow ships one thin host pointer and no owner-file scaffold.
CURRENT_NEUTRAL_SCAFFOLD = (
    "skills/osm-data-context/assets/bridge.md",
)
CURRENT_JOURNEYS = {
    "independent-local-negative-preload": (),
    "owner-business-route": (
        "skills/osm/SKILL.md",
        "skills/osm-data-context/SKILL.md",
        "skills/osm/references/routing.md",
    ),
    "spec-ready": (
        "skills/osm/SKILL.md",
        "skills/osm/references/routing.md",
        "skills/osm-spec-work/SKILL.md",
        "skills/osm/references/model-advice.md",
        "skills/osm/references/lifecycle.md",
        "skills/osm-spec-work/references/readiness.md",
    ),
    "worker-build": (
        "skills/osm/SKILL.md",
        "skills/osm/references/routing.md",
        "skills/osm-build-work/SKILL.md",
        "skills/osm-write-code/SKILL.md",
        "skills/osm/references/model-advice.md",
        "skills/osm-orchestrate-workers/SKILL.md",
        "skills/osm/references/lifecycle.md",
    ),
    "installation-check-basic": (
        "skills/osm/SKILL.md",
        "skills/osm/references/check.md",
    ),
    "codex-package-and-bridge-pre-verification": (
        # Package and pointer journey for the Notion-only flow.
        "skills/osm-setup/SKILL.md",
        "skills/osm-setup/references/setup.md",
        "skills/osm-interview/references/conversation.md",
        "skills/osm-manage-data-context/references/curation.md",
        "skills/osm-setup/references/adapters.md",
        "skills/osm-setup/references/adapter-codex.md",
        "skills/osm-setup/references/codex-tracking-acceptance.md",
    ) + CURRENT_NEUTRAL_SCAFFOLD,
    "codex-package-and-bridge-verification": (
        # Package and pointer journey for the Notion-only flow.
        "skills/osm-setup/SKILL.md",
        "skills/osm-setup/references/setup.md",
        "skills/osm-interview/references/conversation.md",
        "skills/osm-manage-data-context/references/curation.md",
        "skills/osm-setup/references/adapters.md",
        "skills/osm-setup/references/adapter-codex.md",
        "skills/osm-setup/references/codex-tracking-acceptance.md",
        "skills/osm/references/scenarios.md",
        "skills/osm-setup/references/setup-scenarios.md",
    ) + CURRENT_NEUTRAL_SCAFFOLD,
}


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def metadata_entries(skill_root, base_root):
    entries = []
    for path in sorted(skill_root.glob("*/SKILL.md")):
        text = path.read_text()
        frontmatter = text.split("---", 2)[1]
        name = re.search(r"^name:\s*(.+)$", frontmatter, re.M).group(1)
        description = re.search(r"^description:\s*(.+)$", frontmatter, re.M).group(1)
        if description.startswith('"'):
            description = json.loads(description)
        entries.append({
            "path": path.relative_to(base_root).as_posix(),
            "name": name,
            "description": description,
            "metadata": f"name: {name}\ndescription: {description}",
        })
    return entries


def current_metadata_bytes():
    entries = metadata_entries(ROOT / "skills", ROOT)
    require(len(entries) == len(JOB_PREFIXES), "skill metadata inventory")
    require(len({entry["metadata"] for entry in entries}) == len(JOB_PREFIXES),
            "ambiguous skill metadata")
    require(set(JOB_PREFIXES) == {entry["name"] for entry in entries},
            "skill job inventory")
    for entry in entries:
        require(entry["description"].startswith(JOB_PREFIXES[entry["name"]]),
                f"unclear skill job: {entry['name']}")
        require(len(entry["description"].encode()) <= MAX_DESCRIPTION_BYTES,
                f"unbounded skill metadata: {entry['name']}")
    for path in (ROOT / "skills").glob("*/SKILL.md"):
        require(path.stat().st_size <= MAX_SKILL_BODY_BYTES,
                f"unbounded skill body: {path.relative_to(ROOT)}")
    return sum(len(entry["metadata"].encode()) for entry in entries)


def verify_legacy(root, manifest):
    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    require(head == manifest["baseline_commit"], "legacy commit mismatch")
    records = {manifest["startup"]["agents"]["path"]: manifest["startup"]["agents"]}
    records.update(manifest["files"])
    for relative, expected in records.items():
        path = root / relative
        require(path.stat().st_size == expected["bytes"], f"legacy bytes: {relative}")
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        require(digest == expected["sha256"], f"legacy hash: {relative}")

    entries = metadata_entries(root / ".agents/skills", root)
    metadata = manifest["startup"]["skill_metadata"]
    require([entry["path"] for entry in entries] == metadata["source_paths"],
            "legacy metadata paths")
    require(sum(len(entry["metadata"].encode()) for entry in entries) == metadata["bytes"],
            "legacy metadata bytes")
    canonical = [{"path": entry["path"], "metadata": entry["metadata"]}
                 for entry in entries]
    blob = json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()
    require(hashlib.sha256(blob).hexdigest() == metadata["canonical_json_sha256"],
            "legacy metadata hash")


def legacy_bytes(manifest, journey):
    startup = manifest["startup"]["agents"]["bytes"]
    startup += manifest["startup"]["skill_metadata"]["bytes"]
    return startup + sum(manifest["files"][path]["bytes"]
                         for path in journey["files"])


def current_bytes(paths, startup):
    total = startup
    for relative in paths:
        path = ROOT / relative
        require(path.is_file(), f"missing journey source: {relative}")
        total += path.stat().st_size
    return total


def validate_routes():
    adapters = (ROOT / "skills/osm-setup/references/adapters.md").read_text()
    required = ("adapter-codex.md", "adapter-codex-desktop.md", "adapter-pi.md",
                "adapter-portability.md", "adapter-claude.md", "adapter-other.md",
                "harness-configuration.md")
    require(all(target in adapters for target in required), "adapter route coverage")
    require("exactly one operation route" in adapters, "adapter selective-read rule")

    harness = (ROOT / "skills/osm-setup/references/harness-configuration.md").read_text()
    required = ("harness-protection.md", "harness-codex.md",
                "harness-codex-context.md", "harness-codex-computer-use.md",
                "harness-codex-computer-history.md", "harness-pi.md")
    require(all(target in harness for target in required), "harness route coverage")
    require("exactly the references relevant" in harness, "harness selective-read rule")

    scenarios = (ROOT / "skills/osm/references/workflow-scenarios.md").read_text()
    require("Missing System" in scenarios and "no substitution" in scenarios,
            "negative specialist route")
    require("Lead-local proportionality" in scenarios and "do not load orchestration" in scenarios,
            "negative orchestration route")
    require("Context footprint parity" in scenarios and
            "a byte reduction fails if effective behavior narrows" in scenarios,
            "behavior-preserving footprint route")
    setup_scenarios = (ROOT / "skills/osm-setup/references/setup-scenarios.md").read_text()
    require("Reference isolation" in setup_scenarios and
            "do not load Pi, desktop, protection" in setup_scenarios,
            "onboarding reference isolation")

    require(not (ROOT / "skills/osm-setup/assets").exists(),
            "file-home scaffold shipped")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy-root", type=Path,
                        help="optional checkout used to verify the pinned manifest")
    parser.add_argument("--observed-bridge-bytes", type=int, default=876,
                        help="actual expanded owner bridge bytes; lead-observed default")
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text())
    if args.legacy_root:
        verify_legacy(args.legacy_root.resolve(), manifest)

    validate_routes()
    startup = args.observed_bridge_bytes + current_metadata_bytes()
    old_startup = manifest["startup"]["agents"]["bytes"]
    old_startup += manifest["startup"]["skill_metadata"]["bytes"]
    require(startup < old_startup, "startup method regression")
    print(f"baseline_commit={manifest['baseline_commit']}")
    print(f"legacy_startup_method_bytes={old_startup}")
    print(f"working_startup_method_bytes={startup}")
    current_bodies = sum(path.stat().st_size
                         for path in (ROOT / "skills").glob("*/SKILL.md"))
    current_markdown = sum(path.stat().st_size
                           for path in (ROOT / "skills").rglob("*.md"))
    print(f"legacy_all_skill_body_bytes={manifest['aggregate']['skill_bodies_bytes']}")
    print(f"working_all_skill_body_bytes={current_bodies}")
    print(f"legacy_all_skill_markdown_bytes={manifest['aggregate']['all_skill_markdown_bytes']}")
    print(f"working_all_skill_markdown_bytes={current_markdown}")
    legacy_scaffold = sum(manifest["files"][path]["bytes"]
                          for path in manifest["neutral_owner_scaffold"])
    current_scaffold = sum((ROOT / path).stat().st_size
                           for path in CURRENT_NEUTRAL_SCAFFOLD)
    print(f"legacy_neutral_setup_scaffold_bytes={legacy_scaffold}")
    print(f"working_neutral_setup_scaffold_bytes={current_scaffold}")
    print("journey|stage|legacy_bytes|working_bytes|change|working_token_estimate")
    for name, paths in CURRENT_JOURNEYS.items():
        legacy_journey = manifest["journeys"][name]
        legacy = legacy_bytes(manifest, legacy_journey)
        working = current_bytes(paths, startup)
        require(working <= legacy, f"selected-read regression: {name}")
        change = (working / legacy - 1) * 100
        estimate = math.ceil(working / 4)
        print(f"{name}|{legacy_journey['stage']}|{legacy}|{working}|{change:.1f}%|~{estimate}")

    interview = sum((ROOT / path).stat().st_size for path in (
        "skills/osm-interview/SKILL.md",
        "skills/osm-interview/references/owner-context.md",
    ))
    print(f"conditional_owner_interview_extra_bytes={interview}")
    print("NOTE: matched setup routes have an accepted focus and count the shared question procedure; missing foundation adds Interview and its owner-context guide")
    full_setup = current_bytes(CURRENT_JOURNEYS["codex-package-and-bridge-verification"], startup) + interview
    print(f"setup_with_owner_interview_through_verification_bytes={full_setup}")
    business = ROOT / "skills/osm-setup/references/business-context.md"
    print(f"conditional_business_coverage_extra_bytes={business.stat().st_size}")
    print(f"setup_with_business_coverage_and_owner_interview_bytes={full_setup + business.stat().st_size}")
    print("NOTE: business onboarding or a foundation audit adds the coverage reference; matched technical package/bridge journeys and ordinary retrieval do not")
    measurement = ROOT / "skills/osm/references/model-measurement.md"
    print(f"conditional_model_measurement_extra_bytes={measurement.stat().st_size}")
    print("NOTE: performance-claim/comparison tasks add that reference; no matched legacy measurement path is claimed")
    trials = ROOT / "skills/osm-spec-work/references/local-trials.md"
    print(f"conditional_local_trials_extra_bytes={trials.stat().st_size}")
    print("NOTE: a material unresolved choice adds this reference; ordinary Spec and Build routes do not")
    handoff = ROOT / "skills/osm/references/continuation.md"
    print(f"conditional_whole_task_handoff_extra_bytes={handoff.stat().st_size}")
    print("NOTE: portable/whole-task transfer adds that reference, not worker orchestration; no matched legacy transfer path is claimed")
    review_handoff = ROOT / "skills/osm-build-work/references/review-handoff.md"
    print(f"conditional_human_review_handoff_extra_bytes={review_handoff.stat().st_size}")
    print("NOTE: substantive human handoff adds this reference; visual capture uses its inline baseline/candidate rule and difficult explanation can add Clarify. The worker-build benchmark stops before handoff; no matched legacy or runtime saving is claimed")
    notion = sum((ROOT / path).stat().st_size for path in (
        "skills/osm/SKILL.md",
        "skills/osm-data-context/SKILL.md",
        "skills/osm-manage-data-context/references/operating.md",
    )) + startup
    print(f"conditional_notion_owner_route_bytes={notion}")
    contract = ROOT / "skills/osm-data-context/references/home-contract.md"
    print(f"conditional_context_setup_contract_extra_bytes={contract.stat().st_size}")
    print("NOTE: Notion guide, selected cloud sources and MCP tool schemas add workload-dependent bytes; no matched legacy or cost-saving claim")
    print("PASS: bounded skill bodies and representative positive/negative selected routes")
    print("NOTE: token values are bytes/4 estimates; no native-runtime token telemetry was available")
    print("NOTE: owner/task context and target-repository instructions are excluded as documented in the manifest")


if __name__ == "__main__":
    main()
