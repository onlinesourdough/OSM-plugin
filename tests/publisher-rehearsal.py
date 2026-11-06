#!/usr/bin/env python3
"""Fixture rehearsal of the source-only documentation publisher (#85).

Every write goes to an in-memory stand-in: FixtureTransport, and NotionTransport through FakeNotion, a
small in-memory opener. Both scenario worlds run the same publish scenarios, so the class that would
run live is the class tested. Nothing here contacts Notion, reads a credential or proves a live
publication; a pass is fixture and static proof only. The mutation controls at the end break the
publisher in known ways and require this rehearsal to notice each one.
"""

import copy
import http.client
import http.server
import io
import json
import re
import subprocess
import sys
import tempfile
import threading
import types
import urllib.error
import urllib.request
from contextlib import redirect_stdout
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs-publisher"
sys.path.insert(0, str(DOCS))

import publisher as pub  # noqa: E402
from fixture_transport import FakeNotion, FixtureTransport  # noqa: E402

MANIFEST = pub.load_manifest()
SETUP_ZIP = next(a for a in MANIFEST["artifacts"] if a["key"] == "notion.content.setup")["frozen_zip"]["sha256"]
RECORDED_PUBLIC = [v for v in MANIFEST["bindings"].values() if isinstance(v, str) and len(v) > 20] + [SETUP_ZIP]
HEX32 = re.compile(r"(?<![0-9a-f])[0-9a-f]{32}(?![0-9a-f])")
RECORDED_IDS = {i for v in RECORDED_PUBLIC for i in HEX32.findall(v.replace("-", ""))}
APPROVED = MANIFEST["editions"]["released"]["commit"]
TOKEN = "fixture-token-value-1234567890"
README, INDEX, OVERVIEW, ARCH, SKILLS = ("osm.working.readme", "osm.working.docs-index", "osm.working.overview",
                                         "osm.working.architecture", "osm.working.skill-index")
W_KEYS = sorted([README, INDEX, OVERVIEW, ARCH, SKILLS])
TESTS = []          # (name, callable, slow)


def test(function=None, slow=False):
    def register(f):
        TESTS.append((f.__name__, f, slow))
        return f
    return register(function) if function else register


def require(condition, message):
    if not condition:
        raise AssertionError(message)


# --- scenario worlds: one interface over the fixture transport and NotionTransport + FakeNotion -------

class FixtureWorld:
    kind = "fixture"

    def __init__(self):
        self.t = self.transport = FixtureTransport()

    log = property(lambda self: self.t.log)

    def snapshot(self, key):
        row = self.t.rows.get(key)
        return dict(row) if row else None

    def seed(self, key, body, writer="ci", status="complete"):
        self.t.seed(key, body, writer, status)

    def hand_edit(self, key, text):          # edits the page body only, never a property
        self.t.rows[key]["body"] = text

    def set_writer(self, key, writer):
        self.t.rows[key]["writer"] = writer

    def set_access(self, state):
        self.t.access = state

    def fail_next(self, kind, key):
        self.t.fail_next = (kind, key)

    def no_reader(self):
        self.t.public_supported = self.t.catalogue_supported = False

    def public_shows(self, key, text):
        self.t.public_text[key] = text

    def catalogue_shows(self, text):
        self.t.catalogue_text = text

    def unreadable(self, key):
        self.t.unreadable.add(key)

    def corrupt(self, key):
        self.t.corrupt = key

    def fail_retirement(self, key):
        self.t.status_errors[key] = "retired"

    def upserted(self):
        return [e[1] for e in self.log if e[0] == "upsert"]

    def row_count(self):
        return len(self.t.rows)


class NotionWorld:
    """NotionTransport over FakeNotion, with an explicitly enabled test reader (no reader is qualified live)."""
    kind = "notion"

    def __init__(self, title="Title"):
        self.n = FakeNotion(title=title)
        self.reader = pub.PublicReader(self.n.public_base, self.n.catalogue_url, opener=self.n)
        self.transport = pub.NotionTransport("db-fixture", opener=self.n, env={pub.TOKEN_ENV: TOKEN}, public_reader=self.reader)

    log = property(lambda self: self.n.log)

    def snapshot(self, key):
        pid = self.n.page_for(key)
        if pid is None:
            return None
        p = {name: self.n.pages[pid]["props"].get(name, "") for name in FakeNotion.PROPS}
        return {"status": p["Status"], "body": self.n.body(key), "receipt_before": p["ReceiptBefore"], "receipt_after": p["ReceiptAfter"],
                "writer": p["Writer"], "commit": p["Commit"], "body_hash": p["BodyHash"]}

    def seed(self, key, body, writer="ci", status="complete"):
        self.n.add_page(key, body, status, writer)

    def hand_edit(self, key, text):
        self.n.set_body(key, text)

    def set_writer(self, key, writer):
        self.n.pages[self.n.page_for(key)]["props"]["Writer"] = writer

    def set_access(self, state):
        self.n.access = state

    def fail_next(self, kind, key):
        self.n.fail = (kind, key)

    def no_reader(self):
        self.transport.public_reader = None

    def public_markup(self, key, markup, status=200):
        self.n.public[f"{self.n.public_base}/{self.n.page_for(key)}"] = (status, markup)

    def public_shows(self, key, text):
        self.public_markup(key, f"<html><body><p>{text}</p></body></html>")

    def catalogue_shows(self, text):
        self.n.public[self.n.catalogue_url] = (200, f"<html><body><p>{text}</p></body></html>")

    def unreadable(self, key):
        def respond(method, path, payload):
            if method == "GET" and "/children" in path:
                raise urllib.error.HTTPError("x", 500, "boom", {}, io.BytesIO(b""))
        self.n.respond = respond

    def corrupt(self, key):
        self.n.corrupt = key

    def fail_retirement(self, key):
        pid = self.n.page_for(key)

        def respond(method, path, payload):
            status = ((payload or {}).get("properties", {}).get("Status", {}).get("rich_text") or [{}])[0].get("text", {}).get("content")
            if method == "PATCH" and path == f"pages/{pid}" and status == "retired":
                raise urllib.error.HTTPError("x", 403, "no", {}, io.BytesIO(b""))
        self.n.respond = respond

    def upserted(self):
        return [e[1] for e in self.log if e[0] == "upsert"]

    def row_count(self):
        return len(self.n.pages)


WORLDS = (FixtureWorld, NotionWorld)


def scenario(function):
    """Register a scenario once per world."""
    for factory in WORLDS:
        def wrapper(f=function, make=factory):
            f(make())
        wrapper.__name__ = f"{function.__name__}[{factory.kind}]"
        TESTS.append((wrapper.__name__, wrapper, False))
    return function


def working_files(version="v1", readme_lines=4):
    body = lambda name, n=4: "\n".join([f"{name} {version}"] + [f"{name} line {i}" for i in range(n)])
    return {"README.md": body("readme", readme_lines), "docs/README.md": body("index"), "docs/osm.md": body("overview"),
            "docs/architecture.md": body("arch"), "docs/skills.md": body("skills"),
            "skills/alpha/SKILL.md": f"alpha {version}", "docs/content-drafts/skills/content/method-draft.md": "old bundled content draft"}


def released_source(manifest=MANIFEST):
    files = {a["source_paths"][0] + "SKILL.md": f"released {a['key']}" for a in manifest["artifacts"] if a["class"] == "A"}
    return pub.DictSource(files, commit=APPROVED)


def tag_resolver(tag):
    return APPROVED


def run(world, manifest, files, run_id="run-1", **kw):
    result = pub.publish(manifest, pub.DictSource(files, commit="c-" + run_id), world.transport, run_id, kw.pop("tags", tag_resolver),
                         allow_fixture=True, released_source=released_source(manifest), **kw)
    for row in result["rows"]:        # no result may contradict the stored status
        snap = world.snapshot(row["key"])
        if row["outcome"] in pub.NOT_COMPLETE and snap:
            require(snap["status"] != "complete", f"{row['key']} reports {row['outcome']} while its stored status is complete")
        if row["outcome"] in (pub.WRITTEN, pub.RESUMED) and row["key"] in result["affected_set"]:
            require(snap and snap["status"] == "complete", f"{row['key']} reports {row['outcome']} but is not complete")
    return result


def outcomes(result):
    return {r["key"]: r["outcome"] for r in result["rows"]}


# --- the original publish scenarios, run against both transports ------------------------------------

@scenario
def unchanged_source_is_a_valid_no_op(w):
    run(w, MANIFEST, working_files(), "run-1")
    require(sorted(w.upserted()) == W_KEYS, f"the first run writes exactly the five CI-owned rows: {w.upserted()}")
    before = len(w.upserted())
    result = run(w, MANIFEST, working_files(), "run-2")
    require(len(w.upserted()) == before, "an unchanged source writes nothing")
    text = pub.reconciliation_text(result, True)
    require("Result: no documentation impact (a valid no-op)." in text and "| unchanged | 5 |" in text and "| pending-handoff | 22 |" in text,
            "the no-op is stated visibly, with the exact counts")
    require(not pub.failing(result), "a no-op leaves the run green")


@scenario
def changed_reference_updates_one_row_in_the_safe_order(w):
    run(w, MANIFEST, working_files(), "run-1")
    old = pub.body_hash(pub.render(next(a for a in pub.expand(MANIFEST) if a["key"] == ARCH), pub.DictSource(working_files(), "c-run-1")))
    w.log.clear()
    files = working_files()
    files["docs/architecture.md"] += "\narch revised"
    result = run(w, MANIFEST, files, "run-2")
    require(w.upserted() == [ARCH], f"only the changed row is written: {w.upserted()}")
    kinds = [(e[0], e[2] if e[0] == "status" else None) for e in w.log if e[1] == ARCH and e[0] in ("status", "upsert", "body-hash")]
    require(kinds.index(("status", "pending")) < kinds.index(("upsert", None)) < kinds.index(("status", "complete")),
            f"pending is marked before the write and complete only after: {kinds}")
    snap = w.snapshot(ARCH)
    require(snap["status"] == "complete" and outcomes(result)[ARCH] == pub.WRITTEN, "complete after the coherent read-back")
    require(snap["receipt_before"] == old and snap["receipt_after"] != old, "the before and after source are recorded")


@scenario
def rename_and_retirement_keep_history_and_settle(w):
    extra = {"key": "osm.working.old", "class": "W", "edition": "main-working", "owner": "git", "source_paths": ["docs/old.md"],
             "target_subtree": "main-working/docs", "public_writer": "ci", "adoption_state": "unpublished"}
    first = copy.deepcopy(MANIFEST)
    first["artifacts"].append(extra)
    files = {**working_files(), "docs/old.md": "old page\nline\nline"}
    run(w, first, files, "run-1")
    # An explicit row whose source disappears settles into retired, with the stored status to match.
    gone = working_files()
    result = run(w, first, gone, "run-2")
    require(outcomes(result)["osm.working.old"] == pub.RETIRED and w.snapshot("osm.working.old")["status"] == "retired", "retired and stored retired")
    require(w.snapshot("osm.working.old")["body"], "retired, not deleted: the body stays")
    require(outcomes(run(w, first, gone, "run-3"))["osm.working.old"] == pub.UNCHANGED, "a settled retirement is a no-op")
    require(not any(e[0] == "delete" for e in w.log), "no row is deleted")
    # A row whose Key left the manifest is retired with its rename visible, then settles too.
    w2 = type(w)()
    run(w2, first, files, "run-1")
    renamed = copy.deepcopy(MANIFEST)
    renamed["renames"] = {"osm.working.old": README}
    result = run(w2, renamed, working_files(), "run-2")
    row = next(r for r in result["rows"] if r["key"] == "osm.working.old")
    require(row["outcome"] == pub.RETIRED and f"renamed to {README}" in row["detail"], "the rename is visible")
    require(w2.snapshot("osm.working.old")["status"] == "retired", "the stored status matches the report")
    again = run(w2, renamed, working_files(), "run-3")
    require(next(r for r in again["rows"] if r["key"] == "osm.working.old")["outcome"] == pub.UNCHANGED, "repeat delivery after retirement is a no-op")
    require(not pub.failing(again), "and leaves the run green")


@scenario
def newer_original_is_a_conflict_not_an_overwrite(w):
    manifest = copy.deepcopy(MANIFEST)
    guide = next(a for a in manifest["artifacts"] if a["key"] == "notion.guide.entry")
    guide["before_source"]["original_hash"] = pub.body_hash("the recorded original")
    w.seed("notion.guide.entry", "a newer hand edit", writer="notion-authored")
    result = run(w, manifest, working_files(), "run-1")
    require(outcomes(result)["notion.guide.entry"] == pub.CONFLICT, "a newer original is a conflict")
    require(w.snapshot("notion.guide.entry")["body"] == "a newer hand edit", "the original is untouched")
    require("notion.guide.entry" not in w.upserted(), "no write")
    require(pub.failing(result), "a conflict leaves the run red")
    w.hand_edit("notion.guide.entry", "the recorded original")
    result = run(w, manifest, working_files(), "run-2")
    require(outcomes(result)["notion.guide.entry"] == pub.REFUSED_NOTION and "read and unchanged" in next(
        r["detail"] for r in result["rows"] if r["key"] == "notion.guide.entry"), "an original that reads back unchanged is not a conflict")


@scenario
def missing_or_expired_access_fails_closed(w):
    for state in ("expired", "missing"):
        w = type(w)()
        w.set_access(state)
        result = run(w, MANIFEST, working_files(), "run-1")
        require(not w.upserted(), f"{state}: nothing is written")
        require({r["outcome"] for r in result["rows"]} == {pub.BLOCKED}, f"{state}: every row is visibly blocked")
        require(pub.failing(result), f"{state}: the run is red")
    for database, env in (("db", {}), ("db", {pub.TOKEN_ENV: ""}), ("", {pub.TOKEN_ENV: TOKEN}), (None, {pub.TOKEN_ENV: TOKEN})):
        try:
            pub.NotionTransport(database, env=env)
        except pub.MissingCredential:
            continue
        raise AssertionError(f"a missing credential or database id must fail closed: {database!r} {list(env)}")


@scenario
def partial_update_resumes_on_the_same_key_keeping_the_before_source(w):
    run(w, MANIFEST, working_files(readme_lines=250), "run-1")
    first = w.snapshot(README)
    files = working_files("v2", readme_lines=250)
    w.fail_next("partial", README)
    result = run(w, MANIFEST, files, "run-2")
    require(outcomes(result)[README] == pub.PARTIAL, "the partial update is visible")
    require(w.snapshot(README)["status"] == "partial", "left pending and retryable")
    require(w.snapshot(README)["body"] != pub.render(next(a for a in pub.expand(MANIFEST) if a["key"] == README), pub.DictSource(files, "c-run-2")),
            "the page really is incomplete")
    require(pub.failing(result), "the run is red")
    count = w.row_count()
    result = run(w, MANIFEST, files, "run-3")
    require(outcomes(result)[README] == pub.RESUMED, "resumed")
    snap = w.snapshot(README)
    require(snap["status"] == "complete" and w.row_count() == count, "completed with no duplicate row")
    require(snap["receipt_before"] == first["receipt_after"], "the resume keeps the original before-source")
    require(snap["body"].split("\n", 1)[1].count("readme line") == 250, "the full body is on the page after the resume")


@scenario
def repeat_delivery_writes_nothing_and_adds_no_rows(w):
    run(w, MANIFEST, working_files(), "run-1")
    rows, calls = w.row_count(), len(w.upserted())
    for n in (2, 3):
        run(w, MANIFEST, working_files(), f"run-{n}")
    require(w.row_count() == rows and len(w.upserted()) == calls, "idempotent")


@scenario
def class_b_is_never_written_or_repaired(w):
    result = run(w, MANIFEST, working_files(), "run-1")
    b = [r for r in result["rows"] if r["class"] == "B"]
    require(len(b) == 9 and all(r["outcome"] == pub.REFUSED_B for r in b), "every class B row is refused")
    require(not any(k.startswith("notion.content.") for k in w.upserted()), "no class B write")
    bad = copy.deepcopy(MANIFEST)
    next(a for a in bad["artifacts"] if a["class"] == "B")["public_writer"] = "ci"
    require(any("class B must be Notion-authored" in p for p in pub.validate_manifest(bad)), "the manifest cannot hand class B to CI")
    zip_row = next(r for r in b if r["key"] == "notion.content.setup")
    require("frozen ZIP hash: not checked (unsupported)" in zip_row["detail"], "the hash check says it was not run")


@scenario
def unknown_write_is_read_back_before_any_retry(w):
    run(w, MANIFEST, working_files(), "run-1")
    # The write did not land: the next run reads it back, sees it missing, then retries on the same Key.
    w.fail_next("unknown", ARCH)
    files = working_files("v2")
    result = run(w, MANIFEST, files, "run-2")
    require(outcomes(result)[ARCH] == pub.UNKNOWN_WRITE and w.snapshot(ARCH)["status"] == "unknown-write", "visible unknown write")
    require(pub.failing(result), "an unknown write is red")
    w.log.clear()
    run(w, MANIFEST, files, "run-3")
    names = [e[0] for e in w.log if len(e) > 1 and e[1] == ARCH]
    require(names.index("get") < names.index("upsert"), "read back before the retry")
    require(w.snapshot(ARCH)["status"] == "complete", "completed")
    # The write did land: the read-back finds it and no retry happens.
    w = type(w)()
    run(w, MANIFEST, working_files(), "run-1")
    w.fail_next("unknown-landed", ARCH)
    run(w, MANIFEST, files, "run-2")
    w.log.clear()
    result = run(w, MANIFEST, files, "run-3")
    require(ARCH not in w.upserted(), "no retry for a write that landed")
    require(outcomes(result)[ARCH] == pub.RESUMED and w.snapshot(ARCH)["status"] == "complete", "completed by read-back")


@scenario
def artifacts_not_handed_to_ci_get_no_write_and_no_duplicate_row(w):
    result = run(w, MANIFEST, working_files(), "run-1")
    a = [r for r in result["rows"] if r["class"] == "A"]
    require(len(a) == 22 and all(r["outcome"] == pub.PENDING_HANDOFF for r in a), "the 22 released packets are pending handoff")
    require(not any(k.startswith("osm.released.") for k in w.upserted()), "no write to a row CI does not own")
    require("22 artifact(s) are pending handoff" in pub.reconciliation_text(result), "the pending handoff is visible")
    handed = copy.deepcopy(MANIFEST)
    one = next(x for x in handed["artifacts"] if x["key"] == "osm.released.skill.osm")
    one["public_writer"], one["adoption_state"] = "ci", "adopted"
    require(not pub.validate_manifest(handed), "an adopted row may belong to CI")
    # Existing rows carry no Key, so a first write would duplicate the row: refused until the Key is bound.
    result = run(w, handed, working_files(), "run-2")
    require(outcomes(result)["osm.released.skill.osm"] == pub.BLOCKED and "osm.released.skill.osm" not in w.upserted(), "no duplicate row")
    w.seed("osm.released.skill.osm", "released osm.released.skill.osm", status="complete")
    require(outcomes(run(w, handed, working_files(), "run-3"))["osm.released.skill.osm"] in (pub.UNCHANGED, pub.WRITTEN), "a row that carries the Key is handled")
    wrong = copy.deepcopy(MANIFEST)
    next(x for x in wrong["artifacts"] if x["key"] == "osm.released.skill.osm")["public_writer"] = "ci"
    require(any("only after handoff" in p for p in pub.validate_manifest(wrong)), "no CI writer before the handoff state")


@scenario
def a_ci_owned_row_changed_elsewhere_is_a_conflict_by_its_page_body(w):
    run(w, MANIFEST, working_files(), "run-1")
    w.hand_edit(ARCH, "hand edit")                  # the page body only; no property is touched
    result = run(w, MANIFEST, working_files(), "run-2")
    require(outcomes(result)[ARCH] == pub.CONFLICT, "a hand edit is detected even when the source did not change")
    result = run(w, MANIFEST, working_files("v2"), "run-3")
    require(outcomes(result)[ARCH] == pub.CONFLICT and w.snapshot(ARCH)["body"] == "hand edit", "reported as a conflict and not overwritten")
    require(pub.failing(result), "a conflict is red")
    w.hand_edit(ARCH, pub.render(next(a for a in pub.expand(MANIFEST) if a["key"] == ARCH), pub.DictSource(working_files(), "c-run-1")))
    w.set_writer(ARCH, "existing-upkeep")
    require(outcomes(run(w, MANIFEST, working_files("v3"), "run-4"))[ARCH] == pub.CONFLICT, "a row owned by another writer is a conflict")


@scenario
def an_unreadable_body_is_never_unchanged(w):
    run(w, MANIFEST, working_files(), "run-1")
    w.unreadable(ARCH)
    result = run(w, MANIFEST, working_files(), "run-2")
    require(outcomes(result)[ARCH] == pub.UNREADABLE and pub.failing(result), "an unreadable body is not unchanged")
    require(ARCH not in w.upserted()[len(W_KEYS):], "and nothing is overwritten")


@scenario
def public_evidence_is_content_not_a_status(w):
    cases = {"wrong body": "Another page entirely. Lorem ipsum dolor sit amet.", "login page": "Log in to continue. Email. Password.",
             "not found served as 200": "404. This page could not be found.", "empty app shell": ""}
    for name, shown in cases.items():
        w = type(w)()
        run(w, MANIFEST, working_files(), "run-1")
        files = working_files("v2")
        w.public_shows(README, shown)
        result = run(w, MANIFEST, files, "run-2")
        require(outcomes(result)[README] == pub.PARTIAL, f"{name}: a 200 that is not the content leaves the row partial")
        require(w.snapshot(README)["status"] != "complete" and pub.failing(result), f"{name}: not complete, run red")
    w = type(w)()
    run(w, MANIFEST, working_files(), "run-1")
    w.catalogue_shows("some.other.key osm.working.nothing")      # the receipt row exists; the catalogue does not name it
    result = run(w, MANIFEST, working_files("v2"), "run-2")
    require(outcomes(result)[README] == pub.PARTIAL and w.snapshot(README)["status"] != "complete" and pub.failing(result),
            "a row with a receipt but no catalogue evidence is not complete")


@scenario
def no_qualified_reader_holds_every_row_as_unsupported(w):
    w.no_reader()
    result = run(w, MANIFEST, working_files(), "run-1")
    require({outcomes(result)[k] for k in W_KEYS} == {pub.UNSUPPORTED}, f"every affected row is unsupported: {outcomes(result)}")
    require(all(w.snapshot(k)["status"] == "pending" for k in W_KEYS), "every row stays pending")
    text = pub.reconciliation_text(result, True)
    require("Result: HOLD" in text and "no row can reach complete" in text and "| unsupported | 5 |" in text, "HOLD is reported plainly")
    require(len(pub.failing(result)) == 5, "and the run is red")
    again = run(w, MANIFEST, working_files(), "run-2")
    require(len(w.upserted()) == 5 and {outcomes(again)[k] for k in W_KEYS} == {pub.UNSUPPORTED}, "a retry reads back without rewriting and stays on HOLD")
    if w.kind == "notion":
        require(all(url.startswith("https://api.notion.com/") for _m, url, _a in w.n.requests), "no public request was made, so none counted as proof")


@scenario
def the_affected_set_is_held_until_every_member_passes(w):
    run(w, MANIFEST, working_files(), "run-1")
    files = working_files("v2")
    w.public_shows(README, "not the page")
    result = run(w, MANIFEST, files, "run-2")
    require(result["affected_set"] == W_KEYS, f"the set is declared: {result['affected_set']}")
    got = outcomes(result)
    require(got[README] == pub.PARTIAL and {got[k] for k in W_KEYS if k != README} == {pub.HELD}, f"one failing member holds the rest: {got}")
    require(all(w.snapshot(k)["status"] != "complete" for k in W_KEYS), "no member is complete")
    w2 = type(w)()
    run(w2, MANIFEST, working_files(), "run-1")
    w2.fail_next("unknown", README)
    result = run(w2, MANIFEST, files, "run-2")
    require(outcomes(result)[README] == pub.UNKNOWN_WRITE and all(w2.snapshot(k)["status"] != "complete" for k in W_KEYS),
            "a member that could not be written holds the others too")
    require({outcomes(result)[k] for k in W_KEYS if k != README} == {pub.HELD}, "the others are held, not complete")


@scenario
def a_plan_time_failure_holds_the_written_rows(w):
    run(w, MANIFEST, working_files(), "run-1")                       # all five rows complete
    w.hand_edit(ARCH, "hand edit")                                   # the page body only
    result = run(w, MANIFEST, working_files("v2"), "run-2")          # one source change touches every row
    got = outcomes(result)
    require(got[ARCH] == pub.CONFLICT and ARCH not in result["affected_set"], f"the edited page is a plan-time conflict: { {k: got[k] for k in W_KEYS} }")
    others = [k for k in W_KEYS if k != ARCH]
    require({got[k] for k in others} == {pub.HELD}, f"a conflict outside the write set holds the rest: { {k: got[k] for k in W_KEYS} }")
    require(all(w.snapshot(k)["status"] != "complete" for k in others), "no written row is stored complete in that run")
    require(w.snapshot(ARCH)["body"] == "hand edit" and pub.failing(result), "the edit is not overwritten and the run is red")
    arch = next(a for a in pub.expand(MANIFEST) if a["key"] == ARCH)
    w.hand_edit(ARCH, pub.render(arch, pub.DictSource(working_files(), "c-run-1")))      # the conflict is resolved
    result = run(w, MANIFEST, working_files("v2"), "run-3")
    require(all(w.snapshot(k)["status"] == "complete" for k in W_KEYS) and not pub.failing(result), "the hold lifts once nothing fails")


@scenario
def a_hand_edit_after_a_completed_write_is_a_conflict_while_the_row_is_held(w):
    # No reader: the write completes (BodyHash equals the receipt) but the row stays pending at HOLD.
    w.no_reader()
    run(w, MANIFEST, working_files(), "run-1")
    require(w.snapshot(ARCH)["status"] == "pending" and w.snapshot(ARCH)["body_hash"] == w.snapshot(ARCH)["receipt_after"], "a completed write held at pending")
    w.hand_edit(ARCH, "hand edit")
    result = run(w, MANIFEST, working_files(), "run-2")
    require(outcomes(result)[ARCH] == pub.CONFLICT and w.snapshot(ARCH)["body"] == "hand edit", "the later edit is a conflict and is kept")
    require(pub.failing(result), "and the run is red")
    # With a reader, a row held because another member failed is protected the same way.
    w = type(w)()
    run(w, MANIFEST, working_files(), "run-1")
    w.public_shows(README, "not the page")
    result = run(w, MANIFEST, working_files("v2"), "run-2")
    require(outcomes(result)[README] == pub.PARTIAL and outcomes(result)[ARCH] == pub.HELD, "one member fails, the others are held pending")
    w.hand_edit(ARCH, "hand edit")
    result = run(w, MANIFEST, working_files("v2"), "run-3")
    require(outcomes(result)[ARCH] == pub.CONFLICT and w.snapshot(ARCH)["body"] == "hand edit", "a held row's later edit is a conflict and is kept")
    # A write that was interrupted is a different case: BodyHash differs from the receipt, so it still resumes.
    w = type(w)()
    run(w, MANIFEST, working_files(), "run-1")
    w.fail_next("partial", ARCH)
    run(w, MANIFEST, working_files("v2"), "run-2")
    require(outcomes(run(w, MANIFEST, working_files("v2"), "run-3"))[ARCH] == pub.RESUMED, "an interrupted write still resumes")
    # So does a row marked pending whose write was refused before anything landed (BodyHash is still the old one).
    w = type(w)()
    run(w, MANIFEST, working_files(), "run-1")
    w.fail_next("access", ARCH)
    require(outcomes(run(w, MANIFEST, working_files("v2"), "run-2"))[ARCH] == pub.BLOCKED and w.snapshot(ARCH)["status"] == "pending", "refused mid-write, left pending")
    result = run(w, MANIFEST, working_files("v2"), "run-3")
    require(outcomes(result)[ARCH] == pub.RESUMED and w.snapshot(ARCH)["status"] == "complete", "a refused write resumes and completes")


@scenario
def a_failed_retirement_holds_the_set(w):
    old = {"key": "osm.working.old", "class": "W", "edition": "main-working", "owner": "git", "source_paths": ["docs/old.md"],
           "target_subtree": "main-working/docs", "public_writer": "ci", "adoption_state": "unpublished"}
    first = copy.deepcopy(MANIFEST)
    first["artifacts"].append(old)
    run(w, first, {**working_files(), "docs/old.md": "old page\nline\nline"}, "run-1")
    w.fail_retirement("osm.working.old")
    result = run(w, MANIFEST, working_files("v2"), "run-2")      # the old row left the manifest; its retirement is refused
    got = outcomes(result)
    require(got["osm.working.old"] == pub.BLOCKED, f"the failed retirement is visible: {got['osm.working.old']}")
    require({got[k] for k in W_KEYS} == {pub.HELD} and all(w.snapshot(k)["status"] != "complete" for k in W_KEYS),
            "and the written rows are held, not complete")


@test
def a_changed_skill_is_pending_release_propagation_whether_or_not_a_row_maps_it():
    source = pub.DictSource({**working_files(), "skills/osm/SKILL.md": "x"}, "c-1")
    changed = ["skills/osm/SKILL.md", "skills/alpha/SKILL.md", "docs/architecture.md"]
    result = pub.plan(MANIFEST, source, None, changed, released_source=released_source(), base="b")
    require(result["changed_skills"] == ["skills/alpha", "skills/osm"], f"a mapped and an unmapped skill are both reported: {result['changed_skills']}")
    require(result["unmapped_changes"] == [], "a skill path is not also listed as an unmapped change")
    text = pub.reconciliation_text(result)
    require("pending release propagation" in text and "`skills/osm`" in text and "`skills/alpha`" in text, text)
    require(outcomes(result)["osm.released.skill.osm"] == pub.PENDING_HANDOFF, "and the released row still gets no write")
    quiet = pub.plan(MANIFEST, source, None, ["docs/architecture.md"], released_source=released_source(), base="b")
    require(quiet["changed_skills"] == [] and "pending release propagation" not in pub.reconciliation_text(quiet), "no skill changed, none reported")


@test
def an_error_in_the_middle_of_a_run_does_not_claim_that_nothing_was_written():
    w = FixtureWorld()
    run(w, MANIFEST, working_files(), "run-1")
    original = w.t.upsert

    def vanishing(key, *args, **kwargs):
        if key == INDEX:
            raise pub.DuplicateKey("a row was duplicated during the run")
        return original(key, *args, **kwargs)
    w.t.upsert = vanishing
    try:
        run(w, MANIFEST, working_files("v2"), "run-2")
    except pub.PublisherError as error:
        require(isinstance(error, pub.Interrupted) and "may have been written" in str(error) and "a row was duplicated" in str(error), str(error))
    else:
        raise AssertionError("an error mid-run must say that rows may have been written")
    with tempfile.TemporaryDirectory() as tmp:
        result = Path(tmp) / "publication.md"
        n, creates = FakeNotion(), []

        def respond(method, path, payload):
            if method == "POST" and path == "pages":
                creates.append(path)
                if len(creates) == 3:
                    raise pub.DuplicateKey("a row was duplicated during the run")
        n.respond = respond
        code, text, _ = run_main(["publish", "--repo", str(ROOT), "--ref", "HEAD", "--database", "db-fixture", "--out", str(result)],
                                 active_manifest(), n=n)
        require(code == 3 and "may have been written" in text and "Nothing was written" not in text and result.read_text() == text, text)
        require(len(n.pages) == 2 and all(p["props"]["Status"] != "complete" for p in n.pages.values()), "two rows exist, none complete")


@scenario
def an_interrupted_update_never_reports_complete_with_a_wrong_page(w):
    run(w, MANIFEST, working_files(), "run-1")
    files = working_files("v2")
    w.fail_next("unknown-landed", ARCH)
    run(w, MANIFEST, files, "run-2")
    w.public_shows(ARCH, "not the page")
    result = run(w, MANIFEST, files, "run-3")
    require(outcomes(result)[ARCH] == pub.PARTIAL and w.snapshot(ARCH)["status"] != "complete",
            "the earlier write is read back, found wrong in public, and not called complete")
    w2 = type(w)()
    run(w2, MANIFEST, working_files(), "run-1")
    w2.fail_next("partial", ARCH)
    run(w2, MANIFEST, files, "run-2")
    result = run(w2, MANIFEST, files, "run-3")
    arch = next(a for a in pub.expand(MANIFEST) if a["key"] == ARCH)
    require(w2.snapshot(ARCH)["body"] == pub.render(arch, pub.DictSource(files, "c-run-3")) and outcomes(result)[ARCH] == pub.RESUMED,
            "an emptied or cut page is rewritten, not accepted")


@scenario
def a_write_that_reads_back_wrong_is_never_complete(w):
    run(w, MANIFEST, working_files(), "run-1")
    files = working_files("v2")
    w.corrupt(ARCH)                              # the transport answers success but the stored page is damaged
    result = run(w, MANIFEST, files, "run-2")
    require(outcomes(result)[ARCH] == pub.PARTIAL and "differs from the source" in next(r["detail"] for r in result["rows"] if r["key"] == ARCH),
            "the read-back sees the damaged page")
    require(w.snapshot(ARCH)["status"] == "partial" and all(w.snapshot(k)["status"] != "complete" for k in W_KEYS) and pub.failing(result),
            "nothing in the set is complete and the run is red")
    w.corrupt(None)
    result = run(w, MANIFEST, files, "run-3")
    require(outcomes(result)[ARCH] == pub.RESUMED and w.snapshot(ARCH)["status"] == "complete", "a clean retry completes it")


@scenario
def a_body_is_written_whole_or_refused_never_truncated(w):
    lines = [f"line {i}" for i in range(250)] + ["", "", "x" * 5000, "tail"]
    files = {**working_files(), "README.md": "\n".join(lines)}
    run(w, MANIFEST, files, "run-1")
    snap = w.snapshot(README)
    require(snap["body"].endswith("\n".join(lines)), "250 lines, blank lines and a 5000-character line are stored exactly")
    for name, bad in (("a control character", "ok\x00bad"), ("a carriage return", "a\r\nb"),
                      ("a line over the limit", "y" * (pub.CHUNK * pub.MAX_CHUNKS + 1)), ("too many lines", "\n" * pub.MAX_BLOCKS)):
        w = type(w)()
        result = run(w, MANIFEST, {**working_files(), "README.md": bad}, "run-1")
        require(outcomes(result)[README] == pub.REFUSED_UNREPRESENTABLE and README not in w.upserted(), f"{name} is refused visibly, not truncated")
        require(pub.failing(result) and "never truncated" in next(r["detail"] for r in result["rows"] if r["key"] == README), f"{name}: red and explained")


@scenario
def publish_claims_and_releases_the_stage_and_resolves_the_tag(w):
    if w.kind == "fixture":
        w.t.claim_run("run-a")
        try:
            run(w, MANIFEST, working_files(), "run-b")
        except pub.RunInProgress:
            pass
        else:
            raise AssertionError("a second run must not enter the stage")
        w.t.release_run("run-a")
    run(w, MANIFEST, working_files(), "run-1")
    if w.kind == "fixture":
        require(("claim", "run-1") in w.log and ("release", "run-1") in w.log, "the run claims and releases the stage")
    for resolver in (lambda tag: None, lambda tag: "0" * 40):
        try:
            run(w, MANIFEST, working_files(), "run-2", tags=resolver)
        except pub.PublisherError:
            continue
        raise AssertionError("publish must resolve the released tag itself: absent and moved tags both fail")


# --- the public evidence, through NotionTransport with a fake opener ------------------------------------

@test
def the_pure_comparison_and_the_three_states():
    body = "<!-- osm-doc-key: k edition: e commit: c -->\nline one\n\nline two"
    require(pub.compare_content(body, "x <!-- osm-doc-key: k edition: e commit: c --> line one   line two y")[0] == pub.VERIFIED, "in order, whitespace-insensitive")
    for shown in ("", "line one", "line two line one", "Log in. 404 not found", body.replace("commit: c", "commit: d")):
        require(pub.compare_content(body, shown)[0] == pub.FAILED, f"not verified: {shown!r}")
    require(pub.catalogue_lists_key("osm.working.readme", "a osm.working.readme b")[0] == pub.VERIFIED, "the Key is named")
    require(pub.catalogue_lists_key("osm.working.readme", "osm.working.readme-old osm.working.readme.x")[0] == pub.FAILED, "a longer Key is not the Key")
    require({pub.VERIFIED, pub.FAILED, pub.UNSUPPORTED} == {"verified", "failed", "unsupported"}, "three states")
    require(pub.visible_text("<p>a</p><script>var x=1</script><style>p{}</style><p>b &amp; c</p>").split() == ["a", "b", "&", "c"], "scripts and styles are not content")


@test
def notion_transport_without_a_reader_is_unsupported_and_makes_no_public_request():
    n = FakeNotion()
    t = pub.NotionTransport("db-fixture", opener=n, env={pub.TOKEN_ENV: TOKEN})
    require(t.verify_public("k", "body") == (pub.UNSUPPORTED, pub.NO_READER) and t.verify_catalogue("k") == (pub.UNSUPPORTED, pub.NO_READER),
            "no reader is qualified: both observations are unsupported")
    require(not n.requests, "and nothing was requested, so a response was never treated as proof")
    require(MANIFEST["activation"].get("public_reader", "absent") is None, "the reviewed setting that enables a reader is unset today")


@test
def a_public_reader_rejects_a_login_page_a_shell_a_404_and_a_network_failure():
    w = NotionWorld()
    run(w, MANIFEST, working_files(), "run-1")
    pid = w.n.page_for(README)
    url = f"{w.n.public_base}/{pid}"
    expected = pub.render(next(a for a in pub.expand(MANIFEST) if a["key"] == README), pub.DictSource(working_files(), "c-run-1"))
    require(w.transport.verify_public(README, expected)[0] == pub.VERIFIED, "the explicitly enabled test reader verifies the real content")
    cases = {"login page": (200, "<html><body><h1>Log in to Notion</h1><form>Email</form></body></html>"),
             "not found as 200": (200, "<html><body><h1>Page not found</h1></body></html>"),
             "app shell": (200, '<html><body><div id="root"></div><script>window.__APP__={"page":"%s"}</script></body></html>' % pid),
             "real 404": (404, "<html>Not found</html>"), "server error": (500, "oops")}
    for name, answer in cases.items():
        w.n.public[url] = answer
        state, detail = w.transport.verify_public(README, expected)
        require(state == pub.FAILED, f"{name}: {state} {detail}")
    w.n.public[url] = urllib.error.URLError("network down")
    require(w.transport.verify_public(README, expected)[0] == pub.FAILED, "a network failure is failed, never verified")
    w.n.public[url] = http.client.RemoteDisconnected("closed")
    require(w.transport.verify_public(README, expected)[0] == pub.FAILED, "a dropped connection is failed")
    other = pub.render(next(a for a in pub.expand(MANIFEST) if a["key"] == ARCH), pub.DictSource(working_files(), "c-run-1"))
    w.n.public[url] = (200, "<html><body>" + "".join(f"<p>{line}</p>" for line in other.split("\n") if "<!--" not in line) + "</body></html>")
    require(w.transport.verify_public(README, expected)[0] == pub.FAILED, "another page's body is not this page")
    require(all(a is None for _m, u, a in w.n.requests if not u.startswith(w.n.api_base)), "no credential is attached to a public read")
    w.n.public[w.n.catalogue_url] = (200, "<html><body>nothing here</body></html>")
    require(w.transport.verify_catalogue(README)[0] == pub.FAILED, "a receipt row is not catalogue membership")
    w.n.public.pop(w.n.catalogue_url)
    require(w.transport.verify_catalogue(README)[0] == pub.VERIFIED, "the catalogue names the Key")


def active_manifest(reader=False):
    m = copy.deepcopy(MANIFEST)
    m["activation"]["active"] = True
    m["bindings"]["working_subtree"] = "db-fixture"
    if reader:
        m["activation"]["public_reader"] = {"reviewed_in": "this rehearsal only; no real reader is qualified"}
    return m


def run_main(argv, manifest, n=None, env=None, tags=tag_resolver):
    n = n or FakeNotion()
    out = io.StringIO()
    with redirect_stdout(out):
        code = pub.main(argv, manifest=manifest, opener=n, env={pub.TOKEN_ENV: TOKEN} if env is None else env, tag_resolver=tags)
    return code, out.getvalue(), n


@test
def publish_exits_non_zero_and_writes_its_result_unless_everything_is_complete_or_refused():
    with tempfile.TemporaryDirectory() as tmp:
        result = Path(tmp) / "publication.md"
        base = ["publish", "--repo", str(ROOT), "--ref", "HEAD", "--database", "db-fixture", "--out", str(result)]
        # Today: no reader, so the run ends at HOLD and exits non-zero. The file is written for the artifact.
        code, text, n = run_main(base, active_manifest())
        require(code == 4 and "Result: HOLD" in text and result.read_text() == text, f"unsupported exits 4: {code}\n{text}")
        require(all(not p["props"]["Status"] == "complete" for p in n.pages.values()) and len(n.pages) == 5, "five pending rows, none complete")
        require(not any(u for _m, u, _a in n.requests if not u.startswith(n.api_base)), "no public request")
        # Only an explicitly enabled test reader can reach complete, and then the exit is zero.
        fake = FakeNotion()
        code, text, n = run_main(base + ["--public-base", fake.public_base, "--public-catalogue", fake.catalogue_url], active_manifest(reader=True), n=fake)
        require(code == 0 and "written and read back" in text, f"a verified set exits 0: {code}\n{text}")
        require(all(p["props"]["Status"] == "complete" for p in n.pages.values()), "all five complete")
        code, text, n = run_main(base + ["--only", README], active_manifest())
        require(code == 4 and len(n.pages) == 1 and README in text, "the one-row route writes one row")
        code, text, _ = run_main(base + ["--only", "no.such.key"], active_manifest())
        require(code == 3 and "no artifact has this Key" in text and result.read_text() == text, "an unknown Key fails closed, and the file says so")
        code, text, _ = run_main(base, active_manifest(), env={})
        require(code == 3 and "FAIL-CLOSED" in text, "the missing credential fails closed")
        code, text, _ = run_main(base + ["--public-base", "https://example.invalid/site"], active_manifest())
        require(code == 3 and "unused configuration" in text, "a public base with no enabled reader is refused as unused")
        code, text, _ = run_main(base[:-4] + ["--database", "another-db", "--out", str(result)], active_manifest())
        require(code == 3 and "reviewed working subtree" in text, "any other database is refused")
        code, text, _ = run_main(base, active_manifest(), tags=lambda t: None)
        require(code == 3 and "was not found" in text, "an absent released tag fails the publish")
        n = FakeNotion()
        n.access = "expired"
        code, text, _ = run_main(base, active_manifest(), n=n)
        require(code == 4 and "blocked" in text, "an expired credential is red, not green")


@test
def reconcile_check_says_what_it_could_observe_and_names_a_noop():
    out = io.StringIO()
    with redirect_stdout(out):
        code = pub.main(["reconcile", "--repo", str(ROOT), "--ref", "HEAD", "--base", "HEAD"])
    text = out.getvalue()
    require(code == 0 and "valid no-op" in text and "| no-source-change | 5 |" in text and "would-write" not in text, text)
    table = text.split("| Outcome | Artifacts |")[1].split("\n\n")[0]
    require("| written" not in table and "| unchanged" not in table, "the credential-free result never says written or unchanged")
    base = pub.DictSource(working_files(), "c-1")
    changed = pub.plan(MANIFEST, base, None, ["docs/architecture.md", "skills/alpha/SKILL.md", "tests/x.py"], released_source=released_source(), base="b")
    got = outcomes(changed)
    require(got[ARCH] == pub.WOULD_WRITE and all(got[k] == pub.NO_SOURCE_CHANGE for k in W_KEYS if k != ARCH), f"changed paths map to the affected Keys: {got}")
    require(changed["changed_skills"] == ["skills/alpha"] and changed["unmapped_changes"] == ["tests/x.py"], "a changed skill is not a row")
    text = pub.reconciliation_text(changed)
    require("pending release propagation" in text and "`skills/alpha`" in text and "1 CI-owned row(s) would be written if CI were active" in text, text)
    unknown = pub.plan(MANIFEST, base, None, None, released_source=released_source())
    require({outcomes(unknown)[k] for k in W_KEYS} == {pub.UNKNOWN_NO_RECEIPTS}, "with no base the impact is unknown, not written")
    unknown_text = pub.reconciliation_text(unknown)
    require("the impact is unknown" in unknown_text and "| written" not in unknown_text, "and says so")
    for argv, expected in ((["--base", "no-such-ref"], "is not usable"), (["--only", "no.such"], "no artifact has this Key")):
        out = io.StringIO()
        with redirect_stdout(out):
            code = pub.main(["reconcile", "--repo", str(ROOT), "--ref", "HEAD", *argv])
        require(code == 2 and out.getvalue().startswith("ERROR:") and expected in out.getvalue(), "a clean error, not a traceback")
    with redirect_stdout(io.StringIO()):
        require(pub.main(["reconcile", "--repo", str(ROOT), "--ref", "HEAD", "--base", "0" * 40, "--check"]) == 0, "the null commit means no base")


@test
def the_manifest_has_no_skill_generator_and_one_row_route_exists():
    require("generators" not in MANIFEST and not pub.validate_manifest(MANIFEST), "no skill rows are generated")
    require(len(pub.expand(MANIFEST)) == 38 and sum(a["class"] == "W" for a in MANIFEST["artifacts"]) == 5, "22 A, 5 W, 2 G and 9 B rows")
    bad = copy.deepcopy(MANIFEST)
    bad["generators"] = [{"key": "osm.working.skill.{name}"}]
    require(any("generator" in p for p in pub.validate_manifest(bad)), "a generator is refused")
    w = NotionWorld()
    result = pub.publish(MANIFEST, pub.DictSource(working_files(), "c-1"), w.transport, "r", tag_resolver, allow_fixture=True,
                         released_source=released_source(), only=ARCH)
    require([r["key"] for r in result["rows"]] == [ARCH] and w.row_count() == 1, "--only publishes exactly one row")
    try:
        pub.plan(MANIFEST, pub.DictSource(working_files(), "c"), only="nope")
    except pub.PublisherError:
        pass
    else:
        raise AssertionError("an unknown --only Key must be refused")


@test
def class_b_hash_and_guide_checks_report_not_checked_and_tell_failure_from_unsupported():
    result = pub.plan(MANIFEST, pub.DictSource(working_files(), "c"), None, released_source=released_source())
    text = pub.reconciliation_text(result)
    require("notion.content.setup | B | refused-class-B" in text and "frozen ZIP hash: not checked (unsupported)" in text, "class B hash row says not checked")
    require(text.count("newer-original check: not checked (unsupported)") == 2, "both guide rows say not checked")
    t = FixtureTransport()
    states = {f["key"]: f["state"] for f in pub.check_frozen(MANIFEST, t)}
    require(states == {"notion.content.setup": pub.UNSUPPORTED}, "a download that could not be hashed is unsupported")
    t.downloads["notion.content.setup"] = "0" * 64
    mismatch = pub.check_frozen(MANIFEST, t)[0]
    require(mismatch["state"] == pub.FAILED and mismatch["action"] == "reported; not repaired" and not t.rows, "a mismatch is failed, reported, not repaired")
    t.downloads["notion.content.setup"] = SETUP_ZIP
    require(pub.check_frozen(MANIFEST, t)[0]["state"] == pub.VERIFIED, "a match is verified")
    w = FixtureWorld()
    w.t.downloads["notion.content.setup"] = "0" * 64
    result = run(w, MANIFEST, working_files(), "run-1")
    require(outcomes(result)["notion.content.setup"] == pub.CONFLICT and pub.failing(result), "a mismatch makes the run red")
    require(pub.NotionTransport("db", opener=FakeNotion(), env={pub.TOKEN_ENV: TOKEN}).download_hash("k") is None, "no live reader hashes the export")


@test
def the_released_edition_resolves_to_the_exact_approved_commit():
    require(pub.resolve_released(MANIFEST, lambda tag: APPROVED) == APPROVED, "the approved commit resolves")
    for wrong in ("0" * 40, "9de4317a613cb11dea38a59be6dc6cbb9d120e29"):
        try:
            pub.resolve_released(MANIFEST, lambda tag, w=wrong: w)
        except pub.PublisherError:
            continue
        raise AssertionError("a main commit must never be relabelled as the released edition")
    try:
        pub.resolve_released(MANIFEST, lambda tag: None)
    except pub.PublisherError as error:
        require("was not found" in str(error), str(error))
    else:
        raise AssertionError("an absent tag must fail")
    require(pub.resolve_released(MANIFEST, lambda tag: None, require_tag=False) == APPROVED, "the credential-free check may note an absent tag instead")
    real = pub.git_tag_resolver(ROOT)("v0.30.0")
    require(real in (None, APPROVED), f"a tag that exists resolves to the approved commit: {real}")
    unapproved = copy.deepcopy(MANIFEST)
    unapproved["editions"]["released"]["approved"] = False
    try:
        pub.resolve_released(unapproved, lambda tag: APPROVED)
    except pub.PublisherError:
        pass
    else:
        raise AssertionError("an unapproved edition cannot be released")


@test
def an_absent_tag_is_noted_by_the_credential_free_check_and_never_silent():
    note = pub.tag_note(MANIFEST, lambda tag: None)
    require(note and "v0.30.0 is not present" in note and "not checked (unsupported)" in note, f"the note names the tag and says not checked: {note}")
    require(pub.tag_note(MANIFEST, lambda tag: APPROVED) is None, "a tag that resolves needs no note")
    result = pub.plan(MANIFEST, pub.DictSource(working_files(), "c"), None, released_source=released_source())
    result["notes"] = [note]
    require(f"Note: {note}" in pub.reconciliation_text(result), "the note appears in the visible result")


@test
def reconcile_prints_the_absent_tag_note_through_main_and_none_when_the_tag_resolves():
    with tempfile.TemporaryDirectory() as tmp:
        def git(*args):
            return subprocess.run(["git", "-C", tmp, "-c", "user.name=t", "-c", "user.email=t@t", *args], check=True, capture_output=True, text=True).stdout.strip()
        git("init", "-q")
        for name, text in (("README.md", "readme"), ("docs/README.md", "v0.30.0 is the latest"), ("docs/osm.md", "o"), ("docs/architecture.md", "a"), ("docs/skills.md", "s")):
            (Path(tmp) / name).parent.mkdir(exist_ok=True)
            (Path(tmp) / name).write_text(text)
        git("add", "."); git("commit", "-q", "-m", "one")
        mini = copy.deepcopy(MANIFEST)
        mini["artifacts"] = [a for a in mini["artifacts"] if a["class"] == "W"]
        mini["editions"]["released"]["commit"] = git("rev-parse", "HEAD")

        def reconcile():
            out = io.StringIO()
            with redirect_stdout(out):
                code = pub.main(["reconcile", "--repo", tmp, "--ref", "HEAD", "--check"], manifest=mini)
            return code, out.getvalue()
        code, text = reconcile()
        require(code == 0 and "Note: released tag v0.30.0 is not present in this checkout" in text and "not checked (unsupported)" in text,
                f"a tagless checkout prints the note and still passes: {code}\n{text}")
        git("tag", "v0.30.0")
        code, text = reconcile()
        require(code == 0 and "is not present" not in text, f"a tag that resolves prints no note: {text}")


@test
def a_new_release_tag_must_reach_the_manifest_and_the_latest_sentence():
    readme = pub.DictSource({"docs/README.md": "v0.30.0 is the latest"}, "c")
    require(pub.release_problems(MANIFEST, readme) == [], "consistent")
    stale = pub.DictSource({"docs/README.md": "v0.29.0 is the latest"}, "c")
    require(any("is the latest" in p for p in pub.release_problems(MANIFEST, stale)), "a stale 'latest' sentence is a problem")
    with tempfile.TemporaryDirectory() as tmp:
        def git(*args):
            subprocess.run(["git", "-C", tmp, "-c", "user.name=t", "-c", "user.email=t@t", *args], check=True, capture_output=True)
        git("init", "-q")
        (Path(tmp) / "docs").mkdir()
        (Path(tmp) / "docs/README.md").write_text("v0.30.0 is the latest")
        git("add", "."); git("commit", "-q", "-m", "one"); git("tag", "v0.30.0")
        git("commit", "-q", "--allow-empty", "-m", "two"); git("tag", "v0.31.0")
        git("commit", "-q", "--allow-empty", "-m", "three")
        tagged = pub.GitSource(tmp, "v0.31.0")
        require(tagged.release_tags() == ["v0.30.0"] and not [p for p in pub.release_problems(MANIFEST, tagged) if "newer" in p],
                "the tag build itself is not blocked by the tag it is building")
        later = pub.GitSource(tmp, "HEAD")
        require(any("v0.31.0 is newer" in p for p in pub.release_problems(MANIFEST, later)), "a later commit must record the new release")


@test
def old_bundled_content_changes_write_nothing_to_class_b():
    w = FixtureWorld()
    run(w, MANIFEST, working_files(), "run-1")
    w.log.clear()
    files = working_files()
    files["docs/content-drafts/skills/content/method-draft.md"] = "the old bundled draft changed"
    result = pub.plan(MANIFEST, pub.DictSource(files, commit="c-2"), w.transport, changed_paths=["docs/content-drafts/skills/content/method-draft.md"],
                      released_source=released_source())
    require(result["unmapped_changes"] == ["docs/content-drafts/skills/content/method-draft.md"], "reported as mapping to no artifact")
    run(w, MANIFEST, files, "run-2")
    require(not any(k.startswith("notion.content.") for k in w.upserted()), "no class B write")


@test
def duplicate_and_empty_keys_are_blocked_not_guessed():
    w = FixtureWorld()
    run(w, MANIFEST, working_files(), "run-1")
    w.t.duplicates.add(ARCH)
    result = run(w, MANIFEST, working_files(), "run-2")
    require(outcomes(result)[ARCH] == pub.BLOCKED and "more than one row" in next(r["detail"] for r in result["rows"] if r["key"] == ARCH), "fixture duplicate")
    n = FakeNotion()
    t = pub.NotionTransport("db-fixture", opener=n, env={pub.TOKEN_ENV: TOKEN})
    n.add_page("dup", "a", "complete"); n.add_page("dup", "b", "complete"); n.add_page("", "c", "complete")
    try:
        t.get("dup")
    except pub.DuplicateKey:
        pass
    else:
        raise AssertionError("two rows with one Key must not be resolved by picking one")
    rows = pub.plan(MANIFEST, pub.DictSource(working_files(), "c"), t, released_source=released_source())["rows"]
    blocked = {r["key"]: r["detail"] for r in rows if r["outcome"] == pub.BLOCKED}
    require("(empty Key)" in blocked and "dup" in blocked, f"an empty Key and a duplicate Key are visible: {blocked}")
    require(not [e for e in n.log if e[0] in ("upsert", "delete")], "nothing was written or deleted")


@test
def the_notion_transport_is_correct_against_the_in_memory_opener():
    n = FakeNotion(title="Page title")
    t = pub.NotionTransport("db-fixture", opener=n, env={pub.TOKEN_ENV: TOKEN})
    require(t.get("osm.working.readme") is None, "a missing row reads as None")
    method, url, auth = n.requests[-1]
    require(method == "POST" and url.endswith("databases/db-fixture/query") and auth == f"Bearer {TOKEN}", "query shape")
    t.upsert("k.one", "line one\nline two", "h" * 8, "ci", "c1", receipt_before=None, receipt_after="a")
    snap = n.pages[n.page_for("k.one")]
    require(snap["props"]["Status"] == "pending" and snap["props"]["Commit"] == "c1" and snap["title"] == "k.one", "a new row is created already pending")
    got = t.get("k.one")
    require(got["status"] == "pending" and got["commit"] == "c1" and got["receipt_after"] == "a" and got["body_hash"] == "h" * 8, "get returns the commit and every property")
    require(got["actual_hash"] == pub.body_hash("line one\nline two"), "and the hash of the page body as read")
    require(n.log.index(("upsert", "k.one")) < n.log.index(("body-hash", "k.one")), "BodyHash is written after the body")
    t.set_status("k.one", "complete", receipt_after="a", commit="c2", run_id="x")
    require(t.get("k.one")["status"] == "complete" and t.get("k.one")["commit"] == "c2", "set_status updates the row")
    try:
        t.set_status("missing", "complete")
    except pub.PublisherError:
        pass
    else:
        raise AssertionError("marking a row that does not exist must not pass silently")
    mark = len(n.log)
    t.upsert("k.one", "new one\nnew two\nnew three", "h2", "ci", "c3", receipt_before="a", receipt_after="b")
    require([e[0] for e in n.log[mark:] if e[0] in ("upsert", "body-hash")] == ["upsert", "body-hash"], "on update too, BodyHash is written last")
    require(n.body("k.one") == "new one\nnew two\nnew three" and t.get("k.one")["body_hash"] == "h2", "the update path replaces the body, then BodyHash")
    big = "\n".join(f"line {i}" for i in range(250))
    t.upsert("k.one", big, "h3", "ci", "c4")
    require(n.body("k.one") == big, "250 lines stored whole")
    before = len([r for r in n.requests if "children" in r[1] and r[0] == "GET"])
    t.get("k.one")
    require(len([r for r in n.requests if "children" in r[1] and r[0] == "GET"]) - before == 3, "a 250-block body is read in three paginated requests")
    require(all(timeout == pub.TIMEOUT for timeout in n.timeouts), "every request carries a timeout")
    for broken in ({"properties": {"Key": {"type": "rich_text"}}}, {"properties": {"A": {"type": "title"}, "B": {"type": "title"}}}):
        bad = FakeNotion()
        bad.schema_override = broken["properties"]
        try:
            pub.NotionTransport("db-fixture", opener=bad, env={pub.TOKEN_ENV: TOKEN}).get("k")
        except pub.SetupError:
            continue
        raise AssertionError("a database without the documented properties or exactly one title must be refused")


@test
def the_notion_transport_maps_failures_honestly_and_never_prints_the_token():
    def failing_opener(error):
        def opener(request, timeout=None):
            raise error
        return opener

    def request(error):
        return pub.NotionTransport("db", opener=failing_opener(error), env={pub.TOKEN_ENV: TOKEN})._request("GET", "x")

    http_error = lambda code: urllib.error.HTTPError("https://api.notion.com/v1/x", code, "m", {}, io.BytesIO(b""))
    expected = {401: pub.AccessError, 403: pub.AccessError, 404: pub.AccessError, 400: pub.NotApplied, 429: pub.NotApplied,
                500: pub.UnknownWrite, 502: pub.UnknownWrite, 302: pub.UnknownWrite}
    for code, kind in expected.items():
        try:
            request(http_error(code))
        except pub.PublisherError as error:
            require(type(error) is kind and TOKEN not in str(error), f"{code} maps to {kind.__name__}, not {type(error).__name__}")
        else:
            raise AssertionError(f"{code} must raise")
    for error in (http.client.RemoteDisconnected("gone"), urllib.error.URLError("down"), TimeoutError("slow"), ConnectionResetError("reset")):
        try:
            request(error)
        except pub.UnknownWrite:
            continue
        raise AssertionError(f"{type(error).__name__} must be an unknown write")
    class Html:
        status = 200
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def read(self): return b"<html>gateway page</html>"
    try:
        pub.NotionTransport("db", opener=lambda req, timeout=None: Html(), env={pub.TOKEN_ENV: TOKEN})._request("GET", "x")
    except pub.UnknownWrite as error:
        require("not JSON" in str(error), str(error))
    else:
        raise AssertionError("a non-JSON answer must be an unknown write")
    require(TOKEN not in (DOCS / "publisher.py").read_text() and TOKEN not in (DOCS / "fixture_transport.py").read_text(), "no token in source")
    out = io.StringIO()
    with redirect_stdout(out):
        pub.reconciliation_text({"commit": "c", "rows": [], "unmapped_changes": []})
    require(TOKEN not in out.getvalue(), "no token in output")


@test
def a_redirect_is_never_followed_so_the_token_never_reaches_another_host():
    seen = []

    class Target(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            seen.append(self.headers.get("Authorization"))
            self.send_response(200); self.end_headers(); self.wfile.write(b"{}")
        log_message = lambda *a: None

    target = http.server.HTTPServer(("127.0.0.1", 0), Target)

    class Redirect(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(302)
            self.send_header("Location", f"http://localhost:{target.server_address[1]}/other")
            self.end_headers()
        log_message = lambda *a: None

    origin = http.server.HTTPServer(("127.0.0.1", 0), Redirect)
    threads = [threading.Thread(target=s.serve_forever, daemon=True) for s in (target, origin)]
    for thread in threads:
        thread.start()
    try:
        t = pub.NotionTransport("db", env={pub.TOKEN_ENV: TOKEN}, api_base=f"http://127.0.0.1:{origin.server_address[1]}/v1/")
        try:
            t._request("GET", "x")
        except pub.UnknownWrite as error:
            require("redirect" in str(error) and TOKEN not in str(error), str(error))
        else:
            raise AssertionError("a redirect must not be treated as an answer")
        require(seen == [], f"the redirect target was never contacted, so it never saw Authorization: {seen}")
    finally:
        for server in (target, origin):
            server.shutdown(); server.server_close()


@test
def activation_needs_a_reviewed_subtree_and_refuses_unused_configuration():
    active = copy.deepcopy(MANIFEST)
    active["activation"]["active"] = True
    require(any("working_subtree" in p for p in pub.validate_manifest(active)), "active with no subtree is a problem")
    active["bindings"]["working_subtree"] = "db"
    require(not pub.validate_manifest(active), "with a subtree it validates")
    active["activation"]["public_reader"] = {}
    require(any("public_reader" in p for p in pub.validate_manifest(active)), "a reader must name its review")
    empty = copy.deepcopy(MANIFEST)
    empty["artifacts"][0]["key"] = ""
    require(any("empty key" in p for p in pub.validate_manifest(empty)), "an empty key is refused")
    require(MANIFEST["activation"]["active"] is False and MANIFEST["activation"]["live_proof"] == "not-run", "the state is honest")


@test
def marking_a_row_that_does_not_exist_is_an_error_on_both_transports():
    for transport in (FixtureTransport(), pub.NotionTransport("db", opener=FakeNotion(), env={pub.TOKEN_ENV: TOKEN})):
        try:
            transport.set_status("no.such.row", "complete")
        except pub.PublisherError:
            continue
        raise AssertionError(f"{type(transport).__name__}: a status for a missing row must not pass silently")


@test
def the_header_labels_the_edition_and_says_unreleased():
    source = pub.DictSource(working_files(), "c-1")
    arts = {a["key"]: a for a in pub.expand(MANIFEST)}
    working = pub.render(arts[README], source)
    require(working.startswith("<!-- osm-doc-key: osm.working.readme edition: Main working revision (unreleased) commit: c-1 -->\n"),
            "the header names the edition")
    require("Unreleased main working revision; not an installed or released edition." in working.split("\n")[1], "and a visible line says unreleased")
    released = pub.render(arts["osm.released.skill.osm"], released_source())
    require("edition: v0.30.0" in released.split("\n")[0] and "Released edition v0.30.0" in released.split("\n")[1], "a released row says released and which")
    require(pub.body_hash(working) == pub.body_hash(pub.render(arts[README], pub.DictSource(working_files(), "c-2"))), "the receipt hash ignores the commit")


# --- repository-level checks --------------------------------------------------------------------

@test
def inactive_publisher_refuses_and_the_template_is_inert():
    try:
        pub.publish(MANIFEST, pub.DictSource(working_files()), FixtureTransport(), "x", tag_resolver)
    except pub.PublisherError as error:
        require("not active" in str(error), str(error))
    else:
        raise AssertionError("the inactive manifest must refuse to write")
    require(not (ROOT / ".github/workflows/docs-publisher.yml").exists(), "no workflow was enabled")
    require(not any("publisher.py publish" in p.read_text() for p in (ROOT / ".github/workflows").glob("*.yml")), "no workflow publishes")
    out = io.StringIO()
    with redirect_stdout(out):
        code = pub.main(["publish", "--repo", str(ROOT), "--ref", "HEAD"], env={})
    require(code == 3 and "FAIL-CLOSED" in out.getvalue(), "the command refuses without a credential")


@test
def no_class_c_dependency_private_id_or_cron_in_the_repository():
    bad = copy.deepcopy(MANIFEST)
    bad["ci_inputs"].append({"kind": "private-control"})
    require(any("outside the public sources" in p for p in pub.validate_manifest(bad)), "a private input is rejected")
    bad["ci_inputs"] = [{"kind": "public-edition-block"}]
    require(any("outside the public sources" in p for p in pub.validate_manifest(bad)), "an input nothing reads is not declared")
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
    require(template.count("if: always()") == 2 and "--out publication.md" in template and "--only" not in template, "both artifacts upload even when a step fails")
    release = (ROOT / ".github/workflows/release.yml").read_text()
    require("reconcile --check" in release and "--base" in release and "github.event.pull_request.base.sha" in release, "CI passes a base on pull requests and pushes")


@test
def recorded_public_values_stay_out_of_shipped_text():
    shipped = [p for p in (ROOT / "skills").rglob("*") if p.is_file()] + [ROOT / "docs/osm.md"]
    for path in shipped:
        text = path.read_text()
        for value in RECORDED_PUBLIC:
            require(value not in text, f"{path.relative_to(ROOT)} contains a recorded target value")
        require("40d6d2e17f5681" not in text and "gustavanderson.notion.site" not in text, f"public binding in {path.relative_to(ROOT)}")


@test(slow=True)
def the_credential_free_reconciliation_check_passes_on_this_repository():
    out = io.StringIO()
    with redirect_stdout(out):
        code = pub.main(["reconcile", "--repo", str(ROOT), "--ref", "HEAD", "--check"])
    text = out.getvalue()
    require(code == 0, text)
    require("Frozen source commit:" in text and "Publisher active: no" in text, "the result is visible and honest")
    require("| pending-handoff | 22 |" in text and "22 artifact(s) are pending handoff" in text, "the 22 released packets are pending handoff")
    require("| unknown-no-receipts | 5 |" in text and "| written" not in text, "no row claims to be written")
    since = io.StringIO()
    with redirect_stdout(since):
        pub.main(["reconcile", "--repo", str(ROOT), "--ref", "HEAD", "--base", "00d29e2"])
    require("pending release propagation" in since.getvalue() and "`skills/osm`" in since.getvalue() and "`skills/osm-setup`" in since.getvalue(),
            "the real repair's own skill changes are reported as pending release propagation")
    with tempfile.TemporaryDirectory() as tmp:
        out_file = Path(tmp) / "reconciliation.md"
        with redirect_stdout(io.StringIO()):
            pub.main(["reconcile", "--repo", str(ROOT), "--ref", "HEAD", "--out", str(out_file)])
        require(out_file.read_text().startswith("# Documentation reconciliation"), "written for the CI artifact")


# --- mutation controls ----------------------------------------------------------------------------------
# Each control breaks the publisher (or its stand-in) in one known way and requires a scenario to fail.
# A control that no longer applies exactly once is itself a failure, so the list cannot rot silently.

P, F = "publisher.py", "fixture_transport.py"
MUTATIONS = [
    ("public verification always verified", P, [('return (FAILED, "the row is not there") if page is None else self.public_reader.page(page["id"], expected)', 'return VERIFIED, "mutant"')]),
    ("public verification always failed", P, [('return (FAILED, "the row is not there") if page is None else self.public_reader.page(page["id"], expected)', 'return FAILED, "mutant"')]),
    ("no public reader reads as verified", P, [('        if self.public_reader is None:\n            return UNSUPPORTED, NO_READER\n        page = self._find(key)', '        if self.public_reader is None:\n            return VERIFIED, NO_READER\n        page = self._find(key)')]),
    ("no public reader reads as a catalogue match", P, [('return (UNSUPPORTED, NO_READER) if self.public_reader is None else self.public_reader.catalogue(key)', 'return (VERIFIED, NO_READER) if self.public_reader is None else self.public_reader.catalogue(key)')]),
    ("catalogue always lists the Key", P, [('return FAILED, "the public catalogue does not name the Key"', 'return VERIFIED, "mutant"')]),
    ("catalogue dropped from the read-back", P, [('states = [transport.verify_public(key, expected), transport.verify_catalogue(key)]', 'states = [transport.verify_public(key, expected)]')]),
    ("page content not compared", P, [('return compare_content(expected, text) if state == VERIFIED else', 'return (VERIFIED, "mutant") if state == VERIFIED else')]),
    ("body hash dropped from the read-back", P, [('if got["actual_hash"] != row["hash"]:', 'if False:')]),
    ("claim_run removed from publish", P, [('    transport.claim_run(run_id)\n    try:\n        result = plan(', '    try:\n        result = plan(')]),
    ("before-source dropped", P, [('else (remote["receipt_after"] if remote else None)', 'else None'), ('before = (remote.get("receipt_before") or None) if remote and remote["status"] in PENDING_LIKE', 'before = None if remote and remote["status"] in PENDING_LIKE')]),
    ("resume overwrites the before-source with the failed target", P, [('(remote.get("receipt_before") or None) if remote and remote["status"] in PENDING_LIKE', '(remote["receipt_after"] or None) if remote and remote["status"] in PENDING_LIKE')]),
    ("Notion set_status is a no-op", P, [('self._request("PATCH", f"pages/{existing[\'id\']}", {"properties": self._props(status=status, **fields)})', 'pass')]),
    ("Notion update writes no body", P, [('                self._request("PATCH", f"blocks/{page_id}/children", {"children": batch})', '                pass')]),
    ("edition removed from the header", P, [("edition: {label} commit:", "commit:")]),
    ("unreleased line removed", P, [('"Unreleased main working revision; not an installed or released edition."', '"Main working revision."')]),
    ("empty database id accepted", P, [("if not token or not database_id:", "if not token:")]),
    ("empty token accepted", P, [("if not token or not database_id:", "if not database_id:")]),
    ("a non-CI writer may be written", P, [('    if writer != "ci":\n        return PENDING_HANDOFF', '    if False:\n        return PENDING_HANDOFF')]),
    ("class B may be written", P, [('    if artifact["class"] == "B":\n        detail', '    if False:\n        detail')]),
    ("a moved tag is accepted", P, [('if resolved is not None and resolved != ed["commit"]:', 'if False:')]),
    ("an absent tag is accepted", P, [('if resolved is None and require_tag:', 'if False:')]),
    ("publish does not resolve the tag", P, [('    resolve_released(manifest, tag_resolver)\n    transport.claim_run', '    transport.claim_run')]),
    ("a newer guide original is not a conflict", P, [('if remote["actual_hash"] != orig:', 'if False:')]),
    ("a failed read-back keeps the written outcome", P, [('row["outcome"], row["detail"] = PARTIAL, f"read-back did not match: {detail}; left pending and retryable"', 'row["detail"] = detail')]),
    ("unsupported members are completed", P, [('if not stopped and len(wrote) == len(declared) and all(state == VERIFIED for state, _d in verdict.values()):', 'if all(state != FAILED for state, _d in verdict.values()):')]),
    ("the set does not wait for a member that was not written", P, [('if not stopped and len(wrote) == len(declared) and all(state == VERIFIED for state, _d in verdict.values()):', 'if not stopped and wrote and all(state == VERIFIED for state, _d in verdict.values()):')]),
    ("a plan-time failure does not hold the written rows", P, [('if not stopped and len(wrote) == len(declared) and all(state == VERIFIED for state, _d in verdict.values()):', 'if len(wrote) == len(declared) and all(state == VERIFIED for state, _d in verdict.values()):')]),
    ("a landed resume is marked complete without read-back", P, [('row["detail"] = "the earlier write is on the page; read back below, not retried"', 'row["detail"] = "x"; transport.set_status(a["key"], "complete", receipt_after=digest, commit=use.commit)')]),
    ("BodyHash written first", P, [('{"properties": self._props(key=key, writer=writer, commit=commit)}', '{"properties": self._props(key=key, writer=writer, commit=commit, body_hash=digest)}')]),
    ("long lines truncated", P, [('{"content": line[i:i + CHUNK]}} for i in range(0, len(line), CHUNK)]', '{"content": line[:CHUNK]}} for i in range(0, 1)]')]),
    ("only the first 90 lines written", P, [('for line in body.split("\\n")]', 'for line in body.split("\\n")[:90]]')]),
    ("only the first page of children read", P, [('            if not page.get("has_more"):\n                return blocks', '            return blocks')]),
    ("an unreadable body is treated as unchanged", P, [('    if actual is None:\n        return UNREADABLE, f"the page body could not be read ({remote.get(\'body_error\')}); never treated as unchanged", new\n', ''), ('if actual != remote["receipt_after"]:', 'if actual is not None and actual != remote["receipt_after"]:')]),
    ("conflict compares a property, not the page body", P, [('if actual != remote["receipt_after"]:\n        return CONFLICT', 'if remote["body_hash"] != remote["receipt_after"]:\n        return CONFLICT')]),
    ("publish exits 0 whatever happened", P, [("return 4 if failing(result) else 0", "return 0")]),
    ("unsupported leaves the run green", P, [("OK_OUTCOMES = {WRITTEN,", "OK_OUTCOMES = {UNSUPPORTED, WRITTEN,")]),
    ("conflict leaves the run green", P, [("OK_OUTCOMES = {WRITTEN,", "OK_OUTCOMES = {CONFLICT, WRITTEN,")]),
    ("the result file is not written", P, [("    if out:\n        Path(out).write_text(text)", "    if False:\n        pass")]),
    ("a settled retirement is not a no-op", P, [('                    if row["status"] == "retired":\n                        rows.append', '                    if False:\n                        rows.append')]),
    ("retirement does not set the stored status", P, [('transport.set_status(row["key"], "retired", run_id=run_id)', 'pass')]),
    ("duplicate Keys are not detected", P, [("if len(found) > 1:", "if False:")]),
    ("an empty Key is not handled", P, [('if key == "":', "if False:")]),
    ("a class A row with no Key is created", P, [('        if artifact["class"] == "A":\n            return BLOCKED', '        if False:\n            return BLOCKED')]),
    ("requests carry no timeout", P, [("with self._open(req, timeout=TIMEOUT) as response:", "with self._open(req) as response:")]),
    ("redirects are followed", P, [("API_OPENER = urllib.request.build_opener(_NoRedirect).open", "API_OPENER = urllib.request.urlopen")]),
    ("RemoteDisconnected is not mapped", P, [("except (urllib.error.URLError, OSError, http.client.HTTPException):   # timeout", "except urllib.error.URLError:   # timeout")]),
    ("a non-JSON body is not mapped", P, [("        except ValueError:\n            raise UnknownWrite", "        except KeyError:\n            raise UnknownWrite")]),
    ("429 is mapped as an unknown write", P, [("if error.code in (400, 429):", "if error.code in (400,):")]),
    ("the title property is hard-coded", P, [("self._title = title[0]", 'self._title = "Name"')]),
    ("get returns no commit", P, [("for field, name in PROPERTY_NAMES.items()}}", 'for field, name in PROPERTY_NAMES.items() if field != "commit"}}')]),
    ("a new row is not created pending", P, [('key=key, writer=writer, status="pending", commit=commit,', "key=key, writer=writer, commit=commit,")]),
    ("an unrepresentable body is written", P, [("    if why:\n        return REFUSED_UNREPRESENTABLE", "    if False:\n        return REFUSED_UNREPRESENTABLE")]),
    ("a control character is representable", P, [("        bad = next((c for c in line", "        bad = None and next((c for c in line")]),
    ("--only is ignored", P, [("    if only:\n        artifacts = [a for a in artifacts", "    if False:\n        artifacts = [a for a in artifacts")]),
    ("every path maps to every row", P, [("    return any(p == pre or (pre.endswith(\"/\") and p.startswith(pre)) for pre in a[\"source_paths\"] for p in changed_paths)", "    return True")]),
    ("the credential-free result says written", P, [("return WOULD_WRITE, ", "return WRITTEN, ")]),
    ("changed skills are not reported", P, [('skills = sorted({"/".join(p.split("/")[:2]) for p in paths if p.startswith("skills/")})', "skills = []")]),
    ("only unmapped changed skills are reported", P, [('for p in paths if p.startswith("skills/")})', 'for p in unmapped if p.startswith("skills/")})')]),
    ("a later edit of a completed, held write is overwritten", P, [('if status == "pending" and remote.get("body_hash") == remote["receipt_after"] and actual not in', 'if False and actual not in')]),
    ("any pending row with another body is a conflict", P, [('remote.get("body_hash") == remote["receipt_after"] and actual not in (None, remote["receipt_after"]):', 'actual not in (None, remote["receipt_after"]):')]),
    ("a failed retirement does not hold the set", P, [('and (r.get("stops") or (k in arts and arts[k]["public_writer"] == "ci"))]', 'and (k in arts and arts[k]["public_writer"] == "ci")]')]),
    ("an interrupted run is reported as a plain error", P, [('raise Interrupted(f"{error}; the run stopped', 'raise PublisherError(f"{error}; the run stopped')]),
    ("an interrupted run says nothing was written", P, [("if isinstance(error, Interrupted)", "if False")]),
    ("a skill generator is accepted", P, [('    if manifest.get("generators"):', "    if False:")]),
    ("activation without a subtree is accepted", P, [('if activation["active"] and not manifest["bindings"].get("working_subtree"):', "if False:")]),
    ("any database is accepted", P, [('args.database != manifest["bindings"]["working_subtree"]', "False")]),
    ("unused public configuration is accepted", P, [("        if base or catalogue:\n            raise SetupError", "        if False:\n            raise SetupError")]),
    ("a frozen ZIP mismatch is not reported", P, [('elif got != frozen["sha256"]:', "elif False:")]),
    ("the guide check does not say it was not run", P, [('f"Notion-authored original | newer-original check: {NOT_CHECKED}: "', '"Notion-authored original | "')]),
    ("the class B hash check does not say it was not run", P, [('detail += f" | frozen ZIP hash: {NOT_CHECKED}: no reader hashes the live export"', "pass")]),
    ("the absent-tag note is not printed by reconcile", P, [("        notes += [n for n in [tag_note(manifest, resolve)] if n]\n", "")]),
    ("the absent-tag note is dropped", P, [('    if tag_resolver(ed["tag"]) is None:\n        return f"released tag', '    if False:\n        return f"released tag')]),
    ("a newer release tag is not noticed", P, [("        if newer:\n            out.append", "        if False:\n            out.append")]),
    ("the latest sentence is not checked", P, [("""if f"{ed['label']} is the latest" not in text:""", "if False:")]),
    ("a fixture row is created by set_status", F, [('        if key not in self.rows:\n            raise PublisherError(f"no row with the Key {key} to mark {status}")', "        self.rows.setdefault(key, {'writer': 'ci', 'status': status, 'receipt_after': None, 'receipt_before': None, 'body_hash': None, 'body': None, 'commit': None})")]),
]


def load_mutant(replacements):
    """Build the publisher and fixture modules from patched source, without touching any file."""
    sources = {name: (DOCS / name).read_text() for name in (P, F)}
    for name, edits in replacements:
        for old, new in edits:
            require(sources[name].count(old) == 1, f"control cannot apply exactly once in {name}: {old[:70]!r}")
            sources[name] = sources[name].replace(old, new)
    modules = {}
    for name, module_name in ((P, "publisher"), (F, "fixture_transport")):
        module = types.ModuleType(module_name)
        module.__file__ = str(DOCS / name)
        sys.modules[module_name] = module
        exec(compile(sources[name], f"{name} (mutant)", "exec"), module.__dict__)
        modules[module_name] = module
    return modules


def mutation_controls():
    saved = {name: sys.modules[name] for name in ("publisher", "fixture_transport")}
    scope = globals()
    original = {k: scope[k] for k in ("pub", "FixtureTransport", "FakeNotion")}
    quick = [(name, function) for name, function, slow in TESTS if not slow]
    caught, survived = [], []
    try:
        for name, target, edits in MUTATIONS:
            modules = load_mutant([(target, edits)])
            scope.update(pub=modules["publisher"], FixtureTransport=modules["fixture_transport"].FixtureTransport,
                         FakeNotion=modules["fixture_transport"].FakeNotion)
            for test_name, function in quick:
                try:
                    function()
                except Exception:                      # any failure, including a crash, is a detection
                    caught.append((name, test_name))
                    break
            else:
                survived.append(name)
    finally:
        sys.modules.update(saved)
        scope.update(original)
    require(not survived, f"mutation controls survived: {survived}")
    return caught


def main():
    for name, function, _slow in TESTS:
        function()
        print(f"ok  {name}")
    caught = mutation_controls()
    print(f"ok  {len(caught)} mutation controls, each caught by a scenario")
    print(f"PASS: {len(TESTS)} publisher rehearsals and {len(caught)} mutation controls "
          "(in-memory stand-ins only; no live, Notion or credential use)")


if __name__ == "__main__":
    main()
