# Content graph and supervised handoff

Use a graph when a content family needs source/transcript/master/derivative
lineage, versioned review or exact publisher selection. Ordinary standalone
writing does not require one. Keep the graph beside the artifacts it binds.
The read-only [validator](../scripts/check-content-graph.mjs) is the executable
contract; it uses Node 22+ without dependencies and runs from any working directory:

```sh
node "$CONTENT_SKILL/scripts/check-content-graph.mjs" "$PRODUCTION/content-graph.json"
node "$CONTENT_SKILL/scripts/check-content-graph.mjs" "$PRODUCTION/content-graph.json" "$PRODUCTION/publisher-handoff.json"
```

Set these variables to the resolved skill directory and actual external work
folder. [Graph](../assets/templates/content-graph.json) and
[handoff](../assets/templates/publisher-handoff.json) templates are intentionally
invalid until populated with real nodes and hashes; never invent filler nodes.
Existing `acs-content-graph/1.0` and `acs-publisher-handoff/1.0` identifiers are
retained for compatibility. No automatic directory or identity migration occurs.

Family and node IDs are stable lowercase kebab-case, independent of titles,
paths and channels. Versions are positive integers. Increment the affected node
version on changed bytes or identity, refresh its hash and reopen its review;
increment the family version when deliberately superseding the graph revision.
Assess downstream meaning and refresh any affected derivatives. Preserve
unchanged IDs and approved versions.

Each `source`, `transcript`, `thesis`, `master` or `derivative` node contains
only its needed artifact: normalized contained relative POSIX `path`, lowercase
media-type `format`, `sha256:` plus 64 lowercase hex digits over real bytes,
`provenance` (stable type, truthful statement, reference strings), and its own
`review`. Review is `not_reviewed`, `in_review`, `approved` or `rejected`.
Decided states require reviewer and reference; otherwise both are null.
Optional `channel_targets` are arbitrary stable IDs, never a platform allowlist.
Rights, raw-ASR uncertainty and externally produced assets remain explicit.

Edges are `{type, from, to}`: `from` makes the relationship to the referenced
`to`. Supported types are `derived_from`, `excerpt_of`, `adaptation_of`,
`variant_of`, `companion_to` and `promotes`. Relationships and family/source/
master/sibling approval never propagate approval.

Optional `design_handoff` has `revision`, `provenance`, `review_reference` and
`files`: exactly one `design` role pointing to `DESIGN.md`, plus selected `asset`
roles with contained relative paths and real hashes. Omit it without accepted
direction. Keep editable originals with their design owner.

Complete [final review](final-review.md) before selecting approved nodes.
The handoff binds the graph’s actual hash, family ID/version, and each selected
node ID/version/hash. Optional selection targets must be a subset of that
node’s targets. Its invariants remain:

```json
{"status":"awaiting-separate-authorization","supervised":true,"not_posted":true,"external_posting":false}
```

Return exact artifact paths, node versions, hashes and review references to the
caller. Packaging is editorial selection, not a generated publishing package.
Any publishing, sending or scheduling is a separately authorized external effect
owned by the caller’s delivery workflow. This helper has no posting command.

The validator checks shape, containment, bytes and recorded review status. It
cannot prove that a referenced reviewer inspected or accepted the exact version;
inspect that evidence, including freshness after changes, during final review.
