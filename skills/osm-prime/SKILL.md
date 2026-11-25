---
name: osm-prime
description: "Load relevant Notion Data and Context when starting or resuming work."
metadata:
  version: "1.2.4"
---

# OSM:prime

Use when starting or resuming work that needs the selected Notion context, or
when asked to prime. Start with the request and applicable project instructions.
A scheduled Dreaming run uses its own entrypoint. A scoped worker uses the
inputs selected by the lead.

1. Resolve the scope before opening a source. A task that can clearly be solved
   within an independent project uses its local instructions and sources only.
   General questions without owner context also need no Notion access. Honor
   an explicit project or client context boundary before the personal default.
2. For other tasks, resolve the Notion root on the `Data and Context:` line
   (or the existing `Context:` line). Read that line from the host's persistent
   instruction file or, if the host has none, from its built-in persistent
   memory or standing instructions, then open the root through the host's
   authorized connection.
   If the root is missing or unreadable, identify the missing prerequisite and
   continue independent work. Use only the selected home and account.
3. Follow [Manage Data & Context](../osm-manage-data-context/index.md) for
   retrieval. Read the Data and Context Definition and its required controls
   once, then use metadata to find only what the task needs. Use a scoped
   Memory query for a past decision and the selected
   history or project source for unfinished work or an activity recap. Verify
   a live fact at its owning source when the result depends on it.
   Treat the definition as a gateway, not a request to import every source.
   Follow each source's permitted use, processing environment and retention
   rules before reading it. For example, query accounting in its selected
   accounting tool; do not mirror its records into Notion. Permission to read
   a source is separate from permission to retain or share its contents.
4. If you find a verified context error, correct the lookup or conclusion now.
   Use the shared [repair rules](../osm-manage-data-context/references/activity.md#repair-in-the-current-session)
   for an authorized stored repair and a short note for Dreaming.
5. Use the relevant result, then proceed with the user's actual request. In
   this session reuse verified context; refresh the affected source only when
   the task, home, scope, freshness or access changes. After compaction, reuse
   retained verified context; resolve missing routes before relying on them.
   When writing or revising
   an authorised Notion page or row, and for its accompanying reply, follow
   [Writing for a person](../osm-manage-data-context/references/human-output.md).

Prime keeps its work inside the selected home and scope. Report concrete gaps
when they affect the result.
