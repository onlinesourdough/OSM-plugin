#!/usr/bin/env python3
"""Source-only publisher for the public OSM documentation projection.

Not shipped in the package and not active. It builds a per-artifact impact diff from a frozen
source commit, always returns a visible reconciliation result (a no-op is valid), and writes
only artifacts whose public writer is CI. Everything else gets a visible refusal and no write.

Standard library only. The Notion transport below has run only against the in-memory stand-in in
fixture_transport.py (never against Notion) and stays fail-closed until the manifest says
`activation.active` and a dedicated credential exists. No public content reader is qualified, so
no run can reach `complete` today: public access and catalogue membership are `unsupported`.
"""

import argparse
import hashlib
import html
import html.parser
import http.client
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "manifest.json"
TOKEN_ENV = "OSM_PUBLIC_DOCS_TOKEN"
NOTION_VERSION = "2022-06-28"
API_BASE = "https://api.notion.com/v1/"
TIMEOUT = 30
HEADER = "<!-- osm-doc-key:"

# Page body limits. Anything that cannot be written exactly is refused, never truncated.
BATCH, CHUNK, MAX_CHUNKS, MAX_BLOCKS = 100, 1900, 100, 10000

# Outcomes. Only the members of OK_OUTCOMES leave a run green.
WRITTEN, UNCHANGED, RESUMED = "written", "unchanged", "resumed"
PENDING_HANDOFF, REFUSED_B, REFUSED_NOTION = "pending-handoff", "refused-class-B", "refused-notion-authored"
CONFLICT, BLOCKED, UNKNOWN_WRITE, RETIRED, PARTIAL = "conflict", "blocked", "unknown-write", "retired", "partial"
UNSUPPORTED, HELD, UNREADABLE, REJECTED = "unsupported", "held", "unreadable", "rejected"
REFUSED_UNREPRESENTABLE = "refused-unrepresentable"
WOULD_WRITE, UNKNOWN_NO_RECEIPTS, NO_SOURCE_CHANGE = "would-write", "unknown-no-receipts", "no-source-change"
OK_OUTCOMES = {WRITTEN, UNCHANGED, RESUMED, RETIRED, PENDING_HANDOFF, REFUSED_B, REFUSED_NOTION}
NOT_COMPLETE = {PARTIAL, UNKNOWN_WRITE, UNSUPPORTED, HELD}   # results of a write; never reported with a stored `complete`
PENDING_LIKE = ("pending", "partial", "unknown-write")

# Three-state result of an observation. `unsupported` is not a pass.
VERIFIED, FAILED = "verified", "failed"


class PublisherError(Exception):
    pass


class MissingCredential(PublisherError):
    pass


class SetupError(PublisherError):
    """The configured database or setting cannot be used; nothing was written."""


class AccessError(PublisherError):
    """The connection is missing, expired or not granted for the public subtree."""


class UnknownWrite(PublisherError):
    """A write may or may not have happened; read it back before any retry."""


class PartialWrite(PublisherError):
    """Some children were written; the row stays pending and is resumed on the same Key."""


class NotApplied(PublisherError):
    """Notion answered 400 or 429: the request was not applied."""


class DuplicateKey(PublisherError):
    pass


class RunInProgress(PublisherError):
    pass


def sha256(data):
    return hashlib.sha256(data if isinstance(data, bytes) else data.encode()).hexdigest()


# --- sources --------------------------------------------------------------------------------------

class GitSource:
    """A frozen commit of this repository."""

    def __init__(self, repo, ref):
        self.repo = str(repo)
        self.commit = self._git("rev-parse", "--verify", "--end-of-options", ref + "^{commit}").strip()

    def _git(self, *args, raw=False):
        out = subprocess.run(["git", "-C", self.repo, *args], check=True, capture_output=True).stdout
        return out if raw else out.decode()

    def exists(self, path):
        return subprocess.run(["git", "-C", self.repo, "cat-file", "-e", f"{self.commit}:{path}"],
                              capture_output=True).returncode == 0

    def files(self, prefix):
        names = self._git("ls-tree", "-r", "--name-only", "-z", self.commit, "--", prefix.rstrip("/")).split("\0")
        return {n: self._git("show", f"{self.commit}:{n}", raw=True) for n in names if n}

    def changed_paths(self, base):
        try:
            self._git("rev-parse", "--verify", "--end-of-options", base + "^{commit}")
            out = self._git("diff", "--name-only", "-z", "--end-of-options", base, self.commit).split("\0")
        except subprocess.CalledProcessError:
            raise PublisherError(f"--base {base} is not usable: it is not a commit in this checkout") from None
        return sorted(p for p in out if p)

    def release_tags(self):
        """Release tags on strict ancestors of this commit; a tag on the commit itself cannot be recorded in it."""
        out = self._git("tag", "--merged", self.commit, "--list", "v*").split("\n")
        return [t for t in out if re.fullmatch(r"v\d+\.\d+\.\d+", t)
                and self._git("rev-parse", "--verify", "--end-of-options", t + "^{commit}").strip() != self.commit]


class DictSource:
    """A fixture source; `files` maps path to text."""

    def __init__(self, files, commit="fixture"):
        self._files = {k: v.encode() if isinstance(v, str) else v for k, v in files.items()}
        self.commit = commit

    def exists(self, path):
        return path in self._files

    def files(self, prefix):
        return {k: v for k, v in sorted(self._files.items()) if k == prefix or k.startswith(prefix)}


# --- manifest -------------------------------------------------------------------------------------

def load_manifest(path=MANIFEST):
    return json.loads(Path(path).read_text())


def validate_manifest(manifest):
    """Static rules. Returns a list of problems; empty means the manifest is consistent."""
    problems, keys = [], set()
    classes = set(manifest["classes"])
    for kind in manifest.get("ci_inputs", []):
        if kind["kind"] not in {"git-commit", "ci-receipt"}:
            problems.append(f"ci input outside the public sources: {kind['kind']}")
    if manifest.get("generators"):
        problems.append("a generator of skill rows is not allowed: skills stay Git-owned, with no second skill database")
    if "C" in {a.get("class") for a in manifest["artifacts"]}:
        problems.append("class C (private control) must not appear in the manifest")
    activation = manifest["activation"]
    if activation["active"] and not manifest["bindings"].get("working_subtree"):
        problems.append("activation requires bindings.working_subtree (the reviewed public database)")
    reader = activation.get("public_reader")
    if reader is not None and not (isinstance(reader, dict) and reader.get("reviewed_in")):
        problems.append("activation.public_reader must name the review that qualified it (reviewed_in)")
    for a in manifest["artifacts"]:
        if not a["key"]:
            problems.append("an artifact has an empty key")
        if a["key"] in keys:
            problems.append(f"duplicate key {a['key']}")
        keys.add(a["key"])
        if a["class"] not in classes:
            problems.append(f"{a['key']}: unknown class")
        if a["class"] == "B" and (a["public_writer"] != "notion-authored" or a["source_paths"]):
            problems.append(f"{a['key']}: class B must be Notion-authored with no Git source")
        if a["class"] == "A" and a["edition"] != "released":
            problems.append(f"{a['key']}: class A is released-edition only")
        if a["class"] == "A" and a["public_writer"] == "ci" and a["adoption_state"] != "adopted":
            problems.append(f"{a['key']}: CI may own a class A row only after handoff")
        if a["class"] == "W" and a["edition"] != "main-working":
            problems.append(f"{a['key']}: working rows are main-working")
        if a["public_writer"] not in manifest["writers"]:
            problems.append(f"{a['key']}: unknown writer")
    return problems


def expand(manifest, source=None):
    """The explicit artifact rows, each with its edition label. No generated rows."""
    editions = manifest["editions"]
    return [{**a, "edition_label": editions.get(a["edition"], {}).get("label", a["edition"])} for a in manifest["artifacts"]]


def _version(tag):
    return tuple(int(n) for n in tag.lstrip("v").split("."))


def release_problems(manifest, source):
    """The released edition and the 'latest' sentence must follow a new release tag."""
    ed, out = manifest["editions"]["released"], []
    if hasattr(source, "release_tags"):
        newer = sorted((t for t in source.release_tags() if _version(t) > _version(ed["tag"])), key=_version)
        if newer:
            out.append(f"release tag {newer[-1]} is newer than the manifest's {ed['tag']}: update editions.released, "
                       "docs/README.md ('is the latest') and the class A rows in one reviewed commit")
    text = b"".join(source.files("docs/README.md").values()).decode()
    if f"{ed['label']} is the latest" not in text:
        out.append(f"docs/README.md does not say '{ed['label']} is the latest', as the manifest's released edition does")
    return out


def resolve_released(manifest, tag_resolver, require_tag=True):
    """A released edition must resolve to its exact approved commit; a main commit is never relabelled."""
    ed = manifest["editions"]["released"]
    if not ed.get("approved"):
        raise PublisherError("the released edition is not approved")
    resolved = tag_resolver(ed["tag"])
    if resolved is None and require_tag:
        raise PublisherError(f"released tag {ed['tag']} was not found; it must resolve to the approved {ed['commit']}")
    if resolved is not None and resolved != ed["commit"]:
        raise PublisherError(f"released edition {ed['label']} resolves to {resolved}, not the approved {ed['commit']}")
    return ed["commit"]


def tag_note(manifest, tag_resolver):
    """The visible note of the credential-free check when the released tag is absent, else None."""
    ed = manifest["editions"]["released"]
    if tag_resolver(ed["tag"]) is None:
        return f"released tag {ed['tag']} is not present in this checkout; the tag check is {NOT_CHECKED}; only the approved commit is read"
    return None


def git_tag_resolver(repo):
    def resolve(tag):
        r = subprocess.run(["git", "-C", str(repo), "rev-parse", "--verify", "--end-of-options", tag + "^{commit}"],
                           capture_output=True, text=True)
        return r.stdout.strip() if r.returncode == 0 else None
    return resolve


# --- rendering and the page body ------------------------------------------------------------------

def render(artifact, source, label=None, commit=None):
    """Deterministic body: a provenance header, an edition line, then the source files in path order."""
    parts = []
    for prefix in artifact["source_paths"]:
        for path, data in sorted(source.files(prefix).items()):
            parts.append(f"<!-- source: {path} -->\n{data.decode()}")
    if not parts:
        return None
    label = label or artifact.get("edition_label") or artifact["edition"]
    header = f"{HEADER} {artifact['key']} edition: {label} commit: {commit or source.commit} -->\n"
    state = ("Unreleased main working revision; not an installed or released edition." if artifact["edition"] == "main-working"
             else f"Released edition {label}, frozen at its approved commit.")
    return header + state + "\n" + "\n".join(parts)


def body_hash(body):
    # Provenance header carries the commit; the receipt hash covers content only.
    lines = body.split("\n", 1)
    return sha256(lines[1] if body.startswith(HEADER) and len(lines) > 1 else body)


def unrepresentable(body):
    """Why this body cannot be written exactly (one paragraph block per line), or None. Never truncate."""
    lines = body.split("\n")
    if len(lines) > MAX_BLOCKS:
        return f"{len(lines)} lines exceed the {MAX_BLOCKS}-block limit"
    for n, line in enumerate(lines, 1):
        if len(line) > CHUNK * MAX_CHUNKS:
            return f"line {n} is longer than {CHUNK * MAX_CHUNKS} characters"
        bad = next((c for c in line if (ord(c) < 32 and c != "\t") or ord(c) == 127), None)
        if bad:
            return f"line {n} holds the control character U+{ord(bad):04X}"
    return None


def blocks_for(body):
    """One paragraph block per line, a line split into text objects only to respect the 2000-character limit."""
    return [{"object": "block", "type": "paragraph", "paragraph": {"rich_text": [
        {"type": "text", "text": {"content": line[i:i + CHUNK]}} for i in range(0, len(line), CHUNK)]}}
        for line in body.split("\n")]


def block_line(block):
    """The normalised line a block reads back as. Anything but a plain paragraph reads as a marked line."""
    kind = block.get("type")
    text = "".join(t.get("plain_text", "") for t in (block.get(kind) or {}).get("rich_text", []))
    return text if kind == "paragraph" and not block.get("has_children") else f"\x00{kind}:{text}"


def read_back_text(blocks):
    return "\n".join(block_line(b) for b in blocks)


# --- public content comparison (pure) -------------------------------------------------------------

NO_READER = "no qualified public content reader is enabled; a 200 or a receipt row is not proof"


def _squash(text):
    return " ".join(text.split())


def compare_content(expected, observed):
    """Pure. Do the expected lines appear, in order, in the visible text of the public page?"""
    seen, at = _squash(observed), 0
    if not seen:
        return FAILED, "the public page shows no content"
    for line in expected.split("\n"):
        line = _squash(line)
        if not line:
            continue
        found = seen.find(line, at)
        if found < 0:
            return FAILED, f"expected text is not in the public page: {line[:60]!r}"
        at = found + len(line)
    return VERIFIED, "every expected line is in the public page, in order"


def catalogue_lists_key(key, observed):
    """Pure. Does the public catalogue's visible text name this row's Key?"""
    if re.search(rf"(?<![\w.-]){re.escape(key)}(?![\w.-])", observed):
        return VERIFIED, "the public catalogue names the Key"
    return FAILED, "the public catalogue does not name the Key"


class _VisibleText(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self._skip = [], 0

    def handle_starttag(self, tag, attrs):
        self._skip += tag in ("script", "style")

    def handle_endtag(self, tag):
        self._skip -= bool(self._skip and tag in ("script", "style"))

    def handle_data(self, data):
        if not self._skip:
            self.parts.append(data)


def visible_text(markup):
    parser = _VisibleText()
    parser.feed(markup)
    parser.close()
    return " ".join(parser.parts)


class PublicReader:
    """Anonymous reads of public pages. Enabled only by `activation.public_reader` in a reviewed commit.

    No reader is qualified today (whether public Notion HTML contains the body is unknown offline), so
    nothing constructs this in a real run. No credential is ever attached to its requests.
    """

    def __init__(self, base, catalogue_url, opener=None):
        if not base or not catalogue_url:
            raise SetupError("an enabled public reader needs --public-base and --public-catalogue")
        self.base, self.catalogue_url = base.rstrip("/"), catalogue_url
        self._open = opener or urllib.request.urlopen

    def read(self, url):
        request = urllib.request.Request(url, method="GET")
        try:
            with self._open(request, timeout=TIMEOUT) as response:
                status, body = getattr(response, "status", None), response.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as error:
            return FAILED, f"HTTP {error.code}"
        except (urllib.error.URLError, OSError, http.client.HTTPException):
            return FAILED, "no answer"
        return (VERIFIED, visible_text(body)) if status == 200 else (FAILED, f"HTTP {status}")

    def page(self, page_id, expected):
        state, text = self.read(f"{self.base}/{page_id.replace('-', '')}")
        return compare_content(expected, text) if state == VERIFIED else (FAILED, f"the public page was not read ({text})")

    def catalogue(self, key):
        state, text = self.read(self.catalogue_url)
        return catalogue_lists_key(key, text) if state == VERIFIED else (FAILED, f"the public catalogue was not read ({text})")


# --- plan -----------------------------------------------------------------------------------------

NOT_CHECKED = "not checked (unsupported)"


def _hit(a, changed_paths):
    return any(p == pre or (pre.endswith("/") and p.startswith(pre)) for pre in a["source_paths"] for p in changed_paths)


def decide(artifact, source, remote, offline=None):
    """Outcome for one artifact before any write. Returns (outcome, detail, new_hash).

    `remote` is the row as read (or None). `offline` is None when receipts were read, else
    "unknown" (no base), "hit" or "miss" (a mapped path did or did not change since the base).
    """
    writer = artifact["public_writer"]
    if artifact["class"] == "B":
        detail = "Notion-authored Content template edition; never written or repaired"
        if artifact.get("frozen_zip"):
            detail += f" | frozen ZIP hash: {NOT_CHECKED}: no reader hashes the live export"
        return REFUSED_B, detail, None
    if writer == "notion-authored":
        orig = (artifact.get("before_source") or {}).get("original_hash")
        if not orig or remote is None:
            return REFUSED_NOTION, (f"Notion-authored original | newer-original check: {NOT_CHECKED}: "
                                    "no recorded original hash or no readable row, so a later edition is not detected"), None
        if remote.get("actual_hash") is None:
            return UNREADABLE, "Notion-authored original could not be read, so it is not called unchanged", None
        if remote["actual_hash"] != orig:
            return CONFLICT, "a newer original exists in Notion; not overwritten", None
        return REFUSED_NOTION, "Notion-authored original, read and unchanged", None
    if writer != "ci":
        return PENDING_HANDOFF, f"public writer is {writer}; CI writes nothing until the handoff", None
    body = render(artifact, source)
    if body is None:
        if offline:
            return UNKNOWN_NO_RECEIPTS, "no source at this commit; a published row would be retired", None
        if remote is None or remote["status"] == "retired":
            return UNCHANGED, "no source, and nothing to retire", None
        return RETIRED, "no source at this commit", None
    why = unrepresentable(body)
    if why:
        return REFUSED_UNREPRESENTABLE, f"{why}; refused, never truncated", None
    new = body_hash(body)
    if offline:
        if offline == "hit" and artifact["edition"] != "released":
            return WOULD_WRITE, "a mapped source path changed since the base; receipts were not read", new
        if offline == "miss" and artifact["edition"] != "released":
            return NO_SOURCE_CHANGE, "no mapped source path changed since the base", new
        return UNKNOWN_NO_RECEIPTS, "no base or no receipts: whether the row changes is unknown", new
    if remote is None:
        if artifact["class"] == "A":
            return BLOCKED, "no row with this Key; an existing row has none, so a first write would duplicate it", new
        return WRITTEN, "new row", new
    if remote["writer"] != "ci":
        return CONFLICT, f"row is owned by {remote['writer']}", new
    status, actual = remote["status"], remote.get("actual_hash")
    if status in PENDING_LIKE:
        return RESUMED, f"resuming a {status} row", new
    if status not in ("complete", "retired"):
        return CONFLICT, f"row has the status {status!r}, which CI did not set", new
    if actual is None:
        return UNREADABLE, f"the page body could not be read ({remote.get('body_error')}); never treated as unchanged", new
    if actual != remote["receipt_after"]:
        return CONFLICT, "the page body no longer matches CI's receipt: changed elsewhere; not overwritten", new
    if status == "complete" and remote["receipt_after"] == new:
        return UNCHANGED, "page body, source and receipt agree", new
    return WRITTEN, "source changed" if status == "complete" else "source returned for a retired row", new


def plan(manifest, source, transport=None, changed_paths=None, released_source=None, only=None, base=None):
    """Impact diff and per-artifact outcomes. Reads only; never writes.

    `changed_paths` is None when no base was given. Released-edition rows read the frozen released
    source, never the working commit. `only` limits the run to one Key.
    """
    artifacts = expand(manifest)
    if only:
        artifacts = [a for a in artifacts if a["key"] == only]
        if not artifacts:
            raise PublisherError(f"--only {only}: no artifact has this Key")
    rows = []

    def add(a, outcome, detail, new, remote=None):
        rows.append({"key": a["key"], "class": a["class"], "outcome": outcome, "detail": detail, "hash": new, "remote": remote})

    for a in artifacts:
        use = (released_source or source) if a["edition"] == "released" else source
        remote = None
        if transport is not None:
            try:
                remote = transport.get(a["key"])
            except (AccessError, DuplicateKey) as error:
                add(a, BLOCKED, str(error), None)
                continue
            except (UnknownWrite, NotApplied) as error:
                add(a, UNREADABLE, f"the row could not be read: {error}", None)
                continue
        offline = None if transport is not None else ("unknown" if changed_paths is None else
                                                      "hit" if _hit(a, changed_paths) else "miss")
        outcome, detail, new = decide(a, use, remote, offline)
        add(a, outcome, detail, new, remote)
    known = {r["key"] for r in rows}
    if transport is not None and not only:
        try:
            remote_keys = transport.list_keys()
        except (AccessError, UnknownWrite, NotApplied):
            remote_keys = []   # the same problem is already visible on the rows
        counts = Counter(remote_keys)
        for key in sorted(counts):
            if key == "":
                rows.append({"key": "(empty Key)", "class": "W", "outcome": BLOCKED, "hash": None, "remote": None,
                             "detail": f"{counts[key]} row(s) have no Key; not touched"})
            elif counts[key] > 1 and key not in known:
                rows.append({"key": key, "class": "W", "outcome": BLOCKED, "hash": None, "remote": None,
                             "detail": f"{counts[key]} rows share this Key; not touched"})
            elif key not in known:
                row = transport.get(key)
                if row and row["writer"] == "ci":
                    new_key = manifest.get("renames", {}).get(key)
                    if row["status"] == "retired":
                        rows.append({"key": key, "class": "W", "outcome": UNCHANGED, "detail": "already retired", "hash": None, "remote": row})
                    else:
                        rows.append({"key": key, "class": "W", "outcome": RETIRED, "hash": None, "remote": row,
                                     "detail": f"renamed to {new_key}" if new_key else "no longer in the source"})
    paths = changed_paths or []
    unmapped = [p for p in paths if not any(_hit(a, [p]) for a in expand(manifest))]
    skills = sorted({"/".join(p.split("/")[:2]) for p in unmapped if p.startswith("skills/")})
    return {"commit": source.commit, "rows": sorted(rows, key=lambda r: r["key"]), "base": base,
            "unmapped_changes": [p for p in unmapped if not p.startswith("skills/")], "changed_skills": skills,
            "receipts_consulted": transport is not None, "notes": [],
            "affected_set": sorted(r["key"] for r in rows if r["outcome"] in (WRITTEN, RESUMED))}


def failing(result):
    """Rows that leave a run red: anything but a write, a no-op, a resume, a retirement or a recorded refusal."""
    return [r for r in result["rows"] if r["outcome"] not in OK_OUTCOMES]


def reconciliation_text(result, active=False, title="Documentation reconciliation"):
    """The mandatory visible result. It says only what the run could observe."""
    rows = result["rows"]
    counts = Counter(r["outcome"] for r in rows)
    lines = [f"# {title}", "", f"Frozen source commit: `{result['commit']}`",
             f"Publisher active: {'yes' if active else 'no (source and fixtures only)'}"]
    if result.get("base"):
        lines.append(f"Base: `{result['base']}`")
    lines += [f"Note: {n}" for n in result.get("notes", [])]
    lines.append("")
    if not result.get("receipts_consulted", True):
        lines.append("Receipts were not read (credential-free check): no row below was written, and none is known to be unchanged.")
        lines.append("")
        would = counts[WOULD_WRITE]
        stuck = [r for r in rows if r["outcome"] == REFUSED_UNREPRESENTABLE]
        if stuck:
            lines.append(f"Result: {len(stuck)} row(s) cannot be written exactly and would be refused.")
        elif would:
            lines.append(f"Result: {would} CI-owned row(s) would be written if CI were active; nothing was written.")
        elif counts[UNKNOWN_NO_RECEIPTS]:
            lines.append("Result: the impact is unknown (no base and no receipts); nothing was written.")
        else:
            lines.append("Result: no mapped source path changed since the base (a valid no-op).")
    else:
        bad = failing(result)
        if bad:
            held = [r for r in bad if r["outcome"] in (UNSUPPORTED, HELD)]
            lines.append(f"Result: HOLD. {len(bad)} row(s) are not complete and stay pending; the run exits non-zero.")
            if held:
                lines.append("With no qualified public content reader, public access and catalogue membership are unsupported, "
                             "so no row can reach complete.")
        elif counts[WRITTEN] or counts[RESUMED] or counts[RETIRED]:
            lines.append("Result: the affected set was written and read back.")
        else:
            lines.append("Result: no documentation impact (a valid no-op).")
        if result.get("affected_set"):
            lines.append("Affected set: " + ", ".join(result["affected_set"]))
    lines += ["", "| Outcome | Artifacts |", "| --- | --- |"]
    lines += [f"| {k} | {v} |" for k, v in sorted(counts.items())]
    quiet = (UNCHANGED, PENDING_HANDOFF, REFUSED_B, REFUSED_NOTION, NO_SOURCE_CHANGE, UNKNOWN_NO_RECEIPTS)
    shown = [r for r in rows if r["outcome"] not in quiet or NOT_CHECKED in r["detail"]]
    if shown:
        lines += ["", "| Key | Class | Outcome | Detail |", "| --- | --- | --- | --- |"]
        lines += [f"| {r['key']} | {r['class']} | {r['outcome']} | {r['detail']} |" for r in shown]
    if result["unmapped_changes"]:
        lines += ["", "Changed paths that map to no artifact (no write): " + ", ".join(f"`{p}`" for p in result["unmapped_changes"])]
    if result.get("changed_skills"):
        lines += ["", "Changed skills, pending release propagation (the public skill packets change only at a new tagged "
                      "release; nothing is written for them): " + ", ".join(f"`{s}`" for s in result["changed_skills"])]
    pending = counts[PENDING_HANDOFF]
    if pending:
        lines += ["", f"{pending} artifact(s) are pending handoff to CI and receive no write."]
    return "\n".join(lines) + "\n"


# --- publishing -----------------------------------------------------------------------------------

def _mark(transport, key, status):
    """Best effort: a failed mark leaves the row pending-like, which every resume path accepts."""
    try:
        transport.set_status(key, status)
    except PublisherError:
        pass


def _write_row(transport, a, row, use, run_id):
    """Mark pending, then upsert. Returns True when the row's body is now (or already was) the source."""
    remote, digest = row["remote"], row["hash"]
    row["page_commit"] = use.commit
    if remote and remote["status"] in PENDING_LIKE and remote.get("actual_hash") == digest:
        # The content landed under the earlier attempt's commit, which the row records and the page header names.
        row["page_commit"] = remote["commit"] or use.commit
        row["detail"] = "the earlier write is on the page; read back below, not retried"
        return True
    # A resume keeps the original before-source; only a verified row's receipt becomes the next before-source.
    before = (remote.get("receipt_before") or None) if remote and remote["status"] in PENDING_LIKE \
        else (remote["receipt_after"] if remote else None)
    try:
        if remote:
            transport.set_status(a["key"], "pending", receipt_before=before, receipt_after=digest, commit=use.commit, run_id=run_id)
        transport.upsert(a["key"], render(a, use), digest, "ci", use.commit, receipt_before=before, receipt_after=digest)
    except UnknownWrite as error:
        row["outcome"], row["detail"] = UNKNOWN_WRITE, f"{error}; read back before any retry"
        _mark(transport, a["key"], "unknown-write")
    except PartialWrite as error:
        row["outcome"], row["detail"] = PARTIAL, f"{error}; resumes on the same Key"
        _mark(transport, a["key"], "partial")
    except AccessError as error:
        row["outcome"], row["detail"] = BLOCKED, str(error)
    except NotApplied as error:
        row["outcome"], row["detail"] = REJECTED, f"{error}; the row stays pending"
    else:
        return True
    return False


def _read_back(transport, key, row, expected):
    """Body, public page and catalogue, as one three-state result."""
    try:
        got = transport.get(key)
        if got is None:
            return FAILED, "the row is not there"
        if got.get("actual_hash") is None:
            return FAILED, f"the page body could not be read ({got.get('body_error')})"
        if got["actual_hash"] != row["hash"]:
            return FAILED, "the page body read back differs from the source"
        states = [transport.verify_public(key, expected), transport.verify_catalogue(key)]
    except PublisherError as error:
        return FAILED, str(error)
    detail = "; ".join(d for _s, d in states)
    if any(s == FAILED for s, _d in states):
        return FAILED, detail
    return (UNSUPPORTED, detail) if any(s == UNSUPPORTED for s, _d in states) else (VERIFIED, detail)


def publish(manifest, source, transport, run_id, tag_resolver, allow_fixture=False, released_source=None, only=None):
    """One serialized, idempotent run. Returns the plan rows with their final outcomes.

    The released tag is resolved here, not assumed. Order per CI-owned row: mark pending (before/after
    recorded; a new row is created pending), upsert the body, write BodyHash last. The affected set is
    declared by the plan; every member is read back (page body, public page, catalogue) and none is
    complete until all pass. A failure stays visible and retryable on the same Key.
    """
    if not (manifest["activation"]["active"] or allow_fixture):
        raise PublisherError("the publisher is not active; refusing to write")
    resolve_released(manifest, tag_resolver)
    transport.claim_run(run_id)
    try:
        result = plan(manifest, source, transport, released_source=released_source, only=only)
        arts = {a["key"]: a for a in expand(manifest)}
        rows = {r["key"]: r for r in result["rows"]}
        use = lambda a: (released_source or source) if a["edition"] == "released" else source
        for row in result["rows"]:
            if row["outcome"] == RETIRED:
                try:
                    transport.set_status(row["key"], "retired", run_id=run_id)
                except AccessError as error:
                    row["outcome"], row["detail"] = BLOCKED, str(error)
                except PublisherError as error:
                    row["outcome"], row["detail"] = UNKNOWN_WRITE, f"{error}; read back before any retry"
        declared = result["affected_set"]
        wrote = [k for k in declared if _write_row(transport, arts[k], rows[k], use(arts[k]), run_id)]
        verdict = {k: _read_back(transport, k, rows[k], render(arts[k], use(arts[k]), commit=rows[k]["page_commit"])) for k in wrote}
        # A CI-owned row that failed at plan time (conflict, unreadable, blocked, unrepresentable) is outside the
        # write set but inside the coherent set: it holds the rest.
        stopped = [k for k, r in rows.items() if k in arts and arts[k]["public_writer"] == "ci" and k not in declared
                   and r["outcome"] not in OK_OUTCOMES]
        if not stopped and len(wrote) == len(declared) and all(state == VERIFIED for state, _d in verdict.values()):
            for key in declared:
                try:
                    transport.set_status(key, "complete", receipt_after=rows[key]["hash"], commit=rows[key]["page_commit"], run_id=run_id)
                except PublisherError as error:
                    rows[key]["outcome"], rows[key]["detail"] = BLOCKED, f"could not mark complete: {error}"
        else:
            for key, (state, detail) in verdict.items():
                row = rows[key]
                if state == FAILED:
                    row["outcome"], row["detail"] = PARTIAL, f"read-back did not match: {detail}; left pending and retryable"
                    _mark(transport, key, "partial")
                elif state == UNSUPPORTED:
                    row["outcome"], row["detail"] = UNSUPPORTED, f"HOLD: {detail}; left pending"
                else:
                    row["outcome"], row["detail"] = HELD, ("held pending: " + (f"{stopped[0]} failed before the write" if stopped
                                                                else "another member of the affected set did not pass"))
        result["frozen"] = check_frozen(manifest, transport)
        for finding in result["frozen"]:
            row = rows.get(finding["key"])
            if row and finding["state"] == FAILED:
                row["outcome"], row["detail"] = CONFLICT, f"frozen ZIP {finding['detail']}"
            elif row:
                row["detail"] = f"Notion-authored Content template edition; never written or repaired | frozen ZIP hash: {finding['detail']}"
        return result
    finally:
        transport.release_run(run_id)


def check_frozen(manifest, transport):
    """Class B frozen exports: verified, failed (a mismatch) or unsupported (could not be hashed). Never repairs."""
    findings = []
    for a in manifest["artifacts"]:
        frozen = a.get("frozen_zip")
        if not frozen:
            continue
        got = transport.download_hash(a["key"])
        if got is None:
            state, detail = UNSUPPORTED, f"{NOT_CHECKED}: the export could not be hashed"
        elif got != frozen["sha256"]:
            state, detail = FAILED, "hash differs from the recorded one; reported, not repaired"
        else:
            state, detail = VERIFIED, "matches the recorded hash"
        findings.append({"key": a["key"], "state": state, "detail": detail, "expected": frozen["sha256"], "got": got,
                         "action": "reported; not repaired"})
    return findings


# --- Notion transport -----------------------------------------------------------------------------

class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """urllib would resend Authorization to a redirect target on another host; never follow one."""

    def redirect_request(self, *args, **kwargs):
        return None


API_OPENER = urllib.request.build_opener(_NoRedirect).open
PROPERTY_NAMES = {"key": "Key", "writer": "Writer", "status": "Status", "receipt_before": "ReceiptBefore",
                  "receipt_after": "ReceiptAfter", "body_hash": "BodyHash", "commit": "Commit"}


class NotionTransport:
    """Minimal official-API transport. Fail-closed: no credential, no transport.

    It has run only against the in-memory stand-in in fixture_transport.py, never against Notion.
    There is no run lock here: serialization rests on the workflow's concurrency group alone.
    Without an enabled `public_reader`, public access and catalogue membership are `unsupported`.
    """

    def __init__(self, database_id, opener=None, env=None, public_reader=None, api_base=API_BASE):
        token = (env if env is not None else os.environ).get(TOKEN_ENV, "")
        if not token or not database_id:
            raise MissingCredential(f"{TOKEN_ENV} and a public-subtree database id are required; nothing was sent")
        self._token, self.database_id, self.api_base = token, database_id, api_base
        self.public_reader, self._open, self._title = public_reader, opener or API_OPENER, None

    def _request(self, method, path, payload=None):
        data = json.dumps(payload).encode() if payload is not None else None
        req = urllib.request.Request(self.api_base + path, data=data, method=method, headers={
            "Authorization": f"Bearer {self._token}", "Notion-Version": NOTION_VERSION, "Content-Type": "application/json"})
        try:
            with self._open(req, timeout=TIMEOUT) as response:
                raw = response.read() or b"{}"
        except urllib.error.HTTPError as error:
            if error.code in (401, 403, 404):
                raise AccessError(f"Notion refused the request ({error.code}); the connection is missing, expired or not granted") from None
            if error.code in (400, 429):
                raise NotApplied(f"Notion answered {error.code} (rejected or rate-limited)") from None
            if 300 <= error.code < 400:
                raise UnknownWrite(f"Notion redirected the request ({error.code}); the redirect was not followed") from None
            raise UnknownWrite(f"Notion answered {error.code}") from None
        except (urllib.error.URLError, OSError, http.client.HTTPException):   # timeout, reset, RemoteDisconnected
            raise UnknownWrite("no answer from Notion") from None
        try:
            return json.loads(raw)
        except ValueError:
            raise UnknownWrite("Notion answered with a body that is not JSON") from None

    def _schema(self):
        """The title property is read from the database, never assumed; the other properties must exist."""
        if self._title is None:
            props = self._request("GET", f"databases/{self.database_id}").get("properties", {})
            title = [n for n, p in props.items() if p.get("type") == "title"]
            missing = [n for n in PROPERTY_NAMES.values() if props.get(n, {}).get("type") != "rich_text"]
            if len(title) != 1 or missing:
                raise SetupError(f"the database needs one title property and rich-text properties {missing or 'as listed'}; "
                                 f"found title properties {title}")
            self._title = title[0]
        return self._title

    def _find(self, key):
        self._schema()
        found = self._request("POST", f"databases/{self.database_id}/query",
                              {"filter": {"property": "Key", "rich_text": {"equals": key}}, "page_size": 2}).get("results", [])
        if len(found) > 1:
            raise DuplicateKey(f"more than one row has the Key {key}; refusing to choose one")
        return found[0] if found else None

    def _children(self, page_id):
        blocks, cursor = [], None
        while True:
            page = self._request("GET", f"blocks/{page_id}/children?page_size=100" + (f"&start_cursor={cursor}" if cursor else ""))
            blocks += page.get("results", [])
            if not page.get("has_more"):
                return blocks
            cursor = page["next_cursor"]

    @staticmethod
    def _text(props, name):
        return "".join(t.get("plain_text", "") for t in props.get(name, {}).get("rich_text", []))

    def get(self, key):
        """The row's properties plus the hash of the page body as actually read (None if it could not be)."""
        page = self._find(key)
        if page is None:
            return None
        props = page["properties"]
        row = {"page_id": page["id"], **{field: self._text(props, name) for field, name in PROPERTY_NAMES.items()}}
        try:
            row["actual_hash"], row["body_error"] = body_hash(read_back_text(self._children(page["id"]))), None
        except (UnknownWrite, NotApplied) as error:
            row["actual_hash"], row["body_error"] = None, str(error)
        return row

    def list_keys(self):
        self._schema()
        out, cursor = [], None
        while True:
            page = self._request("POST", f"databases/{self.database_id}/query",
                                 {"page_size": 100, **({"start_cursor": cursor} if cursor else {})})
            out += [self._text(r["properties"], "Key") for r in page["results"]]
            if not page.get("has_more"):
                return out
            cursor = page["next_cursor"]

    def _props(self, **fields):
        return {PROPERTY_NAMES[k]: {"rich_text": [{"type": "text", "text": {"content": str(v)}}]}
                for k, v in fields.items() if v is not None and k in PROPERTY_NAMES}

    def upsert(self, key, body, digest, writer, commit, receipt_before=None, receipt_after=None):
        """Create the row already pending, or replace an existing row's children; BodyHash is written last."""
        title, existing = self._schema(), self._find(key)
        blocks = blocks_for(body)
        batches = [blocks[i:i + BATCH] for i in range(0, len(blocks), BATCH)]
        if existing is None:
            props = {title: {"title": [{"type": "text", "text": {"content": key}}]},
                     **self._props(key=key, writer=writer, status="pending", commit=commit,
                                   receipt_before=receipt_before, receipt_after=receipt_after)}
            page_id = self._request("POST", "pages", {"parent": {"database_id": self.database_id}, "properties": props,
                                                      "children": batches[0]})["id"]
            old, rest, changed = [], batches[1:], True
        else:
            page_id = existing["id"]
            self._request("PATCH", f"pages/{page_id}", {"properties": self._props(key=key, writer=writer, commit=commit)})
            old, rest, changed = [b["id"] for b in self._children(page_id)], batches, False
        try:
            for block_id in old:
                self._request("DELETE", f"blocks/{block_id}")
                changed = True
            for batch in rest:
                self._request("PATCH", f"blocks/{page_id}/children", {"children": batch})
                changed = True
        except (UnknownWrite, NotApplied) as error:
            if changed:
                raise PartialWrite(f"some of the page body changed before: {error}") from None
            raise
        try:
            self._request("PATCH", f"pages/{page_id}", {"properties": self._props(body_hash=digest)})
        except NotApplied as error:
            raise UnknownWrite(f"the body was written but BodyHash was not recorded: {error}") from None

    def set_status(self, key, status, **fields):
        existing = self._find(key)
        if existing is None:
            raise PublisherError(f"no row with the Key {key} to mark {status}")
        self._request("PATCH", f"pages/{existing['id']}", {"properties": self._props(status=status, **fields)})

    def verify_public(self, key, expected):
        if self.public_reader is None:
            return UNSUPPORTED, NO_READER
        page = self._find(key)
        return (FAILED, "the row is not there") if page is None else self.public_reader.page(page["id"], expected)

    def verify_catalogue(self, key):
        return (UNSUPPORTED, NO_READER) if self.public_reader is None else self.public_reader.catalogue(key)

    def claim_run(self, run_id):
        return None

    def release_run(self, run_id):
        return None

    def download_hash(self, key):
        return None   # no reader hashes the live frozen export: reported as unsupported, never as a match


# --- command line ---------------------------------------------------------------------------------

def build_reader(manifest, base, catalogue, opener=None):
    if manifest["activation"].get("public_reader") is None:
        if base or catalogue:
            raise SetupError("--public-base or --public-catalogue is set but no public reader is enabled in the manifest; "
                             "refusing unused configuration")
        return None
    return PublicReader(base, catalogue, opener=opener)


def _emit(text, out):
    if out:
        Path(out).write_text(text)
    sys.stdout.write(text)


def main(argv=None, *, manifest=None, opener=None, env=None, tag_resolver=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = parser.add_subparsers(dest="command", required=True)
    rec = sub.add_parser("reconcile", help="credential-free reconciliation of the manifest against a commit")
    rec.add_argument("--repo", default=str(HERE.parent))
    rec.add_argument("--ref", default="HEAD")
    rec.add_argument("--base")
    rec.add_argument("--only", help="limit the result to one Key")
    rec.add_argument("--out")
    rec.add_argument("--check", action="store_true", help="exit non-zero on a manifest or source problem")
    pub = sub.add_parser("publish", help="write CI-owned rows; fails closed without activation and a credential")
    pub.add_argument("--repo", default=str(HERE.parent))
    pub.add_argument("--ref", default="HEAD")
    pub.add_argument("--database")
    pub.add_argument("--public-base", default=os.environ.get("OSM_PUBLIC_DOCS_BASE"))
    pub.add_argument("--public-catalogue", default=os.environ.get("OSM_PUBLIC_DOCS_CATALOGUE"))
    pub.add_argument("--run-id", default=os.environ.get("GITHUB_RUN_ID", "local"))
    pub.add_argument("--only", help="the one-row route for a bounded proof: publish only this Key")
    pub.add_argument("--out", help="write the post-publish result here, also when the run fails")
    args = parser.parse_args(argv)
    manifest = manifest or load_manifest()
    problems = validate_manifest(manifest)
    source = GitSource(args.repo, args.ref)
    released = manifest["editions"]["released"]
    if args.command == "reconcile":
        resolve, notes = git_tag_resolver(args.repo), []
        try:
            resolve_released(manifest, resolve, require_tag=False)
        except PublisherError as error:
            problems.append(str(error))
        notes += [n for n in [tag_note(manifest, resolve)] if n]
        problems += release_problems(manifest, source)
        frozen = GitSource(args.repo, released["commit"])
        for a in manifest["artifacts"]:
            if a["edition"] == "released":
                for prefix in a["source_paths"]:
                    if not frozen.files(prefix):
                        problems.append(f"{a['key']}: nothing at {prefix} in {released['label']}")
        try:
            changed = source.changed_paths(args.base) if args.base and set(args.base) != {"0"} else None
            result = plan(manifest, source, None, changed, released_source=frozen, only=args.only, base=args.base)
        except PublisherError as error:
            print(f"ERROR: {error}")
            return 2
        result["notes"] = notes
        _emit(reconciliation_text(result, manifest["activation"]["active"]), args.out)
        for p in problems:
            print(f"PROBLEM: {p}")
        return 1 if problems and args.check else 0
    if problems:
        print("manifest problems:", *problems, sep="\n  ")
        return 1
    title = "Documentation publication"
    try:
        if manifest["activation"]["active"] and args.database != manifest["bindings"]["working_subtree"]:
            raise SetupError("--database is not the reviewed working subtree recorded in the manifest")
        transport = NotionTransport(args.database, opener=opener, env=env,
                                    public_reader=build_reader(manifest, args.public_base, args.public_catalogue, opener))
        result = publish(manifest, source, transport, args.run_id, tag_resolver or git_tag_resolver(args.repo),
                         released_source=GitSource(args.repo, released["commit"]), only=args.only)
    except PublisherError as error:
        _emit(f"# {title}\n\nFAIL-CLOSED: {error}\n\nNothing was written.\n", args.out)
        return 3
    except Exception as error:
        _emit(f"# {title}\n\nUNEXPECTED ERROR: {type(error).__name__}. The run did not finish; read the job log.\n", args.out)
        raise
    _emit(reconciliation_text(result, True, title), args.out)
    return 4 if failing(result) else 0


if __name__ == "__main__":
    sys.exit(main())
