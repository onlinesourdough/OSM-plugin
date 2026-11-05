---
name: osm-manage-data-context
description: Retrieve relevant context, take in sources, curate concise durable records and repair routes, schema and the definition in the Notion Data & Context home. One method for manual, task-time and scheduled use. Formerly OSM Maintain Context.
metadata:
  version: "3.0.0"
---

# OSM:manage-data-context

Manage the Notion Data & Context home that
[Data & Context](../osm-data-context/SKILL.md) engineers: relevant retrieval,
source intake and reconciliation, concise durable curation, justified schema or
route repair, and metadata and definition upkeep. One method serves a manual
request, a task-time checkpoint and the existing scheduled invocation; the
scheduled job's prompt is its mandate, and nothing here creates or edits a
schedule.

Fetch the root entry once per session and follow the
[operating route](references/operating.md). Resolve the home within this task's
owner or client scope; a consultant's client task never changes their personal
default. What curation may write follows the owner's recorded
[home write policy](../osm-data-context/references/architecture.md#home-write-policy);
with none recorded, nothing is inferred and the current task's authority applies.
When Notion is unavailable or the destination is uncertain, hold dependent
changes and report the gap. Do not fall back to another home or an old local copy.
A general question or an independent repository task needs no owner-context
preload.

## Keep the record lifecycle

Follow the architecture's
[record lifecycle](../osm-data-context/references/architecture.md#record-lifecycle).
In short:

- One concise current record per topic and scope, with a stable identity. Revise
  the affected explanation and its Summary in place; do not append contradictory
  updates or create a version page for every correction. Split only an
  independently maintained scope, and keep useful history explicitly historical
  after verifying it.
- Preserve human originals, attribution, source evidence and material prior
  reasons. A source link, a Source record or an index entry is editable metadata;
  the original artifact keeps its body.
- Authority, relevance, evidence quality and comparable source time are separate.
  A recent edit or revision is not automatically truth or priority, and "latest
  wins" is never a rule. Conflicts and unknown dates are shown, with the reason
  kept.
- Discover the actual metadata and types before mapping. Keep source/evidence,
  import, publication, processing and technical edit times distinct. Provenance
  and current-client fields keep their meaning; do not overwrite an original
  Source with the editing agent just to record who edited.
- Optional `Revised` marks a substantive change; reads, formatting, imports and
  no-op runs never set it. Optional `Review due` is a reconsideration signal with
  a reason, never expiry or falsehood. Unknown values stay unknown: no backfill
  and no freshness score.
- Ordinary pages and the definition follow the same rules without new databases.
  Local field mappings stay small owner configuration.

## Upkeep

Work from useful new evidence, supported route or definition drift and records
that are due or flagged, not only the latest edit or a due queue. Reconcile by
identity and meaning, verify each write, keep partial progress, and inspect an
uncertain outcome before any retry. Unchanged content gets no write and no date.
Return changed facts with provenance, checks, intentional gaps, and Healthy,
Repaired or Needs decision. A check alone does not authorize cleanup.

A selected existing Content store is maintained like any other store, without any
Content module and without creating one. Skill or method changes go through
[Manage Skills](../osm-manage-skills/SKILL.md), which owns capability lifecycle
and discovery; do not duplicate or resume skill management here.

Keep shared facts in routed Notion records, durable corrections in Memory, and
access and recorded authority in the definition. Never store credentials, model
choices, raw transcripts or complete repository plans there. Repository workers
propose learning to the lead; one owner-data writer checks the exact source
immediately before patching, and a conflict preserves both versions and stops
that write. Do not silently invent or merge owner meaning.

A legacy folder or vault home is recognized read-only and never edited here; see
the [legacy-home guidance](../osm/references/update.md#legacy-file-and-vault-homes).
For an explicit System-code update, use [System maintenance](../osm/references/systems.md).
