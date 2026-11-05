# Maintain a selected specialist

Use this procedure for a separately installed specialist, not the content
methods included in OSM. Start from the task's selected capability,
accepted source and existing installation. Verify actual tools, supported
platforms and source identity; a link is not proof of installation.

Prefer the specialist's native package installation. Where its documented
interface is a repository, use that interface at the chosen location after
reading its local instructions. Preserve existing work and customizations.
Do not install alternatives or change a remote to make an assumed source fit.
No owner-home registry or default checkout location is required.

For a matching Power BI request without an established source, the optional
candidate is https://github.com/onlinesourdough/Agentic-PowerBI-System and its
primary `.agents/skills/agentic-powerbi-system/SKILL.md`. Verify it before use.
Power BI Desktop needs a suitable Windows environment; file-based methods have
their own dependencies. The specialist does not install with OSM.

Under the task's installation authority, verify source access, selected ref,
destination, local instructions, dependency requirements and the usable
entrypoint. Continue the specialist's actual method with the accepted inputs
and relevant review. Keep working data in its established location. Package
updates and owner-data Sync remain separate operations.

## Update installed upstream Systems

At a task boundary under authority to update the selected installed Systems:

1. Identify exact selected checkout, verified upstream URL and branch/ref,
   current HEAD and update authority. Inspect local AGENTS.md and its update,
   compatibility, verification and recovery instructions. Customized/forked
   repositories are explicitly owner-maintained and excluded from blind updates;
   their own reviewed maintenance contract must resolve any upstream adoption.
2. Inspect branch, staged/unstaged changes, local commits, all worktrees and
   untracked/ignored paths without exposing private content. Read the System-local
   storage contract to distinguish source from generated/user artifacts and
   locate data, dependencies and backup responsibilities. Ignored does not mean
   backed up, disposable or safely relocatable. Worktrees isolate branches and
   active work; they neither eliminate conflicts nor back up data.
3. Keep an active checkout/worktree on its known version. Defer an affected
   active System or dirty tracked tree. Preserve tracked user artifacts, local
   commits and all untracked/ignored files. An unknown storage/recovery contract,
   collision or required data migration stops application for focused
   reconciliation; do not presume a source-only fast-forward is data-safe.
4. Fetch only the verified upstream under existing authority; never change
   remotes. Record the fetched commit and compare ancestry to HEAD. Equal is a
   no-op. Ahead/diverged or local customization remains preserved for focused
   reconciliation or owner-managed maintenance. Behind is eligible only if
   tracked state is clean and the update is compatible. Review the exact diff,
   release/local instructions, dependency changes and effects on stored data
   and other worktrees. Check incoming tracked paths against untracked/ignored
   files and directories before application; any collision stops the update.
5. Record pre-update HEAD, candidate commit, worktree/data inventory and the
   local recovery path. Recheck state immediately before applying only that
   reviewed commit by fast-forward-only. No force, reset, clean, stash,
   automatic merge/rebase, data migration or upstream push. Do not move or
   delete artifacts to make the update pass. A concurrent change invalidates
   the preflight and requires fresh classification.
6. Read back HEAD and preserved worktree/data state; run the System-local
   dependency and entrypoint checks required by the reviewed change. Report
   exact old/new commits, checks and gaps. Update only relevant source
   pointers under owner-data authority; do not call fetch alone an update.

A failure stops further adoption. Preserve the resulting checkout and artifacts,
report old/candidate/current commits and the focused next action. Use only the
System-local authorized recovery procedure; no automatic downgrade or reset.
An isolated checkout of an earlier source ref can aid diagnosis but cannot
restore untracked/ignored data or undo a migration. Unknown backup or restore
coverage remains an explicit gap, never a claim of recoverability.
