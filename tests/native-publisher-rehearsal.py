#!/usr/bin/env python3
"""Fixture rehearsal of the native whole-skill publisher (#110).

The packets are built from the bound released commit of this repository. Every request goes to
FakeSkills, an in-memory stand-in for the documented Notion calls the publisher makes: the page
object, `GET ai/skills/{id}` with a signed archive address on another host, the multipart
`POST ai/skills/{id}/upload`, the page property update and an anonymous public site. It writes
SKILL.md back the way real Notion readbacks of these pages were observed to: block scalars, its page
id, and `<br />` for the soft line breaks of a paragraph. Nothing here contacts Notion, reads a
credential or proves a live publication; a pass is fixture proof only.
"""

import copy
import hashlib
import html
import io
import json
import re
import sys
import tarfile
import tempfile
import urllib.error
import urllib.parse
import zipfile
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "docs-publisher"))

import native_skills as ns  # noqa: E402
import publisher as pub  # noqa: E402

RECORDED = pub.load_manifest()
# These scenarios start before a handoff regardless of the actual operational
# state. Activation is a reviewed deployment fact, not a perpetual test fixture.
REAL = copy.deepcopy(RECORDED)
REAL['activation'].update(active=False, public_reader=None, live_proof='not-run')
for artifact in REAL['artifacts']:
    if artifact['class'] == 'A':
        artifact.update(public_writer='existing-upkeep', adoption_state='pending-handoff')
        artifact.pop('handoff', None)
RELEASED = REAL["editions"]["released"]
GIT = pub.GitSource(ROOT, RELEASED["commit"])
# The same released bytes held in memory, so a scenario can rebuild the packets without rereading Git.
TREE = {**{path: b"" for path in GIT.paths()}, **GIT.files("skills/"), **GIT.files("package.json"), **GIT.files("LICENSE")}
SOURCE = pub.DictSource(TREE, RELEASED["commit"])
CATALOGUE = REAL["reading_export"]["catalogue"]
TOKEN, SIGNED = "fixture-token-value-1234567890", "SIGNED-ADDRESS-SECRET"
API, FILES, SITE = "https://api.notion.com/v1/", "https://files.fixture.invalid/", "https://public.fixture.invalid"
ENV = {pub.TOKEN_ENV: TOKEN, ns.ENABLED_ENV: "true"}
COUNCIL, SETUP = "osm.released.skill.osm-council", "osm.released.skill.osm-setup"
TESTS = []


def test(function):
    TESTS.append(function)
    return function


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def resolver(tag):
    return RELEASED["commit"] if tag == RELEASED["tag"] else None


def adopted(manifest=REAL, handoffs=None, reader=False):
    """A copy of the manifest as a reviewed activation would record it. Never written to disk."""
    manifest = copy.deepcopy(manifest)
    manifest["activation"]["active"] = True
    if reader:
        manifest["activation"]["public_reader"] = {"reviewed_in": "fixture"}
    for artifact in manifest["artifacts"]:
        if artifact["class"] == "A":
            artifact.update(public_writer="ci", adoption_state="adopted")
            if handoffs and artifact["key"] in handoffs:
                artifact["handoff"] = handoffs[artifact["key"]]
    return manifest


PACKETS = ns.build_packets(REAL, GIT)


def dashed(page_id):
    return "-".join((page_id[:8], page_id[8:12], page_id[12:16], page_id[16:20], page_id[20:]))


class _Response:
    def __init__(self, body, status=200):
        self._body, self.status = body if isinstance(body, bytes) else json.dumps(body).encode(), status

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def read(self, limit=-1):
        return self._body if limit < 0 else self._body[:limit]


def notion_markdown(page_id, page):
    """SKILL.md as Notion generates it from a page: the name is the page title."""
    lines, fenced = [], False
    for line in page["body"].split("\n"):
        starts = not lines or not lines[-1].strip() or not line.strip() or re.match(r"\s*([-*+]|\d+\.|#{1,6}|\|)\s", line)
        if line.strip().startswith("```"):
            fenced, starts = not fenced, True
        if fenced or starts or lines[-1].strip().startswith("```"):
            lines.append(line if fenced else line.strip() if not re.match(r"\s*([-*+]|\d+\.)\s", line) else line)
        else:
            lines[-1] += "<br />" + line.strip()
    return (f"---\nname: |-\n  {page['title']}\ndescription: |-\n  {page['description']}\n"
            f"notion_page_id: {dashed(page_id)}\n---\n\n" + "\n".join(lines).strip() + "\n")


class FakeSkills:
    """Pages of one Skills database, the Agent Skills endpoints and an anonymous public site."""

    def __init__(self):
        self.pages, self.log, self.fail, self.leaks = {}, [], {}, []
        self.revoked, self.unshared, self.capabilities = False, set(), {"read", "insert", "update"}
        self.clears, self.merges, self.shell, self.serve, self.before = ("Status",), False, False, None, None
        self.redirect_api = self.redirect_files = False

    # -- state --
    def seed(self, packet, files, body, title=None, **props):
        values = {"Key": packet["row_key"], "Version": packet["version"], "Source": "https://example.invalid/old-source", "Source revision": "0" * 40,
                  "Package version": packet["package"], "Status": "Released", **props}
        self.pages[packet["page"]] = {
            "title": title or packet["title"], "description": "An earlier description.", "body": body, "files": dict(files),
            "props": {name: ["url" if name == "Source" else "select" if name == "Status" else "rich_text", value] for name, value in values.items()},
            "parent": CATALOGUE, "trashed": False, "edits": 1}

    def version(self, page_id):
        page = self.pages[page_id]
        return hashlib.sha256(repr((page["title"], page["description"], page["body"], sorted(page["files"].items()),
                                    page["edits"])).encode()).hexdigest()

    def archive(self, page_id):
        page = self.pages[page_id]
        return ns.pack(re.sub(r"[^A-Za-z0-9-]", "-", page["title"]),
                       {**page["files"], "SKILL.md": notion_markdown(page_id, page).encode()})

    def writes(self):
        return [(method, kind) for method, kind, _page in self.log if method != "GET"]

    # -- the opener --
    def _error(self, request, status, code="object_not_found"):
        return urllib.error.HTTPError(request.full_url, status, "fixture", {}, io.BytesIO(json.dumps({"code": code}).encode()))

    def __call__(self, request, timeout=None):
        url, method = request.full_url, request.get_method()
        if url.startswith(SITE):
            require(not request.has_header("Authorization"), "the anonymous read carries no credential")
            return self._public(url[len(SITE):].strip("/"))
        if url.startswith(FILES):
            self.log.append(("GET", "archive", ""))
            if request.has_header("Authorization") or TOKEN in url:
                self.leaks.append(url)
            if SIGNED not in url:
                raise self._error(request, 403)
            if self.redirect_files:
                raise urllib.error.HTTPError(url, 302, "moved", {"Location": "https://elsewhere.invalid/"}, io.BytesIO())
            page_id = urllib.parse.urlsplit(url).path.strip("/").split(".")[0]
            return _Response(self.serve(page_id) if self.serve else self.archive(page_id))
        if not url.startswith(API):
            self.leaks.append(url)
            raise AssertionError(f"a request left the allowed hosts: {urllib.parse.urlsplit(url).hostname}")
        path = url[len(API):]
        kind = "upload" if path.endswith("/upload") else "skill" if path.startswith("ai/skills/") else "page"
        page_id = path.split("/")[-2 if kind == "upload" else -1]
        self.log.append((method, kind, page_id))
        if request.get_header("Authorization") != f"Bearer {TOKEN}" or self.revoked:
            raise self._error(request, 401, "unauthorized")
        require(request.get_header("Notion-version") == ns.SKILLS_VERSION, "the documented API version is sent")
        if self.redirect_api:
            raise urllib.error.HTTPError(url, 307, "moved", {"Location": "https://elsewhere.invalid/"}, io.BytesIO())
        if self.before:
            self.before(method, kind, page_id)
        planned = self.fail.pop((method, kind), None)
        if planned in ("lost-before", 500, 400, 429):
            if planned == "lost-before":
                raise urllib.error.URLError("timed out")
            raise self._error(request, planned, "internal_server_error" if planned == 500 else "validation_error")
        if page_id not in self.pages or page_id in self.unshared:
            raise self._error(request, 404, "object_not_found" if kind == "page" else "directory_not_found")
        need = {"GET": "read", "POST": "insert", "PATCH": "update"}[method]
        if need not in self.capabilities:
            raise self._error(request, 403, "restricted_resource")
        answer = getattr(self, f"_{kind}_{method.lower()}")(request, page_id)
        if planned == "lost-after":
            raise urllib.error.URLError("timed out")
        return _Response(answer)

    def _page_get(self, request, page_id):
        page = self.pages[page_id]
        props = {"Name": {"type": "title", "title": [{"plain_text": page["title"]}]}}
        for name, (kind, value) in page["props"].items():
            props[name] = {"type": kind, kind: value if kind == "url" else [{"plain_text": value}] if kind == "rich_text" else ({"name": value} if value else None)}
        return {"object": "page", "id": dashed(page_id), "in_trash": page["trashed"], "is_skill": True, "properties": props,
                "last_edited_time": f"2026-11-20T00:00:{page['edits']:02d}.000Z",
                "parent": {"type": "data_source_id", "data_source_id": "fixture-source", "database_id": dashed(page["parent"])}}

    def _page_patch(self, request, page_id):
        page = self.pages[page_id]
        for name, value in json.loads(request.data)["properties"].items():
            if name == "Name":
                page["title"] = "".join(part["text"]["content"] for part in value["title"])
            elif page["props"][name][0] == "url":
                page["props"][name][1] = value["url"] or ""
            elif page["props"][name][0] == "select":
                page["props"][name][1] = (value["select"] or {}).get("name", "")
            else:
                page["props"][name][1] = "".join(part["text"]["content"] for part in value["rich_text"])
        page["edits"] += 1
        return self._page_get(request, page_id)

    def _skill_get(self, request, page_id):
        return {"id": dashed(page_id), "version_id": self.version(page_id),
                "url": f"{FILES}{page_id}.tar.gz?X-Amz-Signature={SIGNED}&X-Amz-Expires=3600"}

    def _upload_post(self, request, page_id):
        boundary = request.get_header("Content-type").split("boundary=")[1].encode()
        head, _sep, rest = request.data.split(b"--" + boundary)[1].partition(b"\r\n\r\n")
        require(b'name="file"' in head and b"application/gzip" in head, "one gzip `file` part is sent")
        files = ns.read_archive(rest[:-2])
        fields, body = ns.frontmatter(files.pop("SKILL.md").decode())
        page = self.pages[page_id]
        page.update(title=fields["name"], description=fields["description"], body=body.strip(),
                    files={**page["files"], **files} if self.merges else files, edits=page["edits"] + 1)
        for name in self.clears:
            page["props"][name][1] = ""
        return {"status": "completed", "page_id": dashed(page_id), "version_id": self.version(page_id)}

    def _public(self, page_id):
        if self.shell:
            return _Response(b"<html><head><title>Notion</title><script>window.app = {}</script></head>"
                             b"<body><div id='notion-app'></div><noscript>JavaScript is required</noscript></body></html>")
        if page_id == CATALOGUE:
            rows = "".join(f"<li><a href='/{pid}'>{html.escape(page['title'])}</a></li>" for pid, page in self.pages.items())
            return _Response(f"<html><body><h1>OSM skills</h1><ul>{rows}</ul></body></html>".encode())
        if page_id not in self.pages:
            raise urllib.error.HTTPError(SITE, 404, "missing", {}, io.BytesIO())
        text = re.sub(r"\[([^\]]*)\]\(([^)\s]*)\)", r"\1", self.pages[page_id]["body"])
        text = re.sub(r"(?m)^\s*(#{1,6}|[-*+]|\d+\.|>)\s+", "", text.replace("**", "").replace("`", "").replace("|", " "))
        paragraphs = "".join(f"<p>{html.escape(line)}</p>" for line in text.split("\n") if line.strip())
        return _Response(f"<html><body><h1>{html.escape(self.pages[page_id]['title'])}</h1>{paragraphs}</body></html>".encode())


HISTORY = {"history/SOURCE.json": b'{"note": "earlier edition"}\n', "history/osm-earlier-v0.30.0.zip": b"PK-earlier-edition"}


def world(only=None):
    """Every bound page as the existing upkeep left it: an earlier packet with its history."""
    fake = FakeSkills()
    for key, packet in PACKETS.items():
        if only and key not in only:
            continue
        own = {path: data for path, data in packet["files"].items() if not path.startswith("resources/") and path != "SKILL.md"}
        own[packet["zip"]] = b"PK-the-earlier-form-of-this-source-zip"
        fake.seed(packet, {**own, **HISTORY}, "An earlier body.\n\n- one\n- two")
    return fake


def api(fake, env=ENV):
    return ns.SkillsApi({packet["page"] for packet in PACKETS.values()}, env=env, opener=fake)


def reader(fake):
    return pub.PublicReader(SITE, f"{SITE}/{CATALOGUE}", opener=fake)


def handoffs(fake):
    """The handoff records a reviewer would copy from a read-only preflight."""
    result = ns.preflight(REAL, PACKETS, api(fake), read_at="2026-11-20T00:00:00Z")
    require(not fake.writes(), "a preflight sends only reads")
    return {row["key"]: row["handoff"] for row in result["rows"] if "handoff" in row}


def run(fake, manifest, packets=None, **options):
    packets = packets or ns.build_packets(manifest, SOURCE)
    return ns.publish(manifest, packets, api(fake), options.pop("tags", resolver), **options)


def outcomes(result):
    return {row["key"]: row["outcome"] for row in result["rows"]}


def handed_over(only=None, **options):
    fake = world(only)
    manifest = adopted(handoffs=handoffs(fake), **options)
    fake.log.clear()
    return fake, manifest


# --- packets ----------------------------------------------------------------------------------------

@test
def packets_cover_every_released_byte_and_are_reproducible():
    require(len(PACKETS) == 7 and sorted(PACKETS) == sorted(a["key"] for a in REAL["artifacts"] if a["class"] == "A"),
            "one packet per bound released skill")
    sources = GIT.files("skills/")
    helpers = {p.split("/")[1] for p in sources} - {packet["name"] for packet in PACKETS.values()}
    require(len(helpers) == 4, f"the release has four resource-only folders: {sorted(helpers)}")
    for packet in PACKETS.values():
        files, prefix = packet["files"], f"skills/{packet['name']}/"
        own = {p: data for p, data in sources.items() if p.startswith(prefix)}
        require(all(p[len(prefix):] in files for p in own), f"{packet['name']}: every own file is attached")
        require(set(packet["helpers"]) <= helpers and all(
            f"resources/{p[len('skills/'):]}" in files for p in sources if p.split("/")[1] in packet["helpers"]),
            f"{packet['name']}: each referenced helper folder is attached whole")
        with zipfile.ZipFile(io.BytesIO(files[packet["zip"]])) as archive:
            inside = {name: archive.read(name) for name in archive.namelist()}
        provenance = json.loads(files["SOURCE.json"])
        require(all(inside[p] == sources[p] for p in provenance["source_sha256"]) and own.keys() <= inside.keys()
                and inside["LICENSE"] == files["LICENSE"] == GIT.files("LICENSE")["LICENSE"], "the ZIP holds the exact Git bytes and the license")
        require(provenance["commit"] == RELEASED["commit"] and provenance["tag"] == RELEASED["tag"]
                and provenance["source_sha256"] == {p: pub.sha256(inside[p]) for p in provenance["source_sha256"]}, "provenance names the frozen release")
        require(f"blob/{RELEASED['commit']}/" in files["SKILL.md"].decode() and "](../" not in files["SKILL.md"].decode(),
                "relative links name the exact released file")
        require(ns.read_archive(ns.pack(packet["name"], files)) == files, "the archive holds the packet")
    require(PACKETS[SETUP]["helpers"] and any(p.startswith("resources/osm/") for p in PACKETS[SETUP]["files"]), "Setup carries the helpers it links")
    again = ns.build_packets(REAL, SOURCE)
    require(all(ns.pack(p["name"], p["files"]) == ns.pack(p["name"], again[k]["files"]) for k, p in PACKETS.items()),
            "a rebuild from the same bytes is byte-identical")


@test
def packets_are_built_only_from_the_approved_release():
    for change, expected in (({"commit": "f" * 40}, "approved released commit"), ({"tag": "v9.9.9"}, "not the package version")):
        moved = copy.deepcopy(REAL)
        moved["editions"]["released"].update(change)
        try:
            ns.build_packets(moved, SOURCE)
        except ns.Refused as error:
            require(expected in str(error), str(error))
        else:
            raise AssertionError(f"a release that moved is refused: {change}")
    fewer = copy.deepcopy(REAL)
    fewer["artifacts"] = [a for a in fewer["artifacts"] if a["key"] != COUNCIL]
    try:
        ns.build_packets(fewer, SOURCE)
    except ns.Refused as error:
        require("are not the skills of the released commit" in str(error), str(error))
    else:
        raise AssertionError("a skill with no bound page is refused, never given a new one")
    out = io.StringIO()
    with redirect_stdout(out):
        code = ns.main(["build", "--repo", str(ROOT)])
    require(code == 0 and out.getvalue().count("| osm-") == 7, "the credential-free build command proves the seven packets")


@test
def cut_unsafe_and_oversized_archives_are_refused():
    good = ns.pack("osm-x", {"SKILL.md": b"---\nname: osm-x\ndescription: d\n---\nbody\n", "a/b.txt": b"1"})
    require(sorted(ns.read_archive(good)) == ["SKILL.md", "a/b.txt"], "a whole archive is read")

    def tar(members, end=True):
        raw = io.BytesIO()
        with tarfile.open(fileobj=raw, mode="w") as archive:
            for name, kind, data in members:
                info = tarfile.TarInfo(name)
                info.type, info.size, info.linkname = kind, len(data), "SKILL.md" if kind != tarfile.REGTYPE else ""
                archive.addfile(info, io.BytesIO(data))
        data = raw.getvalue()
        return ns.gzip.compress(data if end else data.rstrip(b"\0") + bytes(-len(data.rstrip(b"\0")) % 512))

    skill = ("osm-x/SKILL.md", tarfile.REGTYPE, b"---\nname: osm-x\ndescription: d\n---\n")
    bad = {"cut gzip": good[:-9], "not gzip": b"plain", "tar without its end": tar([skill], end=False),
           "symbolic link": tar([skill, ("osm-x/link", tarfile.SYMTYPE, b"")]),
           "hard link": tar([skill, ("osm-x/link", tarfile.LNKTYPE, b"")]),
           "parent path": tar([skill, ("osm-x/../escape", tarfile.REGTYPE, b"1")]),
           "absolute path": tar([skill, ("/etc/passwd", tarfile.REGTYPE, b"1")]),
           "repeated entry": tar([skill, skill]), "two directories": tar([skill, ("other/file", tarfile.REGTYPE, b"1")]),
           "no SKILL.md": tar([("osm-x/readme", tarfile.REGTYPE, b"1")]), "oversized": bytes(ns.MAX_ARCHIVE + 1)}
    for name, data in bad.items():
        try:
            ns.read_archive(data)
        except ns.Refused:
            continue
        raise AssertionError(f"an archive with a {name} is refused")


@test
def a_notion_readback_means_the_same_and_an_edit_does_not():
    packet = PACKETS[SETUP]
    page = {"title": packet["title"], "description": ns.frontmatter(packet["files"]["SKILL.md"].decode())[0]["description"],
            "body": ns.frontmatter(packet["files"]["SKILL.md"].decode())[1].strip()}
    back = notion_markdown(packet["page"], page)
    require("<br />" in back and "name: |-" in back and back.encode() != packet["files"]["SKILL.md"], "the stand-in rewrites SKILL.md as Notion does")
    require(ns.meaning(back) == packet["skill"], "the rewritten SKILL.md means the same")
    for old, new in (("Reuse answers", "Reuse some answers"), (page["description"][:20], "Another " + page["description"][:20])):
        require(old in back and ns.meaning(back.replace(old, new, 1)) != packet["skill"], f"a changed word is a difference: {old!r}")


# --- gates and access -------------------------------------------------------------------------------

@test
def a_preflight_reads_only_and_names_the_missing_access():
    fake = world()
    result = ns.preflight(REAL, PACKETS, api(fake), reader(fake))
    require(not fake.writes() and len(result["rows"]) == 7, "seven pages are read and nothing is sent but reads")
    require(all(row["outcome"] == pub.BLOCKED and "no native handoff is recorded" in row["detail"] for row in result["rows"]),
            "without a recorded handoff every page is reported, none is writable")
    require(all(not ns.handoff_problems(row["handoff"]["native"]) for row in result["rows"]), "each row offers a well-formed handoff record")
    for env, expected in (({}, ns.ENABLED_ENV), ({ns.ENABLED_ENV: "true"}, pub.TOKEN_ENV), ({pub.TOKEN_ENV: TOKEN}, ns.ENABLED_ENV)):
        out = io.StringIO()
        with redirect_stdout(out):
            code = ns.main(["preflight", "--repo", str(ROOT)], opener=fake, env={**env, "GITHUB_ACTIONS": "true"}, tag_resolver=resolver)
        require(code == 3 and "MISSING ACCESS" in out.getvalue() and expected in out.getvalue() and "::error" in out.getvalue(),
                f"the missing setting is named: {expected}")
    for breakage, expected in ((lambda f: setattr(f, "revoked", True), "401 unauthorized: the token"),
                               (lambda f: f.capabilities.discard("read"), "403 restricted_resource: the dedicated connection lacks the Read content"),
                               (lambda f: f.unshared.add(PACKETS[COUNCIL]["page"]), "404 object_not_found: the page is not shared")):
        fake = world()
        breakage(fake)
        rows = {row["key"]: row for row in ns.preflight(REAL, PACKETS, api(fake))["rows"]}
        require(rows[COUNCIL]["outcome"] == pub.BLOCKED and expected in rows[COUNCIL]["detail"], f"the precise refusal is shown: {rows[COUNCIL]['detail']}")
        require(not fake.writes(), "a refused read writes nothing")


@test
def nothing_is_written_without_activation_handoff_and_the_write_gate():
    fake, manifest = handed_over()
    try:
        run(fake, REAL, PACKETS, write=True, max_writes=7)
    except pub.PublisherError as error:
        require("not active" in str(error) and not fake.log, "the recorded manifest is inactive: nothing is even read")
    else:
        raise AssertionError("the inactive manifest refuses")
    waiting = copy.deepcopy(REAL)
    waiting["activation"]["active"] = True
    require(set(outcomes(run(fake, waiting, PACKETS, write=True, max_writes=7)).values()) == {pub.PENDING_HANDOFF} and not fake.log,
            "pages still with the existing upkeep are not read or written")
    partial = copy.deepcopy(manifest)
    for artifact in partial['artifacts']:
        if artifact['class'] == 'A' and artifact['key'] != COUNCIL:
            artifact.update(public_writer='existing-upkeep', adoption_state='pending-handoff')
            artifact.pop('handoff', None)
    partial_run = run(fake, partial, write=True, max_writes=7)
    require(outcomes(partial_run)[COUNCIL] == pub.HELD and not fake.writes(),
            'an active partial handoff with no explicit Key writes zero pages')
    fake.log.clear()
    planned = run(fake, manifest)
    require(set(outcomes(planned).values()) == {pub.WOULD_WRITE} and not fake.writes(), "without --write the run only plans")
    bounded = run(fake, manifest, write=True)
    require(set(outcomes(bounded).values()) == {pub.HELD} and not fake.writes() and "the gate allows 1" in bounded["rows"][0]["detail"],
            "more pending pages than the bound: none is written")
    try:
        run(fake, manifest, write=True, tags=lambda tag: "e" * 40)
    except pub.PublisherError as error:
        require("not the approved" in str(error), str(error))
    else:
        raise AssertionError("a released tag that moved is refused")
    try:
        pub.publish(adopted(), GIT, object(), "run", resolver, originals={})
    except pub.PublisherError as error:
        require("native skill publisher" in str(error), str(error))
    else:
        raise AssertionError("the paragraph writer never takes a released skill page")


# --- writes -----------------------------------------------------------------------------------------

@test
def the_first_import_delivers_the_whole_packet_and_a_rerun_is_a_no_op():
    fake, manifest = handed_over(reader=True)
    result = ns.publish(manifest, ns.build_packets(manifest, SOURCE), api(fake), resolver, reader(fake), write=True, max_writes=7)
    require(set(outcomes(result).values()) == {pub.WRITTEN}, f"every handed-over page is written: {outcomes(result)}")
    require(fake.writes().count(("POST", "upload")) == 7 and not fake.leaks, "one import per page")
    for packet in PACKETS.values():
        page = fake.pages[packet["page"]]
        wanted = {path: data for path, data in packet["files"].items() if path != "SKILL.md"}
        preserved = {name: data for name, data in page["files"].items() if data == b"PK-the-earlier-form-of-this-source-zip"}
        require(len(preserved) == 1 and all(name.startswith('history/') for name in preserved),
                "a previous same-named ZIP with different bytes is retained in history")
        require(page["files"] == {**wanted, **HISTORY, **preserved}, f"{packet['name']}: the packet and the earlier history are on the page")
        require(page["title"] == packet["title"] and {n: v for n, (_k, v) in page["props"].items()} == {
            "Key": packet["row_key"], "Version": packet["version"],
            "Source": f"https://github.com/onlinesourdough/OSM-plugin/blob/{RELEASED['commit']}/skills/{packet['name']}/SKILL.md",
            "Source revision": RELEASED["commit"],
            "Package version": packet["package"], "Status": "Released"}, f"{packet['name']}: title and properties are restored")
    require("Automatic publication: active for this run" in ns.report(result, manifest), "a fully verified active run says so")
    fake.log.clear()
    again = ns.publish(manifest, ns.build_packets(manifest, SOURCE), api(fake), resolver, reader(fake), write=True, max_writes=7)
    require(set(outcomes(again).values()) == {pub.UNCHANGED} and not fake.writes(), "a repeat run reads and writes nothing")
    require(all(row["before"]["version_id"] != result["rows"][i]["before"]["version_id"] for i, row in enumerate(again["rows"])),
            "the no-op rests on content, not on Notion's version id")


@test
def one_bounded_write_touches_one_page():
    fake, manifest = handed_over()
    result = run(fake, manifest, write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.UNSUPPORTED} and "not established publicly" in result["rows"][0]["detail"],
            "with no qualified reader the written page is held, not complete")
    require({page for _m, _k, page in fake.log if page} == {PACKETS[COUNCIL]["page"]}, "only the named page is addressed")
    require("NOT active or not qualified" in ns.report(result, manifest), "the result claims no automatic publication")
    require(ns.failing(result), "the bounded proof leaves the run red until the public read is qualified")
    try:
        run(fake, manifest, write=True, only="osm.working.readme")
    except pub.PublisherError as error:
        require("no released skill row" in str(error), str(error))
    else:
        raise AssertionError("a Key that is not a released skill is refused")


@test
def another_writers_edit_is_never_overwritten():
    for edit, expected in ((lambda page: page["files"].__setitem__("agents/openai.yaml", b"edited"), "changed elsewhere"),
                           (lambda page: page.__setitem__("body", page["body"] + "\n\nA hand-written note."), "changed elsewhere"),
                           (lambda page: page["props"]["Status"].__setitem__(1, "Draft"), "changed elsewhere"),
                           (lambda page: page["files"].__setitem__("notes.txt", b"mine"), "changed elsewhere")):
        fake, manifest = handed_over({COUNCIL})
        edit(fake.pages[PACKETS[COUNCIL]["page"]])
        result = run(fake, manifest, write=True, only=COUNCIL)
        require(outcomes(result) == {COUNCIL: pub.CONFLICT} and expected in result["rows"][0]["detail"] and not fake.writes(),
                f"an edit made elsewhere is a conflict and is kept: {result['rows'][0]}")
    fake, manifest = handed_over({COUNCIL})
    seen = []

    def edit_after_the_read(method, kind, page_id):
        seen.append(kind)
        if seen.count("skill") == 2:                # the check just before the import
            fake.pages[page_id]["body"] += "\n\nEdited between the read and the write."
    fake.before = edit_after_the_read
    result = run(fake, manifest, write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.CONFLICT} and "changed after it was read" in result["rows"][0]["detail"] and not fake.writes(),
            "an edit between the read and the write is seen through the version id")
    fake, manifest = handed_over({COUNCIL})
    run(fake, manifest, write=True, only=COUNCIL)
    fake.pages[PACKETS[COUNCIL]["page"]]["props"]["Version"][1] = "9.9.9"
    fake.log.clear()
    result = run(fake, manifest, write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.CONFLICT} and "Version" in result["rows"][0]["detail"] and not fake.writes(),
            "a property edited after the import is not silently put back")


@test
def an_unknown_write_is_read_before_any_repeat():
    fake, manifest = handed_over({COUNCIL})
    fake.fail[("POST", "upload")] = "lost-after"
    result = run(fake, manifest, write=True, only=COUNCIL)
    require(fake.writes().count(("POST", "upload")) == 1 and result["rows"][0]["after"]["title"] == PACKETS[COUNCIL]["title"],
            "an import whose answer was lost is read back, found on the page and completed without a second import")
    fake, manifest = handed_over({COUNCIL})
    before = copy.deepcopy(fake.pages[PACKETS[COUNCIL]["page"]])
    fake.fail[("POST", "upload")] = "lost-before"
    result = run(fake, manifest, write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.UNKNOWN_WRITE} and "not applied; not repeated" in result["rows"][0]["detail"]
            and fake.writes() == [("POST", "upload")] and fake.pages[PACKETS[COUNCIL]["page"]] == before,
            f"an import that never arrived is reported, not repeated: {result['rows'][0]}")
    require(f'Write attempted, final state not verified: {COUNCIL}' in ns.report(result, manifest),
            'an unknown write is an attempt rather than an API-verified change')
    result = run(fake, manifest, write=True, only=COUNCIL)
    require(result["rows"][0]["after"]["files"] == ns.digest(ns.file_hashes(fake.pages[PACKETS[COUNCIL]["page"]]["files"]))
            and fake.writes().count(("POST", "upload")) == 2, "the next run reads the unchanged page and writes it once")
    for status, expected in ((500, pub.UNKNOWN_WRITE), (400, pub.REJECTED), (429, pub.REJECTED)):
        fake, manifest = handed_over({COUNCIL})
        fake.fail[("POST", "upload")] = status
        result = run(fake, manifest, write=True, only=COUNCIL)
        require(outcomes(result) == {COUNCIL: expected} and fake.writes() == [("POST", "upload")], f"HTTP {status} on the import: {result['rows'][0]}")
    fake, manifest = handed_over({COUNCIL})
    fake.capabilities.discard("insert")
    result = run(fake, manifest, write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.BLOCKED} and "Insert content" in result["rows"][0]["detail"], "a missing write capability is named")


@test
def a_cut_run_resumes_from_what_is_on_the_page():
    fake, manifest = handed_over({COUNCIL})
    page = fake.pages[PACKETS[COUNCIL]["page"]]
    fake.fail[("PATCH", "page")] = 500
    result = run(fake, manifest, write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.PARTIAL} and page["title"] == "osm-council" and page["props"]["Status"][1] == "",
            f"the import landed and the restore did not: {result['rows'][0]}")
    fake.log.clear()
    result = run(fake, manifest, write=True, only=COUNCIL)
    require(fake.writes() == [("PATCH", "page")] and page["title"] == PACKETS[COUNCIL]["title"] and page["props"]["Status"][1] == "Released"
            and result["rows"][0]["after"]["properties"]["Version"] == PACKETS[COUNCIL]["version"],
            "the rerun restores only the title and properties, including the recorded Status, with no second import")
    require(f'Written and API-verified: {COUNCIL}' in ns.report(result, manifest),
            'a verified metadata-only resume is still reported as a write')
    fake.log.clear()
    require(outcomes(run(fake, manifest, write=True, only=COUNCIL)) == {COUNCIL: pub.UNCHANGED} and not fake.writes(), "then it is a no-op")


@test
def attachments_that_would_be_lost_or_left_behind_fail_closed():
    fake, manifest = handed_over({COUNCIL})
    packet = PACKETS[COUNCIL]
    page = fake.pages[packet["page"]]
    page["files"]["osm-council-0.0.1-osm-0.1.0-source.zip"] = b"PK-older"
    page["files"]["history/osm-council-0.0.1-osm-0.1.0-source.zip"] = b"PK-other-bytes"
    result = run(fake, manifest, write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.CONFLICT} and "attachment conflict" in result["rows"][0]["detail"] and not fake.writes(),
            "two different files for one history name are a conflict")
    fake, manifest = handed_over({COUNCIL})
    fake.merges = True
    fake.pages[packet["page"]]["files"]["references/retired.md"] = b"retired"
    manifest = adopted(handoffs=handoffs(fake))
    result = run(fake, manifest, write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.PARTIAL} and "references/retired.md" in result["rows"][0]["detail"],
            "a file the import left behind is reported, never read as success")
    fake, manifest = handed_over({COUNCIL})
    fake.serve = lambda page_id: fake.archive(page_id)[:-20]
    result = run(fake, manifest, write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.BLOCKED} and "gzip" in result["rows"][0]["detail"] and not fake.writes(), "a cut download is refused")


@test
def a_wrong_identity_is_refused_before_any_write():
    def other_archive(fake):
        other = PACKETS[SETUP]["page"]
        fake.serve = lambda page_id: fake.archive(other)
    for breakage, expected in ((lambda f, p: p.__setitem__("trashed", True), "live page"),
                               (lambda f, p: p.__setitem__("parent", "ab" * 16), "not a row of the bound public catalogue"),
                               (lambda f, p: p["props"].pop("Source revision"), "is not a skill row"),
                               (lambda f, p: p["props"].__setitem__("Key", ["number", "1"]), "cannot be read or restored"),
                               (lambda f, p: other_archive(f), "names another page or another skill")):
        fake, manifest = handed_over({COUNCIL, SETUP})
        breakage(fake, fake.pages[PACKETS[COUNCIL]["page"]])
        result = run(fake, manifest, write=True, only=COUNCIL)
        require(outcomes(result) == {COUNCIL: pub.BLOCKED} and expected in result["rows"][0]["detail"] and not fake.writes(),
                f"refused with its reason: {result['rows'][0]['detail']}")
    fake = world()
    try:
        api(fake).page(CATALOGUE)
    except ns.Refused:
        require(not fake.log, "a page outside the seven bound pages is never requested")
    else:
        raise AssertionError("only the bound pages are addressed")


@test
def the_token_and_the_signed_address_never_leave_their_place():
    fake, manifest = handed_over(reader=True)
    with tempfile.TemporaryDirectory() as folder:
        out, checkpoint, stream = Path(folder) / "out.md", Path(folder) / "checkpoint.json", io.StringIO()
        with redirect_stdout(stream):
            code = ns.main(["publish", "--repo", str(ROOT), "--write", "--max-writes", "7", "--out", str(out), "--checkpoint", str(checkpoint),
                            "--public-base", SITE, "--public-catalogue", f"{SITE}/{CATALOGUE}"],
                           manifest=manifest, opener=fake, env={**ENV, "GITHUB_ACTIONS": "true"}, tag_resolver=resolver)
        text = stream.getvalue() + out.read_text() + checkpoint.read_text()
        kept = json.loads(checkpoint.read_text())
    require(code == 0 and fake.writes().count(("POST", "upload")) == 7, f"the command publishes through the same path: {stream.getvalue()[:400]}")
    require(TOKEN not in text and SIGNED not in text and "X-Amz" not in text and FILES not in text, "no token or signed address is printed or stored")
    require(not fake.leaks and all(row["before"]["version_id"] and row["after"]["file_sha256"] for row in kept["rows"]),
            "the archive was fetched without the token; the checkpoint keeps digests")
    for flag, expected in (("redirect_api", "redirect was not followed"), ("redirect_files", "a redirect is never followed")):
        fake, manifest = handed_over({COUNCIL})
        setattr(fake, flag, True)
        result = run(fake, manifest, write=True, only=COUNCIL)
        require(outcomes(result) == {COUNCIL: pub.UNREADABLE} and expected in result["rows"][0]["detail"] and not fake.leaks and not fake.writes(),
                f"a redirect is not followed and nothing is written: {result['rows'][0]['detail']}")
    for address in ("http://files.fixture.invalid/x", "https://user:pass@files.fixture.invalid/x", "file:///etc/passwd"):
        try:
            api(FakeSkills()).download(address)
        except ns.Refused as error:
            require("fixture" not in str(error) and "passwd" not in str(error), "the refusal does not repeat the address")
        else:
            raise AssertionError(f"an address that is not plain https is refused: {address}")


@test
def a_public_answer_without_the_content_is_not_a_pass():
    fake, manifest = handed_over({COUNCIL}, reader=True)
    fake.shell = True
    result = ns.publish(manifest, ns.build_packets(manifest, SOURCE), api(fake), resolver, reader(fake), write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.HELD} and "establishes nothing" in result["rows"][0]["detail"] and ns.failing(result),
            f"a script shell that answers 200 is a failure: {result['rows'][0]}")
    require(result['rows'][0].get('write_attempted') is True and
            f'Written and API-verified: {COUNCIL}' in ns.report(result, manifest),
            'public failure preserves the fact that a verified API write already happened')
    fake.shell = False
    result = ns.publish(manifest, ns.build_packets(manifest, SOURCE), api(fake), resolver, reader(fake), write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.UNCHANGED} and result["rows"][0]["public"]["state"] == pub.VERIFIED, "real content is verified")
    fake.pages[PACKETS[COUNCIL]["page"]]["title"] = "Something else"
    state, detail = ns.public_state(reader(fake), PACKETS[COUNCIL])
    require(state == pub.FAILED and "catalogue" in detail, "a catalogue that does not show the skill fails")
    out = io.StringIO()
    with redirect_stdout(out):
        code = ns.main(["publish", "--repo", str(ROOT), "--public-base", SITE, "--public-catalogue", SITE], manifest=adopted(), opener=fake, env=ENV, tag_resolver=resolver)
    require(code == 3 and "no public reader is qualified" in out.getvalue(), "a public address cannot stand in for a qualified reader")


@test
def the_next_release_replaces_its_own_packet_and_keeps_the_history():
    fake, manifest = handed_over({COUNCIL})
    run(fake, manifest, write=True, only=COUNCIL)
    page = fake.pages[PACKETS[COUNCIL]["page"]]
    files = dict(TREE)
    # The synthetic next release must stay distinct when the real binding advances.
    major, minor, _ = map(int, json.loads(files["package.json"])["version"].split("."))
    next_version = f"{major}.{minor + 1}.0"
    next_tag = f"v{next_version}"
    files["package.json"] = json.dumps({"version": next_version}).encode()
    skill_version = PACKETS[COUNCIL]["version"]
    skill_major, skill_minor, _ = map(int, skill_version.split("."))
    next_skill_version = f"{skill_major}.{skill_minor + 1}.0"
    old_version = f'version: "{skill_version}"'.encode()
    new_version = f'version: "{next_skill_version}"'.encode()
    skill = files["skills/osm-council/SKILL.md"]
    require(skill.count(old_version) == 1, "the fixture changes exactly the actual skill version")
    files["skills/osm-council/SKILL.md"] = skill.replace(old_version, new_version) + b"\nA new closing line.\n"
    del files["skills/osm-council/agents/openai.yaml"]
    later = copy.deepcopy(manifest)
    later["editions"]["released"].update(tag=next_tag, label=next_tag, commit="c" * 40)
    packets = ns.build_packets(later, pub.DictSource(files, "c" * 40))
    tags = {next_tag: "c" * 40, RELEASED["tag"]: RELEASED["commit"]}
    prior = lambda tag, commit: PACKETS if tags.get(tag) == commit == RELEASED["commit"] else None
    edited = copy.deepcopy(fake)
    edited.pages[PACKETS[COUNCIL]["page"]]["files"]["LICENSE"] += b"\nedited"
    edited.log.clear()
    result = ns.publish(later, packets, api(edited), tags.get, prior_packets=prior, write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.CONFLICT} and not edited.writes(), "a packet edited since CI wrote it is not replaced")
    unknown = ns.publish(later, packets, api(fake), tags.get, prior_packets=lambda tag, commit: None, write=True, only=COUNCIL)
    require(outcomes(unknown) == {COUNCIL: pub.CONFLICT}, "a page whose earlier release cannot be rebuilt is not replaced")
    fake.log.clear()
    planned = ns.publish(later, packets, api(fake), tags.get, prior_packets=prior, only=COUNCIL)
    require(outcomes(planned) == {COUNCIL: pub.WOULD_WRITE} and f"replaces the unmodified packet this publisher built for {RELEASED['tag']}"
            in planned["rows"][0]["detail"] and not fake.writes(), f"the earlier CI packet is recognised: {planned['rows'][0]}")
    result = ns.publish(later, packets, api(fake), tags.get, prior_packets=prior, write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.UNSUPPORTED} and fake.writes().count(("POST", "upload")) == 1 and page["props"]["Version"][1] == next_skill_version and page["props"]["Source revision"][1] == "c" * 40
            and page["props"]["Package version"][1] == next_version and page["title"] == "OSM:council", "the new release is on the page")
    old_zip = PACKETS[COUNCIL]["zip"]
    require(page["files"][f"history/{old_zip}"] == PACKETS[COUNCIL]["files"][old_zip] and old_zip not in page["files"]
            and all(page["files"][path] == data for path, data in HISTORY.items()) and "agents/openai.yaml" not in page["files"]
            and f"osm-council-{next_skill_version}-osm-{next_version}-source.zip" in page["files"], "the earlier source ZIP moved to history and the old history is intact")
    stale = copy.deepcopy(fake)
    stale.log.clear()
    old_run = ns.publish(manifest, ns.build_packets(manifest, SOURCE), api(stale), tags.get,
        prior_packets=lambda tag, commit: packets if tags.get(tag) == commit == "c" * 40 else None,
        write=True, only=COUNCIL)
    require(outcomes(old_run) == {COUNCIL: pub.CONFLICT} and not stale.writes()
            and stale.pages[PACKETS[COUNCIL]["page"]]["props"]["Package version"][1] == next_version,
            f"a stale run must preserve the newer packet: outcome={outcomes(old_run)}, writes={stale.writes()}, package={stale.pages[PACKETS[COUNCIL]['page']]['props']['Package version'][1]}")
    fake.log.clear()
    again = ns.publish(later, packets, api(fake), tags.get, prior_packets=prior, write=True, only=COUNCIL)
    require(outcomes(again) == {COUNCIL: pub.UNCHANGED} and not fake.writes(), "and the repeat is a no-op")


# --- repository -------------------------------------------------------------------------------------

@test
def the_recorded_state_stays_off_and_the_workflow_keeps_its_gates():
    require(not pub.validate_manifest(RECORDED), 'the recorded ownership and reader bindings validate')
    for artifact in RECORDED['artifacts']:
        if artifact['class'] == 'A' and artifact['public_writer'] == 'ci':
            require(not ns.handoff_problems((artifact.get('handoff') or {}).get('native')),
                    'a CI-owned row has a complete actual handoff')
    workflow = (ROOT / ".github/workflows/docs-parity.yml").read_text()
    steps = workflow.split("\n      - ")
    secret = [step for step in steps if "secrets.OSM_PUBLIC_DOCS_TOKEN" in step]
    require(secret and all("if: steps.gates.outputs." in step for step in secret if "id: gates" not in step),
            "every step that receives the secret is behind an inspected gate")
    writing = [step for step in steps if "--write" in step]
    require(len(writing) == 1 and "if: steps.gates.outputs.native_write == 'true'" in writing[0], "one gated step may write")
    require("pull_request" not in workflow and "refs/heads/main" in workflow and "head_branch == 'main'" in workflow
            and "cancel-in-progress: false" in workflow and "group: osm-documentation-publisher" in workflow,
            "main only, serialized, never on a pull request or fork")
    require("native_skills.py build" in workflow and "native_skills.py preflight" in workflow, "packets are built and pages preflighted before any write")
    release = (ROOT / ".github/workflows/release.yml").read_text()
    require("OSM_PUBLIC_DOCS_TOKEN" not in release, "the release workflow never receives the documentation secret")
    activation = (ROOT / "docs-publisher/ACTIVATION.md").read_text()
    require(all(word in activation for word in ("native_skills.py preflight", "Read content", "Insert content", "Update content", "handoff")),
            "the activation steps name the real commands and capabilities")


@test
def semantic_normalization_preserves_code_and_instruction_hierarchy():
    head = '---\nname: sample\ndescription: sample\n---\n'
    require(ns.meaning(head + '```python\nif ready:\n    run()\n```\n') !=
            ns.meaning(head + '```python\nif ready:\nrun()\n```\n'), 'code indentation is meaningful')
    require(ns.meaning(head + '- One\n  - Two\n') != ns.meaning(head + '- One\n- Two\n'),
            'instruction hierarchy is meaningful')


@test
def opaque_api_versions_work_without_being_hex_hashes():
    fake, manifest = handed_over({COUNCIL})
    version = fake.version
    fake.version = lambda page: 'opaque:' + version(page) + '/revision=='
    result = run(fake, manifest, write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.UNSUPPORTED} and fake.writes().count(('POST', 'upload')) == 1,
            'the documented opaque version_id supports a complete API import')


@test
def an_import_preserves_a_concurrent_property_correction():
    fake, manifest = handed_over({COUNCIL})
    upload = fake._upload_post
    def changed(request, page_id):
        answer = upload(request, page_id)
        fake.pages[page_id]['props']['Source revision'][1] = 'owner correction'
        return answer
    fake._upload_post = changed
    result = run(fake, manifest, write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.CONFLICT}, 'an unexpected property edit is held')
    require(fake.pages[PACKETS[COUNCIL]['page']]['props']['Source revision'][1] == 'owner correction',
            'the owner correction is preserved')
    require(not any(method == 'PATCH' for method, _ in fake.writes()), 'no property restoration overwrites it')


@test
def a_bounded_proof_never_claims_the_whole_automatic_run_is_qualified():
    fake, manifest = handed_over(reader=True)
    result = ns.publish(manifest, ns.build_packets(manifest, SOURCE), api(fake), resolver,
                        reader(fake), write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.WRITTEN}, 'the bounded page is verified')
    require('Automatic publication: NOT active' in ns.report(result, manifest),
            'one page does not prove the seven-page automatic run')


@test
def a_later_refusal_preserves_earlier_page_evidence_and_stops_the_remaining_set():
    fake, manifest = handed_over(reader=True)
    pages = list(PACKETS.values())
    original = fake._upload_post
    def refused(request, page_id):
        if page_id == pages[1]['page']:
            raise ns.Refused('fixture second-page refusal')
        return original(request, page_id)
    fake._upload_post = refused
    result = ns.publish(manifest, ns.build_packets(manifest, SOURCE), api(fake), resolver,
                        reader(fake), write=True, max_writes=7)
    require(result['rows'][0]['outcome'] == pub.WRITTEN and result['rows'][0].get('after'),
            'the first verified page stays recorded')
    require(result['rows'][1]['outcome'] == pub.BLOCKED,
            'the later refusal is a page result rather than an escaping exception')
    require(all(row['outcome'] == pub.HELD for row in result['rows'][2:]), 'remaining imports are held')
    with patch.object(ns, 'MAX_UNPACKED', 1024):
        try:
            ns.pack('example', {'SKILL.md':b'a' * 1025})
        except ns.Refused:
            pass
        else:
            raise AssertionError('never upload a packet too large to read back')


@test
def a_mismatched_final_read_is_not_reported_as_an_api_verified_write():
    fake, manifest = handed_over({COUNCIL})
    patch_page = fake._page_patch
    def corrupt_after_restore(request, page_id):
        response = patch_page(request, page_id)
        fake.pages[page_id]['files']['LICENSE'] += b' changed after restore'
        return response
    fake._page_patch = corrupt_after_restore
    result = run(fake, manifest, write=True, only=COUNCIL)
    require(outcomes(result) == {COUNCIL: pub.PARTIAL} and result['rows'][0].get('after'),
            'the mismatched read is retained as evidence')
    require(result['rows'][0].get('api_verified') is not True and
            f'Write attempted, final state not verified: {COUNCIL}' in ns.report(result, manifest),
            'a readback alone does not prove equality')


def main():
    for function in TESTS:
        function()
        print(f"ok  {function.__name__}")
    print(f"PASS: {len(TESTS)} native skill publisher rehearsals (in-memory stand-in only; no live, Notion or credential use)")


if __name__ == "__main__":
    main()
