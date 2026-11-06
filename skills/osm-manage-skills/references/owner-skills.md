# Personal and team skill lifecycle and discovery

Manage Skills owns this owner-method procedure. Use it when an authorized
conversation creates, imports, edits, renames or removes a personal or team
skill, and when Setup places owner methods. Callers link here; do not copy these
steps into another skill. It keeps personal placement, registration and
discovery in the same capability-management lifecycle as installation, update,
removal and rollback. Owner facts and curation remain with
[Manage Data & Context](../../osm-manage-data-context/SKILL.md). This is a
task-boundary procedure, not a watcher or permission to audit unrelated skill
libraries on every message. The owner's recorded write policy decides whether a
skill write is allowed; this procedure decides how it is done, for Manage Data &
Context and a scheduled job as for a person.

## Choose the owner before authoring

Owner-specific, cross-project methods belong in the home's Skills store, using
the [Notion skill lifecycle](notion-skills.md). Repository-specific methods stay
with that repository, and external or plugin skills stay with their distributor.
Do not redirect a genuinely independent repository task into personal owner data.
A legacy folder or vault home is read-only; see the
[legacy-home guidance](../../osm/references/update.md#legacy-file-and-vault-homes).

For a team method, resolve the actual team-owned source, maintainer and change
authority first. Do not place a shared method in an individual global folder or
promote a personal skill by changing its label. Preserve actual access controls.

Use the harness's available Skill Creator for authoring and validation, giving
it the explicit canonical destination above. Do not copy the creator into OSM,
accept its unrelated default directory, or create a second canonical body.
An explicit owner-requested alternative takes precedence; report how its
discovery and backup differ. Pass accepted task intent, not unrelated context.

Prefer a reference to an existing sufficient procedure over a new skill or a
copied workflow. A caller states its trigger and required result; the callee
owns the steps and acceptance checks. Keep distinct responsibilities separate
even when they share vocabulary. Personal facts remain in routed context,
not embedded in the reusable method.

Native plugin namespaces and personal skill names are separate. A harness may
show a plugin skill as `osm:<name>`; keep its canonical name and source.
Personal methods keep the owner's chosen identity; belonging to an OSM owner
home does not make them OSM package skills or require an `osm-` prefix. Keep
folder and declared name aligned. Do not rename unrelated third-party skills.
For an authorized rename, map old/new bodies, callers and owned registrations,
preserve recovery evidence, update them together and verify the obsolete name is
no longer discovered. Naming alone does not move personal methods or facts into
the distributed plugin.

## Reconcile a host-local registration

A locally installed copy of a personal method is a host-specific binding, never
a second canonical body: the Skills store stays canonical.


1. Inspect the canonical body and the same name in relevant native, plugin and
   user discovery locations. Compare the skill's declared name as well as its
   folder name and resolved source. For setup, inventory the owner's skills; for
   ordinary work, scope this to the changed skill and its old name.
2. For Codex where supported, register one symlink
   `~/.agents/skills/<name>` to the resolved canonical folder. An absent entry
   may be created under the task's setup/skill-creation authority. An existing
   link to that exact folder is a no-op. A same-name directory, foreign link,
   unknown dangling link or conflicting package skill is a collision: preserve
   both and stop that registration, without overwriting or uninstalling it.
3. For separately selected Pi owner-skill setup, follow the
   [Pi adapter](../../osm-setup/references/adapter-pi.md#preserve-existing-discovery).
   Inspect current discovery first; keep an existing route that loads the
   canonical skills once. If a local skill folder must be registered, use Pi's
   supported skill-path setting, preserving ambient skills and unrelated
   selections. An exact existing entry is a no-op. Preserve and report
   conflicting roots or packages; do not add a duplicate route.
4. Repoint a moved/renamed Codex link only when the prior target and ownership
   are proved by the accepted change map. Remove an obsolete registration only
   under the accepted rename/removal scope and only while it still matches that
   prior identity. Re-read immediately before changing it. A body edit at the
   same path does not need another link. No duplicate copies in `.codex/skills`
   or extra Pi `skills` entries for the same body.
5. If this harness cannot load its supported registration, use its documented native
   registration for the same source and verify it. An unavailable control or
   collision is a reported gap, not permission to invent a loader, broaden
   access, modify caches or register a second source. Other harnesses require
   their own verified adapter.

The canonical skill lives in the Skills store; links and native discovery
settings are machine-local and are recreated on the receiving computer. Never
copy whole harness homes or credentials. A scope-specific backup/rename map
must retain original bodies and registration identities; rollback changes only
the task's outputs that still match its recorded result. Preserve later edits.
Deleting a registration does not authorize deleting its body or history.

## Verify before saying ready

- Validate the final skill with the available creator/validator; resolve all
  referenced resources from its canonical location.
- Read back the link/native registration and prove its canonical target. Replay
  reconciliation: it must be a no-op, not another copy or registration.
- Use supported native discovery or a fresh session to confirm the final name
  and source appear once. After rename, confirm the obsolete name is absent;
  after removal, confirm the registration is absent without deleting the body
  unless that deletion was separately authorized.
- For a new or materially changed skill, perform a bounded representative
  read-only or synthetic invocation, verifying that the runtime reads the
  canonical instructions and follows the intended route. Do not publish,
  connect accounts or perform the skill's real external action merely to test
  discovery. Native metadata alone is not behavioral proof.

Report authoring, registration and runtime observation separately. Missing runtime proof is NOT VERIFIED, never "ready to use" based
only on a folder or symlink. If fresh-session pickup requires user action,
retain the completed artifact and give that one step.
