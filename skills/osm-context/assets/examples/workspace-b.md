# Fictional workspace B: migrating a separate-entry layout

Everything here is invented: Harborlight Surveys, its people, providers, IDs and
amounts do not exist. It illustrates the
[Context Architecture](../../references/architecture.md) and its
[migration](../../references/migration.md); the matching offline fixture is
`tests/fixtures/context-architecture/workspace-b.json` in the author repository.

**Starting point.** An older layout with a separate entry page, "Operating Notes"
(`fict-b-old-entry`), holding a definition and two procedure children. The team's
human library, "Business Docs" (`fict-b-business-docs`), holds proposals and
reports the team writes. An existing "Field Jobs" database (`fict-b-field-jobs`)
is shared with the whole team.

**Root.** The owner selects a new blank root, "Survey Data & Context"
(`fict-b-root`). The migration moves the definition into the root with its
compatible field names. "Operating Notes" becomes a maintenance/recovery
container with a notice pointing to the root; its procedure children stay, and
the old links `fict-b-link-1` and `fict-b-link-2` keep resolving to it.

**Scoped destination.** New knowledge records need a parent the internal
connection can create in. Field Jobs must not be widened to make that work, so a
new scoped database "Survey Knowledge" (`fict-b-knowledge`) is created under the
root. Existing individually granted Field Jobs pages stay canonical.

| Role | Destination |
| --- | --- |
| Curated knowledge | `fict-b-knowledge` "Survey Knowledge" (the owner's own label) |
| Memory | `fict-b-memory`, native child of the root |
| Methods | `fict-b-skills`, native Skills |
| Operational sources | Field Jobs `fict-b-field-jobs` (direct, canonical); Minutely meeting notes (projection) |
| Definition and control | The root's YAML; `fict-b-maintenance` holds the pipeline agreements |

**Selected excerpt.** The scope section of a signed proposal in Business Docs
(`fict-b-proposal-12`) is retained in Survey Knowledge with source and target
identity, original authority (signed proposal), provenance, observed revision
`v3`, source date 2026-05-14, meaning ("agreed survey boundary for the harbour
wall job"), uncertainty (appendix B unread), coverage (section 2 only) and
refresh state (checked 2026-10-21). Business Docs is unchanged.

**Protected control record inside the knowledge store.** A "Mapping table" page
(`fict-b-mapping`) inside Survey Knowledge defines the Minutely field mapping. It
is protected by its exact identity.

**Relocation candidate.** One agent-created "Meeting digest" page
(`fict-b-reloc-1`) was written into Business Docs by an earlier setup. On the
owner's explicit choice it moves to Survey Knowledge with its identity preserved.

**Finance, partial.** The fictional Tallyhouse invoicing source exports invoices
but not credit notes. "First invoice to this client" is stated as "first observed
in the covered period (from 2026-02)", and a net total is marked partial until
credit notes are covered.

**States.**

| Source | State |
| --- | --- |
| Minutely meeting notes | Configured only; no manual run yet |
| Tallyhouse invoices | Unknown: completeness of history not yet established |
| Shared drive scans | Blocked: no qualified read-only collector route yet |
| Customer survey archive | Deferred by the owner (historical one-off, later) |
| Payroll | Excluded by the owner |
