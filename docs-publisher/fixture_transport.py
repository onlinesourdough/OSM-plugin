"""In-memory stand-ins for the publisher rehearsal. Fixture proof only; never live.

`FixtureTransport` models the part of a public Notion subtree the publisher touches. `FakeNotion` is
a small in-memory opener that answers the few REST calls `NotionTransport` makes, so the class that
would run is the class the scenarios exercise. Neither is Notion: they model only what the publisher
relies on and say nothing about how Notion answers. No network code, no credential.
"""

import html
import io
import json
import urllib.error

from publisher import (NO_READER, UNSUPPORTED, AccessError, PartialWrite, PublisherError, RunInProgress, UnknownWrite,
                       body_hash, catalogue_lists_key, compare_content)


class FixtureTransport:
    """Rows by Key. The page body (`body`) is the truth; `body_hash` is only a property, written last."""

    def __init__(self):
        self.rows = {}
        self.log = []                # every call, in order, for ordering assertions
        self.access = "ok"           # ok | expired | missing
        self.fail_next = None        # ("unknown" | "partial" | "unknown-landed", key)
        self.public_supported = True        # False: no qualified reader, so public access is `unsupported`
        self.catalogue_supported = True
        self.public_text = {}        # key -> what an anonymous reader sees instead of the stored body
        self.catalogue_text = None   # None: the public catalogue lists every row's Key
        self.claimed = None
        self.downloads = {}          # key -> hash of the frozen export (absent: could not be hashed)
        self.duplicates = set()
        self.unreadable = set()
        self.corrupt = None          # key whose next successful write silently stores a damaged body

    # -- reads ---------------------------------------------------------------------------------
    def _check(self):
        if self.access != "ok":
            raise AccessError(f"fixture access is {self.access}")

    def get(self, key):
        self._check()
        self.log.append(("get", key))
        if key in self.duplicates:
            from publisher import DuplicateKey
            raise DuplicateKey(f"more than one row has the Key {key}")
        row = self.rows.get(key)
        if row is None:
            return None
        out = dict(row)
        out["actual_hash"] = None if key in self.unreadable else body_hash(row["body"] or "")
        out["body_error"] = "fixture: unreadable" if key in self.unreadable else None
        return out

    def list_keys(self):
        self._check()
        return sorted(self.rows)

    def verify_public(self, key, expected):
        self.log.append(("public", key))
        if not self.public_supported:
            return UNSUPPORTED, NO_READER
        row = self.rows.get(key)
        return compare_content(expected, self.public_text.get(key, (row["body"] if row else "") or ""))

    def verify_catalogue(self, key):
        self.log.append(("catalogue", key))
        if not self.catalogue_supported:
            return UNSUPPORTED, NO_READER
        return catalogue_lists_key(key, " ".join(self.rows) if self.catalogue_text is None else self.catalogue_text)

    def download_hash(self, key):
        return self.downloads.get(key)

    # -- writes --------------------------------------------------------------------------------
    def claim_run(self, run_id):
        if self.claimed not in (None, run_id):
            raise RunInProgress(f"run {self.claimed} holds the publishing stage")
        self.claimed = run_id
        self.log.append(("claim", run_id))

    def release_run(self, run_id):
        self.log.append(("release", run_id))
        if self.claimed == run_id:
            self.claimed = None

    def set_status(self, key, status, **fields):
        self._check()
        if key not in self.rows:
            raise PublisherError(f"no row with the Key {key} to mark {status}")
        self.log.append(("status", key, status))
        self.rows[key]["status"] = status
        for name in ("receipt_before", "receipt_after", "commit"):
            if fields.get(name) is not None:
                self.rows[key][name] = fields[name]

    def upsert(self, key, body, digest, writer, commit, receipt_before=None, receipt_after=None):
        self._check()
        self.log.append(("upsert", key))
        failure = self.fail_next if self.fail_next and self.fail_next[1] == key else None
        if failure:
            self.fail_next = None
            if failure[0] == "unknown":
                raise UnknownWrite("no answer; the write did not land")
        row = self.rows.get(key)
        if row is None:    # a new row is created already pending
            row = self.rows[key] = {"writer": writer, "status": "pending", "receipt_before": receipt_before or "",
                                    "receipt_after": receipt_after or "", "body_hash": "", "body": "", "commit": commit}
            self.log.append(("status", key, "pending"))
        row.update(writer=writer, commit=commit)
        if failure and failure[0] == "partial":
            lines = body.split("\n")
            row["body"] = "\n".join(lines[: len(lines) // 2])
            raise PartialWrite("only some children were written")
        row["body"] = body[:-1] if self.corrupt == key else body
        row["body_hash"] = digest    # last
        if failure and failure[0] == "unknown-landed":
            raise UnknownWrite("no answer; the write did land")

    # -- helpers for the rehearsal -------------------------------------------------------------
    def seed(self, key, body, writer="ci", status="complete"):
        digest = body_hash(body)
        self.rows[key] = {"writer": writer, "status": status, "receipt_after": digest, "receipt_before": "",
                          "body_hash": digest, "body": body, "commit": "seed"}

    def writes(self):
        return [entry for entry in self.log if entry[0] == "upsert"]


class _Response:
    def __init__(self, body, status=200):
        self._body, self.status = body if isinstance(body, bytes) else json.dumps(body).encode(), status

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def read(self):
        return self._body


class FakeNotion:
    """A small in-memory opener for `NotionTransport`: a database of pages with rich-text properties and
    paragraph children. Not Notion. `log` uses the same entries as FixtureTransport.log."""

    PROPS = ("Key", "Writer", "Status", "ReceiptAfter", "ReceiptBefore", "BodyHash", "Commit")

    def __init__(self, title="Title", api_base="https://api.notion.com/v1/", public_base="https://example.invalid/site",
                 catalogue_url="https://example.invalid/catalogue"):
        self.title, self.api_base, self.public_base, self.catalogue_url = title, api_base, public_base, catalogue_url
        self.timeouts = []
        self.pages, self.blocks = {}, {}      # id -> {"props": {name: text}, "children": [ids]} ; id -> block
        self.log, self.requests = [], []      # requests: (method, url, Authorization header)
        self.access = "ok"                    # ok | expired | missing
        self.fail = None                      # ("unknown" | "partial" | "unknown-landed", key)
        self.public = {}                      # url -> (status, markup) for anonymous reads
        self.schema_override = None
        self.corrupt = None                   # key whose writes silently drop the last block
        self.respond = None                   # a callable (method, path, payload) -> _Response | None, for odd answers
        self._n = 0

    # -- state helpers used by the rehearsal -------------------------------------------------------
    def _id(self, prefix):
        self._n += 1
        return f"{prefix}{self._n:04d}"

    def _block(self, text):
        bid = self._id("b")
        self.blocks[bid] = {"object": "block", "id": bid, "type": "paragraph", "has_children": False, "paragraph": {"rich_text": (
            [{"type": "text", "text": {"content": text}, "plain_text": text}] if text else [])}}
        return bid

    def page_for(self, key):
        return next((pid for pid, p in self.pages.items() if p["props"].get("Key") == key), None)

    def body(self, key):
        page = self.pages[self.page_for(key)]
        return "\n".join(self.blocks[b]["paragraph"]["rich_text"][0]["plain_text"] if self.blocks[b]["paragraph"]["rich_text"] else ""
                         for b in page["children"])

    def set_body(self, key, text):
        page = self.pages[self.page_for(key)]
        page["children"] = [self._block(line) for line in text.split("\n")]

    def add_page(self, key, body, status, writer="ci", **props):
        pid = self._id("p")
        digest = body_hash(body)
        self.pages[pid] = {"props": {"Key": key, "Writer": writer, "Status": status, "ReceiptAfter": digest, "ReceiptBefore": "",
                                     "BodyHash": digest, "Commit": "seed", **props}, "title": key, "children": []}
        self.set_body(key, body)
        return pid

    # -- the opener --------------------------------------------------------------------------------
    def _rich(self, text):
        return {"type": "rich_text", "rich_text": [{"type": "text", "text": {"content": text}, "plain_text": text}] if text else []}

    def _page(self, pid):
        page = self.pages[pid]
        return {"id": pid, "properties": {**{n: self._rich(page["props"].get(n, "")) for n in self.PROPS},
                                          self.title: {"type": "title", "title": [{"plain_text": page["title"]}]}}}

    def _error(self, request, code):
        return urllib.error.HTTPError(request.full_url, code, "fake", {}, io.BytesIO(b""))

    def _apply(self, props, page, request=None):
        for name, value in props.items():
            if name != self.title and name not in self.PROPS:    # Notion rejects a property the database does not have
                raise self._error(request, 400)
            if "title" in value:
                page["title"] = "".join(t["text"]["content"] for t in value["title"])
            else:
                page["props"][name] = "".join(t["text"]["content"] for t in value["rich_text"])

    def __call__(self, request, timeout=None):
        url, method = request.full_url, request.get_method()
        self.requests.append((method, url, request.get_header("Authorization")))
        self.timeouts.append(timeout)
        if not url.startswith(self.api_base):
            outcome = self.public.get(url) or self._mirror(url)
            if outcome is None:
                raise self._error(request, 404)
            if isinstance(outcome, Exception):
                raise outcome
            return _Response(outcome[1].encode(), outcome[0])
        if self.access != "ok":
            raise self._error(request, 401 if self.access == "expired" else 404)
        path = url[len(self.api_base):]
        payload = json.loads(request.data) if request.data else None
        if self.respond and (answer := self.respond(method, path, payload)) is not None:
            return answer
        route, _, query = path.partition("?")
        parts = route.split("/")
        if parts[0] == "databases" and len(parts) == 2 and method == "GET":
            props = self.schema_override or {**{self.title: {"type": "title"}}, **{n: {"type": "rich_text"} for n in self.PROPS}}
            return _Response({"properties": props})
        if parts[0] == "databases" and parts[2:] == ["query"]:
            return self._query(payload)
        if route == "pages" and method == "POST":
            return self._create(request, payload)
        if parts[0] == "pages" and method == "PATCH":
            return self._patch_page(request, parts[1], payload)
        if parts[0] == "blocks" and parts[2:] == ["children"]:
            return self._children(request, method, parts[1], query, payload)
        if parts[0] == "blocks" and method == "DELETE":
            return self._delete(request, parts[1])
        raise self._error(request, 404)

    def _mirror(self, url):
        """What an anonymous reader would see unless a rehearsal overrides it: the stored body, or a Key list."""
        if url == self.catalogue_url:
            return 200, "<html><body><ul>" + "".join(f"<li>{html.escape(p['props'].get('Key', ''))}</li>" for p in self.pages.values()) + "</ul></body></html>"
        pid = url[len(self.public_base) + 1:] if url.startswith(self.public_base + "/") else None
        if pid in self.pages:
            lines = self.body(self.pages[pid]["props"]["Key"]).split("\n")
            return 200, "<html><body>" + "".join(f"<p>{html.escape(line)}</p>" for line in lines) + "</body></html>"
        return None

    def _query(self, payload):
        wanted = (payload.get("filter") or {}).get("rich_text", {}).get("equals") if payload.get("filter") else None
        ids = [pid for pid, p in self.pages.items() if wanted is None or p["props"].get("Key") == wanted]
        if wanted is not None:
            self.log.append(("get", wanted))
        start = int(payload.get("start_cursor", 0))
        size = payload.get("page_size", 100)
        chunk = ids[start:start + size]
        more = start + size < len(ids)
        return _Response({"results": [self._page(i) for i in chunk], "has_more": more, "next_cursor": str(start + size) if more else None})

    def _mutation(self, request, key):
        """Called before each content mutation (create, block delete, append) of a page's body."""
        if self.fail and self.fail[1] == key:
            self._mutations = getattr(self, "_mutations", 0) + 1
            if (self.fail[0] == "unknown" and self._mutations == 1) or (self.fail[0] == "partial" and self._mutations == 2):
                self.fail, self._mutations = None, 0
                raise urllib.error.URLError("fake connection dropped")
        else:
            self._mutations = 0

    def _create(self, request, payload):
        props = payload["properties"]
        page = {"props": {}, "title": "", "children": []}
        self._apply(props, page, request)
        key = page["props"]["Key"]
        self._mutation(request, key)
        pid = self._id("p")
        self.pages[pid] = page
        page["children"] = [self._block("".join(t["text"]["content"] for t in b["paragraph"]["rich_text"])) for b in payload["children"][:len(payload["children"]) - (self.corrupt == key)]]
        self.log += [("upsert", key)] + ([("status", key, page["props"]["Status"])] if "Status" in page["props"] else [])
        return _Response({"id": pid})

    def _patch_page(self, request, pid, payload):
        page, key = self.pages[pid], self.pages[pid]["props"].get("Key")
        landed = self.fail and self.fail[0] == "unknown-landed" and self.fail[1] == key and "BodyHash" in payload["properties"]
        self._apply(payload["properties"], page, request)
        if "BodyHash" in payload["properties"]:
            self.log.append(("body-hash", key))
        if "Status" in payload["properties"]:
            self.log.append(("status", key, page["props"]["Status"]))
        if landed:
            self.fail = None
            raise urllib.error.URLError("fake connection dropped after the write landed")
        return _Response({"id": pid})

    def _children(self, request, method, pid, query, payload):
        page, key = self.pages[pid], self.pages[pid]["props"].get("Key")
        if method == "GET":
            args = dict(p.split("=") for p in query.split("&") if p)
            start, size = int(args.get("start_cursor", 0)), int(args.get("page_size", 100))
            ids = page["children"][start:start + size]
            more = start + size < len(page["children"])
            return _Response({"results": [self.blocks[i] for i in ids], "has_more": more, "next_cursor": str(start + size) if more else None})
        self._mutation(request, key)
        page["children"] += [self._block("".join(t["text"]["content"] for t in b["paragraph"]["rich_text"])) for b in payload["children"][:len(payload["children"]) - (self.corrupt == key)]]
        self.log.append(("upsert", key))
        return _Response({"results": []})

    def _delete(self, request, bid):
        if bid in self.pages:     # archiving a page: nothing in the publisher should ever do this
            self.log.append(("delete", self.pages[bid]["props"].get("Key")))
            del self.pages[bid]
            return _Response({})
        owner = next(p for p in self.pages.values() if bid in p["children"])
        self._mutation(request, owner["props"].get("Key"))
        owner["children"].remove(bid)
        del self.blocks[bid]
        return _Response({})
