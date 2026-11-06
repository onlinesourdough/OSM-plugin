---
name: osm-maintain-context
description: Curate owner facts, memory and routes, or perform explicitly requested OSM continuity Sync.
metadata:
  version: "2.0.1"
---

# OSM:maintain-context

For an explicit System-code update, route to
[System maintenance](../osm-update/references/systems.md); owner Sync does not
update nested repositories.

Use the resolved [context provider](../osm-context/references/providers.md);
resolve it first only when not already known. For a selected home without a
guide/mapping, [Context](../osm-context/SKILL.md) owns setup of that gap. No
provider failure falls through to file maintenance or creates a second home.

For Notion, follow its guide and [operating route](../osm-context/references/notion/operating.md).
For another existing document/vault home, use the [existing-home procedure](../osm-context/references/existing-home.md).
Curate durable decisions, reasons and corrections within current-task or standing
write authority. Update the owning record, preserve provenance, verify writes
and create nothing when unchanged. Lessons belong in the canonical Memory;
change About only when a fact it states changes, and Soul or the operating
model only under the owner's approval. This is task-time curation; personal skill
changes belong to Manage Skills. A non-file-home sync request reconciles only
its named sources, not the file-home Git procedure.

Apply the procedure below only to a selected managed AIOS file home.

## Managed file homes

For an explicit `osm sync` (or the earlier `aios sync`), read [Sync](references/sync.md)
first. At a missing
or genuinely empty chosen home, make its one Sync-existing-versus-new-setup choice;
do not mistake that absence for a malformed owner home. Otherwise read the
established AIOS.md, relevant source, and [curation](references/curation.md).
Before any owner-data mutation, check AIOS_FORMAT at the configured home using
[data compatibility](../osm-setup/references/data-format.md). Unsupported/malformed
formats stay read-only; a missing marker requires explicit setup/migration.
Before a durable change to Git-backed owner data, read [Sync](references/sync.md),
the single owner-continuity procedure.
For an actual legacy import use the separate [migration procedure](../osm-setup/references/data.md).

When an ordinary conversation creates, imports, edits, renames or removes a
personal skill, setup needs its registration, or another capability change is
proposed, route the whole lifecycle through [Manage Skills](../osm-manage-skills/SKILL.md).
It owns placement, discovery, collisions, acceptance and authorized capability
actions. This route retains owner facts and configured Git sync only; do not
duplicate or resume skill management here.

Keep shared facts in routed context, durable corrections in MEMORY.md, access
and recorded authority in CONNECTIONS.md, and useful repository pointers alongside their relevant context. Never store credentials, model choices, raw transcripts or complete
repository plans here. Native memory/history may aid retrieval but cannot
replace these sources.

Repository workers propose learning to the lead. One owner-data writer checks
the exact source bytes immediately before patching; a conflict preserves both
versions and stops that write. Do not silently invent or merge owner meaning.

Repair local reversible authority-neutral errors when the correct result is
unambiguous. Return changed facts with provenance, checks, intentional gaps,
and Healthy, Repaired or Needs decision. A check alone does not authorize cleanup.
