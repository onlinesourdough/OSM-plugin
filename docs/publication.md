# Public method documentation

The public Notion guide is the readable method: explanation, setup cases, the
Data & Context definition template and diagrams. Git versions the installable
skills and runtime. A folder map connects method folders to guide pages and
identifies technical or historical folders. It is not a second task tracker.

## Source ownership

| Material | Original and permitted direction |
| --- | --- |
| Released skills (A) | Exact approved Git tag → existing public skill pages through the existing native-import upkeep; no CI handoff is qualified |
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
python3 docs-publisher/publisher.py export --snapshot public-originals.json --edition 0.34.2 --dry-run
python3 docs-publisher/publisher.py export --snapshot public-originals.json --edition 0.34.2
python3 docs-publisher/publisher.py reconcile --worktree --snapshot public-originals.json --release-tag v0.34.2 --check
```

A lead can supply the exact bodies read through the official Notion plugin in the
same snapshot format. The manifest binds each original's page ID, SHA-256 content
revision, reader, read time and package edition. Export selectors copy the
approved definition YAML and diagram Mermaid into their declared repository
regions while preserving surrounding source. The database field-definition section
also exports to the shared schema asset. Check and review the resulting diff.

The API snapshot reader uses Notion's [Markdown endpoint](https://developers.notion.com/reference/retrieve-page-markdown)
with an explicit [v2 format](https://developers.notion.com/guides/data-apis/migrate-to-notion-flavored-markdown)
and refuses truncated or unsupported content. Different reader representations
are not called equal merely because both read the page: selected exports can be
compared, but a whole-body comparison remains explicitly unsupported until the
representation is qualified. Offline checks compare frozen originals and exports;
they do not establish that the live page has stayed unchanged.
An unread original or a different, unqualified reader representation fails a live
comparison and blocks publication even when selected YAML or Mermaid still matches.

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

Successful trusted package checks and explicit dispatches can run the serialized
documentation workflow. It reads the public originals and reconciles them before
any permitted publication. It never imports the private daily runner's credential.
A missing dedicated credential or disabled activation remains a visible unmet gate.

The writer remains inactive until the existing writer relinquishes the exact
pages, the public-only integration is configured, and bounded write/readback and
anonymous page/catalogue checks pass. Neither a passing fixture nor a login page
with HTTP 200 proves publication. The optional working database is unnecessary
for existing pages bound by ID. See [activation](../docs-publisher/ACTIVATION.md).

Released native skill pages remain with `existing-upkeep`. Their qualified native
import preserves supporting files and explicit historical attachments, with source
and version readback. The legacy paragraph-per-line publisher is unsuitable for
these pages: it neither publishes native packets nor binds attachments in its body
hash, and replacing child blocks would remove supporting content. Production
publication therefore refuses class A rows assigned to CI. A native packet writer,
attachment-aware conflict checks and complete readback must be implemented and
qualified before any class A handoff; a credential alone does not make it ready.

Publishing marks the affected set pending, writes only CI-owned artifacts and
reads bodies, public visibility and catalogue membership back before completion.
Unknown writes are read before retry; partial writes resume at the same identity.
No page is deleted. Replacing child blocks is non-atomic; an edit during an
unfinished write cannot always be distinguished from partial output. Keep one
writer per artifact and workflow serialization. Unreadable or unrepresentable
content is held, never truncated or called unchanged.

## Current release alignment

The manifest binds released v0.34.1 to `4df5ef1` and seven skill packets.
The v0.34.0 source tag is retained unchanged; its automated release stopped
before creating a GitHub Release. The public writer remains inactive; current
manual packet and public-readback evidence is recorded in [verification](verification.md).
The reader keeps reviewed ancestor `dd60c9b`: every packaged skill/resource byte
is identical to the release and guarded by the build. The edition binding does
not rebuild or change the published runtime.

`tests/publisher-rehearsal.py` covers transport and retry behavior with mutation
controls. `tests/publisher-parity.py` checks original/export drift, source identities,
release bindings, dry runs and incomplete Markdown responses. Both use fixtures.
