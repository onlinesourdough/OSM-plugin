# Publication of the public documentation

The public Notion guide, [The Onlinesourdough Method](https://gustavanderson.notion.site/The-Onlinesourdough-Method-40d6d2e17f568124af82ceb93dabf77a),
is a versioned explanatory and reference projection. It is never the installed method.
Git owns the executable method instructions: the skills and their references. Keeping the
projection aligned is the job of a publisher whose source lives in this repository. **The
publisher is source and fixtures only: it is not active, has not written to Notion, and has
no live proof. With no qualified public content reader, no live run can reach `complete`.**

## Ownership per artifact

| Class | Artifacts | Public writer |
| --- | --- | --- |
| A | The 22 released packets, frozen at v0.30.0 (`314dcf1`) | The existing upkeep route until a recorded handoff, then CI |
| B | The five Content templates and their setup, configuration and diagram explanations: a separate Notion-authored Draft edition 2026-11-05.1 | Notion-authored; the publisher never writes, derives or repairs them |
| G | The public guide pages, edition 2026-11-05.2 (the before-source) | Notion-authored; the publisher never overwrites them |
| W | Five documentation pages (README, docs index, overview, architecture, skill index), labelled unreleased | CI, once activated |
| C | The owner's private documentation control and daily state | Not a CI source or credential scope |

Skills are not published as working rows: a changed skill is reported as pending release
propagation and reaches the public guide only at a new tagged release. An unreleased commit is
never published as released or installed. A released edition resolves to its exact approved
commit and changes only at a new tagged, approved commit.

## What the publisher does

On a pull request or main merge it builds an impact diff from a frozen source commit, mapping the
changed paths since the base to the Keys they affect, and always returns a visible result; no
mapped change is a valid result. Without receipts that result says only `would-write`,
`no-source-change` or `unknown-no-receipts`, never that a row was written.

A single stage then handles the rows CI owns, by stable Key. It declares the affected set, marks each
row pending with its before and after source (a new row is created pending), replaces the body in
batches and records the body hash last. It then reads every member back: the page body (all children,
hashed in a defined normalised form), the public page and the catalogue entry. No member is complete
until the whole set passes, and a CI-owned row that fails before the write (a conflict, an
unreadable body, an access block, a body refused as unrepresentable, a refused retirement) holds the set too. A body it cannot write exactly is refused, never truncated. A row whose
body was changed elsewhere after its write completed is a conflict and is not overwritten (an edit while a row is partial or unknown-write, or pending after a refused or interrupted write, cannot be told apart and is the declared limit G3 in
[ACTIVATION](../docs-publisher/ACTIVATION.md)); an unreadable body is never called
unchanged. An unknown write is read back before any retry and a partial update resumes on the same Key.
Anything not owned by CI gets a visible refusal and no write. A missing credential makes it fail closed.
The job exits non-zero unless every row was written, unchanged, resumed, retired or is a recorded refusal.

## Current release alignment

As of 2026-11-06, v0.30.1 is a published prerelease. The public guide and this
publisher manifest still describe the approved v0.30.0 projection. With the
real newer tag present, the unchanged release guard rejects that frozen
binding; the corrected latest-package sentence also differs from its expected
v0.30.0 sentence. This is a publication HOLD, not a product installation
failure. No manifest, released row or public page was advanced. A separate
reviewed binding decision is required before current publication checks can
pass or the publisher can be activated.

## What it cannot observe yet

- **Public access and catalogue membership.** Both read as `unsupported` until a reader is qualified: an
  HTTP 200 may be a login, not-found or app-shell page, and a receipt row is not catalogue membership.
  The rows stay pending and the run reports HOLD and exits non-zero.
- **Deleted history.** No row is deleted, but replacing a body deletes the row's child blocks. Whether Notion
  keeps them is unknown here.
- **Frozen exports and the guide.** The class B ZIP hash and a newer guide edition are `not checked (unsupported)`.
- **Everything live.** The Notion transport has run only against an in-memory stand-in. See
  [ACTIVATION](../docs-publisher/ACTIVATION.md) for each result's evidence and the unmet gates.

## Where things are

- [`docs-publisher/manifest.json`](../docs-publisher/manifest.json): the per-artifact manifest.
- [`docs-publisher/ACTIVATION.md`](../docs-publisher/ACTIVATION.md): preconditions, what each result can observe, unmet gates.
- `tests/publisher-rehearsal.py`: the fixture rehearsal and its mutation controls. It uses in-memory stand-ins and is never live proof.

None of this ships in the plugin package.
