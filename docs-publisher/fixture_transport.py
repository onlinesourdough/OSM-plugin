"""In-memory fixture transport for the publisher rehearsal. Fixture proof only; never live.

It models the part of a public Notion subtree the publisher touches: rows by Key with a receipt,
a body hash, a status and a writer, plus the failures the publisher must survive. It contains no
network code and no credential.
"""

from publisher import (AccessError, PartialWrite, RunInProgress, UnknownWrite, body_hash)


class FixtureTransport:
    def __init__(self):
        self.rows = {}
        self.log = []                # every call, in order, for ordering assertions
        self.access = "ok"           # ok | expired | missing
        self.fail_next = None        # ("unknown" | "partial" | "unknown-landed", key)
        self.anonymous = True
        self.catalogue = True
        self.claimed = None
        self.downloads = {}          # key -> hash of the frozen export

    # -- reads ---------------------------------------------------------------------------------
    def _check(self):
        if self.access != "ok":
            raise AccessError(f"fixture access is {self.access}")

    def get(self, key):
        self._check()
        self.log.append(("get", key))
        row = self.rows.get(key)
        return dict(row) if row else None

    def list_keys(self):
        self._check()
        return sorted(self.rows)

    def anonymous_ok(self, key):
        self.log.append(("anonymous", key))
        return self.anonymous

    def catalogue_lists(self, key):
        self.log.append(("catalogue", key))
        return self.catalogue and key in self.rows

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
        self.log.append(("status", key, status))
        row = self.rows.setdefault(key, {"writer": "ci", "status": status, "receipt_after": None, "receipt_before": None,
                                         "body_hash": None, "body": None, "commit": None})
        row["status"] = status
        for name in ("receipt_before", "receipt_after", "commit"):
            if fields.get(name) is not None:
                row[name] = fields[name]

    def upsert(self, key, body, digest, writer, commit):
        self._check()
        self.log.append(("upsert", key))
        row = self.rows.setdefault(key, {"writer": writer, "status": "pending", "receipt_after": None, "receipt_before": None,
                                         "body_hash": None, "body": None, "commit": None})
        failure = self.fail_next if self.fail_next and self.fail_next[1] == key else None
        if failure:
            self.fail_next = None
            if failure[0] == "unknown":
                raise UnknownWrite("no answer; the write did not land")
            if failure[0] == "unknown-landed":
                row.update(body=body, body_hash=digest, commit=commit)
                raise UnknownWrite("no answer; the write did land")
            if failure[0] == "partial":
                row.update(body=body[: len(body) // 2], body_hash="partial", commit=commit)
                raise PartialWrite("only some children were written")
        row.update(writer=writer, body=body, body_hash=digest, commit=commit)

    # -- helpers for the rehearsal -------------------------------------------------------------
    def seed(self, key, body, writer="ci", status="complete"):
        digest = body_hash(body)
        self.rows[key] = {"writer": writer, "status": status, "receipt_after": digest, "receipt_before": None,
                          "body_hash": digest, "body": body, "commit": "seed"}

    def writes(self):
        return [entry for entry in self.log if entry[0] in ("upsert",)]
