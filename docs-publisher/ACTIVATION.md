# Documentation automation activation

The reconciliation and export implementation is available. The public writer is
inactive. No dedicated CI credential is configured and no live CI write is claimed.

## Required before publication

1. Provision a dedicated Notion integration with grants limited to the public OSM
   guide and catalogue. Do not reuse the owner's private maintenance credential.
2. Store it privately as the GitHub Actions secret `OSM_PUBLIC_DOCS_TOKEN` and
   enable the explicit workflow setting only when the grants have been checked.
   Do not paste its value in a chat, issue, source file or workflow log.
3. Read the exact bound guide IDs through the Markdown v2 API, export their
   originals, compare definition/diagram regions and qualify the reader's body
   representation. Missing access, truncation or unsupported blocks are failures.
4. Keep released skill pages on `existing-upkeep` and record no CI handoff hash.
   The current paragraph writer cannot deliver native skill packets and would
   replace file/child blocks; its body hash does not bind attachment bytes.
   Implement and qualify a native packet writer with attachment-aware conflict
   checks, supporting-file preservation and version/source readback first.
   Production publication refuses class A assigned to CI until that implementation
   is deliberately changed. Only then record each page's identity, full native
   state, Key and sole-writer handoff. No private IDs or schedules enter CI.
5. Qualify one bounded write to an existing public page, exact saved-body readback,
   anonymous public content and catalogue membership. A receipt or HTTP status
   alone is insufficient. `public_reader` stays null until that proof exists.
6. Set `activation.active` in a reviewed commit, then run the serialized workflow.
   Verify the whole affected set and a repeat run with no writes before claiming
   automatic publication is active.

Existing bound pages need no extra working database. Provision one only if a
separate main-working technical projection is wanted, then record its exact
identity in `bindings.working_subtree`. Publication refuses another database.

## What the checks establish

- Offline reconciliation compares Git, frozen Notion originals and declared
  exports. It cannot know whether a live original changed after its read time.
- A live snapshot reads only explicit public guide IDs. It does not follow
  private links or enumerate the owner's workspace.
- A different Markdown representation is not proof of equal full content.
  Exported YAML/Mermaid regions are compared independently; whole-body equality
  remains unsupported until the representations are qualified. A live comparison
  fails on an unqualified representation; publication cannot proceed from it.
- The release guard resolves the approved tag to its exact commit. Before a new
  tag, every guide original must be bound to the intended package edition.
  When live parity is enabled, wait for `osm/public-guide-parity` success on that
  exact main commit before tagging. Release publication requires that status;
  it never reads the Notion secret itself. With live parity disabled, the release
  job explicitly reports the frozen baseline's read times instead.
- Publication writes only artifacts assigned to CI. Notion-authored guide
  originals and optional Content templates are never overwritten or repaired.
- Anonymous public access and catalogue checks remain unsupported until their
  reader is qualified; with that gate absent no live write reaches `complete`.

## Retry and concurrency limits

The workflow concurrency group serializes publication. One writer owns each
artifact. A pending marker, before/after source and body hash identify progress.
An unknown write is read before retry. A partial write uses the same page identity.
A completed page edited elsewhere becomes a conflict and is preserved.

Replacing child blocks is not atomic. A human edit during a partial, unknown or
interrupted write may be indistinguishable from that partial output. Do not run
another writer on those pages. No row is deleted, but Notion's retention of
replaced child blocks is outside this implementation's guarantee.

The fixtures are not live evidence. Record the actual reviewed artifact, grants,
readback, public checks and no-op rerun when these gates have been met.
