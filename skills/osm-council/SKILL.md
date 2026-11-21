---
name: osm-council
description: Ask another agent or model for an independent review, a second opinion or bounded work with a scoped delegation brief.
metadata:
  version: "3.1.2"
---

# OSM:council

Use Council when the user asks for another agent or when an independent
perspective or separable contribution would materially improve the result.

- **Review.** Give the reviewer the exact artifact or decision, the question
  and the criteria. Ask for findings with evidence. Review is read-only.
- **Delegate.** When the worker should do part of the work, send a short brief
  with the expected result, relevant context and allowed actions. The lead
  remains responsible for the whole task.
- **Hand off the whole task.** Follow the [continuation procedure](../osm/references/continuation.md)
  when another agent or chat takes over, including a user-owned chat.

Choose a native worker the host provides, such as a subagent, or an authorized
CLI such as Claude Code or OpenCode.
Honor the requested model and reasoning effort when available. Report a
requested route you cannot use. Consult [model advice](../osm/references/model-advice.md)
if selection is part of the task. For either Council mode, verify the worker's
effective access to inherited instructions, memory and connectors. Inherited
access alone gives no authority. A private Notion route must be authorized
for that worker and task. Use a route that enforces the intended limits, or
keep the work local.

## Delegation brief

- **Work.** State the task, deliverable and how the lead will check it.
- **Context.** Include only applicable, verified references from Knowledge,
  Memory, an earlier Log or Content, alongside task-specific inputs. Give the
  source, its date when relevant and any material uncertainty. Recheck facts
  that may have changed. If the worker cannot open a source, share a minimal
  excerpt only when authorized for that worker and route. Otherwise ask the
  worker to report the gap and return what it can establish within scope.
  Honor each source's permitted processing and retention locations. An access
  grant alone does not authorize copying restricted records into the brief.
- **Authority.** Name allowed tools, edits and destinations. Keep writes to
  owner Memory with the lead. For implementation or existing tracked work,
  follow the [native tracking rules](../osm/references/lifecycle.md#native-tracking-sop)
  and verify the applicable workspace, branch, instructions, permissions and
  goal linkage before edits. Resolve mismatches before work proceeds. Keep
  one writer per overlapping change.
- **Return.** Ask for the result, checks or evidence, actions taken and any
  unresolved gaps.

Check findings against the artifact, test any changes and report unresolved
gaps that block the result. The lead owns the result, decisions, Prime and Log. Delegation
grants no new account, project, issue, publication or sidebar-task authority.
If a writer is interrupted, [verify state and effects before retrying](../osm/references/recovery.md).
Codex's `create_thread` requires an explicit request for a new user-owned chat.
Archive a user-owned chat only under its existing authority after verified handoff.
