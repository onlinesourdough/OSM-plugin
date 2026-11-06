# Check: read-only inspection

Check the requested scope only; no implicit global sweep. A check observes and
reports. It never authorizes repair, update, migration, installation,
publication or any write, and it creates no page, template or test record. Report
per-claim PASS/FAIL/NOT VERIFIED for what was checked, with the actual artifact,
observation and next safe action, and name a repair only after a separate
authorized repair and recheck. There is no overall health verdict or score.
Uncertainty is never PASS. A manifest is not
proof of activation, a source link is not proof of an installed specialist, a
URL is not a backup, and a successful push is not live equality.

If repair is already authorized, apply it through its responsible owner:
[Manage Data & Context](../../osm-manage-data-context/SKILL.md) for owner
context, [Setup](../../osm-setup/SKILL.md) for readiness, the
[update procedure](update.md) for the package, or shared Build with the
repository contract. Then evaluate the final bytes again. Otherwise report the
proposed repair. Preserve owner decisions, authority and existing work.
Artifact quality and lifecycle gates belong to [Review](../../osm-review-work/SKILL.md)
and its owning phases, not this audit.

- Setup, when requested: assess relevant outcome/context/memory/Space,
  connection/tool, harness, first-task and acceptance readiness against the
  [setup scenarios](../../osm-setup/references/setup-scenarios.md). Reuse known
  answers and chosen off states. Missing input is not consent. A checkpoint
  resumes unfinished work without reinterview; ordinary tasks do not repeat the
  onboarding audit.
- Product: normalized plugin manifest, correct skill paths and the release’s declared
  discoverable names, each exactly once; frontmatter valid, local references
  resolve, no install hooks or automatic runtime/dependency setup or hidden
  invocation disabling. Every native manifest points to the same bodies; only
  the selected harness is affected. Compare installed release identity, not just
  a folder name.
- Data & Context: read the Notion root and its one definition read-only against
  the [Context Architecture](../../osm-data-context/references/architecture.md).
  Product-only installation checks do not require fetching owner context.
- Write policy and record lifecycle, read-only: report the owner's recorded
  policy (or one pending item when none is recorded) and keep its four answers
  apart: owner policy, actual access, task mandate and effect. When an existing
  recorded form (a `protected:` list, an Updates note or a CONNECTIONS entry) is
  the policy, report one pending item that asks the owner to confirm that form or
  replace it with a `write_policy`; an explicit narrower choice, once confirmed,
  is not pending. Report a policy that differs between the definition, standing
  rules, connector and job prompt, a pointer that restates scope instead of
  referring to the root, duplicate current Keys, a Review due without a reason
  (read only records with Review due set), and a record whose containment is
  unknown, cyclic, archived or moved outside the home. A past-due record is
  reported, never treated as expired or false. Check writes nothing and
  backfills no date.
- Legacy home recognition, read-only: a folder, vault or `AIOS_FORMAT` home is
  not a supported OSM home. Report what was recognized and point to the
  [legacy-home guidance](update.md#legacy-file-and-vault-homes). Never convert,
  clean up or mirror it from a check.
- Harness baseline: follow the [configuration checklist](../../osm-setup/references/harness-configuration.md).
  Distinguish configured/effective settings from actual tools, native memory,
  Computer Use app/site and OS permissions, and History opt-in/source scope.
  Preserve chosen providers, approvals, Pi settings and unrelated registrations.
  Missing optional native extras do not fail core OSM; do not silently grant
  unrestricted or always-allow access to make a check pass.
  When protection is in scope, distinguish instructions, permissions/sandbox
  and hooks, including trust, failure behavior and actual tool/host coverage.
  An untested worker/cloud path is NOT VERIFIED, not inherited local coverage.
- Codex setup acceptance: account for both native checklist and goal controls via
  [checklist and goal acceptance](../../osm-setup/references/codex-tracking-acceptance.md).
  Updates reuse dated evidence unless runtime/version or capability evidence changed,
  is missing or uncertain. Inspect goal state read-only; no test goal.
- Codex desktop cutover, when in scope: inspect actual New Chat selection and a
  fresh task's cwd/routing, plus relevant System/Project entry roots, using the
  [desktop acceptance](../../osm-setup/references/adapter-codex-desktop.md).
  Check selected Project, active workspace roots and fresh task cwd separately;
  null selection alone is not proof. Inspect local Projects/saved roots, cloud
  environments and sidebar preferences as separate client surfaces. Distinguish
  active stale settings from historical/recovery mentions. Respect app-control
  denial; no alternate automation or internal-state mutation to bypass it.
  CLI tests do not prove GUI defaults. Include associated environment/worktree
  references and refreshed Environments selection; resolve primary/secondary
  physical roots, never label-only duplicates or assumed environment configs.
  Preserve valid setup/actions, credential references, dirty worktrees and custom
  sections/history/files; do not execute setup commands to inspect them;
  unavailable native UI proof leaves cutover PENDING even if installation PASS.
- Methods: built-in methods are usable from the selected workspace. Work data
  stays outside the plugin. Content is not part of the package; a selected
  existing Content store is checked like any other store, and optional
  specialists are verified only when selected and do not install with OSM.
- Creation: verified template source and documented creation interface, actual
  generated identity, local instructions, provenance and recovery. Existing
  repositories are never reseeded; no secondary project registration is required.
- Lifecycle: one authorized goal and concise live requirements list, justified
  owner, verified root, one writer, shared phase methods with local specialist
  contracts, final-byte proof and exact Ship authority. Direct repository tasks
  continue in the current session without owner preload, local phase copies or
  a mandatory lead. Technology and generic audit guidance have one shared owner.
  For actual delegation only, verify the concrete benefit or user request,
  minimum context, root, worker-goal linkage and caller acceptance through
  Orchestrate workers; ordinary repository work does not load it.
  Sensitive changes retain repository-owned security context, scoped negative
  tests, validated findings and affected deployment/retest proof; optional tools
  do not become required scans for ordinary edits.
- Learning: curated source-bound corrections; methods owned in the right place;
  native improvement triage is loaded only for a concrete worker/lead signal;
  optional external skills remain external; no native-memory dependence.
- Personal skill discovery: inspect the acceptance evidence required by
  [Manage Skills](../../osm-manage-skills/references/owner-skills.md#verify-before-saying-ready).
  This check observes the result; that procedure owns any authorized repair.
- Migration/recovery: explicit mapping, content/mode/route preservation,
  unknown-version stop, idempotent rerun, conflicts keep both, restore tested,
  machine-specific paths adjusted without copying entire harness homes.
  Original owner-method bytes remain recoverable; allow only verified mapped
  path/caller changes and test their resolved targets. Equal bytes with broken
  legacy paths are not functional preservation. The legacy-method map and
  external/independent-owner dispositions must be reachable inside the
  extracted plugin without developer docs.

Use [evals](scenarios.md) for the behavioral checkpoint. A release audit
separates product version and installed System/Project currentness. A clean tree
or valid manifest does not prove both. On a requested repository-currentness
audit inspect its root, credential-free remote, branch, local/live IDs and
route; preserve dirty, ahead, diverged and active-session exceptions. Do not
update another owner through a check. Report each exception and the narrow next
action.
