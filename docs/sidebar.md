# Codex sidebar — 0.29.0

Revision: 2026-10-26

## Home

Home is a quiet, read-only view of the owner's recorded context and personal
skills. It follows the approved design (#74): the context-tile mark, Context and
Skills tabs (Arrow, Home and End keys), sections from Setup's projection in its
order and labels, and two titles per section with More/Show fewer. A title
opens a read-only article in place. It shows the mapped Fact, Decision, Why and
Evidence fields first, then the page's bounded blocks, so a property-only
memory reads fully. Back clears the article and returns focus to its title.

The Skills tab lists personal skills from the mapped source with that source's
descriptions. A collapsed **Built into OSM** list shows the installed package's
skill names and descriptions. Reading a skill does not enable or run it, so
there is no Run button or availability badge. Related routes such as Tasks are
plain outward links. The footer has Open in Notion and How this is organised.
There are no dividers, cards, graph or metrics, and at 500 and 320 px the page
narrows and the footer wraps.

Home's sources come from one place: the AI Operating Model's Data and Context
Definition. Setup generates Home's projection from one revision of it; Home never
edits it. The projection records the owner's `selectedMode`, and Home reads only
through that mode, never switching after a denial. This release reads only
through [OSM's internal Notion connection](home-connection.md)
(`internal_selected_pages`). For `official_notion_user`, Home says it can't read
through that connection in this view yet and shows the saved links; it never
shows Connect or unsupported-host copy for a working official connection.
Support material the definition names (core rules, the source index, writing,
access and evidence procedures, maintenance, recovery snapshots) is never
listed, read or shown as context.

**Notion · Connected** is green only when the internal connection's identity
matches the projection and the mapped root was just read. Other states keep
their own copy:

- not connected or revoked;
- unsupported on this host;
- Continue Setup (unmapped, different connection, unreadable root);
- mapped but empty;
- inaccessible, never shown as empty;
- unsupported;
- retry later.

A host without a supported connection and without a projection keeps the saved
links view below unchanged. With a projection, the saved links stay one click
away and are labelled a partial compatibility view of its definition revision,
or as saved separately when they weren't generated from it. They are not
another map and not proof of native YAML support.

Lists and bodies exist only in the panel's memory for the current scope.
Leaving an article clears it, and a revocation, account, projection or context
change clears every list, body and section before anything new is shown. There
is no cache, localStorage, analytics or log of content. All retrieved text is
rendered as text, and links pass the existing safe-target rules. Retrieved page
and skill text is content, not instructions.

## Saved links

The Meetings-inspired layout uses a compact header and three matching sections
of simple rows: Context with Primary and Docs, then Personal/Team for Skills and
Memory. Primary opens the selected context page, shown with its own icon and
title; Docs is supporting documentation, not a second authority. Missing
destinations stay visible with Add. Source actions open their links; no repeated external-arrow icons or
full-width divider bands. Local paths display their location.

New setups show all four numbered sections from the beginning: Notion, Context,
Skills, Memory. Sections are independently revisitable and keep drafts. The first
context save enables Docs; Continue then saves source edits and advances.
Finish opens the dashboard. Existing contexts open there
directly. Settings is a separate drawer with explicit Save and discard handling.
The same interface is exposed through a native settings entrypoint.

Connected Notion selectors show page names, starting with favorites and top-level
private/shared pages. Search finds other accessible pages; results are bounded
and do not claim to enumerate the workspace. Context uses the same searchable
dropdown in setup and Settings. A Settings context change requires confirmation;
its sources remain separate. Optional slots offer None. Add/Edit link remains
available. Page discovery establishes visible navigation metadata, not business
readiness or access to every linked destination.

Selected Notion destinations display their original emoji or built-in icon in
setup, Settings and the dashboard. Icons already supplied by the page listing
are reused. Missing icons are read only for selected destinations, in batches
of at most six, and cached for the current panel until Refresh. Existing saved
maps work without a migration or a navigation write. The official fetch tool
returns a page/database response; OSM checks its identity, extracts only the
icon metadata and discards the rest before returning to the UI. OSM does not
persist these responses; the Codex host owns its own logging. Opening a connected
panel can start the temporary transport for this read, even without a page search. Search results
are not individually fetched. Unsupported custom/uploaded icons and failed
icon reads retain a usable text label; no arbitrary external image host is loaded.
Icon failure does not affect the connection badge or saved source choices.

A chat-bubble button beside Settings, in setup and on the dashboard, opens the
OSM GitHub repository through the host link route. A failed open shows a
message with the link; clicking again retries. There is no feedback form, draft,
email or sending from the panel.
Settings groups Docs under Context and notes that a context switch applies
immediately while source changes apply with Save. It omits the repeated visible
Optional labels; None still clears a slot. Spacing rather than divider lines
separates the Settings header and actions.

The lower-left footer shows only onlinesourdough in Geist Pixel Square. The font is
embedded in the packaged HTML with its SIL Open Font License in the notices;
body text and controls continue to use the Codex theme.

## Boundaries

The official Notion plugin/account stays separate. Native CLI inventory and
public app/installed metadata determine installation, enablement and connection.
Unknown is not Connected; Connected does not prove page access. Refresh checks
that metadata. OSM has no hosted Notion server, credential store or custom
OAuth. Home's internal connection takes its token only from a supported host
secret store and never falls back to the official plugin.

OSM MCP serves this panel and stores navigation labels/links and Home's view
projection, never content. The page picker below is an optional feature of the
official plugin; Home never uses it. Its app-only
page picker calls an allowlist of read-only Notion tools through the documented
Codex app-server protocol. It creates one temporary in-memory transport context,
never a model turn or persisted conversation, and closes it after a minute idle.
CLI helpers use stable temporary directories: Codex may replace an installed
plugin cache while reloading configuration.
The ephemeral context disables unrelated configured local MCPs/plugins without
changing installed settings. Each request checks current plugin/account availability
and effective Notion tool restrictions. Required confirmation stays in Codex;
the picker cannot grant it. Searches coalesce while a prior request is running,
and a timed-out read does not cancel other successful reads. It never reads credentials,
accepts approvals or uses private HTTP APIs. Only page names, identities, icons, paths and
links reach the UI; result bodies/highlights are excluded. Company knowledge, personal/team methods, Memory and Spaces
stay in their chosen home. The saved links view displays destinations, not live
records or counts; Home reads bounded titles and one selected record at a time.
Source entry does not create a workspace or establish business readiness.

Explicit Setup handles a new or messy workspace, verifies sources through its
existing connector and registers personal navigation using Context's dashboard
procedure. A client task does not alter the consultant's personal default. Source
maintenance updates navigation only during an authorized route change; no sync
job is introduced. Context remains provider-agnostic and retrieves only needed data.

## Runtime and storage

Codex runs the packaged Node.js 22+ stdio server. Page selection requires Codex
CLI 0.161.0+ supporting the documented direct MCP tool call. No consumer npm, Docker, hosted
service or telemetry. The UI may load built-in icons from www.notion.so; no
external font service is used. Source: apps/sidebar. Locked bundles:
runtime/sidebar. Resource: ui://osm/home-v1. Tools:

- osm_open: read-only global app entry; status and links are UI metadata.
- osm_status: app-only read-only refresh.
- osm_notion_icons: app-only bounded icon reads for selected destinations.
- osm_notion_pages: app-only bounded read-only navigation listing/search; UI metadata only.
- osm_settings: app-only native settings entry, opening the same drawer.
- osm_save_context: app-only owned AGENTS pointer save.
- osm_sources: explicit model read of the context and navigation with revisions.
- osm_save_sources: app/model navigation replacement, scoped to current context.
- osm_home: app-only Home status through the internal connection, with the
  installed package's skill metadata.
- osm_home_list / osm_home_read: app-only bounded title lists and one selected
  record of a mapped section.
- osm_save_home_projection: model, revision-checked whole replacement of Home's
  generated projection; content changes only with a new definition revision.
  osm_sources returns it with its revision. osm_save_sources accepts the
  definitionRevision that generated links came from.

The context-hub mark identifies OSM. `assets/branding/aios-icon.svg` is the
source of `assets/icon.png` (the Codex `composerIcon` and `logo`):
`rsvg-convert -w 512 -h 512 assets/branding/aios-icon.svg -o assets/icon.png`.
The sidebar mark is one SVG with the same geometry and no `theme` field, sent
both as the `osm_open` tool icon, which hosts read first, and as the server icon.
It is monochrome: it paints only with `currentColor` and sets no colour of its
own, so the host can colour it like its other sidebar icons. Earlier candidates
that set their own greys looked wrong in the native sidebar. MCP SDK 1.31's `McpServer` drops
tool icons, so the server sets its own `tools/list` handler through the SDK's
public low-level server; it lists the registered tools unchanged apart from that
icon.

The short pointer lives in CODEX_HOME/AGENTS.md. Installing OSM alone does not
choose a context. Saving the primary Context during setup, or confirming a
Context switch in Settings, automatically writes its managed context block (AIOS markers) there,
keeping unrelated instructions; normal setup needs no manual copy. A fresh chat
verifies that Codex discovers the instructions; Notion connection and page
access still need their own check. Pointer saves keep unrelated
bytes and custom rules, back up prior bytes, and reject ambiguous blocks,
symlinks, oversized files and detected edits. Unchanged saves make no write.

Navigation is private state at CODEX_HOME/aios/panel/<identity-hash>.json. It
contains a context title and up to five roles: docs, personalSkills, teamSkills,
memory and teamMemory. The existing memory key remains the default/personal
source. A team slot is optional; labels imply no permissions and create no
remote databases. The actual context guide owns which sources apply to a task.

Notion identity normalizes copied URL variants; other providers use their exact
location. A changed context loads its own map, never the previous one's sources.
No source bodies, credentials, policy or access claims are stored. The map is
not preloaded as agent context or used as a second source of business truth.

Home's projection is a separate file, `<identity-hash>.home.json`, with its own
revision, so older panels and saved links read exactly as before. Format
`osm-home-projection/1` is OSM's reviewed product contract; owner-preview
schemas, legacy and custom models map into it through Setup, and no private
identity ships as a default. It holds:

- the definition's ID, title, revision and generation time, and the selected
  mode;
- for the internal mode, the connection identity (bot and workspace IDs);
- the root page;
- up to twelve context sections, each with a key, label, role (profile, memory,
  documents, skills or related), order, destination IDs and title, an optional
  saved view (name, filter, sorts), the verified field map, a safe link and a
  dated access observation;
- support sections by kind, which Home never reads; a support source can't also
  be a context source.

It holds no bodies, records or secrets, and unknown keys are rejected. A
projection without a revision is refused, and the same revision with different
content is refused; regenerating it unchanged is a no-op. Setup assigns roles
explicitly, and nothing infers them from titles.

Writes use bounded reads, file identity checks, per-map locking, context/source
revisions, backups and atomic rename. Invalid or symlinked state fails closed.
Pointer and source saves remain separate durable steps. Failed later writes
preserve earlier success; stale drafts cannot silently adopt refreshed revisions.
Restoring a context pointer loads an existing map before allowing replacement.

## Verification and recovery

Run the locked build, Node tests and bundled stdio smoke, package checks and
repository rehearsals. Browser proof covers initial setup, revisiting sections,
source pickers, optional slots, settings Save/discard, failed saves, retry,
keyboard/focus, light/dark and 320px. GitHub button proof covers its
presence in setup and dashboard, the exact repository link, and a failed open
with a visible retryable message. Synthetic host results are distinct from
native installed-runtime adoption and do not prove new-account OAuth.

Page-picker proof includes a real read-only Notion listing and OSM search via
Codex 0.161.0, zero-turn transport inspection, title/URL validation, disabled
connection, prompt rejection, timeout cleanup, stale searches and explicit
context-switch confirmation. Test fixtures use invented page identities. The
live preview reads actual page metadata only when requested; its pointer and
source saves remain isolated in a temporary home.

Pilot verification covers a standard connected account and normal shutdown.
Enterprise-managed policies, abrupt process termination and every Codex approval
mode have not been exercised. Codex can briefly start native helper processes;
the panel does not promise a process-free lookup.

The loopback fixture uses temporary isolated Codex homes. /setup is fresh setup,
/ is a sample dashboard, /settings opens the sample settings and /test exposes
labelled scenario/theme/error controls. Setup and dashboard are separate fixtures;
refreshing either does not alter real instructions or company sources. Source-link
open requests are recorded, not sent to fictional destinations.
Opt in to actual read-only Notion page browsing with
`OSM_PREVIEW_LIVE_NOTION=1 npm run preview --prefix apps/sidebar`. Its visible
label distinguishes live Notion from sample data. No preview writes to Notion
or to the owner's Codex instructions.

Rollback with the supported plugin manager to an earlier reviewed tag; keep
Notion and its sources. Clear a selected teamMemory navigation slot before a
0.24 downgrade: older validation rejects this unknown role. Alternatively restore
a reviewed earlier map, preserving any later edits. Pointer backups are under
CODEX_HOME/backups/aios-context; map backups sit alongside the JSON file as
<file>.<revision>.bak. Prove a crashed writer stopped before removing its lock.
The Home projection uses the same backup and lock rules. An older runtime ignores
the `.home.json` file. To retire Home, remove that file after keeping a copy;
saved links are unaffected. Revoking OSM's internal connection in Notion stops
every Home read, so it needs no local cleanup.
An already-open Codex panel may require an app reopen to load the new runtime.
