# Activation notes for the documentation publisher

Status: source and fixtures only. Nothing here is active. No workflow is enabled, no secret
exists, no Notion write has happened and no live proof has run. A merge does not activate it.

**With no qualified public content reader, no live run can reach `complete`.** Public access and
catalogue membership read as `unsupported`, so a run ends at HOLD: the rows stay pending and the job
exits non-zero. That is an unmet live gate (G1 below), not a defect to work around.

## What exists

- `manifest.json`: per-artifact source and ownership, with each artifact's current public writer. Five
  documentation rows are CI-owned working rows. There is no skill row: skills stay Git-owned, and a
  changed skill is reported as pending release propagation, whether or not a class A row maps its folder.
- `publisher.py`: the impact diff, the reconciliation result, the serialized idempotent publishing
  stage, a Notion transport and a pure content comparison. Standard library only; no poller, timer or new dependency.
- `fixture_transport.py` and `tests/publisher-rehearsal.py`: the fixture proof. It runs every publish
  scenario against an in-memory transport and against `NotionTransport` through a small in-memory opener
  (`FakeNotion`), and it holds the mutation controls. It is not a live publication, and `FakeNotion` is
  not Notion: it models only what the code relies on.
- `workflow.template.yml`: an inactive template with one trigger (push to `main`) and no schedule. It is
  outside `.github/workflows` on purpose. Both result files upload with `if: always()`.
- A credential-free check, `python3 docs-publisher/publisher.py reconcile --check`, which the repository
  checks already run (with `--base` on pull requests and pushes). It writes nothing and needs no secret.
  `--only KEY` limits a run to one row: the route for the bounded proof.

## What each result can observe

| Result | Evidence it rests on | What it does not show |
| --- | --- | --- |
| `would-write`, `no-source-change`, `unknown-no-receipts` (credential-free) | Git paths changed since `--base`, mapped to Keys | Anything about Notion: receipts are not read, so nothing says written or unchanged |
| `unchanged`, `conflict` for a CI row | The page body read back (all children, paginated, normalised to one line per paragraph) hashed and compared with CI's receipt | A hand edit made after a write completed (BodyHash equals the receipt) is a conflict even while the row is held at `pending`. One made while a row is `partial` or `unknown-write`, or `pending` after a write was refused or cut off (BodyHash differs from the receipt), cannot be told from the interrupted write and is overwritten on resume |
| `conflict` for another writer | The row's `Writer` property | An edit by another writer that leaves `Writer` alone shows only as a body mismatch |
| `written`, `resumed` | Body read back equal to the source, public page and catalogue verified for the whole affected set, with no CI-owned row failing at plan time (a conflict, unreadable, blocked or refused row, or a refused retirement, holds the set) | Nothing live: see G1. Today the public and catalogue observations are `unsupported`, so neither result can occur live |
| `unsupported` (HOLD) | No qualified reader, so the observation was not made | Whether the page is public, or in the catalogue |
| `partial`, `unknown-write`, `rejected`, `blocked`, `unreadable` | The API refused, dropped, rate-limited or returned something unreadable; or the body read back differs | Why Notion refused (a 404 cannot say which cause) |
| `refused-unrepresentable` | A body with a control character or beyond the block limits; refused, never truncated | |
| Class B `refused-class-B`, frozen ZIP hash | Ownership only. The hash is `not checked (unsupported)`: no reader hashes the live export | A changed ZIP is not detected until a reader exists |
| Guide `refused-notion-authored`, newer original | Ownership only. `not checked (unsupported)`: no original hash is recorded and no reader records one | A later guide edition is not detected until both exist |
| Released tag resolves | The tag in the checkout resolves to the approved commit; `publish` fails if it is absent or moved. `reconcile --check` notes an absent tag as not checked | |

A replaced body deletes the row's child blocks and appends new ones. No row is deleted, and a retired row
stays, marked retired. Whether Notion keeps deleted children, and for how long, is unknown here.
A row's content is replaced non-atomically; the row stays pending until the read-back passes.

## Ownership per artifact

| Class | What | Public writer | The publisher |
| --- | --- | --- | --- |
| A | The 18 released instruction and reference packets of the bound release, v0.31.3 (the public pages' last verified projection is still v0.30.0) | existing upkeep until handoff, then CI | Pending handoff: no write. After handoff it changes only at a new tagged, approved commit, and only for a row that already carries its Key |
| B | Content templates and their setup, configuration and diagram explanations (Draft edition 2026-11-05.1) | Notion-authored | Never writes, derives or repairs. The ZIP hash check is not run |
| G | Public guide pages (edition 2026-11-05.2, the before-source) | Notion-authored | Never overwrites. A newer original is not detected yet |
| W | Main-working documentation projection, labelled unreleased | CI | Writes once active |
| C | The owner's private documentation control and daily state | not a CI source | Absent from the manifest and from CI inputs |

A CI-owned row whose page body changed elsewhere is drift: it is reported as a conflict and not overwritten.
Each artifact has one public writer, one trigger and one receipt. Separate local locks are not enough. The
publisher takes no run lock of its own: serialization rests on the workflow's concurrency group alone.

## Preconditions before anyone turns it on

1. **Relinquishment (the source-chat owner, outside this repository).** The existing daily
   private-maintenance route stops writing the exact rows being handed to CI and keeps private upkeep,
   drift detection and explicit handoff only. It is required for every class A row moved to CI and not
   for a new working row. Each handed-over row is then changed in the manifest in a reviewed commit
   (`public_writer: ci`, `adoption_state: adopted`). No private job id, path or schedule enters this repository.
   For a class A row, the existing row must also carry its Key first: existing rows have none, so a
   first write would create a duplicate, and the publisher refuses (`blocked`) instead.
2. **A dedicated connection** limited to the public subtree: a Notion internal integration with no other grants.
   Not a personal connector and not an owner-wide key.
3. **The subtree and its database.** The owner provisions a labelled public main-working subtree and a
   database in it with rich-text properties `Key`, `Writer`, `Status`, `ReceiptAfter`, `ReceiptBefore`,
   `BodyHash` and `Commit`, plus exactly one title property, which may have any name: the publisher reads it
   from the database. A database with other properties missing or a second title property is refused.
   The subtree must really be shared publicly, or an anonymous read means nothing. `bindings.working_subtree`
   stays null until then and activation requires it; with `active` true, `publish` refuses any other `--database`.
   `target_subtree` on each artifact is a label, not enforcement. The target ids belong in configuration, not in method text.
4. **The secret location.** A repository secret `OSM_PUBLIC_DOCS_TOKEN` and a repository variable
   `OSM_PUBLIC_DOCS_DATABASE`. `OSM_PUBLIC_DOCS_BASE` and `OSM_PUBLIC_DOCS_CATALOGUE` (the public page base and the
   public catalogue view) stay unset until a reader is enabled; setting them earlier is refused as unused
   configuration. No token appears in source, packets, artifacts or logs. Without the secret the publisher fails closed.
5. **Workflow activation.** Copy `workflow.template.yml` to `.github/workflows/` and set
   `activation.active` to true in one reviewed commit. Merge and activation are separate decisions.

## Unmet live gates and missing setup

Unmet live gates. If any stays open, the publisher must not be called operational. Activating it for the bounded proof depends on
Root's decision on G1 (accept HOLD, or a separate anonymous-readback receipt); G2 can close only through a live run.

- **G1. No qualified public content reader.** `activation.public_reader` is null. The comparison itself is a
  pure function that is tested, and a reader (an anonymous read of the page and of the catalogue view) is
  implemented, but nothing qualifies it: whether a public Notion page's HTML contains the body, or a per-row
  marker, is unknown offline. Until it is enabled by a reviewed commit, no live run reaches `complete` and the
  bounded proof ends at HOLD, unless the owner or root accepts a separate anonymous-readback receipt. That is a decision, not a code path.
- **G2. The Notion transport has run only against `FakeNotion`.** Unknown until a live run: what the API
  returns for the body, query consistency right after a create, rate limits against a page of a few hundred
  blocks (each existing child is deleted by one request), block and property limits beyond what the code
  assumes (the 500 KB request-payload limit and the counting of the 2000-character limit in UTF-16 are not modelled; a batch over a limit
  would be answered 400 and shown as `rejected` or `partial`, never silently), API 2022-06-28 behaviour against this database, and how long deleted children are recoverable.
- **Keyless rows.** Any row in the database with no Key (Notion adds blank rows to a new database) turns every full `publish` red with one `blocked` `(empty Key)` line; the other rows are still written and completed (a keyless row does not hold the set). Delete or fill it first.
- **CI base.** `--base` on a force-push whose `before` commit is not in the clone exits 2 with a clean error, so that CI run goes red.
- **G3. Hand edits in flight.** A hand edit made while a row is `partial` or `unknown-write`, or `pending` after a write was
  refused or cut off (BodyHash differs from the receipt), is not told apart from the interrupted write and is overwritten on resume.
  A completed write that is only held (BodyHash equals the receipt) is protected: a later edit is a conflict. A hand edit to only the provenance header line is not detected, because the hash covers the content after it.

Not yet built, so the matching claims are not made:

- Hashing the live frozen export (the class B ZIP check) and reading the guide pages' originals: a changed ZIP or
  a later guide edition is not detected. The guide's `original_hash` is not recorded.
- A binding of existing class A rows to their Keys (needed for any class A handoff only).
- Not needed for the bounded proof on a working row: template titles, the guide's original hash and live frozen-export hashing.

## The bounded live proof (not started)

`publish --only osm.working.readme` writes one authorized working row, then a read-only rerun that makes no
write, then anonymous access to the changed page and its catalogue entry. With G1 open it can show the write, the
body read back and a rerun that makes no write; that rerun ends at HOLD, exit 4, with the rows still pending, and it cannot show `complete`. Until G1 closes and the result is reviewed,
nothing may describe the publisher as operational.
