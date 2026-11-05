#!/usr/bin/env python3
"""Prepare isolated semantic probes and score native model output; never launches a model."""

import argparse
import hashlib
import json
from pathlib import Path
import subprocess

from skill_metadata import RENAMED_SKILLS

ROOT = Path(__file__).resolve().parents[1]
CASES = ROOT / "tests/fixtures/model-selection-cases.json"
SOURCES = [
    "skills/osm/references/model-advice.md",
    "skills/osm/references/model-measurement.md",
    "skills/osm/references/continuation.md",
    "skills/osm/references/lifecycle.md",
    "skills/osm-spec-work/SKILL.md",
    "skills/osm-build-work/SKILL.md",
    "skills/osm-orchestrate-workers/SKILL.md",
]
FIELDS = {
    "id": {"type": "string"},
    "model": {"type": ["string", "null"]},
    "effort": {"type": ["string", "null"]},
    "session": {"type": "string", "enum": ["stay", "switch_here", "worker", "new_task", "user_handoff", "blocked"]},
    "ask": {"type": "boolean"},
    "research": {"type": "boolean"},
    "apply_switch": {"type": "boolean"},
    "launch_model_arg": {"type": ["string", "null"]},
    "write_defaults": {"type": "boolean"},
    "write_inventory": {"type": "boolean"},
    "coordination": {"type": "string", "enum": ["current_task", "orchestrator", "recipient", "user", "unresolved"]},
    "prepare_prompt": {"type": "boolean"},
    "after_startup": {"type": "string", "enum": ["not_launching", "coordinate", "end_lead"]},
    "reassess_judgment": {"type": "boolean"},
    "handoff_prompt": {"type": ["string", "null"]},
    "explanation": {"type": "string"},
}


def baseline_path(relative):
    """Map a current source to its pre-0.30.0 skill folder for older baselines."""
    parts = relative.split("/")
    parts[1] = RENAMED_SKILLS.get(parts[1], parts[1])
    return "/".join(parts)


def prepare(destination, baseline):
    destination.mkdir(parents=True, exist_ok=True)
    snippets = []
    hashes = {}
    for relative in SOURCES:
        if baseline:
            result = subprocess.run(["git", "show", f"{baseline}:{relative}"], cwd=ROOT,
                                    text=True, capture_output=True)
            if result.returncode and baseline_path(relative) != relative:
                result = subprocess.run(["git", "show", f"{baseline}:{baseline_path(relative)}"],
                                        cwd=ROOT, text=True, capture_output=True)
            if result.returncode and relative == "skills/osm/references/continuation.md":
                # Before shared ownership, the same conditional procedure lived here.
                result = subprocess.run(["git", "show", f"{baseline}:skills/aios-select-model/references/continuation.md"],
                                        cwd=ROOT, text=True, capture_output=True)
            if result.returncode:
                if relative.startswith("skills/osm/references/model-") or relative.endswith("/continuation.md"):
                    continue  # Model advice did not exist at these paths in the baseline.
                raise RuntimeError(result.stderr)
            content = result.stdout
        else:
            content = (ROOT / relative).read_text()
        hashes[relative] = hashlib.sha256(content.encode()).hexdigest()
        snippets.append(f"SOURCE {relative}\n{content}")
    cases = json.loads(CASES.read_text())
    prompt = """You are independently exercising the attached OSM instructions on synthetic tasks.
Treat each case independently. Use only the supplied instructions and runtime facts;
do not call tools, access files, read personal context or execute any case.
The fixtures describe the hypothetical runtime, not the evaluator's own tools.
Produce the next routing decision for every case. Keep explanations to one short
sentence and portable prompts concise while preserving essential inputs.
This is decision simulation, not a claim that a switch, write, launch or research occurred.
ask means a question needs an answer, not a direct instruction for an already-decided user action.
apply_switch means you would invoke an available authorized in-session switch now.
write_defaults means a persistent native default change is part of the next authorized action.
write_inventory means persisting the runtime/benchmark inventory in the shipped method or synced owner home.
launch_model_arg is the exact model argument for a proposed worker/new-task call, or null when omitted/not launching.
research means a new external evidence lookup is needed now, not reusing supplied evidence.
session describes the next routing action; worker leaves the writer in place for separable work.
coordination identifies who owns continuation; orchestrator means this caller retains coordination/acceptance of delegated work.
prepare_prompt means provide self-contained accepted context and essential instructions for the recipient, not inaccessible path references alone.
after_startup describes this caller's role after confirmed startup of a proposed launch, not a claim startup occurred.
reassess_judgment means explicitly reopen a prior phase-based suitability decision because unresolved choices have changed.
handoff_prompt is the actual usable prompt for cases explicitly asking for a portable brief, otherwise null; do not perform its production task.
Return the required JSON, with all case IDs exactly once.\n\n"""
    prompt += "\n\n".join(snippets)
    prompt += "\n\nCASES\n" + json.dumps([{k: v for k, v in c.items() if k != "expected"}
                                            for c in cases], ensure_ascii=False, indent=2)
    (destination / "prompt.txt").write_text(prompt)
    schema = {"type": "object", "properties": {"decisions": {"type": "array", "items": {
        "type": "object", "properties": FIELDS, "required": list(FIELDS), "additionalProperties": False}}},
        "required": ["decisions"], "additionalProperties": False}
    (destination / "schema.json").write_text(json.dumps(schema, indent=2) + "\n")
    (destination / "source-hashes.json").write_text(json.dumps(hashes, indent=2) + "\n")
    print(f"Prepared {len(cases)} independent cases; {len(prompt.encode())} prompt bytes; expectations withheld.")


def score(result):
    cases = json.loads(CASES.read_text())
    decisions = json.loads(result.read_text())["decisions"]
    by_id = {d["id"]: d for d in decisions}
    assert len(by_id) == len(decisions) == len(cases), "missing/duplicate case"
    assert set(by_id) == {c["id"] for c in cases}, "case identity mismatch"
    failed = []
    for case in cases:
        errors = []
        decision = by_id[case["id"]]
        for key, expected in case["expected"].items():
            actual = decision[key]
            ok = actual in expected if isinstance(expected, list) else actual == expected
            if not ok:
                errors.append(f"{key}={actual!r}, expected {expected!r}")
        if errors:
            failed.append(case["id"])
        print(f"{'FAIL' if errors else 'PASS'} {case['id']}: " + ("; ".join(errors) or decision["explanation"]))
    print(f"{len(cases)-len(failed)}/{len(cases)} semantic fixture decisions passed.")
    print("Requires human inspection of explanations; this does not prove live switching, install or task-token savings.")
    return bool(failed)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    prep = commands.add_parser("prepare")
    prep.add_argument("destination", type=Path)
    prep.add_argument("--baseline", help="optional existing Git revision, same cases and evaluator contract")
    check = commands.add_parser("score")
    check.add_argument("result", type=Path)
    args = parser.parse_args()
    if args.command == "prepare":
        prepare(args.destination.resolve(), args.baseline)
        return 0
    return score(args.result)


if __name__ == "__main__":
    raise SystemExit(main())
