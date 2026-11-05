#!/usr/bin/env python3
"""Source-only publisher for the public OSM documentation projection.

Not shipped in the package and not active. It builds a per-artifact impact diff from a frozen
source commit, always returns a visible reconciliation result (a no-op is valid), and writes
only artifacts whose public writer is CI. Everything else gets a visible refusal and no write.

Standard library only. The only transport that is exercised here is the in-memory fixture in
fixture_transport.py; the Notion transport below is unexercised source and stays fail-closed
until the manifest says `activation.active` and a dedicated credential exists.
"""

import argparse
import fnmatch
import hashlib
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "manifest.json"
TOKEN_ENV = "OSM_PUBLIC_DOCS_TOKEN"
NOTION_VERSION = "2022-06-28"

# Outcomes. Only `written`, `unchanged` and `resumed` are successes of a CI-owned row.
WRITTEN, UNCHANGED, RESUMED = "written", "unchanged", "resumed"
PENDING_HANDOFF, REFUSED_B, REFUSED_NOTION = "pending-handoff", "refused-class-B", "refused-notion-authored"
CONFLICT, BLOCKED, UNKNOWN_WRITE, RETIRED, PARTIAL = "conflict", "blocked", "unknown-write", "retired", "partial"


class PublisherError(Exception):
    pass


class MissingCredential(PublisherError):
    pass


class AccessError(PublisherError):
    """The connection is missing, expired or not granted for the public subtree."""


class UnknownWrite(PublisherError):
    """A write may or may not have happened; read it back before any retry."""


class PartialWrite(PublisherError):
    """Some children were written; the row stays pending and is resumed on the same Key."""


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

    def skill_names(self):
        names = self._git("ls-tree", "--name-only", self.commit, "skills/").split("\n")
        return sorted(n.split("/", 1)[1] for n in names if n and self.exists(n + "/SKILL.md"))

    def changed_paths(self, base):
        out = self._git("diff", "--name-only", "-z", base, self.commit).split("\0")
        return sorted(p for p in out if p)


class DictSource:
    """A fixture source; `files` maps path to text."""

    def __init__(self, files, commit="fixture"):
        self._files = {k: v.encode() if isinstance(v, str) else v for k, v in files.items()}
        self.commit = commit

    def exists(self, path):
        return path in self._files

    def files(self, prefix):
        return {k: v for k, v in sorted(self._files.items()) if k == prefix or k.startswith(prefix)}

    def skill_names(self):
        return sorted({k.split("/")[1] for k in self._files if k.startswith("skills/") and k.endswith("/SKILL.md")})


# --- manifest -------------------------------------------------------------------------------------

def load_manifest(path=MANIFEST):
    return json.loads(Path(path).read_text())


def validate_manifest(manifest):
    """Static rules. Returns a list of problems; empty means the manifest is consistent."""
    problems, keys = [], set()
    classes = set(manifest["classes"])
    for kind in manifest.get("ci_inputs", []):
        if kind["kind"] not in {"git-commit", "public-edition-block", "ci-receipt"}:
            problems.append(f"ci input outside the public sources: {kind['kind']}")
    if "C" in {a.get("class") for a in manifest["artifacts"]}:
        problems.append("class C (private control) must not appear in the manifest")
    for a in manifest["artifacts"]:
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


def expand(manifest, source):
    """Concrete artifact list for a source: explicit rows plus generated skill rows."""
    rows = [dict(a) for a in manifest["artifacts"]]
    for gen in manifest.get("generators", []):
        for name in source.skill_names():
            row = {k: v for k, v in gen.items() if k not in ("match", "key", "source_paths")}
            row["key"] = gen["key"].format(name=name)
            row["owner"] = "git"
            row["source_paths"] = [p.format(name=name) for p in gen["source_paths"]]
            rows.append(row)
    return rows


def resolve_released(manifest, tag_resolver):
    """A released edition must resolve to its exact approved commit; a main commit is never relabelled."""
    ed = manifest["editions"]["released"]
    if not ed.get("approved"):
        raise PublisherError("the released edition is not approved")
    resolved = tag_resolver(ed["tag"])
    if resolved is not None and resolved != ed["commit"]:
        raise PublisherError(f"released edition {ed['label']} resolves to {resolved}, not the approved {ed['commit']}")
    return ed["commit"]


def git_tag_resolver(repo):
    def resolve(tag):
        r = subprocess.run(["git", "-C", str(repo), "rev-parse", "--verify", "--end-of-options", tag + "^{commit}"],
                           capture_output=True, text=True)
        return r.stdout.strip() if r.returncode == 0 else None
    return resolve


# --- rendering ------------------------------------------------------------------------------------

def render(artifact, source):
    """Deterministic body for an artifact: its source files in path order under a provenance header."""
    parts = []
    for prefix in artifact["source_paths"]:
        for path, data in sorted(source.files(prefix).items()):
            parts.append(f"<!-- source: {path} -->\n{data.decode()}")
    if not parts:
        return None
    header = f"<!-- osm-doc-key: {artifact['key']} edition: {artifact['edition']} commit: {source.commit} -->\n"
    return header + "\n".join(parts)


def body_hash(body):
    # Provenance header carries the commit; the receipt hash covers content only.
    lines = body.split("\n", 1)
    return sha256(lines[1] if body.startswith("<!-- osm-doc-key:") and len(lines) > 1 else body)


# --- plan -----------------------------------------------------------------------------------------

def decide(artifact, source, remote):
    """Outcome for one artifact before any write. Returns (outcome, detail, new_hash)."""
    writer = artifact["public_writer"]
    if artifact["class"] == "B":
        return REFUSED_B, "Notion-authored Content template edition; never written or repaired", None
    if writer == "notion-authored":
        detail = "Notion-authored original"
        orig = (artifact.get("before_source") or {}).get("original_hash")
        if remote is not None and orig and remote.get("body_hash") != orig:
            return CONFLICT, "a newer original exists in Notion; not overwritten", None
        return REFUSED_NOTION, detail, None
    if writer != "ci":
        return PENDING_HANDOFF, f"public writer is {writer}; CI writes nothing until the handoff", None
    body = render(artifact, source)
    if body is None:
        return RETIRED if remote else UNCHANGED, "no source at this commit", None
    new = body_hash(body)
    if remote is None:
        return WRITTEN, "new row", new
    if remote["writer"] != "ci":
        return CONFLICT, f"row is owned by {remote['writer']}", new
    if remote["status"] == "complete" and remote["body_hash"] != remote["receipt_after"]:
        return CONFLICT, "a CI-owned row was changed by another writer; not overwritten", new
    if remote["status"] == "complete" and remote["receipt_after"] == new:
        return UNCHANGED, "source and receipt agree", new
    if remote["status"] in ("pending", "partial", "unknown-write"):
        return RESUMED, f"resuming a {remote['status']} row", new
    return WRITTEN, "source changed", new


def plan(manifest, source, transport=None, changed_paths=(), released_source=None):
    """Impact diff and per-artifact outcomes. Reads only; never writes.

    Released-edition rows read the frozen released source, never the working commit.
    """
    rows = []
    for a in expand(manifest, source):
        use = (released_source or source) if a["edition"] == "released" else source
        remote = None
        if transport is not None:
            try:
                remote = transport.get(a["key"])
            except AccessError as error:
                rows.append({"key": a["key"], "class": a["class"], "outcome": BLOCKED, "detail": str(error), "hash": None})
                continue
        outcome, detail, new = decide(a, use, remote)
        rows.append({"key": a["key"], "class": a["class"], "outcome": outcome, "detail": detail, "hash": new})
    # Retirement and rename: a remote CI row whose key no longer expands from the source.
    known = {r["key"] for r in rows}
    if transport is not None:
        try:
            remote_keys = transport.list_keys()
        except AccessError:
            remote_keys = []   # access problems are already visible as blocked rows
        for key in remote_keys:
            if key not in known and transport.get(key)["writer"] == "ci":
                new_key = manifest.get("renames", {}).get(key)
                rows.append({"key": key, "class": "W", "outcome": RETIRED,
                             "detail": f"renamed to {new_key}" if new_key else "no longer in the source", "hash": None})
    mapped = {pre for a in expand(manifest, source) for pre in a["source_paths"]}
    unmapped = [p for p in changed_paths if not any(p == m or p.startswith(m) for m in mapped)]
    return {"commit": source.commit, "rows": sorted(rows, key=lambda r: r["key"]), "unmapped_changes": unmapped,
            "receipts_consulted": transport is not None}


def reconciliation_text(result, active=False):
    """The mandatory visible reconciliation result. A no-op reads as such."""
    rows = result["rows"]
    counts = {}
    for r in rows:
        counts[r["outcome"]] = counts.get(r["outcome"], 0) + 1
    lines = ["# Documentation reconciliation", "",
             f"Frozen source commit: `{result['commit']}`",
             f"Publisher active: {'yes' if active else 'no (source and fixtures only)'}", ""]
    changed = [r for r in rows if r["outcome"] in (WRITTEN, RESUMED, RETIRED, CONFLICT, BLOCKED, UNKNOWN_WRITE, PARTIAL)]
    if not result.get("receipts_consulted", True):
        lines.append("Receipts were not consulted (credential-free check), so CI-owned rows show as a first delivery.")
        lines.append("")
        lines.append(f"Result: {len(changed)} CI-owned row(s) would be delivered; nothing was written." if changed
                     else "Result: no CI-owned row would be delivered (a valid no-op).")
    elif not changed:
        lines.append("Result: no documentation impact (a valid no-op).")
    else:
        lines.append("Result: documentation impact found.")
    lines += ["", "| Outcome | Artifacts |", "| --- | --- |"]
    lines += [f"| {k} | {v} |" for k, v in sorted(counts.items())]
    if changed:
        lines += ["", "| Key | Class | Outcome | Detail |", "| --- | --- | --- | --- |"]
        lines += [f"| {r['key']} | {r['class']} | {r['outcome']} | {r['detail']} |" for r in changed]
    if result["unmapped_changes"]:
        lines += ["", "Changed paths that map to no artifact (no write): " + ", ".join(f"`{p}`" for p in result["unmapped_changes"])]
    pending = [r for r in rows if r["outcome"] == PENDING_HANDOFF]
    if pending:
        lines += ["", f"{len(pending)} artifact(s) are pending handoff to CI and receive no write."]
    return "\n".join(lines) + "\n"


# --- publishing -----------------------------------------------------------------------------------

def publish(manifest, source, transport, run_id, allow_fixture=False, released_source=None):
    """One serialized, idempotent run. Returns the plan rows with their final outcomes.

    Order per CI-owned row: mark pending (before/after recorded), upsert by Key, then read the whole
    affected set back; a row is complete only after that coherent read-back. A failure stays visible
    and retryable on the same Key.
    """
    if not (manifest["activation"]["active"] or allow_fixture):
        raise PublisherError("the publisher is not active; refusing to write")
    transport.claim_run(run_id)
    try:
        result = plan(manifest, source, transport, released_source=released_source)
        arts = {a["key"]: a for a in expand(manifest, source)}
        written = []
        for row in result["rows"]:
            if row["outcome"] not in (WRITTEN, RESUMED):
                if row["outcome"] == RETIRED and row["key"] not in arts:
                    transport.set_status(row["key"], "retired", run_id=run_id)
                continue
            a = arts[row["key"]]
            use = (released_source or source) if a["edition"] == "released" else source
            body = render(a, use)
            remote = transport.get(a["key"])
            before = remote["receipt_after"] if remote else None
            if remote and remote["status"] in ("pending", "partial", "unknown-write") and remote["body_hash"] == row["hash"]:
                # The earlier write did land: read it back instead of retrying.
                transport.set_status(a["key"], "complete", receipt_after=row["hash"], commit=use.commit, run_id=run_id)
                row["outcome"], row["detail"] = RESUMED, "earlier write read back; no retry"
                written.append(a["key"])
                continue
            transport.set_status(a["key"], "pending", receipt_before=before, receipt_after=row["hash"],
                                 commit=use.commit, run_id=run_id)
            try:
                transport.upsert(a["key"], body, body_hash(body), writer="ci", commit=use.commit)
            except UnknownWrite as error:
                row["outcome"], row["detail"] = UNKNOWN_WRITE, f"{error}; read back before any retry"
                transport.set_status(a["key"], "unknown-write", run_id=run_id)
                continue
            except PartialWrite as error:
                row["outcome"], row["detail"] = PARTIAL, f"{error}; resumes on the same Key"
                transport.set_status(a["key"], "partial", run_id=run_id)
                continue
            except AccessError as error:
                row["outcome"], row["detail"] = BLOCKED, str(error)
                continue
            written.append(a["key"])
        # Coherent affected-set read-back before anything is called complete.
        for key in written:
            row = next(r for r in result["rows"] if r["key"] == key)
            got = transport.get(key)
            ok = (got is not None and got["body_hash"] == row["hash"] and transport.anonymous_ok(key)
                  and transport.catalogue_lists(key))
            if ok:
                transport.set_status(key, "complete", receipt_after=row["hash"], commit=got["commit"], run_id=run_id)
            else:
                row["outcome"], row["detail"] = PARTIAL, "read-back did not match; left pending and retryable"
        return result
    finally:
        transport.release_run(run_id)


def check_frozen(manifest, transport):
    """Report a class B frozen export whose hash differs from the recorded one. Never repairs."""
    findings = []
    for a in manifest["artifacts"]:
        frozen = a.get("frozen_zip")
        if frozen:
            got = transport.download_hash(a["key"])
            if got != frozen["sha256"]:
                findings.append({"key": a["key"], "expected": frozen["sha256"], "got": got, "action": "reported; not repaired"})
    return findings


# --- Notion transport (unexercised source) --------------------------------------------------------

class NotionTransport:
    """Minimal official-API transport. Fail-closed: no credential, no transport.

    Unexercised: nothing here has been run against Notion. It exists so the activation candidate
    has the call shapes reviewed; the first bounded live proof is still outstanding.
    """

    def __init__(self, database_id, opener=None, env=None, public_base=None):
        token = (env if env is not None else os.environ).get(TOKEN_ENV, "")
        if not token or not database_id:
            raise MissingCredential(f"{TOKEN_ENV} and a public-subtree database id are required; nothing was sent")
        self._token, self.database_id, self.public_base = token, database_id, public_base
        self._open = opener or urllib.request.urlopen

    def _request(self, method, path, payload=None):
        data = json.dumps(payload).encode() if payload is not None else None
        req = urllib.request.Request("https://api.notion.com/v1/" + path, data=data, method=method, headers={
            "Authorization": f"Bearer {self._token}", "Notion-Version": NOTION_VERSION, "Content-Type": "application/json"})
        try:
            with self._open(req) as response:
                return json.loads(response.read() or b"{}")
        except urllib.error.HTTPError as error:
            if error.code in (401, 403, 404):
                raise AccessError(f"Notion refused the request ({error.code}); the connection is missing, expired or not granted") from None
            raise UnknownWrite(f"Notion answered {error.code}") from None
        except (urllib.error.URLError, TimeoutError):
            raise UnknownWrite("no answer from Notion") from None

    def get(self, key):
        found = self._request("POST", f"databases/{self.database_id}/query",
                              {"filter": {"property": "Key", "rich_text": {"equals": key}}, "page_size": 1})
        if not found.get("results"):
            return None
        page = found["results"][0]
        props = page["properties"]
        text = lambda name: "".join(t["plain_text"] for t in props.get(name, {}).get("rich_text", []))
        return {"page_id": page["id"], "writer": text("Writer"), "status": text("Status"), "receipt_after": text("ReceiptAfter"),
                "body_hash": text("BodyHash")}

    def list_keys(self):
        out, cursor = [], None
        while True:
            payload = {"page_size": 100, **({"start_cursor": cursor} if cursor else {})}
            page = self._request("POST", f"databases/{self.database_id}/query", payload)
            out += ["".join(t["plain_text"] for t in r["properties"]["Key"]["rich_text"]) for r in page["results"]]
            if not page.get("has_more"):
                return out
            cursor = page["next_cursor"]

    def _props(self, **fields):
        return {name: {"rich_text": [{"type": "text", "text": {"content": str(value)[:1900]}}]} for name, value in fields.items()}

    def upsert(self, key, body, digest, writer, commit):
        existing = self.get(key)
        props = {"Name": {"title": [{"type": "text", "text": {"content": key}}]},
                 **self._props(Key=key, Writer=writer, BodyHash=digest, SourceCommit=commit)}
        blocks = [{"object": "block", "type": "paragraph", "paragraph": {"rich_text": [{"type": "text", "text": {"content": line[:1900]}}]}}
                  for line in body.split("\n") if line.strip()][:90]
        if existing is None:
            self._request("POST", "pages", {"parent": {"database_id": self.database_id}, "properties": props, "children": blocks})
            return
        self._request("PATCH", f"pages/{existing['page_id']}", {"properties": props})
        for child in self._request("GET", f"blocks/{existing['page_id']}/children?page_size=100").get("results", []):
            self._request("DELETE", f"blocks/{child['id']}")
        self._request("PATCH", f"blocks/{existing['page_id']}/children", {"children": blocks})

    def set_status(self, key, status, **fields):
        existing = self.get(key)
        if existing is None:
            return
        extra = {k.title().replace("_", ""): v for k, v in fields.items() if v is not None and k != "run_id"}
        self._request("PATCH", f"pages/{existing['page_id']}", {"properties": self._props(Status=status, **extra)})

    def anonymous_ok(self, key):
        """Read the public page with no credential at all; the token is never attached to this request."""
        row = self.get(key)
        if row is None or not self.public_base:
            return False
        request = urllib.request.Request(self.public_base.rstrip("/") + "/" + row["page_id"].replace("-", ""), method="GET")
        try:
            with self._open(request) as response:
                return getattr(response, "status", 200) == 200
        except (urllib.error.URLError, TimeoutError):
            return False

    def catalogue_lists(self, key):
        return self.get(key) is not None

    def claim_run(self, run_id):
        return None

    def release_run(self, run_id):
        return None

    def download_hash(self, key):
        raise PublisherError("hashing the live frozen export is not implemented in source; the check is fixture-only until the live proof")


# --- command line ---------------------------------------------------------------------------------

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = parser.add_subparsers(dest="command", required=True)
    rec = sub.add_parser("reconcile", help="credential-free reconciliation of the manifest against a commit")
    rec.add_argument("--repo", default=str(HERE.parent))
    rec.add_argument("--ref", default="HEAD")
    rec.add_argument("--base")
    rec.add_argument("--out")
    rec.add_argument("--check", action="store_true", help="exit non-zero on a manifest or source problem")
    pub = sub.add_parser("publish", help="write CI-owned rows; fails closed without activation and a credential")
    pub.add_argument("--repo", default=str(HERE.parent))
    pub.add_argument("--ref", default="HEAD")
    pub.add_argument("--database")
    pub.add_argument("--public-base", default=os.environ.get("OSM_PUBLIC_DOCS_BASE"))
    pub.add_argument("--run-id", default=os.environ.get("GITHUB_RUN_ID", "local"))
    args = parser.parse_args(argv)
    manifest = load_manifest()
    problems = validate_manifest(manifest)
    source = GitSource(args.repo, args.ref)
    if args.command == "reconcile":
        released = manifest["editions"]["released"]
        try:
            resolve_released(manifest, git_tag_resolver(args.repo))
        except PublisherError as error:
            problems.append(str(error))
        frozen = GitSource(args.repo, released["commit"])
        for a in manifest["artifacts"]:
            if a["edition"] == "released":
                for prefix in a["source_paths"]:
                    if not frozen.files(prefix):
                        problems.append(f"{a['key']}: nothing at {prefix} in {released['label']}")
        changed = source.changed_paths(args.base) if args.base else []
        result = plan(manifest, source, None, changed, released_source=frozen)
        text = reconciliation_text(result, manifest["activation"]["active"])
        if args.out:
            Path(args.out).write_text(text)
        sys.stdout.write(text)
        for p in problems:
            print(f"PROBLEM: {p}")
        return 1 if problems and args.check else 0
    if problems:
        print("manifest problems:", *problems, sep="\n  ")
        return 1
    try:
        transport = NotionTransport(args.database, public_base=args.public_base)
        result = publish(manifest, source, transport, args.run_id,
                         released_source=GitSource(args.repo, manifest["editions"]["released"]["commit"]))
    except PublisherError as error:
        print(f"FAIL-CLOSED: {error}")
        return 3
    sys.stdout.write(reconciliation_text(result, True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
