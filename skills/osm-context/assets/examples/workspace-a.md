# Fictional workspace A: new blank root reusing existing stores

Everything here is invented: Willowmere Pottery, its people, providers, IDs and
amounts do not exist. It illustrates the
[Context Architecture](../../references/architecture.md); the matching offline
fixture is `tests/fixtures/context-architecture/workspace-a.json` in the author
repository.

**Starting point.** A Notion workspace with an existing Clients database and an
existing Projects database that the owner already uses. No earlier context entry.

**Root.** The owner creates a blank page "Data & Context" (`fict-a-root`) and
grants the internal connection that root only. Clients and Projects stay where
they are; the definition reuses them by identity as operational sources.

| Role | Destination |
| --- | --- |
| Curated knowledge | `fict-a-knowledge` "Knowledge", native child of the root |
| Memory | `fict-a-memory`, native child of the root |
| Methods | `fict-a-skills`, native Skills |
| Operational sources | Clients `fict-a-clients`, Projects `fict-a-projects` (direct, canonical) |
| Definition and control | The root's YAML; `fict-a-maintenance` holds the pipeline agreements |

**Selected excerpt.** One section of the owner's glaze-safety handbook (a human
original in the owner's personal library, `fict-a-handbook`) is retained in
Knowledge through a qualified read-only collector route: source and target
identity, original authority (owner-written handbook), provenance, observed
revision `r7`, source date 2026-03-02, meaning ("kiln temperature limits for
the studio glazes"), uncertainty (none stated), coverage (section 3 only) and
refresh state (checked 2026-10-20). The handbook itself is unchanged.

**Write policy: the owner's recorded choice.** On 2026-10-12 the studio owner
chose whole-home: agents and the maintenance job may read, insert and update
across the root and its real descendants. The definition records that choice
once (`write_policy`); nothing is asked again per write. Sharing, accounts,
credentials, deletion and publishing still need their own authority.

**Maintained control record inside Knowledge.** A legacy "Source index" page
(`fict-a-knowledge/source-index`) sits inside Knowledge. Under the recorded
choice, curation maintains it like any control record, with a useful-change
reason.

**Relocation candidate.** One agent-created page, "Studio pricing notes"
(`fict-a-reloc-1`), landed in the owner's personal library during an earlier
trial. On the owner's explicit choice it can move to Knowledge with its ID,
content, creation time, evidence and relations preserved.

**Finance, partial.** The fictional Ledgerline accounting source covers January
to June. A question about annual revenue gets "January–June: 18,400 EUR net
from 41 complete invoice rows; July–December not covered", never an annual total.

**States.**

| Source | State |
| --- | --- |
| Ledgerline invoices | Manual run verified on 2026-10-20; saved schedule; no timed run observed yet |
| Chatterbox chat | Unknown: plan entitlement not yet checked |
| Payment provider | Blocked: read-only credential not yet issued |
| Newsletter platform | Deferred by the owner |
