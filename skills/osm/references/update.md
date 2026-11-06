# Update, roll back and recover

Adopt or roll back a reviewed OSM package, or maintain a selected optional
specialist. This is separate from a read-only [check](check.md) (a check never
authorizes an update) and from curating owner content (that belongs to
[Manage Data & Context](../../osm-manage-data-context/SKILL.md)). It reuses the
authority the task already has and adds no approval ceremony of its own.

For a selected System installation or an explicit System-code update, use
[System maintenance](systems.md), the single procedure for that boundary. A
package update does not update Systems. The steps below apply only to the OSM
package.

Keep the active task on its known method version. At a suitable task boundary,
inspect the requested immutable release, the current installed identity and
source, discovery origins and the recovery path. Use
[native adapters](../../osm-setup/references/adapters.md) for supported package
operations. A source checkout is not an installed release.

## What an update never changes

An update preserves the owner's choices and extensions under the
[Context Architecture](../../osm-data-context/references/architecture.md):
the recorded write policy and the one existing maintenance job, personal
skills, and every explicit model, effort, provider or account selection. It
never overrides a narrower policy, adds a job, backfills dates or changes a
selection to make a check pass.

## Choose the adoption path

- An existing native `osm@online-sourdough` 0.30.0+ package uses its supported
  update or reinstall operation targeting the reviewed ref.
- An `aios@online-sourdough` package (0.29.x or earlier) is the same method under
  its previous identity. Updating it never installs `osm`; follow
  [switch procedure](../../osm-setup/references/migration.md#switch-from-aios-to-osm):
  install and read back `osm`, disable `aios` before fresh-session acceptance,
  and keep `aios` restorable. Owner data and bridges stay as they are.
- An OSM 0.1.x package changes identity as well as method content. Follow
  [identity migration](../../osm-setup/references/migration.md); updating the old
  selector does not install the new one automatically.
- A legacy AIOS template/global skill installation needs the same explicit
  source/registration inventory. Identical skill names are not evidence that
  this package owns those files. Never invoke the old template updater to copy
  methods into this package or infer ownership from an `aios-*` or `osm-*` prefix.

Use a read-only plan first, with the exact before and after revision: source/tag
or commit, installed and target versions, native registrations, the home's
compatibility, potential conflicts, permitted mutations and the preserved
rollback identities. Read release notes and check hashes/source identity. A
missing baseline or customized discovery source is a gap to resolve, not
permission to overwrite it.

## Retired names and the scheduled caller

Several entries were renamed or folded into `osm`: `osm-context` is now
`osm-data-context`, `osm-maintain-context` is now `osm-manage-data-context`,
and Check, Update and model advice are procedures of `osm`. Content and Diffusion
Studio left the package. No alias skill directory ships, so a request that uses an
old name reaches the new owner through `osm`'s routing.

An existing scheduled caller that invokes `osm-maintain-context` needs one
retarget to `osm-manage-data-context`. Prepare it as a one-time change under the
owner's existing job authority; this reference does not read or edit any
schedule.

1. Read the native job identity first: its id and name, cadence, scope and the
   prompt that names the old skill. Write them down before any change.
2. Change only the skill name in that same job. Keep the cadence and scope
   exactly. Do not create a second job, and do not leave two writers.
3. Read the job back and compare it with step 1. Report the exact before and
   after.
4. An uncertain outcome is inspected, not retried blindly. If the job changed
   in a way you did not intend, restore the recorded prompt from step 1.

## Apply and verify

Under existing exact installation authority, use supported native actions for
only the accepted package/registration changes. Leave owner data and custom
skills untouched unless a separately reviewed migration explicitly includes
those paths. Do not edit caches, native databases or the entire settings file.
Respect app-control denials and current native permissions.

Read back package source/version and start a fresh session. Verify the release’s
declared public skills are discoverable exactly once and that ordinary owner and
independent repository requests use the intended routes. Report source
installation, discovery, desktop entry-point cutover and model behavior
separately. A failed or unavailable native observation stays pending even if
source checks passed. Use the [check procedure](check.md) for the relevant
acceptance scope. For Codex, recheck
[checklist and goal acceptance](../../osm-setup/references/codex-tracking-acceptance.md)
only when runtime/version or capability evidence changed, is missing or
uncertain; an unchanged method update reuses dated evidence and does not
authorize config edits.

## Roll back and recover

Preserve the prior reviewed ref and the pre-change registration/bridge evidence.
A failed update stops further activation; restore only the scoped native
registration through supported actions when authority covers recovery. Do not
delete the old artifact, home, history or unknown settings. An uncertain action
requires readback before retry. Subsequent edits are conflicts, not overwrite
permission. Product rollback does not roll back owner data; the explicit
[migration map](../../osm-setup/references/migration.md) owns that separate
recovery. Report the exact before and after delivered/active identity,
unavailable proof and the next bounded action.

## Legacy file and vault homes

Earlier versions could keep the context home in a managed folder (`AIOS.md`,
`AIOS_FORMAT`, `MEMORY.md`, `CONNECTIONS.md`) or in an Obsidian vault,
repository or drive. OSM now establishes and maintains the data and context
foundation in Notion only. Such a home is not a supported OSM home, and nothing
here converts it.

- Recognize it read-only: the `AIOS_FORMAT` marker, the files above, or a
  pointer block that names a folder or vault. Do not write to it, upgrade its
  format or treat it as a fallback when Notion is unavailable.
- Say plainly that the home is incompatible with this version's core, that
  nothing was changed, and what the owner can do next.
- Preserve the originals and recovery: keep the folder or vault and any backup
  as they are, and keep the prior package ref, which rolls back the method (not
  the data) by the procedure above. No silent conversion, no destructive
  cleanup, no default mirroring or sync, and no alternate-home fallback.
- Offer migration only as a separate, requested, reviewed task. The old home is
  read as a source; Setup and Manage Data & Context then write the useful,
  selected content into the Notion roles as ordinary reviewed writes whose
  provenance points back at the old source. The old home stays the untouched
  original until the owner decides otherwise.
- External systems, local files and repositories remain valid sources and
  working artifacts. They are not an alternate OSM context home.

## Shared-method migration

For an explicitly requested System/Project migration, inspect only selected
repositories for legacy generic phases, technology choice, audit and tracking
copies. Read their local contracts and classify each method by responsibility,
not name alone: domain review/audit methods remain specialist-owned. Preserve
real local constraints in AGENTS or their existing domain owner before removing
known generic payloads and callers. Use [migration guidance](shared-lifecycle.md)
for this boundary. A package-only update neither scans nor rewrites repositories.
