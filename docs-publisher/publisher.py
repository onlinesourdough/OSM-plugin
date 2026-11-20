#!/usr/bin/env python3
"""Source-only publisher and parity check for the public OSM documentation.

Not shipped in the package. Ownership is per artifact. The public Notion guide pages are
Notion-authored originals: they are frozen read-only, bound by page id and content revision, exported
to Git deliberately (`export`) and never written from Git. Git-owned artifacts are written only where
their public writer is CI. It builds a per-artifact impact diff from a frozen source commit and always
returns a visible reconciliation result (a no-op is valid); everything else gets a visible refusal
and no write.

Standard library only. The transport stays fail-closed until the manifest records
`activation.active` and a dedicated credential exists. Completing publication also needs a
qualified public reader; actual evidence is recorded separately from fixture results.

Released skill pages (class A) are not written here. native_skills.py delivers them whole through
Notion's Agent Skills API; the paragraph writer below would replace their files and refuses them.
"""

import argparse
import datetime
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
import urllib.parse
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
NOT_PROVISIONED = "not-provisioned"
UNVERIFIED_ORIGINAL = "unverified-original"
OK_OUTCOMES = {WRITTEN, UNCHANGED, RESUMED, RETIRED, PENDING_HANDOFF, REFUSED_B, REFUSED_NOTION, NOT_PROVISIONED}
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


class Interrupted(PublisherError):
    """An error stopped the run after it may have begun writing; nothing was marked complete after that point."""


class RunInProgress(PublisherError):
    pass


class SelectionError(PublisherError):
    """A selector names nothing, or more than one thing, in the text it is applied to."""


def sha256(data):
    return hashlib.sha256(data if isinstance(data, bytes) else data.encode()).hexdigest()


def clean_credential(value):
    value = value.strip() if isinstance(value, str) else ''
    if any(char.isspace() or ord(char) < 32 for char in value):
        raise MissingCredential('The public documentation credential has an invalid format')
    return value


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

    def paths(self):
        return [n for n in self._git("ls-tree", "-r", "--name-only", "-z", self.commit).split("\0") if n]

    def tags_here(self):
        """Release tags on this commit itself: the release this build is cutting, if any."""
        out = self._git("tag", "--points-at", self.commit, "--list", "v*").split("\n")
        return [t for t in out if re.fullmatch(r"v\d+\.\d+\.\d+", t)]

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

    def paths(self):
        return sorted(self._files)


class DirSource:
    """The working tree as it is on disk: what `export` wrote, before it is committed."""

    commit = "working-tree"

    def __init__(self, root):
        self.root = Path(root)

    def exists(self, path):
        return (self.root / path).is_file()

    def files(self, prefix):
        base = self.root / prefix.rstrip("/")
        found = [base] if base.is_file() else sorted(p for p in base.rglob("*") if p.is_file()) if base.is_dir() else []
        return {p.relative_to(self.root).as_posix(): p.read_bytes() for p in found}

    def paths(self):
        listed = subprocess.run(["git", "-C", str(self.root), "ls-files", "-z", "--cached", "--others", "--exclude-standard"], capture_output=True)
        if listed.returncode == 0:
            return [n for n in listed.stdout.decode().split("\0") if n and (self.root / n).is_file()]
        return sorted(p.relative_to(self.root).as_posix() for p in self.root.rglob("*") if p.is_file())


# --- manifest -------------------------------------------------------------------------------------

def load_manifest(path=MANIFEST):
    return json.loads(Path(path).read_text())


def validate_manifest(manifest):
    """Static rules. Returns a list of problems; empty means the manifest is consistent."""
    problems, keys = [], set()
    classes = set(manifest["classes"])
    for kind in manifest.get("ci_inputs", []):
        if kind["kind"] not in {"git-commit", "ci-receipt", "notion-original-snapshot"}:
            problems.append(f"ci input outside the public sources: {kind['kind']}")
    if manifest.get("generators"):
        problems.append("a generator of skill rows is not allowed: skills stay Git-owned, with no second skill database")
    if "C" in {a.get("class") for a in manifest["artifacts"]}:
        problems.append("class C (private control) must not appear in the manifest")
    activation = manifest["activation"]
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
        problems += [f"{a['key']}: {problem}" for problem in binding_shape(a)]
    pages = [a["notion"] for a in manifest["artifacts"] if a.get("notion")]
    originals = {a["notion"] for a in manifest["artifacts"] if a["class"] == "G" and a.get("notion")}
    problems += [f"page {page} is bound to more than one artifact" for page in sorted({p for p in pages if pages.count(p) > 1})]
    problems += [f"{a['key']}: bound to the page of a Notion-authored original, which is never written from Git"
                 for a in manifest["artifacts"] if a["class"] != "G" and a.get("notion") in originals]
    return problems


def _selector_ok(selector):
    return selector is None or (isinstance(selector, dict) and len({"fence", "section"} & set(selector)) == 1
                                and not set(selector) - {"fence", "section", "index"})


def binding_shape(a):
    """Static rules of a source binding. A Notion original is bound by page id and content revision; a
    Git-native artifact carries no provenance it does not have."""
    out, digest = [], re.compile(r"[0-9a-f]{64}")
    if a.get("notion") is not None and not re.fullmatch(r"[0-9a-f]{32}", str(a["notion"])):
        out.append("notion must be a page id of 32 hexadecimal digits")
    if a["class"] != "G":
        if a.get("original") or a.get("exports"):
            out.append("only a Notion-authored guide original carries an original binding or exports; a Git-native artifact needs no provenance")
        handoff = (a.get("handoff") or {}).get("body_hash")
        if handoff is not None and not (a.get("notion") and digest.fullmatch(str(handoff))):
            out.append("a handoff records the body hash of the bound page it relinquishes")
        return out
    if a["owner"] != "notion" or a["public_writer"] != "notion-authored" or a["source_paths"] or not a.get("notion"):
        out.append("a guide original is Notion-authored, bound to its page id, with no Git source path")
    bound = a.get("original")
    if bound is not None and not (bound.get("notion") == a.get("notion") and digest.fullmatch(str(bound.get("revision")))
                                  and all(isinstance(bound.get(f), str) and bound[f] for f in ("edition", "reader", "read_at"))):
        out.append("an original binding names its page id, content revision, edition, reader and read time")
    if bound is not None:
        aliases = bound.get('reader_equivalence', {})
        if not isinstance(aliases, dict) or any(not isinstance(value, dict) or
                value.get('canonical_revision') != bound.get('revision') or not value.get('reviewed_in')
                for value in aliases.values()):
            out.append('reader equivalence must be reviewed against the bound canonical revision')
    for e in a.get("exports", []):
        path = str(e.get("path") or "")
        if not path or path.startswith("/") or ".." in path.split("/") or path.startswith(ORIGINALS + "/"):
            out.append(f"export path {path!r} is not a repository path outside the frozen originals")
        if not (_selector_ok(e.get("git")) and _selector_ok(e.get("notion"))):
            out.append(f"{path}: a selector names one fence or one section")
        if (e.get("sha256") is None) != (bound is None) or (e.get("sha256") is not None and not digest.fullmatch(str(e["sha256"]))):
            out.append(f"{path}: an export hash is recorded with its bound original, never without one")
    return out


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


# --- Notion-authored originals: selection, snapshot, parity and export (Notion to Git only) --------

ORIGINALS = "docs-publisher/originals"
SNAPSHOT_FORMAT = 1
API_READER = "notion-api-markdown-v2-stable-media/1"
SPLIT_FOLDERS = ("skills", "docs")      # mapped one level down; every other top-level folder is one unit
SECRET = re.compile(r"(secret_|ntn_)[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----")
_FENCE = re.compile(r"^([ \t]*)(`{3,})[ \t]*([^`]*?)[ \t]*$")
_HEADING = re.compile(r"^(#{1,6})[ \t]+(.*?)[ \t]*$")


def normalise(text):
    """Line endings and the end of the text only; nothing inside a body is rewritten."""
    return text.replace("\r\n", "\n").replace("\r", "\n").rstrip("\n") + "\n"


def stable_notion_media(text):
    """Use Notion's block/file identity instead of an expiring S3 signature.

    Native Markdown supplies the block and workspace in `notion_record` and
    the immutable file identity in the URL path. All other text stays exact.
    Unknown temporary links cannot become a supposedly stable source snapshot.
    """
    uuid = r"[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"
    def replace(match):
        value = match[0]
        suffix = ')' if value.endswith(')') else ''
        url = value[:-1] if suffix else value
        parsed = urllib.parse.urlsplit(url)
        if not ('X-Amz-' in parsed.query or parsed.fragment.startswith('notion_record=')):
            return value
        record = re.fullmatch(r'notion_record=block\.(' + uuid + r')\.(' + uuid + r')', parsed.fragment)
        parts = parsed.path.strip('/').split('/')
        if (not record or parsed.scheme != 'https' or
                parsed.hostname != 'prod-files-secure.s3.us-west-2.amazonaws.com' or
                len(parts) != 3 or parts[0].lower() != record[2].lower() or
                not re.fullmatch(uuid, parts[1]) or not parts[2]):
            raise NotApplied('an expiring media URL has no qualified stable Notion identity')
        name = urllib.parse.quote(urllib.parse.unquote(parts[2]), safe='')
        return f'notion-file-block://{record[1].lower()}/{parts[1].lower()}?space_id={record[2].lower()}&name={name}' + suffix
    return re.sub(r'https://[^\s<>"\']+', replace, text)


def revision(body):
    """The content revision of an original: the hash of its readable body as frozen."""
    return sha256(normalise(body))


def _fences(lines):
    """(language, indent, first content line, closing line) of every closed fenced block."""
    found, i = [], 0
    while i < len(lines):
        opened = _FENCE.match(lines[i])
        end = opened and next((j for j in range(i + 1, len(lines)) if lines[j].strip() == opened[2]), None)
        if end:
            found.append((opened[3].lower(), len(opened[1]), i + 1, end))
            i = end
        i += 1
    return found


def _span(lines, selector):
    """(first line, line after the last, indent) of the one thing a selector names."""
    fenced = _fences(lines)
    if "fence" in selector:
        blocks = [f for f in fenced if f[0] == selector["fence"].lower()]
        index = selector.get("index")
        if not blocks or (index is None and len(blocks) > 1) or (index is not None and not 0 <= index < len(blocks)):
            raise SelectionError(f"{len(blocks)} fenced {selector['fence']} block(s) found; the selector must name exactly one")
        _language, indent, start, end = blocks[index or 0]
        return start, end, indent
    inside = {n for _l, _i, start, end in fenced for n in range(start - 1, end + 1)}
    heads = [(n, len(m[1]), m[2]) for n, line in enumerate(lines) if n not in inside and (m := _HEADING.match(line))]
    named = [(n, level) for n, level, title in heads if title == selector["section"]]
    if len(named) != 1:
        raise SelectionError(f"{len(named)} heading(s) named {selector['section']!r} found; the selector must name exactly one")
    at, level = named[0]
    start, end = at + 1, next((n for n, other, _t in heads if n > at and other <= level), len(lines))
    while start < end and not lines[start].strip():
        start += 1
    while end > start and not lines[end - 1].strip():
        end -= 1
    return start, end, 0


def select(text, selector=None):
    """The selected text with one trailing newline; the whole text when there is no selector."""
    if not selector:
        return normalise(text)
    lines = normalise(text).split("\n")[:-1]
    start, end, indent = _span(lines, selector)
    return "\n".join(line[indent:] if not line[:indent].strip() else line for line in lines[start:end]) + "\n"


def replace_selection(text, selector, new):
    """`text` with its selection replaced by `new`; everything outside the selection is kept byte for byte."""
    if not selector:
        return normalise(new)
    lines = text.split("\n")
    start, end, indent = _span(lines, selector)
    pad = lines[start - 1][:indent] if "fence" in selector else ""
    return "\n".join(lines[:start] + [pad + line if line else line for line in normalise(new).split("\n")[:-1]] + lines[end:])


def guide_pages(manifest):
    """The Notion-authored guide originals, by Key."""
    return {a["key"]: a for a in manifest["artifacts"] if a["class"] == "G"}


def frozen_path(key):
    return f"{ORIGINALS}/{key}.md"


def read_snapshot(data, manifest):
    """Originals as read: a lead's exact tool-read bodies, or the output of `snapshot`. Returns pages by Key.

    Only the body is trusted. The content revision is recomputed, and a stated one that differs is refused."""
    if not isinstance(data, dict) or data.get("format") != SNAPSHOT_FORMAT or not isinstance(data.get("pages"), dict):
        raise SetupError(f"a snapshot is an object with format {SNAPSHOT_FORMAT} and pages")
    reader = data.get("reader")
    if not isinstance(reader, str) or not reader.strip():
        raise SetupError("a snapshot names the reader that read the bodies")
    guide = guide_pages(manifest)
    by_page = {a["notion"]: key for key, a in guide.items()}
    pages = {}
    for ref, page in data["pages"].items():
        key = ref if ref in guide else by_page.get(str(ref).replace("-", "").lower())
        if key is None:
            raise SetupError(f"snapshot page {ref} is not a guide original in the manifest")
        if key in pages:
            raise SetupError(f"the snapshot names {key} twice")
        if isinstance(page, dict) and page.get("notion") is not None and str(page["notion"]).replace("-", "").lower() != guide[key]["notion"]:
            raise SetupError(f"snapshot page {key} names a different page identity")
        if isinstance(page, dict) and (page.get("truncated") or page.get("unknown_block_ids") or page.get("warnings")):
            raise SetupError(f"snapshot page {key} is incomplete or has unsupported content")
        body = page.get("body") if isinstance(page, dict) else None
        if not isinstance(body, str) or not body.strip():
            raise SetupError(f"snapshot page {key} has no readable body")
        if page.get("revision") not in (None, revision(body)):
            raise SetupError(f"snapshot page {key} states a revision its body does not hash to")
        pages[key] = {"notion": guide[key]["notion"], "title": page.get("title"), "last_edited_time": page.get("last_edited_time"),
                      "body": normalise(body), "revision": revision(body)}
    read_at = data.get("read_at") or datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    return {"format": SNAPSHOT_FORMAT, "reader": reader.strip(), "read_at": read_at, "pages": pages,
            "errors": [str(e) for e in data.get("errors") or []]}


def load_snapshot(path, manifest):
    try:
        data = json.loads(Path(path).read_text())
    except (OSError, ValueError) as error:
        raise SetupError(f"the snapshot could not be read: {error}") from None
    return read_snapshot(data, manifest)


def freeze(manifest, transport, read_at=None):
    """Read every guide original through the API. Read-only; an unreadable page is an error entry, never an empty body."""
    pages, errors = {}, []
    for key, a in sorted(guide_pages(manifest).items()):
        try:
            page = transport.read_original(a["notion"])
        except PublisherError as error:
            errors.append(f"{key}: {error}")
            continue
        if not page["body"].strip():
            errors.append(f"{key}: the page read back empty")
            continue
        pages[key] = {**page, "revision": revision(page["body"])}
    read_at = read_at or datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    return {"format": SNAPSHOT_FORMAT, "reader": API_READER, "read_at": read_at, "pages": pages, "errors": errors}


def original_as_read(artifact, originals):
    """The original as a snapshot holds it; None when no snapshot was supplied."""
    if originals is None:
        return None
    page = originals["pages"].get(artifact["key"])
    if page is not None:
        return {**page, "reader": originals["reader"]}
    why = next((e for e in originals["errors"] if e.startswith(artifact["key"] + ":")), "it was not frozen")
    return {"revision": None, "error": why}


def original_state(artifact, source, read=None):
    """(outcome, detail) for a Notion-authored guide original. Never a write, in either direction.

    Without a snapshot it checks what Git holds: the frozen original hashes to the bound revision and each
    declared export equals its selection of that original. With one it also compares the original as read."""
    never, key = "Notion-authored original; never written", artifact["key"]
    bound, exports = artifact.get("original"), artifact.get("exports", [])
    if not bound:
        return REFUSED_NOTION, (f"{never} | newer-original check: {NOT_CHECKED}: "
                                "no revision is bound, so a later original and export parity are not detected")
    label = f"bound to revision {bound['revision'][:12]} for {bound['edition']}"
    frozen = b"".join(source.files(frozen_path(key)).values()).decode()
    if not frozen or revision(frozen) != bound["revision"]:
        return CONFLICT, f"{label}, but {frozen_path(key)} is missing or does not hash to it; a frozen original changes only through export"
    for e in exports:
        try:
            want, have = select(frozen, e.get("notion")), select(b"".join(source.files(e["path"]).values()).decode(), e.get("git"))
        except SelectionError as error:
            return CONFLICT, f"{e['path']}: {error}"
        if sha256(want) != e.get("sha256"):
            return CONFLICT, f"{e['path']}: the recorded export hash is not its selection of the frozen original"
        if have != want:
            return CONFLICT, (f"{e['path']} differs from the bound original; a Notion-owned export changes only through export, "
                              "after the original is edited in Notion")
    agree = f"{label}; the frozen original and {len(exports)} export(s) agree"
    if read is None:
        return REFUSED_NOTION, f"{never} | {agree} | newer-original check: {NOT_CHECKED}: no snapshot was supplied"
    if read.get("revision") is None:
        return UNREADABLE, f"{label}; the original is not in the snapshot ({read.get('error')}), so it is not called unchanged"
    aliases = bound.get('reader_equivalence', {})
    equivalent = aliases.get(read['reader'], {}) if isinstance(aliases, dict) else {}
    if read['reader'] != bound['reader'] and not (
            isinstance(equivalent, dict) and equivalent.get('canonical_revision') == bound['revision'] and equivalent.get('reviewed_in')):
        return UNVERIFIED_ORIGINAL, (f"{never} | {agree} | newer-original check: {NOT_CHECKED}: "
                                    "the reader representations are not comparable until qualified against this original")
    for e in exports:
        try:
            now = select(read["body"], e.get("notion"))
        except SelectionError as error:
            return CONFLICT, f"a newer original exists in Notion: it no longer holds the selection exported to {e['path']} ({error}); not overwritten"
        if sha256(now) != e["sha256"]:
            return CONFLICT, (f"a newer original exists in Notion: the selection exported to {e['path']} changed; export it deliberately, "
                              "nothing is overwritten in either direction")
    if read["revision"] != bound["revision"]:
        return CONFLICT, (f"a newer original exists in Notion ({read['revision'][:12]}; {label}); export it deliberately, "
                          "nothing is overwritten in either direction")
    return REFUSED_NOTION, f"{never} | {agree} | read and unchanged"


def content_folders(paths):
    """The folders the map must cover: each top-level folder, with skills/ and docs/ taken one level down."""
    out = set()
    for path in paths:
        parts = path.split("/")
        if len(parts) > 1:
            out.add("/".join(parts[:2 if parts[0] in SPLIT_FOLDERS and len(parts) > 2 else 1]) + "/")
    return out


def folder_problems(manifest, paths):
    """Every method content folder names its public guide page; every technical folder states its role."""
    folders, guide, out = manifest.get("folders") or {}, guide_pages(manifest), []
    method_pages = set(guide) | {a["key"] for a in manifest["artifacts"] if a["class"] == "A" and a.get("notion")}
    needed = content_folders(paths)
    out += [f"folder {f} has no entry in the folder map: name its guide page or its technical role" for f in sorted(needed - set(folders))]
    out += [f"folder map entry {f} names no folder at this commit" for f in sorted(set(folders) - needed)]
    for folder, entry in sorted(folders.items()):
        page, role = entry.get("page"), entry.get("role")
        if (page is None) == (role is None) or (role is not None and not str(role).strip()):
            out.append(f"folder {folder} names exactly one of a guide page or a technical role")
        elif page is not None and page not in method_pages:
            out.append(f"folder {folder} names {page}, which is not a bound public method page")
        elif page is None and folder.startswith("skills/"):
            out.append(f"folder {folder} is method content: it names its guide page, not a technical role")
    return out


def binding_problems(manifest, tag):
    """A release being cut carries every guide original bound for that edition."""
    edition, out = tag.lstrip("v"), []
    for key, a in sorted(guide_pages(manifest).items()):
        bound = a.get("original")
        if not bound or bound["edition"] != edition:
            out.append(f"release {tag}: {key} is {'bound for ' + bound['edition'] if bound else 'not bound'}; "
                       f"freeze the guide originals and export them for {edition} before the tag")
    return out


def export_originals(root, manifest, snapshot, edition, keys=None, dry_run=False):
    """Notion to Git only: bind each selected original (page id and content revision), freeze its readable
    body and write its declared exports. Nothing is written unless every selected original binds exactly.
    Returns the report rows; `manifest` is updated in place unless `dry_run`."""
    root, guide, refused, files, bindings = Path(root), guide_pages(manifest), [], {}, []
    for key in keys or sorted(snapshot["pages"]):
        a, page = guide.get(key), snapshot["pages"].get(key)
        if a is None:
            refused.append(f"{key}: only a Notion-authored guide original is exported; a Git-owned artifact has no original to bind")
            continue
        if page is None:
            refused.append(f"{key}: not in the snapshot")
            continue
        if SECRET.search(page["body"]):
            refused.append(f"{key}: the body holds secret-like text; nothing is frozen into the repository")
            continue
        files[frozen_path(key)] = page["body"]
        hashes = []
        for e in a.get("exports", []):
            try:
                text = select(page["body"], e.get("notion"))
                target = root / e["path"]
                current = files[e["path"]] if e["path"] in files else (
                    "" if not target.exists() and not e.get("git") else target.read_text())
                files[e["path"]] = replace_selection(current, e.get("git"), text)
                hashes.append(sha256(text))
            except (SelectionError, OSError) as error:
                refused.append(f"{key}: {e['path']}: {error}")
        bindings.append((a, hashes, {"notion": a["notion"], "revision": page["revision"], "edition": edition, "reader": snapshot["reader"],
                                     "read_at": snapshot["read_at"], "last_edited_time": page.get("last_edited_time")}))
    if refused:
        raise PublisherError("export refused; nothing was written: " + "; ".join(refused))
    report = [{"key": a["key"], "notion": a["notion"], "revision": binding["revision"],
               "previous": (a.get("original") or {}).get("revision")} for a, _h, binding in bindings]
    changed = sorted(path for path, text in files.items() if not (root / path).is_file() or (root / path).read_text() != text)
    if not dry_run:
        for path in changed:
            (root / path).parent.mkdir(parents=True, exist_ok=True)
            (root / path).write_text(files[path])
        for a, hashes, binding in bindings:
            a["original"] = binding
            for e, digest in zip(a.get("exports", []), hashes):
                e["sha256"] = digest
    return report, changed


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


def _owned(a, path):
    """A changed path that belongs to this artifact: its Git source, or the frozen original and exports of a guide page."""
    return _hit(a, [path]) or (a["class"] == "G" and path in [frozen_path(a["key"])] + [e["path"] for e in a.get("exports", [])])


def decide(artifact, source, remote, offline=None):
    """Outcome for one artifact before any write. Returns (outcome, detail, new_hash).

    `remote` is the row as read (or None); for a Notion-authored guide original it is the original as a
    snapshot holds it. `offline` is None when receipts were read, else "unknown" (no base), "hit" or
    "miss" (a mapped path did or did not change since the base).
    """
    writer = artifact["public_writer"]
    if artifact["class"] == "B":
        detail = "Notion-authored Content template edition; never written or repaired"
        if artifact.get("frozen_zip"):
            detail += f" | frozen ZIP hash: {NOT_CHECKED}: no reader hashes the live export"
        return REFUSED_B, detail, None
    if writer == "notion-authored":
        return (*original_state(artifact, source, remote), None)
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
    if remote is not None and remote.get("unclaimed"):
        # An existing public page bound by id that carries no CI receipt: only the recorded handoff state is replaced.
        if not remote.get("handoff_ok"):
            return BLOCKED, (f"the bound page carries no CI receipt and its body ({str(remote.get('actual_hash'))[:12]}) is not the "
                             "recorded handoff state; not overwritten"), new
        return WRITTEN, "first write after the recorded handoff of the bound page", new
    if remote is None:
        if artifact["class"] == "A":
            return BLOCKED, "no row with this Key; an existing row has none, so a first write would duplicate it", new
        return WRITTEN, "new row", new
    if remote["writer"] != "ci":
        return CONFLICT, f"row is owned by {remote['writer']}", new
    status, actual = remote["status"], remote.get("actual_hash")
    if status == "pending" and remote.get("body_hash") == remote["receipt_after"] and actual not in (None, remote["receipt_after"]):
        # The write completed (BodyHash is written last and equals the receipt) and the row was only held, so a body
        # that differs now was changed afterwards. A partial or unknown write has BodyHash != receipt and still resumes.
        return CONFLICT, "the page body changed after CI's write completed; not overwritten", new
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


def plan(manifest, source, transport=None, changed_paths=None, released_source=None, only=None, base=None, originals=None):
    """Impact diff and per-artifact outcomes. Reads only; never writes.

    `changed_paths` is None when no base was given. Released-edition rows read the frozen released
    source, never the working commit. `only` limits the run to one Key. `originals` is a frozen
    snapshot of the guide originals, or None. Only a row CI owns is looked up through the transport.
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
        if a["public_writer"] == "notion-authored":
            remote = original_as_read(a, originals) if a["class"] == "G" else None
        elif transport is not None and a["public_writer"] == "ci":
            if not a.get("notion") and getattr(transport, "database_id", True) is None:
                add(a, NOT_PROVISIONED, "the optional working projection has no database (bindings.working_subtree is null); nothing is written for it", None)
                continue
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
    unmapped = [p for p in paths if not any(_owned(a, p) for a in expand(manifest))]
    skills = sorted({"/".join(p.split("/")[:2]) for p in paths if p.startswith("skills/")})
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
    guide = [r for r in rows if r["class"] == "G"]
    if guide:
        bound = [r for r in guide if "bound to revision" in r["detail"]]
        lines += ["", f"Guide originals (Notion-authored, never written): {len(bound)} of {len(guide)} bound to a content revision; "
                      f"{len([r for r in guide if r['outcome'] not in OK_OUTCOMES])} not in agreement."]
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
    claimed = not (remote or {}).get("unclaimed")
    if not claimed:
        before = remote["actual_hash"]      # the handed-over body is the before-source of the first write
    try:
        if remote and claimed:
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


def publish(manifest, source, transport, run_id, tag_resolver, allow_fixture=False, released_source=None, only=None, originals=None):
    """One serialized, idempotent run. Returns the plan rows with their final outcomes.

    The released tag is resolved here, not assumed. Order per CI-owned row: mark pending (before/after
    recorded; a new row is created pending), upsert the body, write BodyHash last. The affected set is
    declared by the plan; every member is read back (page body, public page, catalogue) and none is
    complete until all pass. A failure stays visible and retryable on the same Key.
    """
    if not (manifest["activation"]["active"] or allow_fixture):
        raise PublisherError("the publisher is not active; refusing to write")
    if any(a.get("original") for a in guide_pages(manifest).values()) and originals is None:
        raise PublisherError("bound guide originals require a comparable snapshot before publication")
    if not allow_fixture and any(a["class"] == "A" and a["public_writer"] == "ci" for a in manifest["artifacts"]):
        raise PublisherError("released skill pages are delivered whole by the native skill publisher (native_skills.py); "
                             "this paragraph writer never writes a class A page")
    resolve_released(manifest, tag_resolver)
    transport.claim_run(run_id)
    try:
        result = plan(manifest, source, transport, released_source=released_source, only=only, originals=originals)
        guide_errors = [r for r in result["rows"] if r["class"] == "G" and r["outcome"] not in OK_OUTCOMES]
        if guide_errors:
            raise PublisherError(f"guide original parity failed for {guide_errors[0]['key']}; no publication writes were attempted")
        arts = {a["key"]: a for a in expand(manifest)}
        rows = {r["key"]: r for r in result["rows"]}
        use = lambda a: (released_source or source) if a["edition"] == "released" else source
        for row in result["rows"]:
            if row["outcome"] == RETIRED:
                try:
                    transport.set_status(row["key"], "retired", run_id=run_id)
                except AccessError as error:
                    row["outcome"], row["detail"], row["stops"] = BLOCKED, str(error), True
                except PublisherError as error:
                    row["outcome"], row["detail"], row["stops"] = UNKNOWN_WRITE, f"{error}; read back before any retry", True
        declared = result["affected_set"]
        try:
            wrote = [k for k in declared if _write_row(transport, arts[k], rows[k], use(arts[k]), run_id)]
            verdict = {k: _read_back(transport, k, rows[k], render(arts[k], use(arts[k]), commit=rows[k]["page_commit"])) for k in wrote}
        except PublisherError as error:
            raise Interrupted(f"{error}; the run stopped, rows may have been written (they stay pending) and none was marked complete") from None
        # A CI-owned row that failed at plan time (conflict, unreadable, blocked, unrepresentable) is outside the
        # write set but inside the coherent set: it holds the rest.
        stopped = [k for k, r in rows.items() if k not in declared and r["outcome"] not in OK_OUTCOMES
                   and (r.get("stops") or (k in arts and arts[k]["public_writer"] == "ci"))]
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
RECEIPT = "osm-doc-receipt"
READABLE = {"paragraph": "", "heading_1": "# ", "heading_2": "## ", "heading_3": "### ", "bulleted_list_item": "- ",
            "numbered_list_item": "1. ", "to_do": "- [ ] ", "quote": "> ", "callout": "> "}


def receipt_line(fields):
    """A bound page's receipt: the row fields a database row keeps in properties, as one paragraph of the page."""
    return " | ".join([RECEIPT] + [f"{name}: {fields.get(name) or '-'}" for name in PROPERTY_NAMES])


def parse_receipt(line):
    pairs = [part.partition(": ") for part in line.split(" | ")[1:]]
    return {name: "" if value == "-" else value for name, _sep, value in pairs if name in PROPERTY_NAMES}


def bound_rows(manifest):
    """Git-owned rows bound to an existing public page by id. They need no database."""
    return {a["key"]: {"id": a["notion"], "handoff": (a.get("handoff") or {}).get("body_hash"), "row_key": a.get("row_key")}
            for a in manifest["artifacts"] if a.get("notion") and a["owner"] == "git"}


class NotionTransport:
    """Minimal official-API transport. Fail-closed: no credential, no transport.

    It has run only against the in-memory stand-in in fixture_transport.py, never against Notion.
    There is no run lock here: serialization rests on the workflow's concurrency group alone.
    Without an enabled `public_reader`, public access and catalogue membership are `unsupported`.

    A row lives in the working database, found by its Key, or on an existing public page bound by id
    (`bound`), which needs no database: its receipt is one paragraph of that page and its body is every
    other block. `bound={}` alone allows a database-free transport for bound rows and read-only originals.
    """

    def __init__(self, database_id, opener=None, env=None, public_reader=None, api_base=API_BASE, bound=None):
        token = clean_credential((env if env is not None else os.environ).get(TOKEN_ENV, ""))
        if not token or not (database_id or bound is not None):
            raise MissingCredential(f"{TOKEN_ENV} and a public-subtree database id or page bindings are required; nothing was sent")
        self._token, self.database_id, self.api_base = token, database_id or None, api_base
        self.public_reader, self._open, self._title = public_reader, opener or API_OPENER, None
        self.bound = bound if bound is not None else {}

    def _request(self, method, path, payload=None, *, version=None):
        data = json.dumps(payload).encode() if payload is not None else None
        req = urllib.request.Request(self.api_base + path, data=data, method=method, headers={
            "Authorization": f"Bearer {self._token}", "Notion-Version": version or NOTION_VERSION, "Content-Type": "application/json"})
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
        if key in self.bound:
            return {"id": self.bound[key]["id"]}
        if self.database_id is None:
            raise AccessError(f"no database is configured and {key} is not bound to a page; nothing was sent for it")
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

    def _page_row(self, key):
        """A row bound to an existing page: (page id, receipt block or None, body blocks)."""
        page_id = self.bound[key]["id"]
        blocks = self._children(page_id)
        receipts = [b for b in blocks if b.get("type") == "paragraph" and block_line(b).startswith(RECEIPT)]
        if len(receipts) > 1 or (receipts and parse_receipt(block_line(receipts[0])).get("key") != key):
            raise DuplicateKey(f"the page bound to {key} carries more than one receipt, or another Key's; refusing to choose one")
        return page_id, (receipts[0] if receipts else None), [b for b in blocks if b not in receipts]

    def _write_receipt(self, block_id, fields):
        self._request("PATCH", f"blocks/{block_id}", {"paragraph": blocks_for(receipt_line(fields))[0]["paragraph"]})

    def get(self, key):
        """The row's properties plus the hash of the page body as actually read (None if it could not be)."""
        if key in self.bound:
            _page_id, receipt, body = self._page_row(key)
            row = {**{field: "" for field in PROPERTY_NAMES}, "actual_hash": body_hash(read_back_text(body)), "body_error": None}
            if receipt is None:     # an existing page CI has not claimed: only its recorded handoff state may be replaced
                return {**row, "unclaimed": True, "handoff_ok": row["actual_hash"] == self.bound[key].get("handoff")}
            return {**row, **parse_receipt(block_line(receipt))}
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
        if self.database_id is None:
            return []       # bound pages are named by the manifest; nothing else on them is CI's to list
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
        blocks = blocks_for(body)
        batches = [blocks[i:i + BATCH] for i in range(0, len(blocks), BATCH)]
        if key in self.bound:
            return self._upsert_bound(key, batches, digest, dict(key=key, writer=writer, commit=commit), receipt_before, receipt_after)
        title, existing = self._schema(), self._find(key)
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
        self._replace_body(page_id, old, rest, changed)
        try:
            self._request("PATCH", f"pages/{page_id}", {"properties": self._props(body_hash=digest)})
        except NotApplied as error:
            raise UnknownWrite(f"the body was written but BodyHash was not recorded: {error}") from None

    def _replace_body(self, page_id, old, rest, changed):
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

    def _upsert_bound(self, key, batches, digest, fields, receipt_before, receipt_after):
        """The same order on a bound page: claim or mark the receipt, replace every other block, record the body hash last.
        The first write after a handoff appends the receipt pending before anything is removed, so a cut run resumes."""
        page_id, receipt, body = self._page_row(key)
        if receipt is None:
            fields = dict(fields, status="pending", receipt_before=receipt_before, receipt_after=receipt_after)
            receipt = self._request("PATCH", f"blocks/{page_id}/children", {"children": blocks_for(receipt_line(fields))})["results"][0]
        else:
            fields = {**parse_receipt(block_line(receipt)), **fields}
            self._write_receipt(receipt["id"], fields)
        self._replace_body(page_id, [b["id"] for b in body], batches, False)
        try:
            self._write_receipt(receipt["id"], dict(fields, body_hash=digest))
        except NotApplied as error:
            raise UnknownWrite(f"the body was written but the receipt's body hash was not recorded: {error}") from None

    def read_original(self, page_id):
        """Read one explicit public guide page through Notion's lossless Markdown API.

        The version is explicit. Unsupported/truncated content is a failure, never a
        complete snapshot; child page links are not recursively followed.
        """
        page = self._request("GET", f"pages/{page_id}")
        rendered = self._request("GET", f"pages/{page_id}/markdown?markdown_version=v2", version="2026-03-11")
        if (rendered.get("object") != "page_markdown" or not isinstance(rendered.get("markdown"), str)
                or rendered.get("truncated") or rendered.get("unknown_block_ids") or rendered.get("warnings")):
            raise NotApplied("the guide Markdown read is incomplete or has unsupported content")
        title = next(("".join(t.get("plain_text", "") for t in prop.get("title", []))
                      for prop in page.get("properties", {}).values() if prop.get("type") == "title"), "")
        return {"notion": page_id, "title": title, "last_edited_time": page.get("last_edited_time"),
                "body": stable_notion_media(rendered["markdown"])}

    def set_status(self, key, status, **fields):
        if key in self.bound:
            _page_id, receipt, _body = self._page_row(key)
            if receipt is None:
                raise PublisherError(f"no receipt on the page bound to {key} to mark {status}")
            current = parse_receipt(block_line(receipt))
            return self._write_receipt(receipt["id"], {**current, "status": status, **{k: v for k, v in fields.items() if v is not None and k in PROPERTY_NAMES}})
        existing = self._find(key)
        if existing is None:
            raise PublisherError(f"no row with the Key {key} to mark {status}")
        self._request("PATCH", f"pages/{existing['id']}", {"properties": self._props(status=status, **fields)})

    def verify_public(self, key, expected):
        if self.public_reader is None:
            return UNSUPPORTED, NO_READER
        page = self.bound.get(key) or self._find(key)
        return (FAILED, "the row is not there") if page is None else self.public_reader.page(page["id"], expected)

    def verify_catalogue(self, key):
        return (UNSUPPORTED, NO_READER) if self.public_reader is None else self.public_reader.catalogue(self.bound.get(key, {}).get("row_key") or key)

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


def _snapshot(args, manifest, problems, opener, env):
    """Freeze the guide originals through the API. Read-only: page and block GETs, nothing else."""
    if problems:
        print("manifest problems:", *problems, sep="\n  ")
        return 1
    try:
        frozen = freeze(manifest, NotionTransport(None, opener=opener, env=env, bound={}))
    except MissingCredential as error:
        print(f"MISSING ACCESS: {error} No original was read and no snapshot was written.")
        return 3
    Path(args.out).write_text(json.dumps(frozen, indent=1, ensure_ascii=False, sort_keys=True) + "\n")
    print(f"froze {len(frozen['pages'])} of {len(guide_pages(manifest))} guide originals (read-only); {len(frozen['errors'])} unreadable")
    for error in frozen["errors"]:
        print(f"UNREADABLE {error}")
    return 4 if frozen["errors"] else 0


def _export(args, manifest):
    """Notion to Git only. The one command that changes a frozen original, an export or a binding."""
    root = Path(args.repo)
    path = root / "docs-publisher" / "manifest.json"
    try:
        manifest = manifest or load_manifest(path)
        problems = validate_manifest(manifest)
        if problems:
            raise PublisherError("manifest problems: " + "; ".join(problems))
        snapshot = load_snapshot(args.snapshot, manifest)
        edition = args.edition or json.loads((root / "package.json").read_text())["version"]
        report, changed = export_originals(root, manifest, snapshot, edition, args.key, args.dry_run)
        if not args.dry_run:
            path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
            wrong = [f"{key}: {detail}" for key, (outcome, detail) in ((r["key"], original_state(guide_pages(manifest)[r["key"]], DirSource(root)))
                                                                      for r in report) if outcome not in OK_OUTCOMES]
            if wrong:
                raise PublisherError("the export was written but does not read back in agreement: " + "; ".join(wrong))
    except (PublisherError, OSError, ValueError, KeyError) as error:
        print(f"EXPORT REFUSED: {error}")
        return 1
    print(f"# Export of guide originals (Notion to Git only){' - dry run, nothing written' if args.dry_run else ''}\n")
    print(f"Edition: {edition}. Reader: {snapshot['reader']}. Read at: {snapshot['read_at']}.\n")
    print("| Key | Page id | Content revision | Before |\n| --- | --- | --- | --- |")
    for r in report:
        before = "not bound" if r["previous"] is None else "same revision" if r["previous"] == r["revision"] else r["previous"]
        print(f"| {r['key']} | {r['notion']} | {r['revision']} | {before} |")
    print("\n" + ("Files that differ from the working tree: " + ", ".join(f"`{c}`" for c in changed) if changed
                  else "Every frozen original and export already equals the working tree."))
    return 0


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
    rec.add_argument("--snapshot", help="frozen guide originals (a lead's tool-read bodies or the output of `snapshot`) to compare with their bindings")
    rec.add_argument("--worktree", action="store_true", help="read the working tree instead of --ref: what `export` wrote, before it is committed")
    rec.add_argument("--release-tag", help="apply the rule of a release being cut: every guide original is bound for this edition")
    snap = sub.add_parser("snapshot", help="freeze the guide originals through the API (read-only); fails closed without the credential")
    snap.add_argument("--out", required=True)
    exp = sub.add_parser("export", help="Notion to Git only: bind frozen guide originals by page id and content revision and write their exports")
    exp.add_argument("--repo", default=str(HERE.parent))
    exp.add_argument("--snapshot", required=True, help="frozen guide originals: the exact bodies as read, by page id or Key")
    exp.add_argument("--key", action="append", help="limit the export to this guide original (repeatable); default: every page in the snapshot")
    exp.add_argument("--edition", help="the package edition these originals explain; default: the version in package.json")
    exp.add_argument("--dry-run", action="store_true", help="report what would be bound and written; write nothing")
    pub = sub.add_parser("publish", help="write CI-owned rows; fails closed without activation and a credential")
    pub.add_argument("--repo", default=str(HERE.parent))
    pub.add_argument("--ref", default="HEAD")
    pub.add_argument("--database")
    pub.add_argument("--public-base", default=os.environ.get("OSM_PUBLIC_DOCS_BASE"))
    pub.add_argument("--public-catalogue", default=os.environ.get("OSM_PUBLIC_DOCS_CATALOGUE"))
    pub.add_argument("--run-id", default=os.environ.get("GITHUB_RUN_ID", "local"))
    pub.add_argument("--only", help="the one-row route for a bounded proof: publish only this Key")
    pub.add_argument("--out", help="write the post-publish result here, also when the run fails")
    pub.add_argument("--snapshot", help="frozen guide originals to compare with their bindings in the same run")
    args = parser.parse_args(argv)
    if args.command == "export":
        return _export(args, manifest)
    manifest = manifest or load_manifest()
    problems = validate_manifest(manifest)
    if args.command == "snapshot":
        return _snapshot(args, manifest, problems, opener, env)
    released = manifest["editions"]["released"]
    try:
        originals = load_snapshot(args.snapshot, manifest) if args.snapshot else None
        if args.command == "reconcile" and args.worktree and args.base:
            raise SetupError("--worktree reads the files on disk and has no base to compare with")
    except PublisherError as error:
        print(f"ERROR: {error}")
        return 2
    source = DirSource(args.repo) if args.command == "reconcile" and args.worktree else GitSource(args.repo, args.ref)
    if args.command == "reconcile":
        resolve, notes = git_tag_resolver(args.repo), []
        try:
            resolve_released(manifest, resolve, require_tag=False)
        except PublisherError as error:
            problems.append(str(error))
        notes += [n for n in [tag_note(manifest, resolve)] if n]
        problems += release_problems(manifest, source)
        problems += folder_problems(manifest, source.paths())
        cutting = [args.release_tag] if args.release_tag else [t for t in (source.tags_here() if hasattr(source, "tags_here") else [])
                                                                if _version(t) > _version(released["tag"])]
        problems += [p for tag in cutting for p in binding_problems(manifest, tag)]
        frozen = GitSource(args.repo, released["commit"])
        for a in manifest["artifacts"]:
            if a["edition"] == "released":
                for prefix in a["source_paths"]:
                    if not frozen.files(prefix):
                        problems.append(f"{a['key']}: nothing at {prefix} in {released['label']}")
        try:
            changed = source.changed_paths(args.base) if args.base and set(args.base) != {"0"} else None
            result = plan(manifest, source, None, changed, released_source=frozen, only=args.only, base=args.base, originals=originals)
        except PublisherError as error:
            print(f"ERROR: {error}")
            return 2
        result["notes"] = notes + ([f"guide originals compared with a snapshot read through {originals['reader']} at {originals['read_at']}"] if originals else [])
        problems += [f"{r['key']}: {r['detail']}" for r in result["rows"] if r["class"] == "G" and r["outcome"] not in OK_OUTCOMES]
        _emit(reconciliation_text(result, manifest["activation"]["active"]), args.out)
        for p in problems:
            print(f"PROBLEM: {p}")
        return 1 if problems and args.check else 0
    if problems:
        print("manifest problems:", *problems, sep="\n  ")
        return 1
    title = "Documentation publication"
    try:
        if manifest["activation"]["active"] and (args.database or None) != manifest["bindings"]["working_subtree"]:
            raise SetupError("--database is not the reviewed working subtree recorded in the manifest")
        transport = NotionTransport(args.database, opener=opener, env=env, bound=bound_rows(manifest),
                                    public_reader=build_reader(manifest, args.public_base, args.public_catalogue, opener))
        result = publish(manifest, source, transport, args.run_id, tag_resolver or git_tag_resolver(args.repo),
                         released_source=GitSource(args.repo, released["commit"]), only=args.only, originals=originals)
    except PublisherError as error:
        _emit(f"# {title}\n\nFAIL-CLOSED: {error}\n\n" + ("Rows may have been written before it stopped; read the job log.\n" if isinstance(error, Interrupted)
                                                         else "Nothing was written.\n"), args.out)
        return 3
    except Exception as error:
        _emit(f"# {title}\n\nUNEXPECTED ERROR: {type(error).__name__}. The run did not finish; read the job log.\n", args.out)
        raise
    _emit(reconciliation_text(result, True, title), args.out)
    return 4 if failing(result) else 0


if __name__ == "__main__":
    sys.exit(main())
