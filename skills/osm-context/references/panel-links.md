# Codex dashboard links

OSM's local MCP owns the panel and a small navigation map. The independent
Notion connector owns remote reads and writes. The map contains only a context
title and source names/links, never documents, skills, memories, credentials,
permissions or company policy. It is not a context home or synchronization.

After authorized personal onboarding or a requested source-route change:

1. Verify the selected entry and the actual Docs, Personal Skills, optional
   Team Skills, default/personal Memory and optional Team Memory destinations through the existing provider tools.
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

## Home view mapping

Home is a read-only Context/Skills view that reads through OSM's own internal
Notion connection, never the official plugin. Save its mapping only when
`osm_home` reports a verified connection, and never ask for a token in chat.
On a host reporting `unsupported_host`, leave the mapping unsaved and say Home is
unavailable there; saved links keep working.

1. Use the model's actual routes. For each section record a short `key`, the
   owner's display `label`, an explicit `role` (`profile`, `memory`,
   `documents`, `skills` or `related`) and `order`. Never infer a role from a
   title or force the owner's model into fixed names.
2. Destinations are real IDs: a data source with a verified field map (`title`;
   optional `description`; for memory `fact`, `decision`, `why`, `evidence`),
   up to six named pages, or for `related` only a link. Map only fields that
   exist; omit what is missing. Add an existing saved filter or sort only when
   the model names it.
3. Record the connection identity and dated `observed` access per readable
   section. A linked external database needs its own grant; record it as
   `inaccessible` rather than claiming the root covers it.
4. Call `osm_save_home_map` with the context target, `expectedContextRevision`
   and `home.revision` from `osm_sources`; read back. No bodies, records,
   generated descriptions or secrets.

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
When a verified route changes, update this navigation metadata within that same
authorized change. No background sync, daily task or duplicate company brain.
