---
name: osm-triage-improvement
description: Triage a concrete underlying improvement signal into a sanitized, deduplicated and authorized issue action.
metadata:
  version: "2.0.1"
---

# OSM:triage-improvement

Load this native skill only after the worker or lead has identified a concrete
underlying improvement signal. Ordinary deliverable corrections alone do not
invoke it. With no signal, the worker may return `Improvement signals: none`
and Review does not load this skill, search for duplicates, take issue action or
run an extra disposition workflow.

The delivery gate remains independent. A result can be correct and still
reveal an opportunity; a result can need `REVISE` and also carry a signal.
Neither signal triage nor its delivery changes the worker's primary goal. An
explicit request for an implementation issue brief selects
[Spec](../osm-spec-work/SKILL.md), which writes it and reuses the sanitation and
duplicate search below. An independently detected improvement signal still
triggers this skill as above.

## Inspect and decide

The worker reports facts; the lead decides `CREATE`, `UPDATE` or `SKIP`.
Inspect concrete failures, workarounds, repeated friction or material
capability gaps. Read more session history only when needed to reconstruct
facts; it is evidence, not authority. Confirm the underlying issue, impact and
useful evidence, then identify the canonical repository that owns it. Separate
read/search scope from issue/comment write authority: an authorized read-only
search may inspect that destination for a duplicate and improve a sanitized
draft even when write authority is absent. Unknown account, owner or read
access holds the search. Never infer read or write authority from a credential
or available tool.
Use `SKIP` for speculation, no new information, no responsible owner, a
duplicate with no new evidence, or a summary that cannot be made safe/useful.
Use `CREATE` only for a safe useful brief. Use `UPDATE` only when an existing
issue owns the problem and one substantive new evidence comment helps.

Sanitize before any search or handback: remove secrets, credentials, client
facts, private URLs and machine-specific private paths, raw prompts or
transcripts, and unrelated logs. Preserve the problem, expected and observed
behavior, minimal reproduction or unavailable proof, relevant safe revisions
and errors, chronology when necessary, impact/confidence, workaround or
recovery, duplicate search, acceptance replay and exclusions. Never upload raw
sessions or treat session history as authority.

Exact action authority must already come from the current task or a matching
standing grant. A credential, issue tool or this skill is not approval. Check
read/search authority before a destination search and write authority before
any issue/comment action. If read access is authorized but issue/comment
authority, destination or owner is missing, return the sanitized draft with the
duplicate-search result and one precise write blocker, record `SKIP`, and take
no external write. If read access is missing or unknown, hold the search too.
An issue grants no implementation, repair, pull request, merge, deployment,
closure or unrelated-comment authority.

## Deliver once and read back

After the relevant delivery `PASS` and exact authority, inspect the destination
before writing. Keep a pending signal/disposition through `REVISE`, but do not
deliver an issue action before the primary delivery gate passes. For `CREATE`,
write one reviewed issue body only when the same brief is absent. For
`UPDATE`, append one substantive evidence comment only when it adds value; do
not rewrite the original body. If an exact matching brief is already present,
read it back and `SKIP` rather than duplicate it. If a create/comment response
is lost or uncertain, inspect the destination first and retry only when the
exact effect is absent. Read back the one observed body/comment and retain its
identity.

Report `Improvement disposition: CREATE | UPDATE | SKIP`, the sanitized
evidence, exact authority basis, duplicate result and readback separately from
the worker's delivery defects and gate. If a later action is authorized, use
[Ship](../osm-ship-work/SKILL.md) only for that reviewed issue/comment action.
