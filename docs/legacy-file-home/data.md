# Owner-data migration (#54)

Use only for an actual legacy import, owner-file move, personal-method route
repair or optional private backup. Read the small [format contract](data-format.md)
first. Current format checks and ordinary writes stop there rather than loading
this migration procedure. For package identity changes, legacy template layout or overlapping
native/global registrations, also use the explicit [identity migration](../../skills/osm-setup/references/migration.md).

## Plan before migration

Inspect source and destination without modifying either. Inventory every file,
symlink target, mode and content hash, including untracked/ignored work and
nonreserved owner skills. Separate portable context, independent repository
checkouts, assets, credentials, harness configuration and recovery state.
Do not read credential contents into evidence; use secure existing credential
stores and reauthenticate on another machine. A Git URL cannot preserve local
uncommitted files. Keep a local protected original/backup and test restore.

Construct an explicit source-to-destination map. For legacy template AIOS, map the
CONTEXT index to AIOS.md routes plus context detail, MEMORY to MEMORY,
CONNECTIONS to CONNECTIONS, and useful work/specialist pointers to the
owner’s relevant source indexes. Preserve facts, sources, access boundaries, every registry column,
unknown values and all nonreserved owner skills externally. The 17 proved legacy methods map to the
packaged [legacy parity map](../../skills/osm-setup/references/legacy-parity.md). A name or prefix alone never
proves ownership; inspect provenance before changing any legacy registration.
Other owner methods stay outside Method. System and
Project skills stay in their repositories. Do not copy private .aios context
into the distributable repo or package.

Use the new neutral assets only for absent files. Preserve existing data rather
than overwrite with blank templates. A richer legacy CONTEXT can remain a
routed context/legacy-context.md with its content intact while AIOS.md stays
short; rewrite only references whose mapped targets are proved. Compare facts
and routes semantically, not just file counts. A newly selected independent
product root overrides any research suggestion to reuse the legacy repo.

## Preserve owner methods while repairing their routes

Preserve original bytes, modes and unknown fields in a recoverable source or
backup. At the new destination, semantic preservation may require a minimal
path or caller change: a moved `.aios` reference or a retired lifecycle skill
name must not remain broken merely to obtain equal hashes. Setup authority
covers a narrow, verified adaptation; it does not authorize redesigning the
method, deleting unknown metadata or changing its action permissions.

List each old reference, proved new target and reason in the accepted map.
Resolve paths relative to the receiving skill, including referenced assets.
For a retired reserved caller, use the [parity map](../../skills/osm-setup/references/legacy-parity.md) to select
the new entry/reference, preserving the caller's intent and lifecycle gate.
Change only those spans, compare the complete diff, and prove all other bytes
and unknown fields unchanged. Open the new target and rehearse the affected
invocation or route before claiming functionality. If intent or the target is
ambiguous, keep both versions and stop that adaptation for review.

Record original and accepted destination hashes separately. An identical
replay compares against the accepted transformed destination, not the obsolete
source bytes. Subsequent destination edits are conflicts, not permission to
overwrite. Restore can recover the original body; activation uses the verified
adapted body. Do not copy either body into the distributable Method package.

## Apply a reviewed content-preserving map

One owner-data writer applies only the accepted paths. Compare each current
source/destination hash to the planned baseline immediately before writing.
The accepted mapped content at an existing destination is a no-op, including
any verified path/caller substitutions. A different existing
destination is a conflict: preserve source and destination, stop that unsafe
write, and return both identities. Never auto-merge contradictory facts or
permissions. Do not write through unexpected symlinks. Record completed map
entries/hashes in local migration evidence so an interrupted run resumes at
the first incomplete entry; do not copy that log into the always-read core.

Set format 2 only after mapped facts, owner methods, routes and restore proof
pass. Re-run the migration: it must produce no new files, duplicate bridges,
metadata entries, changed content or new authority. Preserve unrecognized data.
A rollback restores only scoped changed files whose current bytes still equal
the migration's output. If subsequent owner edits exist, keep both versions and
reconcile instead of overwriting. The legacy original remains available.

## Move to another machine

Copy portable owner context, optional owner skills and required local assets
using a reviewed file backup. Inventory nested checkouts separately so a folder
copy cannot silently replace their independent recovery plan. Preserve
repositories and uncommitted work; clone only repositories that are actually
available and authorized, restore local work separately. Inventory/hash compare
source and restored files, then resolve the new absolute home once and update
only managed bridge paths and explicit machine-local checkout paths. Keep
canonical Git URLs unchanged. Reauthenticate required accounts natively;
never copy entire .codex/.pi trees, histories or secret stores. Test a real
owner task and a local repository task on the target machine. Mark unavailable
checkouts, assets and connections precisely. Do not delete the old home or
remove its navigation pin until lead reconciliation proves the cutover.

## Optional private Git backup

Local folder operation needs no Git. If the user chooses it, initialize a
separate private owner-data repository, not the distributable Method product.
Inspect tracking/ignore rules before adding: credentials, work, backups and
nested checkouts must stay outside commits. Use the
[checkout ignore rules](owner/.gitignore) while preserving existing source-index
README files trackable. Prove exclusions with git check-ignore and inspect the
index for already tracked checkout files or gitlinks: ignore rules do not untrack
them. Stop unsafe staging and reconcile that state under explicit scope; do not
silently remove index entries or repository work. Verify private destination/account
and explicit allowed paths and branch. User configuration records authority;
product assets leave it unset. Follow [sync](sync.md).
Private visibility is not permission to store secrets. Product update/uninstall
never deletes or migrates this owner repository automatically.
