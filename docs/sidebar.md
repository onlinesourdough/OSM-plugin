# Codex sidebar — 0.32.1

Revision: 2026-11-09

## Home

Home is an overview of the selected Data & Context home's definition-routed
sources, in deterministic projection order. The verified root title and icon
open the root reader; its body is never loaded on the overview. Home uses
Setup's type, controls and card vocabulary: one 600px column and one card whose
sections show verified source titles/icons and up to three preview rows from the
first list response at every width. Every successfully listed, non-empty source
ends with a named “Open ‹source›” action, even when the preview already shows
all rows, and it opens the full source list with explicit cursor pagination and
the existing 50-row display cap. An empty mapped source says so and has the same
action, which opens its own empty list with Open in Notion and reads nothing more;
denied, unsupported or unavailable sources keep their state line and recovery and
get no Open action. Each source head carries Setup's filled numbered circle (the
source's place in the definition) and the saved-links view uses the same card.
An optional Content store (role `content`) is a source only when the selected
definition names an existing Content route and OSM's own connection proves access
to it; it then lists, reads, searches and goes Back like Docs. Status names it only as
a neutral routing entry: its saved title, link and label come back only inside its own
list result, and Home shows the source only once that list (or a title search) proves
access, so a denied or failing route shows nothing of it. Absent or denied, no Content
source or data is shown, and OSM never creates Content. Related routes only
open Notion, under “More in Notion”; support material is excluded from Home and
search. Routing and its revision-bound projection cache confer no access.

Search contains page titles within each mapped readable source. Data-source
queries intersect the mapped title property's `contains` filter with the saved
view filter, at most five results per source; page lists filter verified titles.
There is no workspace search or other-connector fallback. Pasted Notion links
must pass mapped membership and the same containment predicate before a reader
can open. An outside page discloses no metadata; a 404 stays neutral about
whether it exists or is shared. Failures name the affected source without
hiding other matches. Typing debounces 300 ms and coalesces in-flight work.

The simple reader shows mapped properties and bounded text. Back restores the
source/search view, query and opener focus. Breadcrumbs follow Home's routes.
Copy link announces success only after the clipboard accepts the Notion URL;
otherwise a selected URL input supports manual copy. Native clipboard and panel
visibility events still require host qualification.

The gear opens Settings with Notion connection status and actual checked time,
Data & Context home in its bordered context picker, a card with Saved links and
a Built into OSM row (like Saved links, a row with an icon, a description and one
chevron that opens its own Settings page listing the installed package's methods,
with a “1 method”/“N methods” summary under the description; choosing one reads its
text through the name-checked `osm_builtin_read`, with Back to the list and to
Settings, and no run, enable or ownership controls), the optional separate plugin,
and explicit agent help. Saved links editing
is confined to Settings and manual Setup; it neither grants nor revokes access.
Healthy Home has no connection pill or link editor. Access refresh runs on open,
context change, explicit retry, return from a hidden panel (at most once per
30 seconds), and Settings close after a connection action. There is no polling.
A recheck retains dimmed content until status answers; an invalid identity or
scope clears it under the existing recovery budget and stale-generation guards.
Page originals remain in Notion. This reader does not define the owner's write
policy for agents.

Source/record emoji, native Notion icons and bounded custom/file/external raster
icons come from metadata obtained through OSM's own connection. Expired or
unsupported images retain a readable title. Raw signed icon URLs and retrieved
bytes are not stored. The current reader is bounded text, headings, lists and
code; it does not claim to embed arbitrary native Notion views or edit pages.

Personal skills show their source descriptions. Built-in methods are listed on their own
Settings page and open as text; listing or reading one does not imply enablement or execution. See the canonical
[design guide](../design.md) for the editable Paper and flow/state map.

First use offers human **Connect Notion** guidance. Browser sign-in is not configured (it needs
OSM's own registered client and a secure backend), and that does not block the working internal
macOS route, which is the supported first-use path today. The person can check an existing OSM connection
without starting a model. Optional **Set up with agent** sends one fixed setup
request after a deliberate click using MCP Apps `sendMessage`. A host rejection
shows a manual prompt fallback and never claims setup succeeded.

Home's sources come from one place: the AI Operating Model's Data and Context
Definition. Setup generates Home's projection from one revision of it; Home never
edits it. The projection records the owner's `selectedMode`, and Home reads only
through that mode, never switching after a denial. This release reads only
through [OSM's internal Notion connection](home-connection.md)
(`internal_selected_pages`). For `official_notion_user`, Home says it can't read
through that connection in this view yet and shows the saved links; it never
shows Connect or unsupported-host copy for a working official connection.
The definition can name support material: core rules, the source index,
writing, access and evidence procedures, maintenance and recovery snapshots.
One containment check, the same for every list and read, keeps it and what lies
under it out of Context, within these limits:

- A projection that maps a known support page, source or database as context is
  refused.
- The check walks a page's parents with page metadata reads. It takes at most
  three ancestor-page steps per item, counted whether or not a step was already
  read for an earlier item. A parent that is the root or a named support item
  needs no read.
- For a data source, it uses the schema already read for that section: its
  database and that database's `database_parent`. It never reads a database
  object or a parent data source.
- The walk stops at the mapped root or the workspace. Anything found to be
  support, or inside support, is left out of lists and refused on read before
  its title, fields or blocks are used. A data-source section inside support
  lists nothing.
- What the check can't resolve is refused as unresolved, never guessed:
  - a block parent;
  - a parent the connection can't read;
  - a database inside a database;
  - a data source whose parent is a data source that isn't named support;
  - a chain that needs more than three ancestor-page steps.

Two of these refusals are unresolved pending an owner decision. They are not
accepted limits:

- **(a)** An external database is listed only when its whole ancestry up to the
  root or the workspace can be read within that bound. Sharing only its
  immediate parent page isn't enough if a higher ancestor is unreadable.
- **(d)** A page in a page list that is a row of a data source is refused, even
  when that data source is mapped as another section. Only the item's own
  section schema is used.

Exclusions are counted, never named. Support items the definition doesn't name,
and anything above the mapped root, are outside this check.

**Notion · Connected** is green only when the internal connection's identity
matches the projection and the mapped root, not in the trash, was just read.
Other states keep their own copy:

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

After Home observes a different connection, it keeps the saved links out of
view until Setup has saved a mapping for the current connection and Home is
ready again. It offers no Show saved links action, keeps the links view hidden
(also one chosen earlier), opens no saved link and reads no page icons.
Settings and setup hide their five saved-source fields and show the context
without its saved name, and saving source links waits with the existing "Saved
source links need attention" message. No other status ends this: not an
official-mode projection, a missing projection or connection, a failed,
pending or transient check, a list or read that reports the change, or a
status read for another context. The gate shows the account-change message,
or for a failed or transient check its own message with Try again. While it
holds, the context pickers leave the context page and the saved source pages
out of their live results, also results already listed, without closing an
open list or clearing its search, and a context switch that names a saved page
keeps the choice but hides its question. The saved links, any edits in
progress, an unfinished link and a page chosen in setup are kept, and return
unchanged once Home is ready again. For a configured context, each Home status
names the context it was read for, and Home does not apply one that names
another context: after the context changes outside this panel, such a status
counts as a failed check until Refresh reads the current one. The server's
error fallback and a status read without a configured context name no context
and apply as before; neither can end a held change, which needs a ready status
with a saved mapping. Three limits apply. An open list of saved choices
closes, as on every Refresh, and a page search typed into it is cleared on its
next open. Hidden fields and the hidden links view keep their content in the
page. And this applies only once Home has observed the change: before its
first status check returns, the views show as before, and Home in official
mode makes no connection check, so a newly opened panel does not observe the
change.

Lists and bodies exist only in the panel's memory for the current scope.
Leaving an article clears it, and a revocation, account, projection or context
change clears every list, body and section before anything new is shown. So
does a denial for a source or record that had already listed, also when it
arrives after Back: Home clears its titles and checks status once. A source denied from the first read keeps its
placeholder without rechecking. An article whose property text is longer than
Home shows, or whose block text was cut at 20,000 characters or 200 text parts,
says that part is in Notion. An article shows only the answer to its own read.
There
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
Because icon reads use the official connection, they need positive evidence
from the resolved current status. None run while a refresh, retry, recovery or
context change is pending, or after a failed check or the server's error status.
They then run only where the saved links are the visible view: an official-mode
projection, no projection, or links the user chose. While Home shows the
internal connection's view, the panel makes no automatic official-route call.

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
  installed package's skill metadata and, for a configured context, the
  context it was read for.
- osm_home_list / osm_home_read: app-only bounded title lists and one selected
  record of a mapped section.
- osm_home_search / osm_home_locate: app-only scoped title query and link
  membership checks, using the same credential, mapping and containment checks.
- osm_home_page: app-only read of the actual selected root page.
- osm_connection: app/model check using OSM's credential: why the route can or
  cannot be used, the bot and workspace identity and whether a mapping exists;
  no token or complete grant inventory is returned.
- osm_context_home / osm_context_list / osm_context_read: model-visible reads
  through the same service and access checks as Home, with no connector fallback.
  With no projection yet, osm_context_home is the bounded bootstrap read of only
  the selected root, with its optional `check` of up to eight destinations the root's
  text names (access, title, property names and types).
- osm_builtin_read: app-only read of one bundled method's SKILL.md as bounded plain
  blocks, by name. The name must be one the package's own skills folder lists. Before
  any byte is read, the folder must be a real folder that resolves to its own place and
  the file a real, unlinked SKILL.md within the size bound, and the file is then read
  through a no-follow handle for at most that bound. A path, a traversal, an unlisted
  folder, a symlinked folder or file and an oversize file are never listed, so they are
  inaccessible. It touches no Notion data and returns nothing outside the package.
- osm_save_connection_route: model, revision-checked per-context non-secret setting
  that turns OSM's macOS Keychain route on or off from the owner's recorded
  selection of the internal connection; osm_sources returns it as `connectionRoute`.
  It may also hold the link to this connection's own access page in Notion with the
  bot and workspace it was verified for (`manage`; left out keeps it, null removes it).
  Settings → Manage access in Notion opens that link only while the live connection
  is that bot and workspace, and otherwise Notion itself with the Settings →
  Connections path. After a successful open, the first real return (focus or
  visibility, at least 1.5 s later) runs one fresh status and access check, never a poll.
  That check is Manage access's only refresh: closing Settings adds none, and a refused
  open leaves nothing to refresh. See [the connection](home-connection.md#host-credential-route-macos-keychain).
- osm_save_home_projection: model, revision-checked whole replacement of Home's
  generated projection; content changes only with a new definition revision.
  osm_sources returns it with its revision. For the first projection its evidence
  comes from osm_context_home's bootstrap read. osm_save_sources accepts the
  definitionRevision that generated links came from.

The O identifies OSM: two mirrored ellipse halves meeting in a narrow seam, with no dot or nodes.
`assets/branding/osm-icon.svg` is the source of `assets/icon.png` (the Codex `composerIcon` and `logo`, 512 px,
brown `#2B1B12` on cream `#F8F2E8`); any SVG renderer at 512 px reproduces it, and the committed PNG was rendered with
resvg-js 2.6.2. The sidebar mark is one SVG with the same two paths in a 24-unit box and no `theme` field, sent
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
native installed-runtime adoption and do not prove new-account OAuth. Native observations exist for
one macOS Codex host: the installed 0.31.3 displayed Home and read records through OSM's own
connection, and 0.32.0, installed from a pinned source commit with no tag or release, read an
existing Content route through it. Windows is unavailable here and is a known limit, not a gate; other
hosts, writes through the connection and other timed or scheduled callers are not qualified. The
11 November 2026 scheduled Dreaming run in [verification](verification.md) used the owner's own
route, not this panel.

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
