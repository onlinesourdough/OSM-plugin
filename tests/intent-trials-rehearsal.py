#!/usr/bin/env python3
"""Prepare and score bounded decision probes; never launches a model."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
CASES = ROOT / "tests/fixtures/intent-trials-cases.json"
SOURCES = (
    "skills/osm/SKILL.md",
    "skills/osm-interview/SKILL.md",
    "skills/osm-spec-work/SKILL.md",
    "skills/osm-spec-work/references/local-trials.md",
)
FIELDS = {"id": "string", "interview": "boolean", "trial": "boolean",
          "question": "boolean", "next_action": "string", "reply": "string"}


def prepare(destination, baseline):
    if destination.exists():
        raise SystemExit("Destination exists; preserve prior observations.")
    destination.mkdir(parents=True)
    excerpts, hashes = [], {}
    for relative in SOURCES:
        if baseline:
            result = subprocess.run(["git", "show", f"{baseline}:{relative}"],
                                    cwd=ROOT, text=True, capture_output=True)
            if result.returncode:
                if relative.endswith("/local-trials.md"):
                    continue
                raise RuntimeError(result.stderr)
            content = result.stdout
        else:
            content = (ROOT / relative).read_text()
        hashes[relative] = hashlib.sha256(content.encode()).hexdigest()
        excerpts.append(f"SOURCE {relative}\n{content}")
    cases = json.loads(CASES.read_text())
    prompt = """Exercise these instructions on each synthetic case independently.
Do not execute cases, call tools, read other files or write anything. Context
describes each case's tools, not your own. Return one decision per case.
interview means exploratory conversation before work; a focused mid-task question
alone is not an interview. trial means a local sample or concrete comparison is
the useful next route, including visual-direction exploration. question means a missing
answer holds the next dependent action; inviting a choice after showing variants
does not count as asking now. Include the actual short next reply in the user's
language and a concise next_action. Keep observed and planned evidence distinct.
This is decision simulation, not proof of native selection or executed trials.

"""
    prompt += "\n\n".join(excerpts)
    prompt += "\n\nCASES\n" + json.dumps(
        [{k: v for k, v in case.items() if k != "expected"} for case in cases],
        ensure_ascii=False, indent=2)
    item = {"type": "object", "properties": {
        key: {"type": kind} for key, kind in FIELDS.items()},
        "required": list(FIELDS), "additionalProperties": False}
    schema = {"type": "object", "properties": {
        "decisions": {"type": "array", "items": item}},
        "required": ["decisions"], "additionalProperties": False}
    (destination / "prompt.txt").write_text(prompt)
    (destination / "schema.json").write_text(json.dumps(schema, indent=2) + "\n")
    (destination / "source-hashes.json").write_text(json.dumps(hashes, indent=2) + "\n")
    print(f"Prepared {len(cases)} cases; expectations withheld; {len(prompt.encode())} bytes.")


def score(result):
    cases = json.loads(CASES.read_text())
    decisions = json.loads(result.read_text())["decisions"]
    by_id = {d["id"]: d for d in decisions}
    if len(by_id) != len(decisions) or set(by_id) != {c["id"] for c in cases}:
        raise ValueError("Missing, unexpected or duplicated case identity.")
    failed = []
    for case in cases:
        decision = by_id[case["id"]]
        errors = [f"{key}={decision[key]}, expected {value}"
                  for key, value in case["expected"].items() if decision[key] != value]
        if errors:
            failed.append(case["id"])
        print(f"{'FAIL' if errors else 'PASS'} {case['id']}: " +
              ("; ".join(errors) or decision["next_action"]))
    print(f"{len(cases) - len(failed)}/{len(cases)} decisions passed. Inspect replies separately.")
    return bool(failed)


# Outcome and criteria probe (#75). It reads the instructions a task would use to define
# what must be true, and records the answers for inspection. Scoring checks the withheld
# decisions and that each required requirement is named somewhere in the criteria. That is a
# lexical anchor check, not a measure of semantic quality: read the printed answers.
OUTCOME_CASES = ROOT / "tests/fixtures/intent-outcome-cases.json"
OUTCOME_CONTROLS = ROOT / "tests/fixtures/intent-outcome-controls.json"
OUTCOME_SOURCES = (
    "skills/osm/SKILL.md",
    "skills/osm/references/routing.md",
    "skills/osm/references/lifecycle.md",
    "skills/osm-interview/SKILL.md",
    "skills/osm-spec-work/SKILL.md",
    "skills/osm-spec-work/references/readiness.md",
    "skills/osm-review-work/SKILL.md",
    "skills/osm-review-work/references/completeness.md",
    "skills/osm-triage-improvement/SKILL.md",
    "skills/osm-ship-work/SKILL.md",
)
METHODS = ["none", "interview", "spec", "build", "review", "triage", "ship", "write-code"]
VERDICTS = ["none", "PASS", "REVISE", "BLOCKED"]
TEXT, TEXTS, FLAG = {"type": "string"}, {"type": "array", "items": {"type": "string"}}, {"type": "boolean"}
OUTCOME_ITEM = {
    "id": TEXT, "outcome": TEXT, "must_be_true": TEXTS, "failure": TEXTS, "observed_by": TEXT,
    "out_of_scope": TEXTS, "criteria_owner": {"type": "string", "enum": METHODS},
    "next_method": {"type": "string", "enum": METHODS}, "verdict": {"type": "string", "enum": VERDICTS}, "gaps": TEXTS, "proceeds": FLAG,
    "asks": FLAG, "new_artifact": FLAG, "next_action": TEXT, "reply": TEXT}
ENTRY_LIMIT = 240
OUTCOME_PROMPT = """Exercise these instructions on each synthetic case independently.
Do not execute cases, call tools, read other files or write anything. Context
describes each case's tools, not your own. Return one answer per case.
outcome: one or two sentences interpreting the desired user-visible change from the
full request and context. must_be_true: every indispensable condition for this work to
count as done, each stated in these entries themselves and not only in outcome or
reply, including who the change is for and any timing or filter constraint the request
sets; proportionate to its size (a one-line edit needs one entry); one condition per
entry. failure: what would count as failure. observed_by: how it will be observed.
out_of_scope: what this task does not include. criteria_owner: the method whose
instructions own the accepted contract and its criteria for this work, or none when the
task is too small to need any. next_method: the method that handles this request next, or
none when it is answered or done directly; it can differ from criteria_owner, because the
method that owns the contract is not always the one executing the current phase. verdict: PASS, REVISE or
BLOCKED only when the case asks for a review of a result, otherwise none. gaps: for a
review, the requirements not met or not evidenced, otherwise empty. proceeds: true
when the agent carries out the request as asked, now, without waiting for approval or
a requirements document. For a review request that means completing the review and
returning its verdict; it does not mean changing the work under review or doing more
than was asked. asks: true when the reply puts a question to the owner; a question
the agent could settle from the context or by inspecting the work is still a
question. new_artifact: true when the agent would
create a requirements document, plan file or ritual the user did not ask for. Include
the actual short next reply in the user's language and a concise next_action. Keep
observed and planned evidence distinct. This is decision simulation, not proof of
native selection or of multi-turn behavior.

"""


def prepare_outcomes(destination, baseline):
    if destination.exists():
        raise SystemExit("Destination exists; preserve prior observations.")
    destination.mkdir(parents=True)
    excerpts, hashes = [], {}
    for relative in OUTCOME_SOURCES:
        if baseline:
            result = subprocess.run(["git", "show", f"{baseline}:{relative}"],
                                    cwd=ROOT, text=True, capture_output=True)
            if result.returncode:
                raise RuntimeError(result.stderr)
            content = result.stdout
        else:
            content = (ROOT / relative).read_text()
        hashes[relative] = hashlib.sha256(content.encode()).hexdigest()
        excerpts.append(f"SOURCE {relative}\n{content}")
    cases = json.loads(OUTCOME_CASES.read_text())
    prompt = OUTCOME_PROMPT + "\n\n".join(excerpts)
    prompt += "\n\nCASES\n" + json.dumps(
        [{k: case[k] for k in ("id", "request", "context")} for case in cases],
        ensure_ascii=False, indent=2)
    item = {"type": "object", "properties": OUTCOME_ITEM,
            "required": list(OUTCOME_ITEM), "additionalProperties": False}
    schema = {"type": "object", "properties": {
        "outcomes": {"type": "array", "items": item}},
        "required": ["outcomes"], "additionalProperties": False}
    (destination / "prompt.txt").write_text(prompt)
    (destination / "schema.json").write_text(json.dumps(schema, indent=2) + "\n")
    (destination / "source-hashes.json").write_text(json.dumps(hashes, indent=2) + "\n")
    print(f"Prepared {len(cases)} outcome cases; expectations withheld; {len(prompt.encode())} bytes.")


def blank(value):
    return not isinstance(value, str) or not value.strip()


def check_shape(decision):
    if set(decision) != set(OUTCOME_ITEM):
        return ["fields differ from the schema"]
    errors = []
    for key, kind in OUTCOME_ITEM.items():
        value = decision[key]
        if kind is TEXTS:
            ok = isinstance(value, list) and all(isinstance(i, str) for i in value)
        elif kind is FLAG:
            ok = isinstance(value, bool)
        elif "enum" in kind:
            ok = value in kind["enum"]
        else:
            ok = isinstance(value, str)
        if not ok:
            errors.append(f"{key} has the wrong type or value")
    return errors


def check_outcome(case, decision):
    errors = check_shape(decision)
    if errors:
        return errors
    # An expected value may be a list of acceptable values where the instructions allow more than one.
    errors = [f"{key}={decision[key]}, expected {value}"
              for key, value in case["expected"].items()
              if decision[key] not in (value if isinstance(value, list) else [value])]
    for key in ("outcome", "observed_by", "next_action", "reply"):
        if blank(decision[key]):
            errors.append(f"{key} is empty")
    for key in ("must_be_true", "failure", "out_of_scope", "gaps"):
        if any(blank(item) or len(item) > ENTRY_LIMIT for item in decision[key]):
            errors.append(f"{key} has an empty or oversized entry")
    criteria = [item.strip().casefold() for item in decision["must_be_true"] if not blank(item)]
    if len(set(criteria)) != len(criteria):
        errors.append("must_be_true repeats an entry")
    low, high = case["bounds"]["min_criteria"], case["bounds"]["max_criteria"]
    if not low <= len(criteria) <= high:
        errors.append(f"must_be_true has {len(criteria)} entries, expected {low} to {high}")
    if not decision["failure"]:
        errors.append("failure is empty")
    if decision["verdict"] == "none" and decision["gaps"]:
        errors.append("gaps without a review verdict")
    if decision["verdict"] in ("REVISE", "BLOCKED") and not decision["gaps"]:
        errors.append("a REVISE or BLOCKED verdict names no gap")
    for group in case["must_cover"]:
        value = decision[group.get("field", "must_be_true")]
        texts = [value] if isinstance(value, str) else value
        if not any(names(text, group) for text in texts):
            errors.append(f"does not cover: {group['label']}")
    return errors


def names(text, group):
    """One entry names a requirement: any anchor of "any", or an anchor from every list of "all"."""
    text = text.casefold()
    if "all" in group:
        return all(any(anchor.casefold() in text for anchor in anchors) for anchors in group["all"])
    return any(anchor.casefold() in text for anchor in group["any"])


def by_identity(cases, decisions):
    by_id = {d.get("id"): d for d in decisions}
    if len(by_id) != len(decisions) or set(by_id) != {c["id"] for c in cases}:
        raise ValueError("Missing, unexpected or duplicated case identity.")
    return by_id


def score_outcomes(result):
    cases = json.loads(OUTCOME_CASES.read_text())
    by_id = by_identity(cases, json.loads(result.read_text())["outcomes"])
    failed = []
    for case in cases:
        decision = by_id[case["id"]]
        errors = check_outcome(case, decision)
        if errors:
            failed.append(case["id"])
        print(f"{'FAIL' if errors else 'PASS'} {case['id']}: " + ("; ".join(errors) or "anchors present"))
        if not check_shape(decision):
            for key in ("outcome", "must_be_true", "failure", "observed_by", "out_of_scope",
                        "gaps", "next_action", "reply"):
                print(f"    {key}: {decision[key]}")
    print(f"{len(cases) - len(failed)}/{len(cases)} cases passed. Passing shows the withheld decisions "
          "and named requirements, not that the answers are good: read them.")
    return bool(failed)


def selftest():
    """Show that the scorer rejects each kind of incomplete answer; it runs no model."""
    cases = json.loads(OUTCOME_CASES.read_text())
    fixture = json.loads(OUTCOME_CONTROLS.read_text())
    controls = {c["id"]: c for c in fixture["compliant"]}
    problems, ran = [], []

    def expect(label, case, decision, needle=None):
        ran.append(label)
        errors = check_outcome(case, decision)
        if bool(errors) != (needle is not None) or (needle and not any(needle in e for e in errors)):
            problems.append(f"{label}: {errors}")

    flips = {("proceeds", True): False, ("asks", False): True, ("new_artifact", False): True,
             ("criteria_owner", "spec"): "none", ("criteria_owner", "none"): "spec",
             ("next_method", "spec"): "none", ("next_method", "build"): "none", ("next_method", "review"): "none",
             ("verdict", "none"): "REVISE", ("verdict", "REVISE"): "PASS"}
    for case in cases:
        base = controls[case["id"]]
        for key in ("expected", "bounds", "must_cover"):
            assert case[key], (case["id"], key)
        assert set(case["expected"]) == {"proceeds", "asks", "new_artifact", "criteria_owner", "next_method", "verdict"}
        expect(f"{case['id']} compliant", case, base)
        for group in case["must_cover"]:
            field = group.get("field", "must_be_true")
            mutated = dict(base)
            if isinstance(base[field], str):
                mutated[field] = "unrelated words"
            else:
                mutated[field] = [i for i in base[field] if not names(i, group)]
            expect(f"{case['id']} without {group['label']}", case, mutated, f"does not cover: {group['label']}")
        for key, value in case["expected"].items():
            flipped = next(m for m in METHODS if m not in value) if isinstance(value, list) else flips[(key, value)]
            expect(f"{case['id']} flipped {key}", case, {**base, key: flipped}, f"{key}=")
            if isinstance(value, list):
                for accepted in value:
                    expect(f"{case['id']} accepts {key}={accepted}", case, {**base, key: accepted})
        low, high = case["bounds"]["min_criteria"], case["bounds"]["max_criteria"]
        extras = [f"extra requirement {i}" for i in range(high + 1)]
        expect(f"{case['id']} ceremony", case, {**base, "must_be_true": base["must_be_true"] + extras}, "expected")
        expect(f"{case['id']} repeated criterion", case,
               {**base, "must_be_true": base["must_be_true"] + base["must_be_true"][:1]}, "repeats")
        anchors = [a for g in case["must_cover"] for a in g.get("any", sum(g.get("all", []), []))]
        soup = (" ".join(anchors) + " ") * (ENTRY_LIMIT // 2)
        expect(f"{case['id']} keyword soup", case, {**base, "must_be_true": [soup]}, "oversized")
        for key in ("outcome", "observed_by", "reply"):
            expect(f"{case['id']} blank {key}", case, {**base, key: " "}, f"{key} is empty")
        expect(f"{case['id']} no failure", case, {**base, "failure": []}, "failure is empty")
        expect(f"{case['id']} dropped field", case, {k: v for k, v in base.items() if k != "reply"}, "schema")
    # criteria_owner is the canonical contract owner and next_method the method handling the request now. Build
    # may carry a resumed task and Review may handle a review while the contract stays Spec's; mixing them fails.
    by_id = {c["id"]: c for c in cases}
    for case_id, field, wrong in (("resumed-with-steer", "criteria_owner", "build"),
                                  ("resumed-with-steer", "next_method", "spec"),
                                  ("polished-but-incomplete", "criteria_owner", "review"),
                                  ("polished-but-incomplete", "next_method", "spec"),
                                  ("small-edit-proportionate", "next_method", "ship"),
                                  ("small-edit-proportionate", "criteria_owner", "spec")):
        expect(f"{case_id}: {field} {wrong} is the wrong concept", by_id[case_id],
               {**controls[case_id], field: wrong}, f"{field}=")
    for direct in ("none", "write-code", "build"):
        expect(f"small edit may be handled directly by {direct}", by_id["small-edit-proportionate"],
               {**controls["small-edit-proportionate"], "next_method": direct})
    # An expected value may be a list where the instructions allow several methods.
    resumed = by_id["resumed-with-steer"]
    several = {**resumed, "expected": {**resumed["expected"], "next_method": ["build", "spec"]}}
    for accepted in ("build", "spec"):
        expect(f"list accepts {accepted}", several, {**controls["resumed-with-steer"], "next_method": accepted})
    expect("list rejects none", several, {**controls["resumed-with-steer"], "next_method": "none"}, "next_method=")
    for fine in fixture["acceptable"]:
        base = controls[fine["id"]]
        assert fine["from"] in base[fine["field"]], fine
        swapped = [fine["to"] if item == fine["from"] else item for item in base[fine["field"]]]
        expect(f"{fine['id']} acceptable wording: {fine['to']}", by_id[fine["id"]], {**base, fine["field"]: swapped})
    for weak in fixture["weakened"]:
        case = next(c for c in cases if c["id"] == weak["id"])
        base = controls[weak["id"]]
        assert weak["from"] in base[weak["field"]], weak
        weakened = [weak["to"] if item == weak["from"] else item for item in base[weak["field"]]]
        expect(f"{weak['id']} weakened: {weak['to']}", case, {**base, weak["field"]: weakened}, weak["fails"])
    review = controls["polished-but-incomplete"]
    expect("review REVISE without a gap", next(c for c in cases if c["id"] == "polished-but-incomplete"),
           {**review, "gaps": []}, "names no gap")
    expect("gaps without a review verdict", next(c for c in cases if c["id"] == "rough-onboarding"),
           {**controls["rough-onboarding"], "gaps": ["something"]}, "without a review verdict")
    for label, decisions in {
            "missing": list(controls.values())[1:],
            "duplicated": list(controls.values()) + [controls["rough-onboarding"]],
            "unexpected": list(controls.values()) + [{**controls["rough-onboarding"], "id": "invented"}]}.items():
        ran.append(f"identity {label}")
        try:
            by_identity(cases, decisions)
            problems.append(f"identity {label} was accepted")
        except ValueError:
            pass
    for problem in problems:
        print("FAIL", problem)
    print(f"{len(ran) - len(problems)}/{len(ran)} scorer controls held ({len(cases)} compliant answers pass).")
    return bool(problems)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    prep = commands.add_parser("prepare")
    prep.add_argument("destination", type=Path)
    prep.add_argument("--baseline")
    check = commands.add_parser("score")
    check.add_argument("result", type=Path)
    outcome_prep = commands.add_parser("prepare-outcomes")
    outcome_prep.add_argument("destination", type=Path)
    outcome_prep.add_argument("--baseline")
    outcome_check = commands.add_parser("score-outcomes")
    outcome_check.add_argument("result", type=Path)
    commands.add_parser("selftest")
    args = parser.parse_args()
    if args.command == "prepare":
        prepare(args.destination.resolve(), args.baseline)
    elif args.command == "prepare-outcomes":
        prepare_outcomes(args.destination.resolve(), args.baseline)
    elif args.command == "score-outcomes":
        raise SystemExit(score_outcomes(args.result))
    elif args.command == "selftest":
        raise SystemExit(selftest())
    else:
        raise SystemExit(score(args.result))
