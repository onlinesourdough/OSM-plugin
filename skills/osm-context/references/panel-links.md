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

## Home projection

The AI Operating Model's Data and Context Definition is the one place that holds
source and query identities. Home stores only a projection generated from one of
its revisions; never edit that projection or keep it as a second map.

1. Read the definition and its revision. Record the owner's `selectedMode`:
   `official_notion_user` or `internal_selected_pages`. Never switch it, and
   never create the internal connection only to fill Home. Home reads only
   through the internal connection; an official projection shows saved links
   with a note that Home can't read through it yet.
2. Project each route the definition names into a section: a short `key`, the
   owner's `label`, an explicit `role` (`profile`, `memory`, `documents`,
   `skills` or `related`) and `order`. Record core rules, the source index,
   writing, access and evidence procedures, maintenance and recovery snapshots as
   `role: support` with their `kind`, so Home never shows them as context. Never
   infer a role from a title.
3. Use the definition's real IDs: a data source with its verified field map
   (`title`; optional `description`; for memory `fact`, `decision`, `why`,
   `evidence`), up to six named pages, or for `related` only a link. Add a
   saved filter or sort only when the definition names it.
4. For `internal_selected_pages`, `osm_home` is no verification step: it is an
   app-only Home tool, not a Setup or agent tool, its status gives no bot or
   workspace IDs, and it cannot verify the mapped root before the first
   projection exists. In this phase, save such a projection only with
   separately established identity and access evidence, and record that identity
   and dated `observed` access per readable section. This is a limitation of
   this phase, not proof of a grant. A linked external database needs its own
   grant; record it as `inaccessible`. Never ask for a token in chat.
5. Call `osm_save_home_projection` with the definition's `id`, `title`,
   `revision` and `generatedAt`, the context target, `expectedContextRevision`
   and `home.revision` from `osm_sources`; read back. Content changes only with
   a new definition revision. When regenerating saved links from the same
   revision, pass `definitionRevision` to `osm_save_sources`; they stay a partial
   compatibility view, not native YAML proof. No bodies, records, generated
   descriptions, private defaults or secrets.

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
