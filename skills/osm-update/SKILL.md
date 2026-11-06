---
name: osm-update
description: Update or roll back a reviewed OSM package or a selected System.
metadata:
  version: "3.0.1"
---

# OSM:update

For a selected System installation or an explicit System-code update, use
[System maintenance](references/systems.md), the single procedure for that
boundary. A package update does not update Systems, and owner Sync transfers
source pointers, not their repository contents. The remaining steps here
apply only to the OSM package.

Keep the active task on its known method version. At a suitable task boundary,
inspect the requested immutable release, current installed identity and source,
owner-format compatibility, discovery origins and recovery path. Use
[native adapters](../osm-setup/references/adapters.md) for supported package
operations. A source checkout is not an installed release.

## Choose the adoption path

- An existing native `osm@online-sourdough` 0.30.0+ package uses its supported
  update or reinstall operation targeting the reviewed ref.
- An `aios@online-sourdough` package (0.29.x or earlier) is the same method under
  its previous identity. Updating it never installs `osm`; follow
  [switch procedure](../osm-setup/references/migration.md#switch-from-aios-to-osm):
  install and read back `osm`, disable `aios` before fresh-session acceptance,
  and keep `aios` restorable. Owner data and bridges stay as they are.
- An OSM 0.1.x package changes identity as well as method content. Follow
  [identity migration](../osm-setup/references/migration.md); updating the old
  selector does not install the new one automatically.
- A legacy AIOS template/global skill installation needs the same explicit
  source/registration inventory. Identical skill names are not evidence that
  this package owns those files. Never invoke the old template updater to copy
  methods into this package or infer ownership from an `aios-*` or `osm-*` prefix.

Use a read-only plan first: exact source/tag or commit, installed and target
versions, native registrations, owner-data compatibility, potential conflicts,
permitted mutations and preserved rollback identities. Read release notes and
check hashes/source identity. A missing baseline or customized discovery source
is a gap to resolve, not permission to overwrite it.

## Shared-method migration (0.4.0)

For an explicitly requested System/Project migration, inspect only selected
repositories for legacy generic phases, technology choice, audit and tracking
copies. Read their local contracts and classify each method by responsibility,
not name alone: domain review/audit methods remain specialist-owned. Preserve
real local constraints in AGENTS or their existing domain owner before removing
known generic payloads and callers. Use [migration guidance](references/shared-lifecycle.md)
for this boundary. A package-only update neither scans nor rewrites repositories.

## Apply and verify

Under existing exact installation authority, use supported native actions for
only the accepted package/registration changes. Leave owner data and custom
skills untouched unless a separately reviewed migration explicitly includes
those paths. A customized operating model, Soul or personal skill is never
regenerated because a newer template or upstream setup guide exists; reconcile
a new upstream guide version deliberately, keeping the model's own revision and
local rules. Acquiring a new skill or
specialist is a [Manage Skills](../osm-manage-skills/SKILL.md) change. Do not edit caches, native databases or the entire settings file.
Respect app-control denials and current native permissions.

Read back package source/version and start a fresh session. Verify the release’s declared public
skills are discoverable exactly once and that ordinary owner and independent
repository requests use the intended routes. Report source installation,
discovery, desktop entry-point cutover and model behavior separately. A failed
or unavailable native observation stays pending even if source checks passed.
Use [Check](../osm-check/SKILL.md) for the relevant acceptance scope.
For Codex, recheck [checklist and goal acceptance](../osm-setup/references/codex-tracking-acceptance.md)
only when runtime/version or capability evidence changed, is missing or uncertain;
an unchanged method update reuses dated evidence and does not authorize config edits.

## Recover

Preserve the prior reviewed ref and pre-change registration/bridge evidence.
A failed update stops further activation; restore only the scoped native
registration through supported actions when authority covers recovery. Do not
delete the old artifact, home, history or unknown settings. An uncertain action
requires readback before retry. Subsequent edits are conflicts, not overwrite
permission. Product rollback does not roll back owner data; the explicit
[migration map](../osm-setup/references/migration.md) owns that separate
recovery. Report exact delivered/active identity, unavailable proof and the
next bounded action.
