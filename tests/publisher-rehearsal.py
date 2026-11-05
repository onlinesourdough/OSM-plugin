#!/usr/bin/env python3
"""Fixture rehearsal of the source-only documentation publisher (#85).

Every write goes to an in-memory fixture transport. Nothing here contacts Notion, reads a credential
or proves a live publication; a pass is fixture and static proof only.
"""

import copy
import io
import json
import re
import subprocess
import sys
import tempfile
from contextlib import redirect_stdout
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "docs-publisher"))

import publisher as pub  # noqa: E402
from fixture_transport import FixtureTransport  # noqa: E402

MANIFEST = pub.load_manifest()
SETUP_ZIP = next(a for a in MANIFEST["artifacts"] if a["key"] == "notion.content.setup")["frozen_zip"]["sha256"]
RECORDED_PUBLIC = [v for v in MANIFEST["bindings"].values() if isinstance(v, str) and len(v) > 20] + [SETUP_ZIP]
HEX32 = re.compile(r"(?<![0-9a-f])[0-9a-f]{32}(?![0-9a-f])")
RECORDED_IDS = {i for v in RECORDED_PUBLIC for i in HEX32.findall(v.replace("-", ""))}
TESTS = []


def test(function):
    TESTS.append(function)
    return function


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def working_files(skill="v1"):
    return {
        "README.md": "readme", "docs/README.md": "index", "docs/osm.md": "overview", "docs/architecture.md": "arch",
        "docs/skills.md": "skills",
        "skills/alpha/SKILL.md": f"alpha {skill}", "skills/alpha/references/r.md": "alpha reference",
        "skills/beta/SKILL.md": "beta body",
        "docs/content-drafts/skills/content/method-draft.md": "old bundled content draft",
    }


def released_source(manifest=MANIFEST):
    files = {}
    for a in manifest["artifacts"]:
        if a["class"] == "A":
            files[a["source_paths"][0] + "SKILL.md"] = f"released {a['key']}"
    return pub.DictSource(files, commit=manifest["editions"]["released"]["commit"])


def run(manifest, files, transport, run_id="run-1", released=None, **kw):
    return pub.publish(manifest, pub.DictSource(files, commit="c-" + run_id), transport, run_id,
                       allow_fixture=True, released_source=released or released_source(manifest), **kw)


def outcomes(result):
    return {r["key"]: r["outcome"] for r in result["rows"]}


def upserted(transport):
    return [entry[1] for entry in transport.log if entry[0] == "upsert"]


@test
def unchanged_source_is_a_valid_no_op():
    t = FixtureTransport()
    run(MANIFEST, working_files(), t, "run-1")
    before = len(upserted(t))
    require(before == 2 + 5 + 0 or before >= 7, "first run writes the CI-owned rows")
    result = run(MANIFEST, working_files(), t, "run-2")
    require(len(upserted(t)) == before, "an unchanged source writes nothing")
    text = pub.reconciliation_text(result)
    require("no documentation impact (a valid no-op)" in text, "the no-op is stated visibly")


@test
def changed_reference_updates_one_row_in_the_safe_order():
    t = FixtureTransport()
    run(MANIFEST, working_files(), t, "run-1")
    t.log.clear()
    files = working_files()
    files["skills/alpha/references/r.md"] = "alpha reference, revised"
    result = run(MANIFEST, files, t, "run-2")
    require(upserted(t) == ["osm.working.skill.alpha"], f"only the changed row is written: {upserted(t)}")
    order = [e for e in t.log if len(e) > 2 and e[1] == "osm.working.skill.alpha" and e[0] == "status" or e[0] == "upsert"]
    kinds = [(e[0], e[2] if e[0] == "status" else None) for e in order]
    require(kinds.index(("status", "pending")) < kinds.index(("upsert", None)) < kinds.index(("status", "complete")),
            f"pending is marked before the write and complete only after: {kinds}")
    require(t.rows["osm.working.skill.alpha"]["status"] == "complete", "complete after the coherent read-back")
    require(outcomes(result)["osm.working.skill.alpha"] == pub.WRITTEN, "reported as written")


@test
def rename_and_retirement_keep_history():
    t = FixtureTransport()
    manifest = copy.deepcopy(MANIFEST)
    manifest["renames"] = {"osm.working.skill.beta": "osm.working.skill.gamma"}
    run(manifest, working_files(), t, "run-1")
    files = {k: v for k, v in working_files().items() if not k.startswith("skills/beta/")}
    files["skills/gamma/SKILL.md"] = "beta body"
    result = run(manifest, files, t, "run-2")
    got = outcomes(result)
    require(got["osm.working.skill.beta"] == pub.RETIRED and got["osm.working.skill.gamma"] == pub.WRITTEN, str(got))
    require("renamed to osm.working.skill.gamma" in next(r for r in result["rows"] if r["key"] == "osm.working.skill.beta")["detail"],
            "the rename is visible")
    require(t.rows["osm.working.skill.beta"]["status"] == "retired" and t.rows["osm.working.skill.beta"]["body"],
            "retired, not deleted: the body stays")
    require(not any(e[0] == "delete" for e in t.log), "nothing is deleted")


@test
def newer_original_is_a_conflict_not_an_overwrite():
    manifest = copy.deepcopy(MANIFEST)
    guide = next(a for a in manifest["artifacts"] if a["key"] == "notion.guide.entry")
    guide["before_source"]["original_hash"] = "a" * 64
    t = FixtureTransport()
    t.rows["notion.guide.entry"] = {"writer": "notion-authored", "status": "complete", "receipt_after": None, "receipt_before": None,
                                    "body_hash": "b" * 64, "body": "a newer hand edit", "commit": None}
    result = run(manifest, working_files(), t, "run-1")
    require(outcomes(result)["notion.guide.entry"] == pub.CONFLICT, "a newer original is a conflict")
    require(t.rows["notion.guide.entry"]["body"] == "a newer hand edit", "the original is untouched")
    require("notion.guide.entry" not in upserted(t), "no write")


@test
def missing_or_expired_access_fails_closed():
    for state in ("expired", "missing"):
        t = FixtureTransport()
        t.access = state
        result = run(MANIFEST, working_files(), t, "run-1")
        require(not upserted(t), f"{state}: nothing is written")
        require({r["outcome"] for r in result["rows"]} <= {pub.BLOCKED}, f"{state}: every row is visibly blocked")
        require(all(r["status"] != "complete" for r in t.rows.values()), f"{state}: nothing is called complete")
    try:
        pub.NotionTransport("db", env={})
    except pub.MissingCredential:
        pass
    else:
        raise AssertionError("a missing credential must fail closed")
    out = io.StringIO()
    with redirect_stdout(out):
        code = pub.main(["publish", "--repo", str(ROOT), "--ref", "HEAD"])
    require(code == 3 and "FAIL-CLOSED" in out.getvalue(), "the command refuses without a credential")


@test
def partial_update_resumes_on_the_same_key():
    t = FixtureTransport()
    run(MANIFEST, working_files(), t, "run-1")
    files = working_files("v2")
    t.fail_next = ("partial", "osm.working.skill.alpha")
    result = run(MANIFEST, files, t, "run-2")
    require(outcomes(result)["osm.working.skill.alpha"] == pub.PARTIAL, "the partial update is visible")
    require(t.rows["osm.working.skill.alpha"]["status"] == "partial", "left pending and retryable")
    count = len(t.rows)
    result = run(MANIFEST, files, t, "run-3")
    require(outcomes(result)["osm.working.skill.alpha"] == pub.RESUMED, "resumed")
    require(t.rows["osm.working.skill.alpha"]["status"] == "complete" and len(t.rows) == count, "completed with no duplicate row")


@test
def repeat_delivery_writes_nothing_and_adds_no_rows():
    t = FixtureTransport()
    run(MANIFEST, working_files(), t, "run-1")
    rows, calls = len(t.rows), len(upserted(t))
    for n in (2, 3):
        run(MANIFEST, working_files(), t, f"run-{n}")
    require(len(t.rows) == rows and len(upserted(t)) == calls, "idempotent")


@test
def class_b_is_never_written_or_repaired():
    t = FixtureTransport()
    result = run(MANIFEST, working_files(), t, "run-1")
    b = [r for r in result["rows"] if r["class"] == "B"]
    require(b and all(r["outcome"] == pub.REFUSED_B for r in b), "every class B row is refused")
    require(not any(k.startswith("notion.content.") for k in upserted(t)), "no class B write")
    bad = copy.deepcopy(MANIFEST)
    next(a for a in bad["artifacts"] if a["class"] == "B")["public_writer"] = "ci"
    require(any("class B must be Notion-authored" in p for p in pub.validate_manifest(bad)), "the manifest cannot hand class B to CI")
    try:
        pub.publish(bad, pub.DictSource(working_files()), FixtureTransport(), "x", allow_fixture=True)
    except pub.PublisherError:
        raise AssertionError("an invalid manifest is reported by validation, not by raising mid-run")
    t2 = FixtureTransport()
    t2.downloads["notion.content.setup"] = "0" * 64
    findings = pub.check_frozen(MANIFEST, t2)
    require(findings and findings[0]["action"] == "reported; not repaired" and not t2.rows, "a frozen ZIP mismatch is reported, not repaired")


@test
def unknown_write_is_read_back_before_any_retry():
    key = "osm.working.skill.alpha"
    # The write did not land: the next run reads it back, sees it missing, then retries on the same Key.
    t = FixtureTransport()
    run(MANIFEST, working_files(), t, "run-1")
    t.fail_next = ("unknown", key)
    result = run(MANIFEST, working_files("v2"), t, "run-2")
    require(outcomes(result)[key] == pub.UNKNOWN_WRITE and t.rows[key]["status"] == "unknown-write", "visible unknown write")
    t.log.clear()
    run(MANIFEST, working_files("v2"), t, "run-3")
    names = [e[0] for e in t.log if len(e) > 1 and e[1] == key]
    require(names.index("get") < names.index("upsert"), "read back before the retry")
    require(t.rows[key]["status"] == "complete", "completed")
    # The write did land: the read-back finds it and no retry happens.
    t = FixtureTransport()
    run(MANIFEST, working_files(), t, "run-1")
    t.fail_next = ("unknown-landed", key)
    run(MANIFEST, working_files("v2"), t, "run-2")
    t.log.clear()
    result = run(MANIFEST, working_files("v2"), t, "run-3")
    require(key not in upserted(t), "no retry for a write that landed")
    require(outcomes(result)[key] == pub.RESUMED and t.rows[key]["status"] == "complete", "completed by read-back")


@test
def released_edition_resolves_to_the_exact_approved_commit():
    approved = MANIFEST["editions"]["released"]["commit"]
    require(pub.resolve_released(MANIFEST, lambda tag: approved) == approved, "the approved commit resolves")
    for wrong in ("0" * 40, "9de4317a613cb11dea38a59be6dc6cbb9d120e29"):
        try:
            pub.resolve_released(MANIFEST, lambda tag, w=wrong: w)
        except pub.PublisherError:
            continue
        raise AssertionError("a main commit must never be relabelled as the released edition")
    real = pub.git_tag_resolver(ROOT)("v0.30.0")
    require(real in (None, approved), f"the real tag resolves to the approved commit: {real}")
    unapproved = copy.deepcopy(MANIFEST)
    unapproved["editions"]["released"]["approved"] = False
    try:
        pub.resolve_released(unapproved, lambda tag: approved)
    except pub.PublisherError:
        pass
    else:
        raise AssertionError("an unapproved edition cannot be released")


@test
def old_bundled_content_changes_write_nothing_to_class_b():
    t = FixtureTransport()
    run(MANIFEST, working_files(), t, "run-1")
    t.log.clear()
    files = working_files()
    files["docs/content-drafts/skills/content/method-draft.md"] = "the old bundled draft changed"
    source = pub.DictSource(files, commit="c-2")
    result = pub.plan(MANIFEST, source, t, changed_paths=["docs/content-drafts/skills/content/method-draft.md"],
                      released_source=released_source())
    require(result["unmapped_changes"] == ["docs/content-drafts/skills/content/method-draft.md"], "reported as mapping to no artifact")
    run(MANIFEST, files, t, "run-2")
    require(not any(k.startswith("notion.content.") for k in upserted(t)), "no class B write")


@test
def artifacts_not_handed_to_ci_get_no_write():
    t = FixtureTransport()
    files = working_files()
    result = run(MANIFEST, files, t, "run-1")
    a = [r for r in result["rows"] if r["class"] == "A"]
    require(len(a) == 22 and all(r["outcome"] == pub.PENDING_HANDOFF for r in a), "the 22 released packets are pending handoff")
    require(not any(k.startswith("osm.released.") for k in upserted(t)), "no write to a row CI does not own")
    require("pending handoff" in pub.reconciliation_text(result), "the pending handoff is visible")
    handed = copy.deepcopy(MANIFEST)
    one = next(x for x in handed["artifacts"] if x["key"] == "osm.released.skill.osm")
    one["public_writer"], one["adoption_state"] = "ci", "adopted"
    require(not pub.validate_manifest(handed), "an adopted row may belong to CI")
    run(handed, files, t, "run-2")
    require(upserted(t).count("osm.released.skill.osm") == 1, "only the handed-over row is written")
    wrong = copy.deepcopy(MANIFEST)
    next(x for x in wrong["artifacts"] if x["key"] == "osm.released.skill.osm")["public_writer"] = "ci"
    require(any("only after handoff" in p for p in pub.validate_manifest(wrong)), "no CI writer before the handoff state")


@test
def a_ci_owned_row_changed_by_another_writer_is_a_conflict():
    t = FixtureTransport()
    run(MANIFEST, working_files(), t, "run-1")
    key = "osm.working.skill.alpha"
    t.rows[key]["body"], t.rows[key]["body_hash"] = "hand edit", pub.sha256("hand edit")
    result = run(MANIFEST, working_files("v2"), t, "run-2")
    require(outcomes(result)[key] == pub.CONFLICT, "reported as a conflict")
    require(t.rows[key]["body"] == "hand edit", "not overwritten")
    t.rows[key]["writer"] = "existing-upkeep"
    t.rows[key]["body_hash"] = t.rows[key]["receipt_after"]
    require(outcomes(run(MANIFEST, working_files("v3"), t, "run-3"))[key] == pub.CONFLICT, "a row owned by another writer is a conflict")


@test
def the_publication_stage_is_serialized():
    t = FixtureTransport()
    t.claim_run("run-a")
    try:
        t.claim_run("run-b")
    except pub.RunInProgress:
        pass
    else:
        raise AssertionError("two runs must not hold the stage")
    t.release_run("run-a")
    t.claim_run("run-b")


@test
def propagation_is_complete_only_after_the_coherent_read_back():
    t = FixtureTransport()
    t.anonymous = False
    result = run(MANIFEST, working_files(), t, "run-1")
    require(all(r["outcome"] != pub.WRITTEN for r in result["rows"] if r["class"] == "W"), "not reported written")
    require(all(row["status"] != "complete" for row in t.rows.values()), "anonymous access failed: nothing is complete")
    t.anonymous = True
    run(MANIFEST, working_files(), t, "run-2")
    require(all(row["status"] == "complete" for row in t.rows.values()), "complete after the read-back passes")


@test
def inactive_publisher_refuses_and_the_template_is_inert():
    try:
        pub.publish(MANIFEST, pub.DictSource(working_files()), FixtureTransport(), "x")
    except pub.PublisherError as error:
        require("not active" in str(error), str(error))
    else:
        raise AssertionError("the inactive manifest must refuse to write")
    require(MANIFEST["activation"]["active"] is False and MANIFEST["activation"]["live_proof"] == "not-run", "the state is honest")
    require(not (ROOT / ".github/workflows/docs-publisher.yml").exists(), "no workflow was enabled")
    require(not any("docs-publisher" in p.read_text() for p in (ROOT / ".github/workflows").glob("*.yml")
                    if "publisher.py publish" in p.read_text()), "no workflow publishes")


@test
def no_class_c_dependency_private_id_or_cron_in_the_repository():
    bad = copy.deepcopy(MANIFEST)
    bad["ci_inputs"].append({"kind": "private-control"})
    require(any("outside the public sources" in p for p in pub.validate_manifest(bad)), "a private input is rejected")
    require(not pub.validate_manifest(MANIFEST), "the recorded manifest is consistent")
    scanned = list((ROOT / "docs-publisher").glob("*")) + list((ROOT / ".github/workflows").glob("*.yml"))
    for path in scanned:
        if path.suffix == ".pyc" or path.is_dir():
            continue
        text = path.read_text()
        require(not re.search(r"^\s*(cron|schedule)\s*:", text, re.M) and "cron:" not in text, f"no schedule in {path.name}")
        for found in HEX32.findall(text.replace("-", "")):
            require(found in RECORDED_IDS, f"unrecorded identifier in {path.name}: {found}")
    template = (ROOT / "docs-publisher/workflow.template.yml").read_text()
    triggers = re.search(r"^on:\n((?:  .*\n)+)", template, re.M)
    require(triggers and len(re.findall(r"^  [a-z_]+:", triggers.group(1), re.M)) == 1, "the template has exactly one trigger")
    require("secrets." + pub.TOKEN_ENV in template and not re.search(r"secret_[A-Za-z0-9]{8,}|ntn_[A-Za-z0-9]{8,}", template),
            "the template names the secret, never a value")
    require(not (ROOT / "docs-publisher/workflow.template.yml").is_relative_to(ROOT / ".github"), "the template is outside .github")


@test
def recorded_public_values_stay_out_of_shipped_text():
    shipped = [p for p in (ROOT / "skills").rglob("*") if p.is_file()] + [ROOT / "docs/osm.md"]
    for path in shipped:
        text = path.read_text()
        for value in RECORDED_PUBLIC:
            require(value not in text, f"{path.relative_to(ROOT)} contains a recorded target value")
        require("40d6d2e17f5681" not in text and "gustavanderson.notion.site" not in text, f"public binding in {path.relative_to(ROOT)}")


@test
def the_notion_transport_fails_closed_and_never_prints_the_token():
    secret = "fixture-token-value-1234567890"
    seen = []

    class Response:
        def __init__(self, body): self._body = body
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def read(self): return json.dumps(self._body).encode()

    def opener(request):
        seen.append((request.get_method(), request.full_url, request.get_header("Authorization"), request.data))
        if request.full_url.endswith("/query"):
            return Response({"results": []})
        return Response({})

    t = pub.NotionTransport("db-fixture", opener=opener, env={pub.TOKEN_ENV: secret})
    require(t.get("osm.working.readme") is None, "a missing row reads as None")
    method, url, auth, data = seen[0]
    require(method == "POST" and url.endswith("databases/db-fixture/query") and auth == f"Bearer {secret}", "query shape")
    require(json.loads(data)["filter"]["property"] == "Key", "looked up by Key, never by title")
    t.upsert("osm.working.readme", "line one\nline two", "h", "ci", "c1")
    require(seen[-1][0] == "POST" and seen[-1][1].endswith("/pages"), "a new row is created by Key, not a site replacement")
    seen.clear()
    t3 = pub.NotionTransport("db-fixture", opener=lambda request: (seen.append(request), Response({"results": [{"id": "1111", "properties": {
        "Writer": {"rich_text": []}, "Status": {"rich_text": []}, "ReceiptAfter": {"rich_text": []}, "BodyHash": {"rich_text": []}}}]}))[1],
        env={pub.TOKEN_ENV: secret}, public_base="https://example.invalid/site")
    t3.anonymous_ok("k")
    anonymous = seen[-1]
    require(anonymous.get_method() == "GET" and anonymous.get_header("Authorization") is None
            and anonymous.full_url == "https://example.invalid/site/1111", "the anonymous read carries no credential")
    import urllib.error
    def refusing(request):
        raise urllib.error.HTTPError(request.full_url, 403, "no", {}, None)
    t2 = pub.NotionTransport("db-fixture", opener=refusing, env={pub.TOKEN_ENV: secret})
    try:
        t2.get("k")
    except pub.AccessError as error:
        require(secret not in str(error), "no token in the failure text")
    else:
        raise AssertionError("a refusal must surface as an access error")
    out = io.StringIO()
    with redirect_stdout(out):
        pub.reconciliation_text({"commit": "c", "rows": [], "unmapped_changes": []})
    require(secret not in out.getvalue() and secret not in (ROOT / "docs-publisher/publisher.py").read_text(), "no token in output or source")


@test
def the_credential_free_reconciliation_check_passes_on_this_repository():
    out = io.StringIO()
    with redirect_stdout(out):
        code = pub.main(["reconcile", "--repo", str(ROOT), "--ref", "HEAD", "--check"])
    text = out.getvalue()
    require(code == 0, text)
    require("Frozen source commit:" in text and "Publisher active: no" in text, "the result is visible and honest")
    require("22" in text or "pending handoff" in text, "the 22 released packets are pending handoff")
    with tempfile.TemporaryDirectory() as tmp:
        out_file = Path(tmp) / "reconciliation.md"
        with redirect_stdout(io.StringIO()):
            pub.main(["reconcile", "--repo", str(ROOT), "--ref", "HEAD", "--out", str(out_file)])
        require(out_file.read_text().startswith("# Documentation reconciliation"), "written for the CI artifact")


def main():
    for function in TESTS:
        function()
        print(f"ok  {function.__name__}")
    print(f"PASS: {len(TESTS)} publisher rehearsals (fixture transport only; no live, Notion or credential use)")


if __name__ == "__main__":
    main()
