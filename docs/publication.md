# Public method documentation

The public Notion guide is the readable method: explanation, setup cases, the
Data & Context definition template and diagrams. Git versions the installable
skills and runtime. A folder map connects method folders to guide pages and
identifies technical or historical folders. It is not a second task tracker.

## Source ownership

| Material | Original and permitted direction |
| --- | --- |
| Released skills (A) | Exact approved Git tag → seven existing public skill pages through the CI native packet writer after their recorded handoffs |
| Method guide (G) | Notion page and content revision → frozen Git original and declared exports |
| Optional Content templates (B) | Their stated separate source/edition; this publisher does not rewrite them |
| Working technical docs (W) | Git; an optional labelled Notion projection needs a database only if selected |
| Private business context (C) | Outside this repository, public snapshots and CI credentials |

A guide original is never overwritten from Git. A changed definition or diagram
is edited in Notion first, then deliberately exported. A hand edit to the exported
region in Git, a changed original, a missing source or an unmapped folder is
reported, not silently reconciled in the opposite direction.

## Read, export and check

Use a dedicated public-only connection to read the explicit guide page IDs:

```sh
python3 docs-publisher/publisher.py snapshot --out public-originals.json
python3 docs-publisher/publisher.py export --snapshot public-originals.json --edition 0.34.3 --dry-run
python3 docs-publisher/publisher.py export --snapshot public-originals.json --edition 0.34.3
python3 docs-publisher/publisher.py reconcile --worktree --snapshot public-originals.json --release-tag v0.34.3 --check
```

A lead can supply the exact bodies read through the official Notion plugin in the
same snapshot format. The manifest binds each original's page ID, SHA-256 content
revision, reader, read time and package edition. Export selectors copy the
approved definition YAML and diagram Mermaid into their declared repository
regions while preserving surrounding source. The database field-definition section
also exports to the shared schema asset. Check and review the resulting diff.

After binding the guide originals, run
`python3 docs-publisher/build-guide.py --icon-defaults` before freezing the skill
source commit. It projects the five approved icon URLs from the bound AI operating
model table into `skills/osm-data-context/assets/icon-defaults.json`, with its
source page and revision. Do not edit that generated file or add a second URL
list. The normal reader build refuses a missing or changed projection, and the
generator refuses unbound, incomplete or ambiguous tables and non-immutable URLs.
This is a frozen release resource read only when new-home icons are needed; it
does not establish live image availability, database metadata support or visual
rendering. Those remain separate native checks.

The API snapshot reader uses Notion's [Markdown endpoint](https://developers.notion.com/reference/retrieve-page-markdown)
with an explicit [v2 format](https://developers.notion.com/guides/data-apis/migrate-to-notion-flavored-markdown)
and refuses truncated or unsupported content. Native media is represented by its
stable Notion identity, so expiring download addresses do not enter the frozen
originals. Each original records its complete body, reader and content revision.
A live body must match that bound representation or an explicitly qualified
whole-body equivalent. Matching only selected YAML or Mermaid regions is
insufficient. An unread original, unknown media form, changed body or unqualified
representation blocks live publication.

Offline checks compare the frozen originals and their exports. They do not
establish whether the live pages have stayed unchanged; the serialized main
workflow performs that comparison using the dedicated public-only connection.

Before a release tag, bind all guide originals for that edition. The release
commit cannot contain its own future commit hash. The reviewed follow-up binds
the actual tag, exact commit, released skill set and latest-release sentence.
Moved or missing release tags are refused by live publication.

## Public guide reader

Codex receives a checked public guide export and a bundled fallback. It is a
reading surface, not a private context dashboard or a full Notion editor. The
public export contains no account credential or owner context.
`python3 docs-publisher/build-guide.py` builds it from the bound guide originals,
the explicitly frozen optional Content introduction and seven exact Git skill
sources. The virtual skill index links those same public page identities.
The build checks this export before bundling the reader. See
[Codex integration](sidebar.md) for runtime behavior and native qualification.

## CI and activation

Successful trusted `main` package checks and explicit `main` dispatches run the
serialized documentation workflow. It reads the eight public guide originals
and reconciles their complete bodies and exports before any permitted write.
Its dedicated public-only connection is separate from the owner's private
Notion route. Missing access, activation or reader qualification is a visible
failure, not an offline success presented as live delivery.

`native_skills.py` builds the bound released packets from the immutable approved
tag and delivers each to its existing bound Notion page. It compares all
supporting files by bytes, the complete native instructions by their semantics
and structure, and the title plus six managed properties by value. Historical
source packets remain in the archive. An unrecognised edit or attachment is held
for inspection. The legacy paragraph writer refuses these native skill pages;
it serves only the optional working projection, which is not provisioned.

After all writes and API readbacks, an isolated browser reads all seven pages
and the catalogue in one fresh anonymous session. It receives no Notion or
GitHub credential and retains no profile between runs. Visible instruction
lines must match in order; a title, login shell or HTTP 200 alone cannot pass.
Navigation is paced and respects bounded server backoff. A failed public check
retains the API write evidence and holds the run.

Unknown writes are read before any retry. A rerun reads current content and
resumes at the same page identity, without uploading an already verified packet.
The workflow serializes runs; the previous upkeep has relinquished these exact
seven pages. Guide originals, optional Content templates and private context
remain outside its write scope. See [activation](../docs-publisher/ACTIVATION.md)
for the recorded gates, recovery rules and actual qualification evidence.

## Current release alignment

The released edition in `docs-publisher/manifest.json` binds an existing reviewed
tag to its exact commit. [Documentation](README.md) identifies the actual latest
GitHub Release separately from a source candidate. Before tagging, every guide
original must be deliberately bound to the intended package edition and enabled
live parity must succeed on that exact main commit. A reviewed follow-up binds
the new release only after its tag exists; the workflow then delivers that
release's packets. Neither a source push nor an API write alone establishes
public delivery or installation.

[Verification](verification.md) records release assets, native adoption and
actual publication runs separately. Older dated inactive observations remain
historical evidence. No CI implementation guide is added to the public method.

`tests/publisher-rehearsal.py` covers transport and retry behavior with mutation
controls. `tests/publisher-parity.py` checks original/export drift, source identities,
release bindings, dry runs and incomplete Markdown responses. Both use fixtures.

### Reviewed source references and published packages

The manifest's latest reviewed source tag can precede its GitHub Release. Native reading copies therefore say **Source reference**, link the exact commit and its repository archive, and retain the exact per-skill source ZIP. They do not advertise a missing release asset or establish package publication. Actual releases and installed versions retain their separate readbacks.

When recognising prior publisher output, reconstruct only current explicitly bound row identities that existed in the historical tag. The current roster still requires complete coverage. Unmarked packets through v0.36.4 use the preserved legacy reading projection for recognition, including their original relative-link formatting and introduction; new packets record their explicit projection in SOURCE.json independently of the source tag, and unknown projections are refused; this is not a rewrite or relaxed comparison of live files. The retained actual v0.36.3 packet digests independently exercise the seven-to-eight transition and reject an edited older packet.
