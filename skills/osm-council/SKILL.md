---
name: osm-council
description: Ask another agent or model for an independent review, a second opinion or help with a bounded piece of work.
metadata:
  version: "3.0.0"
---

# OSM:council

Use Council when the user asks for another agent or when an independent
perspective or separable contribution would materially improve the result.

1. Choose a native worker or an authorized CLI such as Claude Code or OpenCode.
   Honor the requested model and reasoning effort when available. Report a
   requested route you cannot use. Consult [model advice](../osm/references/model-advice.md)
   if selection is part of the task.
2. Give the worker the exact artifact or inputs, the question or outcome, and
   the evidence to return. Reviews are read-only. For hands-on help, verify
   the workspace, allowed edits and tools. Keep one writer per overlapping change.
   Give the worker only the context it needs. For an alternate CLI, verify
   effective access to inherited instructions, memory and connectors before
   passing information. Use a route that can enforce those limits, or keep
   the work local. Private Notion access requires its own selection.
3. Check findings against the artifact and test any changes. The lead agent
   owns the result, decisions, Prime and Log. If a writer is interrupted,
   [verify state and effects before retrying](../osm/references/recovery.md).
   Use the [handoff route](../osm/references/continuation.md) for a user-owned
   chat or continuation of the whole task.
