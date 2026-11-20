#!/usr/bin/env python3
"""Native whole-skill publisher for the released skill pages (class A, issue #110).

Not shipped in the package and not active. A released skill page is delivered whole through Notion's
Agent Skills API: `GET ai/skills/{id}` names a temporary signed archive of the page as a skill
directory, and `POST ai/skills/{id}/upload` imports one gzip tar archive into that existing page
(title, Description, body and Files). The paragraph writer in publisher.py never writes these pages.

Each packet is built from the frozen released commit only: the projected SKILL.md, every supporting
file of the skill, the resource-only helper folders it references, LICENSE, SOURCE.json and one
canonical source ZIP of the exact Git bytes. Files under history/ already on the page are carried
forward byte for byte. Only the seven pages bound in manifest.json are ever addressed, and the guide
originals are never touched. Nothing is recorded on the page beyond the packet: the state CI compares
is the page itself (supporting bytes, the meaning of SKILL.md, title and properties).

Standard library only. This module has run only against the in-memory stand-in in
tests/native-publisher-rehearsal.py, never against Notion. Read ACTIVATION.md before enabling it.
"""

import argparse
import datetime
import gzip
import http.client
import io
import json
import os
import posixpath
import re
import sys
import tarfile
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zipfile
import zlib

import publisher as pub

REPO_URL = "https://github.com/onlinesourdough/OSM-plugin"
SKILLS_VERSION = "2026-03-11"           # the Notion-Version the Agent Skills endpoints are documented for
ENABLED_ENV = "OSM_PUBLIC_DOCS_ENABLED"
SOURCE_FORMAT = "osm-public-skill-source/2"
MAX_ARCHIVE = 20 * 1024 * 1024          # Notion's documented upload limit
MAX_UNPACKED, MAX_FILES, MAX_JSON = 25 * 1024 * 1024, 1000, 4 * 1024 * 1024
MANAGED = ("Key", "Version", "Source revision", "Package version", "Status")
RESERVED = ("resources", "history", "LICENSE", "SOURCE.json")
_LINK = re.compile(r"\]\(([^)\s]+)\)")
_BREAK = re.compile(r"<br\s*/?>")
_ID = re.compile(r"[0-9a-f]{32}")
_SHA256 = re.compile(r"[0-9a-f]{64}")


def content_version(value):
    # Notion documents version_id as an opaque string, not a SHA-256 digest.
    return isinstance(value, str) and 0 < len(value) <= 4096


def body_structure(body):
    """Keep code whitespace and list/heading structure when soft prose wraps change."""
    codes, structure, code, fence, indents = [], [], [], None, []
    for line in body.splitlines():
        opened = re.match(r"^\s*(`{3,}|~{3,})(.*)$", line)
        if fence:
            if opened and opened[1][0] == fence[0] and len(opened[1]) >= len(fence) and not opened[2].strip():
                codes.append("\n".join(code)); code, fence = [], None
            else:
                code.append(line)
            continue
        if opened:
            fence = opened[1]; code = [opened[2].strip()]
            continue
        heading = re.match(r"^\s*(#{1,6})\s+", line)
        listed = re.match(r"^(\s*)([-*+]|\d+\.)\s+", line)
        if heading:
            structure.append(("heading", len(heading[1]))); indents = []
        elif listed:
            indent = len(listed[1].expandtabs(4))
            while indents and indent < indents[-1]: indents.pop()
            if not indents or indent > indents[-1]: indents.append(indent)
            structure.append(("ordered" if listed[2][0].isdigit() else "bullet", len(indents)))
    if fence:
        codes.append("UNCLOSED:" + "\n".join(code))
    return {"code": codes, "structure": structure}


class Refused(pub.PublisherError):
    """An identity, archive or packet rule failed; nothing is written for that page."""


def compact(value):
    return str(value or "").replace("-", "").lower()


# --- packets: the frozen released commit as native skill directories --------------------------------

def frontmatter(text):
    """(fields, body) of a SKILL.md: plain, quoted and block scalars; one nested level as `parent.child`."""
    match = re.match(r"---\n(.*?)\n---[ \t]*(?:\n(.*))?\Z", text, re.S)
    if not match:
        raise Refused("SKILL.md has no frontmatter")
    fields, lines, at = {}, match[1].split("\n"), 0

    def scalar(value):
        value = value.strip()
        if value.startswith('"'):
            try:
                return str(json.loads(value))
            except ValueError:
                raise Refused("SKILL.md frontmatter holds an unreadable quoted value") from None
        return value[1:-1].replace("''", "'") if len(value) > 1 and value[0] == value[-1] == "'" else value

    while at < len(lines):
        entry = re.match(r"([A-Za-z_][\w-]*):[ \t]*(.*)$", lines[at])
        at += 1
        if not entry:
            continue
        nested = []
        while at < len(lines) and (not lines[at].strip() or lines[at][0] in " \t"):
            nested.append(lines[at].strip())
            at += 1
        if entry[2] in ("|", "|-", "|+", ">", ">-", ">+"):
            fields[entry[1]] = ("\n" if entry[2][0] == "|" else " ").join(nested).strip()
        elif entry[2]:
            fields[entry[1]] = scalar(entry[2])
        else:
            for child in nested:
                sub = re.match(r"([A-Za-z_][\w-]*):[ \t]*(.*)$", child)
                if sub:
                    fields[f"{entry[1]}.{sub[1]}"] = scalar(sub[2])
    return fields, match[2] or ""


def meaning(text):
    """What a SKILL.md says, independent of how Notion writes it back.

    Notion returns block scalars in the frontmatter, adds its page id, drops other keys and joins the
    soft line breaks of a paragraph with `<br />`. The name is compared by its letters and digits (the
    page title is restored to the canonical one), the description and body by their words in order.
    """
    fields, body = frontmatter(text)
    return {"name": re.sub(r"[^a-z0-9]", "", fields.get("name", "").lower()),
            "description": " ".join(fields.get("description", "").split()),
            "body": digest({"words": " ".join(_BREAK.sub(" ", body).split()), **body_structure(body)})}


def file_hashes(files):
    return {path: pub.sha256(data) for path, data in sorted(files.items()) if path != "SKILL.md"}


def digest(value):
    return pub.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False))


def _targets(text, path):
    """Each relative link of a Markdown file as (match, repository path, fragment)."""
    for match in _LINK.finditer(text):
        target = match[1]
        if target.startswith(("#", "/")) or re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", target):
            continue
        file, sep, anchor = target.partition("#")
        yield match, posixpath.normpath(posixpath.join(posixpath.dirname(path), file)), sep + anchor


def project(text, path, commit, tree):
    """A page copy of a Markdown file: every relative link names the exact file of the released commit."""
    resolved = {match.start(): (target, anchor) for match, target, anchor in _targets(text, path)}

    def link(match):
        if match.start() not in resolved:
            return match[0]
        target, anchor = resolved[match.start()]
        kind = "blob" if target in tree else "tree" if any(p.startswith(target + "/") for p in tree) else None
        if kind is None:
            raise Refused(f"{path} links to {match[1]}, which is not in the released commit")
        return f"]({REPO_URL}/{kind}/{commit}/{target}{anchor})"
    return _LINK.sub(link, text)


def _zip(files):
    """Stored, not deflated: the bytes do not depend on the zlib that built them."""
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w", compression=zipfile.ZIP_STORED) as archive:
        for name, data in sorted(files.items()):
            entry = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            entry.create_system, entry.external_attr = 3, 0o100644 << 16
            archive.writestr(entry, data, compress_type=zipfile.ZIP_STORED)
    return stream.getvalue()


def build_packets(manifest, source):
    """One packet per bound released skill, from `source` (the frozen released commit). Pure; no network."""
    released = manifest["editions"]["released"]
    if source.commit != released["commit"]:
        raise Refused(f"packets are built only from the approved released commit {released['commit']}, not {source.commit}")
    sources = source.files("skills/")
    tree = set(source.paths())
    skills = sorted(p.split("/")[1] for p in sources if re.fullmatch(r"skills/[^/]+/SKILL\.md", p))
    helpers = sorted({p.split("/")[1] for p in sources} - set(skills))
    rows = {a["key"].rsplit(".", 1)[-1]: a for a in manifest["artifacts"] if a["class"] == "A"}
    if sorted(rows) != skills:
        raise Refused(f"the bound released rows {sorted(rows)} are not the skills of the released commit {skills}")
    try:
        package = json.loads(source.files("package.json")["package.json"])["version"]
        licence = source.files("LICENSE")["LICENSE"]
    except (KeyError, ValueError):
        raise Refused("the released commit has no readable package.json version or LICENSE") from None
    if released["tag"] != f"v{package}":
        raise Refused(f"the released tag {released['tag']} is not the package version {package} of its commit")
    commit, packets = source.commit, {}
    for name in skills:
        row, prefix = rows[name], f"skills/{name}/"
        if not _ID.fullmatch(str(row.get("notion"))) or not row.get("row_key") or row["source_paths"] != [prefix]:
            raise Refused(f"{row['key']}: a released row names its existing page, its catalogue Key and its one skill folder")
        used, queue = set(), [p for p in sources if p.startswith(prefix)]
        while queue:                        # the helper folders this skill reaches, whole, through its links
            path = queue.pop()
            if not path.endswith(".md"):
                continue
            for _match, target, _anchor in _targets(sources[path].decode(), path):
                folder = target.split("/")[1] if target.startswith("skills/") and target.count("/") > 1 else None
                if folder in helpers and folder not in used:
                    used.add(folder)
                    queue += [p for p in sources if p.startswith(f"skills/{folder}/")]
        exact = {p: data for p, data in sources.items() if p.split("/")[1] in {name, *used}}
        fields, _body = frontmatter(sources[prefix + "SKILL.md"].decode())
        version = fields.get("metadata.version")
        if fields.get("name") != name or not fields.get("description") or not re.fullmatch(r"\d+\.\d+\.\d+", version or ""):
            raise Refused(f"{prefix}SKILL.md does not carry this skill's name, a description and a version")
        provenance = (json.dumps({
            "format": SOURCE_FORMAT, "package": package, "tag": released["tag"], "commit": commit, "skill": name,
            "skill_version": version, "path": prefix, "resource_folders": [f"skills/{folder}/" for folder in sorted(used)],
            "source_sha256": {p: pub.sha256(data) for p, data in sorted(exact.items())}, "license_sha256": pub.sha256(licence),
            "note": "The ZIP beside this file holds these exact Git bytes at their repository paths. The Markdown files "
                    "attached to the page are reading copies whose relative links name the same commit.",
        }, indent=2, sort_keys=True) + "\n").encode()
        zip_name = f"{name}-{version}-osm-{package}-source.zip"
        files = {"LICENSE": licence, "SOURCE.json": provenance,
                 zip_name: _zip({**exact, "LICENSE": licence, "SOURCE.json": provenance})}
        for path, data in exact.items():
            inside = path[len(prefix):] if path.startswith(prefix) else "resources/" + path[len("skills/"):]
            if path.startswith(prefix) and (inside.split("/")[0] in RESERVED or inside == zip_name):
                raise Refused(f"{path} would collide with a reserved name of the packet")
            files[inside] = project(data.decode(), path, commit, tree).encode() if path.endswith(".md") else data
        header, body = sources[prefix + "SKILL.md"].decode()[4:].split("\n---\n", 1)
        intro = (f"Released reference · OSM {package} · skill {version}\n\n"
                 f"[Exact instruction source]({REPO_URL}/blob/{commit}/{prefix}SKILL.md) · commit `{commit}`. "
                 "Use the instructions supplied with your installed version. Supporting files are attached to this skill.\n\n"
                 f"[Download the OSM source package]({REPO_URL}/releases/download/{released['tag']}/osm-{package}-source.zip).\n\n")
        files["SKILL.md"] = (f"---\n{header}\n---\n\n{intro}"
                             + project(body.strip(), prefix + "SKILL.md", commit, tree) + "\n").encode()
        if any(pub.SECRET.search(data.decode("utf-8", "ignore")) for data in files.values()):
            raise Refused(f"{name}: secret-like text is refused in a public packet")
        packet = {"key": row["key"], "name": name, "page": row["notion"], "row_key": row["row_key"],
                  "title": "OSM:" + name.removeprefix("osm-"), "version": version, "package": package, "commit": commit,
                  "tag": released["tag"], "zip": zip_name, "files": files, "exact": exact, "helpers": sorted(used),
                  "skill": meaning(files["SKILL.md"].decode()), "handoff": (row.get("handoff") or {}).get("native"),
                  "writer": row["public_writer"], "adopted": row["adoption_state"] == "adopted"}
        prove_coverage(packet, sources, licence)
        packets[row["key"]] = packet
    return packets


def prove_coverage(packet, sources, licence):
    """Full byte coverage, proved on the archive as it would be sent: every file of the skill and of its
    helper folders is attached, and the ZIP holds exactly those Git bytes. Raises on the first gap."""
    name, files = packet["name"], read_archive(pack(packet["name"], packet["files"]))
    own = {p for p in sources if p.startswith(f"skills/{name}/")}
    wanted = own | {p for p in sources if p.split("/")[1] in packet["helpers"]}
    if files != packet["files"] or set(packet["exact"]) != wanted:
        raise Refused(f"{name}: the packed archive does not hold the packet")
    with zipfile.ZipFile(io.BytesIO(files[packet["zip"]])) as archive:
        inside = {entry: archive.read(entry) for entry in archive.namelist()}
    if inside != {**{p: sources[p] for p in wanted}, "LICENSE": licence, "SOURCE.json": files["SOURCE.json"]}:
        raise Refused(f"{name}: the source ZIP is not the exact released bytes")
    for path in wanted:
        inside_path = path[len(f"skills/{name}/"):] if path in own else "resources/" + path[len("skills/"):]
        if inside_path not in files or (not path.endswith(".md") and files[inside_path] != sources[path]):
            raise Refused(f"{name}: {path} is not attached")


def pack(name, files):
    """The archive Notion imports: one top-level directory named after the skill. Refuses, never truncates."""
    raw = io.BytesIO()
    with tarfile.open(fileobj=raw, mode="w") as tar:
        for path, data in sorted(files.items()):
            info = tarfile.TarInfo(f"{name}/{path}")
            info.size, info.mtime, info.mode = len(data), 0, 0o644
            tar.addfile(info, io.BytesIO(data))
    packed = gzip.compress(raw.getvalue(), mtime=0)
    if len(packed) >= MAX_ARCHIVE or len(files) >= MAX_FILES:
        raise Refused(f"{name}: the packet exceeds Notion's archive limits")
    return packed


def read_archive(data):
    """The files of a skill archive, relative to its one top-level directory. A truncated, oversized or
    unsafe archive is refused whole; nothing is written to disk."""
    if len(data) > MAX_ARCHIVE:
        raise Refused("the archive exceeds the size limit")
    try:
        raw = gzip.GzipFile(fileobj=io.BytesIO(data)).read(MAX_UNPACKED + 1)
    except (OSError, EOFError, zlib.error):
        raise Refused("the archive is not a complete gzip stream") from None
    if len(raw) > MAX_UNPACKED or len(raw) % 512 or raw[-1024:] != bytes(1024):
        raise Refused("the archive is oversized or its tar stream is cut short")
    files = {}
    try:
        with tarfile.open(fileobj=io.BytesIO(raw), mode="r:") as tar:
            for member in tar:
                if member.isdir():
                    continue
                parts = member.name.split("/")
                if (not member.isfile() or member.issparse() or "\\" in member.name or "\0" in member.name
                        or len(parts) > 20 or any(len(p.encode()) > 200 for p in parts)
                        or any(p in ("", ".", "..") for p in parts)):
                    raise Refused("the archive holds a link, a device or an unsafe path")
                body = tar.extractfile(member).read()
                if len(body) != member.size or member.name.casefold() in {p.casefold() for p in files} or len(files) >= MAX_FILES:
                    raise Refused("the archive holds a short, repeated or excessive entry")
                files[member.name] = body
    except (tarfile.TarError, EOFError, OSError):
        raise Refused("the archive is not a readable tar stream") from None
    if "SKILL.md" not in files:
        tops = {path.split("/")[0] for path in files}
        if len(tops) != 1 or any("/" not in path for path in files):
            raise Refused("the archive is not one skill directory")
        files = {path.split("/", 1)[1]: body for path, body in files.items()}
    if "SKILL.md" not in files:
        raise Refused("the archive holds no SKILL.md")
    return files


# --- the Agent Skills API ---------------------------------------------------------------------------

class SkillsApi:
    """The few official calls this publisher makes, each against an explicitly allowed page id.

    The token goes only to the API host and no redirect is followed, so it cannot reach another host.
    The signed archive address is its own credential: it is fetched without the token, never followed
    through a redirect, and never stored, logged or put in an error.
    """

    def __init__(self, allowed, env=None, opener=None, api_base=pub.API_BASE):
        env = env if env is not None else os.environ
        token = pub.clean_credential(env.get(pub.TOKEN_ENV, ""))
        if env.get(ENABLED_ENV) != "true":
            raise pub.MissingCredential(f"{ENABLED_ENV} is not 'true': live access to the public skill pages is switched off")
        if not token:
            raise pub.MissingCredential(f"the secret {pub.TOKEN_ENV} is empty or not available to this job")
        self._token, self._open, self.api_base, self._allowed = token, opener or pub.API_OPENER, api_base, frozenset(allowed)

    def _send(self, method, path, body=None, content_type="application/json", needs="Read content"):
        if path.split("/")[-2 if path.endswith("/upload") else -1] not in self._allowed:
            raise Refused("a page outside the bound released skill pages was addressed; nothing was sent")
        headers = {"Authorization": f"Bearer {self._token}", "Notion-Version": SKILLS_VERSION}
        if body is not None:
            headers["Content-Type"] = content_type
        request = urllib.request.Request(self.api_base + path, data=body, method=method, headers=headers)
        try:
            with self._open(request, timeout=pub.TIMEOUT) as response:
                raw = response.read(MAX_JSON + 1)
        except urllib.error.HTTPError as error:
            raise self._refusal(error, needs) from None
        except (urllib.error.URLError, OSError, http.client.HTTPException):
            raise pub.UnknownWrite("no answer from Notion") from None
        try:
            answer = json.loads(raw)
        except ValueError:
            answer = None
        if not isinstance(answer, dict):
            raise pub.UnknownWrite("Notion answered with a body that is not a JSON object")
        return answer

    @staticmethod
    def _refusal(error, needs):
        try:
            code = str(json.loads(error.read(MAX_JSON)).get("code", ""))
        except Exception:                       # the body is advisory; the status decides
            code = ""
        label = f"{error.code} {code}" if re.fullmatch(r"[a-z_]{1,40}", code) else str(error.code)
        if error.code == 401:
            return pub.AccessError(f"Notion answered {label}: the token in {pub.TOKEN_ENV} is invalid, expired or revoked")
        if error.code == 403:
            return pub.AccessError(f"Notion answered {label}: the dedicated connection lacks the {needs} capability for this page")
        if error.code == 404:
            return pub.AccessError(f"Notion answered {label}: the page is not shared with the dedicated connection, or is not a skill page")
        if error.code in (400, 409, 429):
            return pub.NotApplied(f"Notion answered {label}; the request was not applied")
        if 300 <= error.code < 400:
            return pub.UnknownWrite(f"Notion redirected the request ({error.code}); the redirect was not followed")
        return pub.UnknownWrite(f"Notion answered {label}")

    def page(self, page_id):
        return self._send("GET", f"pages/{page_id}")

    def skill(self, page_id):
        """The page as a skill directory: its opaque content version and a signed archive address."""
        answer = self._send("GET", f"ai/skills/{page_id}")
        if compact(answer.get("id")) != page_id or not content_version(answer.get("version_id")) \
                or not isinstance(answer.get("url"), str):
            raise Refused("the skill directory answer does not name this page, a content version and an archive")
        return answer

    def download(self, address):
        parts = urllib.parse.urlsplit(address)
        if parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
            raise Refused("the archive address is not a plain https address")
        request = urllib.request.Request(address, method="GET")     # no Authorization: the address is the credential
        try:
            with self._open(request, timeout=pub.TIMEOUT) as response:
                data = response.read(MAX_ARCHIVE + 1)
        except urllib.error.HTTPError as error:
            raise pub.UnknownWrite(f"the archive download answered {error.code}; a redirect is never followed") from None
        except (urllib.error.URLError, OSError, http.client.HTTPException):
            raise pub.UnknownWrite("no answer from the archive download") from None
        return data

    def upload(self, page_id, name, archive):
        boundary = uuid.uuid4().hex
        body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{name}.tar.gz"\r\n'
                "Content-Type: application/gzip\r\n\r\n").encode() + archive + f"\r\n--{boundary}--\r\n".encode()
        answer = self._send("POST", f"ai/skills/{page_id}/upload", body, f"multipart/form-data; boundary={boundary}",
                            needs="Read content, Insert content and Update content")
        if answer.get("status") != "completed" or compact(answer.get("page_id")) != page_id \
                or not content_version(answer.get("version_id")):
            raise pub.UnknownWrite("the upload answer does not confirm a completed import of this page")
        return answer["version_id"]

    def update(self, page_id, properties):
        self._send("PATCH", f"pages/{page_id}", json.dumps({"properties": properties}).encode(), needs="Update content")


def _text(prop):
    kind = prop.get("type")
    if kind in ("rich_text", "title"):
        return "".join(part.get("plain_text", "") for part in prop.get(kind) or [])
    if kind in ("select", "status"):
        return (prop.get(kind) or {}).get("name") or ""
    if kind == "url":
        return prop.get("url") or ""
    raise Refused(f"a property of type {kind!r} cannot be read or restored exactly")


def _value(kind, text):
    if kind in ("rich_text", "title"):
        return {kind: [{"type": "text", "text": {"content": text}}] if text else []}
    return {kind: {"name": text} if text else None} if kind in ("select", "status") else {"url": text or None}


def observe(api, packet, catalogue):
    """The page as it is: identity, title, managed properties and the whole skill directory.

    Every identity rule is checked here, before any decision: the exact page, not in the trash, a row of
    the bound catalogue with its managed properties, and an archive that names this page and this skill.
    """
    page_id = packet["page"]
    page = api.page(page_id)
    props, parent = page.get("properties") or {}, page.get("parent") or {}
    titles = [name for name, prop in props.items() if prop.get("type") == "title"]
    if page.get("object") != "page" or compact(page.get("id")) != page_id or page.get("in_trash") or page.get("archived"):
        raise Refused("the bound page was not returned as a live page with its own id")
    if catalogue not in (compact(parent.get("database_id")), compact(parent.get("data_source_id"))):
        raise Refused("the bound page is not a row of the bound public catalogue")
    if page.get("is_skill") is False or len(titles) != 1 or [name for name in MANAGED if name not in props]:
        raise Refused("the bound page is not a skill row with one title and the properties " + ", ".join(MANAGED))
    listing = api.skill(page_id)
    files = read_archive(api.download(listing["url"]))
    try:
        text = files.pop("SKILL.md").decode()
        fields, said = frontmatter(text)[0], meaning(text)
    except UnicodeDecodeError:
        raise Refused("the archived SKILL.md is not UTF-8 text") from None
    if compact(fields.get("notion_page_id") or page_id) != page_id or said["name"] != packet["skill"]["name"]:
        raise Refused("the archive names another page or another skill")
    return {"title": _text(props[titles[0]]), "title_property": titles[0], "types": {n: props[n]["type"] for n in MANAGED},
            "properties": {name: _text(props[name]) for name in MANAGED}, "files": files, "skill": said,
            "version_id": listing["version_id"], "last_edited_time": page.get("last_edited_time")}


def evidence(seen):
    """What a checkpoint keeps of an observation: digests and public values, never an address or a token."""
    return {"title": seen["title"], "properties": seen["properties"], "files": digest(file_hashes(seen["files"])),
            "skill": digest(seen["skill"]), "file_sha256": file_hashes(seen["files"]),
            "version_id": seen["version_id"], "last_edited_time": seen["last_edited_time"]}


def handoff_problems(record):
    """Shape of a recorded native handoff: exactly what a read-only preflight printed for that page."""
    ok = (isinstance(record, dict) and all(_SHA256.fullmatch(str(record.get(f))) for f in ("files", "skill"))
          and isinstance(record.get("title"), str) and isinstance(record.get("properties"), dict)
          and sorted(record["properties"]) == sorted(MANAGED) and all(isinstance(v, str) for v in record["properties"].values())
          and isinstance(record.get("read_at"), str) and record["read_at"])
    return [] if ok else ["a native handoff records the files and skill digests, title, managed properties and read time of the page it relinquishes"]


# --- decision ---------------------------------------------------------------------------------------

def expected(packet, seen):
    """The whole state this page must have: the packet, plus every history file already there, plus the
    previous edition's source ZIP moved under history/. Status is the recorded one, else kept as read."""
    files = {path: data for path, data in packet["files"].items() if path != "SKILL.md"}
    for path, data in sorted(seen["files"].items()):
        kept = path if path.startswith("history/") else \
            f"history/{path}" if "/" not in path and path.endswith("-source.zip") and path != packet["zip"] else None
        if path == packet["zip"] and data != files.get(path):
            # A changed packet format can reuse an old filename. Keep its bytes.
            kept = f"history/{path[:-4]}-{pub.sha256(data)[:12]}.zip"
        if kept is None:
            continue
        if files.get(kept, data) != data:
            raise Refused(f"attachment conflict: {kept} is already on the page with other bytes; nothing is overwritten")
        files[kept] = data
    status = (packet["handoff"] or {}).get("properties", {}).get("Status", seen["properties"]["Status"])
    return {"files": files, "skill": packet["skill"], "title": packet["title"],
            "properties": {"Key": packet["row_key"], "Version": packet["version"], "Source revision": packet["commit"],
                           "Package version": packet["package"], "Status": status}}


def _same_content(seen, want):
    return file_hashes(seen["files"]) == file_hashes(want["files"]) and seen["skill"] == want["skill"]


def _same(seen, want):
    return _same_content(seen, want) and seen["title"] == want["title"] and seen["properties"] == want["properties"]


def _built_by_ci(packet, seen, prior_packets):
    """Is the page exactly the packet this publisher builds for the earlier release its SOURCE.json names?"""
    try:
        source = json.loads(seen["files"].get("SOURCE.json", b""))
        earlier = (prior_packets(source["tag"], source["commit"]) or {}).get(packet["key"]) if source.get("format") == SOURCE_FORMAT else None
    except (ValueError, KeyError, TypeError, AttributeError, pub.PublisherError):
        return None
    if earlier is None or earlier["commit"] == packet["commit"]:
        return None
    current = {path: data for path, data in seen["files"].items() if not path.startswith("history/")}
    return earlier["tag"] if _same({**seen, "files": current}, expected({**earlier, "handoff": packet["handoff"]}, {**seen, "files": {}})) else None


def decide(packet, seen, prior_packets=None):
    """(outcome, detail, wanted state) for one observed page. Pure; never writes."""
    want = expected(packet, seen)
    record = packet["handoff"]
    if _same(seen, want):
        return pub.UNCHANGED, "supporting files, SKILL.md, title and properties are the released packet", want
    if _same_content(seen, want):
        # The import landed and only the title or properties are left: the import's own side effect, or a cut run.
        known = {name: {want["properties"][name], "", (record or {}).get("properties", {}).get(name, "")} for name in MANAGED}
        odd = [name for name in MANAGED if seen["properties"][name] not in known[name]]
        if odd or re.sub(r"[^a-z0-9]", "", seen["title"].lower()) != packet["skill"]["name"]:
            return pub.CONFLICT, ("the packet is on the page but its title or " + ", ".join(odd or ["title"])
                                  + " was changed elsewhere; not overwritten"), want
        return pub.RESUMED, "the packet is on the page; only its title and properties are restored", want
    if record and not handoff_problems(record) and (
            digest(file_hashes(seen["files"])), digest(seen["skill"]), seen["title"], seen["properties"]) == (
            record["files"], record["skill"], record["title"], record["properties"]):
        return pub.WRITTEN, "first native import after the recorded handoff", want
    earlier = _built_by_ci(packet, seen, prior_packets) if prior_packets else None
    if earlier:
        return pub.WRITTEN, f"replaces the unmodified packet this publisher built for {earlier}", want
    if not record:
        return pub.BLOCKED, "no native handoff is recorded for this page and it is not a packet this publisher built; not overwritten", want
    return pub.CONFLICT, "the page is neither the recorded handoff state nor a packet this publisher built: changed elsewhere; not overwritten", want


def differences(seen, want):
    """Short names of what differs, for a visible result."""
    have, need = file_hashes(seen["files"]), file_hashes(want["files"])
    out = sorted(path for path in set(have) | set(need) if have.get(path) != need.get(path))
    out += ["SKILL.md"] if seen["skill"] != want["skill"] else []
    out += ["title"] if seen["title"] != want["title"] else []
    return out + [name for name in MANAGED if seen["properties"][name] != want["properties"][name]]


# --- anonymous public read --------------------------------------------------------------------------

def _letters(text):
    return re.sub(r"[\W_]+", "", text).lower()


def plain_lines(markdown):
    """The words a reader sees for a SKILL.md body, one entry per source line: link targets and markup
    are dropped and only letters and digits are compared, so the rendering of punctuation does not matter."""
    body = frontmatter(markdown)[1] if markdown.startswith("---\n") else markdown
    lines = (re.sub(r"^\s*(#{1,6}|[-*+]|\d+\.|>)\s+", "", line) for line in _BREAK.sub("\n", body).split("\n"))
    return [line for line in (_letters(re.sub(r"\[([^\]]*)\]\([^)\s]*\)", r"\1", line)) for line in lines) if line]


def public_state(reader, packet):
    """Does an anonymous reader actually see this skill and its catalogue entry? A page that answers 200
    with a script shell shows none of the text and is a failure, not a pass."""
    if reader is None:
        return pub.UNSUPPORTED, pub.NO_READER
    state, text = reader.read(f"{reader.base}/{packet['page']}")
    if state != pub.VERIFIED:
        return pub.FAILED, f"the public page was not read ({text})"
    shown, at = _letters(text), 0
    for number, line in enumerate(plain_lines(packet["files"]["SKILL.md"].decode()), 1):
        at = shown.find(line, at) + len(line) if shown.find(line, at) >= 0 else -1
        if at < 0:
            return pub.FAILED, (f"the anonymous page does not show line {number} of the skill text in order; an answer "
                                "without the text (such as a script shell) establishes nothing")
    state, text = reader.read(reader.catalogue_url)
    if state != pub.VERIFIED or _letters(packet["title"]) not in _letters(text):
        return pub.FAILED, "the public catalogue was not read or does not show this skill"
    return pub.VERIFIED, "the anonymous page shows the skill text in order and the catalogue shows the skill"


# --- runs -------------------------------------------------------------------------------------------

def _row(packet, outcome, detail, **more):
    return {"key": packet["key"], "page": packet["page"], "outcome": outcome, "detail": detail, **more}


def _read(api, packet, catalogue):
    """An observation, or the row that says precisely why there is none."""
    try:
        return observe(api, packet, catalogue), None
    except pub.AccessError as error:
        return None, _row(packet, pub.BLOCKED, f"missing access: {error}")
    except Refused as error:
        return None, _row(packet, pub.BLOCKED, str(error))
    except (pub.UnknownWrite, pub.NotApplied) as error:
        return None, _row(packet, pub.UNREADABLE, f"the page could not be read: {error}")


def _plan_row(api, packet, catalogue, prior_packets):
    seen, failed = _read(api, packet, catalogue)
    if failed:
        return failed
    try:
        outcome, detail, want = decide(packet, seen, prior_packets)
    except Refused as error:
        return _row(packet, pub.CONFLICT, str(error), before=evidence(seen))
    row = _row(packet, outcome, detail, before=evidence(seen))
    row["_seen"], row["_want"] = seen, want
    if outcome not in (pub.UNCHANGED,):
        row["differs"] = differences(seen, want)
    return row


def preflight(manifest, packets, api, reader=None, prior_packets=None, read_at=None):
    """Qualification, read-only: page and skill GETs and anonymous reads, never a write. Each row carries
    the handoff record a reviewer may copy into the manifest once the page is the state to relinquish."""
    catalogue, rows = manifest["reading_export"]["catalogue"], []
    read_at = read_at or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    for packet in packets.values():
        row = _plan_row(api, packet, catalogue, prior_packets)
        if row["outcome"] in (pub.WRITTEN, pub.RESUMED):
            row["outcome"], row["detail"] = pub.WOULD_WRITE, f"would be written ({row['detail']}); a preflight writes nothing"
        seen = row.pop("_seen", None)
        row.pop("_want", None)
        if seen:
            row["handoff"] = {"native": {**{k: row["before"][k] for k in ("files", "skill", "title", "properties", "version_id")},
                                         "read_at": read_at}}
            row["public"] = dict(zip(("state", "detail"), public_state(reader, packet)))
        rows.append(row)
    return {"mode": "preflight", "commit": manifest["editions"]["released"]["commit"], "read_at": read_at, "rows": rows}


def _write(api, packet, row, catalogue):
    """One page: import the whole packet if it differs, restore the title and properties, read everything back.
    A write that may or may not have happened is read before anything else and is never repeated in the run."""
    seen, want, page_id = row.pop("_seen"), row.pop("_want"), packet["page"]
    before_properties, before_title = dict(seen["properties"]), seen["title"]

    def stop(outcome, detail):
        row["outcome"], row["detail"] = outcome, detail
        return False

    def again(why):
        after, failed = _read(api, packet, catalogue)
        if failed:
            stop(pub.UNKNOWN_WRITE if row.get("sent") else failed["outcome"], f"{why}; then {failed['detail']}; inspect before any repeat")
        return after

    try:
        if api.skill(page_id)["version_id"] != seen["version_id"]:
            return stop(pub.CONFLICT, "the page changed after it was read; not overwritten")
        if row["outcome"] == pub.WRITTEN:
            row["sent"] = True
            try:
                row["uploaded_version_id"] = api.upload(page_id, packet["name"], pack(packet["name"], {**want["files"], "SKILL.md": packet["files"]["SKILL.md"]}))
            except pub.UnknownWrite as error:
                after = again(f"the import got no usable answer ({error})")
                if after is None:
                    return False
                if not _same_content(after, want):
                    untouched = evidence(after) == row["before"]
                    return stop(pub.UNKNOWN_WRITE, f"the import got no usable answer ({error}); read back: " + (
                        "the page is unchanged, so it was not applied; not repeated in this run" if untouched
                        else "the page is in neither state; inspect before any repeat"))
                seen = after
            else:
                seen = again("the import completed")
                if seen is None:
                    return False
                if not _same_content(seen, want):
                    return stop(pub.PARTIAL, "the import completed but reads back differently: " + ", ".join(differences(seen, want)[:6]))
        unexpected = [name for name in MANAGED if seen["properties"][name] not in
                      (before_properties[name], want["properties"][name], "")]
        title_known = (seen["title"] in (before_title, want["title"]) or
                       re.sub(r"[^a-z0-9]", "", seen["title"].lower()) == packet["skill"]["name"])
        if unexpected or not title_known:
            return stop(pub.CONFLICT, "title or properties changed during the import; preserving the concurrent edit")
        changes = {name: _value(seen["types"][name], want["properties"][name]) for name in MANAGED
                   if seen["properties"][name] != want["properties"][name]}
        if seen["title"] != want["title"]:
            changes[seen["title_property"]] = _value("title", want["title"])
        if changes:
            row["sent"] = True
            try:
                api.update(page_id, changes)
            except pub.PublisherError as error:
                return stop(pub.PARTIAL, f"the packet is on the page but its title and properties were not restored ({error}); a rerun reads the page and resumes")
            seen = again("the title and properties were restored")
            if seen is None:
                return False
    except pub.AccessError as error:
        return stop(pub.BLOCKED, f"missing access: {error}")
    except pub.NotApplied as error:
        return stop(pub.REJECTED, f"{error}; nothing changed")
    except pub.UnknownWrite as error:
        return stop(pub.UNKNOWN_WRITE if row.get("sent") else pub.UNREADABLE, f"{error}; inspect before any repeat")
    row["after"] = evidence(seen)
    if not _same(seen, want):
        return stop(pub.PARTIAL, "the final read differs from the released packet: " + ", ".join(differences(seen, want)[:6]))
    return True


def publish(manifest, packets, api, tag_resolver, reader=None, prior_packets=None, write=False, max_writes=1, only=None):
    """One serialized run over the pages CI owns. Off unless the manifest is active and `write` is set; at
    most `max_writes` pages may need a write, or none is written. A page is complete only when its final
    read equals the packet and an anonymous reader sees it."""
    if not manifest["activation"]["active"]:
        raise pub.PublisherError("the publisher is not active; refusing to write")
    pub.resolve_released(manifest, tag_resolver)
    if only and only not in packets:
        raise pub.PublisherError(f"--only {only}: no released skill row has this Key")
    catalogue, rows = manifest["reading_export"]["catalogue"], []
    for packet in packets.values():
        if only and packet["key"] != only:
            continue
        if packet["writer"] != "ci" or not packet["adopted"]:
            rows.append(_row(packet, pub.PENDING_HANDOFF, f"public writer is {packet['writer']}; CI writes nothing until the handoff"))
        elif packet["handoff"] is not None and handoff_problems(packet["handoff"]):
            rows.append(_row(packet, pub.BLOCKED, handoff_problems(packet["handoff"])[0]))
        else:
            rows.append(_plan_row(api, packet, catalogue, prior_packets))
    todo = [row for row in rows if row["outcome"] in (pub.WRITTEN, pub.RESUMED)]
    stopped = [row for row in rows if row["outcome"] not in pub.OK_OUTCOMES]
    result = {"mode": "publish" if write else "plan", "commit": manifest["editions"]["released"]["commit"], "rows": rows}
    if not write or stopped or len(todo) > max_writes:
        why = ("the write gate is off (--write was not given)" if not write
               else f"{stopped[0]['key']} failed before any write" if stopped
               else f"{len(todo)} pages need a write and the gate allows {max_writes}")
        for row in todo:
            row["outcome"], row["detail"] = (pub.WOULD_WRITE if not write else pub.HELD), f"not written: {why} ({row['detail']})"
            row.pop("_seen"), row.pop("_want")
    else:
        for row in todo:
            if not _write(api, packets[row["key"]], row, catalogue):
                for later in todo[todo.index(row) + 1:]:
                    later["outcome"], later["detail"] = pub.HELD, f"not written: {row['key']} did not complete"
                    later.pop("_seen"), later.pop("_want")
                break
    for row in rows:
        row.pop("_seen", None), row.pop("_want", None), row.pop("sent", None)
        if row["outcome"] in (pub.WRITTEN, pub.RESUMED, pub.UNCHANGED):
            state, detail = public_state(reader, packets[row["key"]])
            row["public"] = {"state": state, "detail": detail}
            if state != pub.VERIFIED and (row["outcome"] != pub.UNCHANGED or reader is not None):
                row["outcome"] = pub.UNSUPPORTED if state == pub.UNSUPPORTED else pub.HELD
                row["detail"] = f"HOLD: the page is the released packet but is not established publicly: {detail}"
    return result


def failing(result):
    quiet = pub.OK_OUTCOMES | ({pub.WOULD_WRITE} if result["mode"] != "publish" else set())
    return [row for row in result["rows"] if row["outcome"] not in quiet]


def report(result, manifest):
    """The visible result. It claims automatic publication only when every gate is recorded and every row passed."""
    mode, rows, activation = result["mode"], result["rows"], manifest["activation"]
    title = {"preflight": "Native skill preflight (read-only)", "plan": "Native skill plan (no write)",
             "publish": "Native skill publication"}[mode]
    qualified = len(rows) == len([a for a in manifest['artifacts'] if a['class'] == 'A']) \
        and bool(activation["active"] and activation.get("public_reader")) and mode == "publish" and not failing(result) \
        and all(row["outcome"] != pub.PENDING_HANDOFF for row in rows)
    wrote = [row["key"] for row in rows if row["outcome"] in (pub.WRITTEN, pub.RESUMED)]
    lines = [f"# {title}", "", f"Frozen released commit: `{result['commit']}`",
             "Automatic publication: " + ("active for this run" if qualified else "NOT active or not qualified; this run proves no automatic publication"),
             "Written: " + (", ".join(wrote) if wrote else "nothing"), "",
             "| Key | Outcome | Detail | Anonymous public read |", "| --- | --- | --- | --- |"]
    for row in rows:
        seen = row.get("public") or {}
        lines.append(f"| {row['key']} | {row['outcome']} | {row['detail']} | {seen.get('state', 'not read')}"
                     + (f": {seen['detail']}" if seen.get("detail") else "") + " |")
    return "\n".join(lines) + "\n"


# --- command line -----------------------------------------------------------------------------------

def _prior_packets(manifest, repo, resolver):
    """Packets of an earlier approved release, rebuilt from its tag, to recognise this publisher's own output."""
    def build(tag, commit):
        if not re.fullmatch(r"v\d+\.\d+\.\d+", str(tag)) or resolver(tag) != commit:
            return None
        earlier = json.loads(json.dumps(manifest))
        earlier["editions"]["released"].update(tag=tag, commit=commit)
        return build_packets(earlier, pub.GitSource(repo, commit))
    return build


def main(argv=None, *, manifest=None, opener=None, env=None, tag_resolver=None, source=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = parser.add_subparsers(dest="command", required=True)
    for name, text in (("build", "credential-free: build the released packets and prove their byte coverage"),
                       ("preflight", "qualification: read the bound pages and their public view; never writes"),
                       ("publish", "import the released packets into the pages CI owns; off without --write")):
        command = sub.add_parser(name, help=text)
        command.add_argument("--repo", default=str(pub.HERE.parent))
        command.add_argument("--out", help="write the visible result here")
        if name == "build":
            command.add_argument("--packets", help="also write each archive into this directory")
            continue
        command.add_argument("--checkpoint", help="write the per-page evidence (digests, never an address or token) here")
        command.add_argument("--public-base", default=os.environ.get("OSM_PUBLIC_DOCS_BASE"))
        command.add_argument("--public-catalogue", default=os.environ.get("OSM_PUBLIC_DOCS_CATALOGUE"))
        command.add_argument("--browser-public-read", action="store_true", help="read anonymous visible public content in an isolated CI browser")
        if name == "publish":
            command.add_argument("--write", action="store_true", help="the explicit write gate; without it the run only plans")
            command.add_argument("--max-writes", type=int, default=1, help="refuse the whole run if more pages need a write")
            command.add_argument("--only", help="the bounded proof: this one Key")
    args = parser.parse_args(argv)
    manifest = manifest or pub.load_manifest()
    resolver = tag_resolver or pub.git_tag_resolver(args.repo)
    actions = (env if env is not None else os.environ).get("GITHUB_ACTIONS") == "true"

    def emit(text, code, problem=None):
        if args.out:
            pub.Path(args.out).write_text(text)
        sys.stdout.write(text)
        if problem and actions:
            print("::error title=Public skill pages::" + re.sub(r"[\r\n%]", " ", problem))
        return code

    try:
        problems = pub.validate_manifest(manifest)
        if problems:
            raise pub.SetupError("manifest problems: " + "; ".join(problems))
        commit = pub.resolve_released(manifest, resolver, require_tag=args.command != "build")
        if args.command != "build":         # the access settings are checked first, so a missing one is named at once
            api = SkillsApi({a["notion"] for a in manifest["artifacts"] if a["class"] == "A"}, env=env, opener=opener)
        packets = build_packets(manifest, source or pub.GitSource(args.repo, commit))
        if args.command == "build":
            lines = ["# Released skill packets (built, not published)", "", f"Frozen released commit: `{commit}`", "",
                     "| Skill | Version | Files | Helper folders | Archive bytes |", "| --- | --- | --- | --- | --- |"]
            for packet in packets.values():
                archive = pack(packet["name"], packet["files"])
                if args.packets:
                    pub.Path(args.packets).mkdir(parents=True, exist_ok=True)
                    (pub.Path(args.packets) / f"{packet['name']}.tar.gz").write_bytes(archive)
                lines.append(f"| {packet['name']} | {packet['version']} | {len(packet['files'])} | "
                             f"{', '.join(packet['helpers']) or '-'} | {len(archive)} |")
            return emit("\n".join(lines) + "\n", 0)
        reader = None
        if args.public_base or args.public_catalogue:
            if args.command == "publish" and manifest["activation"].get("public_reader") is None:
                raise pub.SetupError("a public address is set but no public reader is qualified in the manifest; refusing unused configuration")
            if args.browser_public_read:
                from browser_reader import BrowserReader
                reader = BrowserReader(args.public_base, args.public_catalogue, packets)
            else:
                reader = pub.PublicReader(args.public_base, args.public_catalogue, opener=opener)
        elif args.command == "publish" and manifest["activation"].get("public_reader") is not None:
            raise pub.SetupError("the qualified public reader needs --public-base and --public-catalogue")
        prior = None if source else _prior_packets(manifest, args.repo, resolver)
        if args.command == "preflight":
            result = preflight(manifest, packets, api, reader, prior)
        else:
            result = publish(manifest, packets, api, resolver, reader, prior, write=args.write, max_writes=args.max_writes, only=args.only)
    except pub.MissingCredential as error:
        return emit(f"# Native skill pages\n\nMISSING ACCESS: {error}. Nothing was read or written.\n", 3, f"missing access: {error}")
    except pub.PublisherError as error:
        return emit(f"# Native skill pages\n\nFAIL-CLOSED: {error}\n\nNothing was written.\n", 3, str(error))
    if args.checkpoint:
        pub.Path(args.checkpoint).write_text(json.dumps(result, indent=1, ensure_ascii=False, sort_keys=True) + "\n")
    bad = failing(result)
    return emit(report(result, manifest), 4 if bad else 0,
                "; ".join(f"{row['key']}: {row['detail']}" for row in bad)[:900] if bad else None)


if __name__ == "__main__":
    sys.exit(main())
