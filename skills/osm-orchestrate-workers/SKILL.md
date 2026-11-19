---
name: osm-orchestrate-workers
description: Delegate separable work to a native worker or selected CLI and recover interrupted work while the caller retains coordination and acceptance.
metadata:
  version: "2.1.0"
---

# OSM:orchestrate-workers

Use when delegating a separable task or recovering a worker. The lead keeps
the overall result, context decisions, Prime, Log and acceptance. A new
user-owned task or whole-task continuation uses the
[handoff route](../osm/references/continuation.md).

## Choose the route

Use the smallest native worker or the selected alternate CLI, such as Claude
Code or OpenCode. Verify the route, initial workspace and effective tools.
Honor the requested model and effort when supported. Use the native default
unless another choice is authorized. Report an unavailable requested choice.
Use [model advice](../osm/references/model-advice.md)
when suitability needs a decision. Codex's user-owned `create_thread` requires
an explicit request for a new task.

Launch external reviews with only the selected inputs. A new directory alone
does not isolate global instructions, memory, plugins, hooks or connectors.
Check the CLI's actual settings and effective tool access. Disable inherited
personal context and tool access when they are outside scope. If a route cannot
honor the boundary, hold that delegation and continue independent work.

## Delegate

- **Read-only review.** Pass the exact artifact or excerpts, question,
  evidence standard and expected handback. Keep the review read-only and
  omit plan or goal setup. The lead verifies findings against the artifact.
- **Implementation.** Pass the accepted outcome and proof, exact repository
  and initial workspace, allowed changes and destinations, and remaining
  decisions. Verify the launch-bound root, branch, instructions, authority
  and tools before edits. Stop the affected work on a mismatch. Keep one
  writer. Use the lead's existing tracking and
  the [native lifecycle](../osm/references/lifecycle.md) when they apply.

Workers use only the selected context. Private Notion requires separately
selected access. Keep worker findings in the handback to the lead. Delegation
does not add authority to write externally, publish or start user-owned work.

## Accept and recover

Return the result with files or evidence, checks, gaps and any decision the
lead needs. The lead reviews it and sends a revision back to the same worker
when possible. For interruption, drift or uncertain effects, use
[recovery](../osm/references/recovery.md): verify identity and state, read back
before retrying, and establish that the old writer stopped before replacement.

Archive a user-owned worker only with the relevant authority, after a passed
review and verified handoff. Keep actionable or waiting-for-approval work open.
