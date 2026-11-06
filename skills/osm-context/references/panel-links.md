# Codex dashboard links

OSM's local MCP owns the panel and a small navigation map. The independent
Notion connector owns remote reads and writes. The map contains only a context
title and source names/links, never documents, skills, memories, credentials,
permissions or company policy. It is not a context home or synchronization.

These links are optional Saved shortcuts, shown beside a saved model's
overview as More links. A fresh setup from an AI Operating
Model needs none: Setup uses the selected model, the pointer and the
[overview](#operating-model-overview), and registers no Docs, Skills or Memory
role map. Use the steps below only to maintain Saved shortcuts that already
exist for the selected context, including folder contexts, or when the person
explicitly asks to add or change one:

1. Verify the selected entry and each shortcut destination being kept, added or
   changed through the existing provider tools.
   Reuse IDs and source names; do not create a database for the panel.
2. If `osm_sources` is available, read its current context and source revisions.
   Compare the selected context identity. A client task must not overwrite the
   consultant's personal context or its links. If this is not the selected
   personal default, keep that task scoped and leave this panel alone.
3. Call `osm_save_sources` with the selected target, `expectedContextRevision`,
   `expectedRevision`, short context `title`, and `links`. Each link is
   `{ title, target }`; role keys are `docs`, `personalSkills`, `teamSkills`,
   `memory`, `teamMemory`. `memory` remains the existing default; only add a
   separate team source when verified and needed. Labels do not grant access.
   Preserve existing roles unless their removal is authorized. Omit
   an unused Team source; never infer a team's sharing permissions.
4. Read back with `osm_sources`. Repeating unchanged metadata makes no write.
   A revision conflict requires fresh inspection, not a blind retry. Do not
   hand-edit plugin caches or the navigation files to bypass these tools.

If the panel tools are unavailable, the verified context home still works.
Report the missing panel registration; do not claim that a fresh install has
loaded new tools. Reopen Codex when its old runtime is still active.

Connected Notion selectors browse and search accessible page names through the
existing official connector. They fetch navigation metadata, not page bodies.
Saved names and direct links remain available. Setup's verified business source
mapping is a separate observation. Connection Refresh checks the official
plugin/account, not every destination. Picker interaction triggers bounded reads;
there is no background sync, chat message or agent run. Other panel clicks open
sources or save navigation.

Storage is per context identity under `$CODEX_HOME/aios/panel/`, not in the
system prompt. A new context cannot inherit another context's links. The
short AGENTS pointer and Notion's guide still govern agent retrieval and Spaces.
When a verified route changes and an existing shortcut points to it, update
that shortcut within the same authorized change; do not add shortcuts the
person did not ask for. No background sync, daily task or duplicate company
brain. These links are the panel's secondary Saved shortcuts when an overview
exists.

## Operating-model overview

The panel shows the selected AI Operating Model's own source groups from a
dated snapshot, never a live read. Refresh it only when the person selects a
model or asks for a refresh during Setup or Settings work:

1. Fetch only the selected model page through the existing Notion connection.
   Do not fetch its linked destinations.
2. Call `osm_save_model_overview` with the model `target`, its page `title`,
   a `revision` label when the connector reports one (such as last edited
   time) and `content` exactly as fetched, including Notion's `<page>` and
   `<content>` wrapper, `<b>` labels and `<mention>` references. Never rewrite,
   normalize or convert it to fit the overview. Always set `complete` yourself;
   never rely on the tool's default. Pass `complete: true` only when the fetch
   reports all of its completeness signals and they show nothing missing:
   `truncated` false, `unknown_block_count` 0 and `unknown_block_ids` empty.
   Pass `complete: false` when the response was truncated, reports unknown
   blocks, or omits or leaves unclear any of these signals. `false` means
   completeness is not established, not that a particular source is missing;
   `true` means only that those signals reported nothing missing. If the read
   failed, pass `outcome` `no_access`, `not_found` or `disconnected` instead;
   this replaces the earlier overview.
3. OSM keeps only headings followed by lists of page or database references,
   in Markdown or the current Notion fetch form (`<b>Role:</b> <mention url>`).
   Prose, policy, evidence and quoted links are ignored, and the text is
   discarded. A result of `ambiguous` lists sections: ask the person once which
   to show and call again with `sections`. Later refreshes keep that choice;
   `changed` reports chosen sections that disappeared; `[]` clears the choice.
   `unsupported` means no explicit source list; report it rather than guess or
   rewrite the model. A failed or `unsupported` refresh replaces the earlier
   overview; do not retry with edited text.
4. Tell the person to refresh the panel and review it. Saving the pointer is
   their explicit panel action; this tool never changes it.

One snapshot is kept at `$CODEX_HOME/aios/overview/model.json`. It is derived
navigation, not routing authority, and implies no access, native Skills,
Memory or agent loading. An account change is visible only to the next refresh.
