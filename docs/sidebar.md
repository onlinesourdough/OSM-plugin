# Codex sidebar — 0.29.0

Revision: 2026-10-20

## Operating-model overview (#58 source candidate)

This section describes an unreleased source candidate for issue #58. An earlier
version was installed once and showed a real saved model; this layout has not
been installed or checked in the app.

The dashboard leads with navigation. The section at the top uses the selected
model's own title as its heading, once, with Open in Notion beside it; a small
"Operating model" label appears above only when that title does not already say
so. The model's cards follow directly. The main view shows only what needs
action: a hidden, failed or held overview, a section choice, or Save pointer
before the pointer is saved. When the links may be incomplete or completeness
is unknown, one short line above the cards says "Some links may be missing",
with a Details button. Healthy connection is shown only by the header's
Connected badge.

Routine facts sit in one closed **About this overview** disclosure below the cards:
Notion connection, host pointer, the source revision the connector reported (or
Not reported), when this snapshot was saved, coverage (Complete as reported,
Partial or Completeness unknown, with the number of rows left out), why rows
were left out and changes since the previous snapshot. The save time is not a
read time: a snapshot saved today from an older export says so. Details opens it
and moves focus to its summary. None of these claims that an agent has loaded
the model, that native Skills are enabled or that Memory exists.

Each of the model's own sections is a card with its heading and links. Cards
share the width in columns of at least 220px and stack into one column in a
narrow panel; long names wrap. When a role-labelled row's page has the same
name as its role, such as `**Notes:**` linking a page called Notes, Setup records
that page name as a short label and the card shows it once. Only letter case,
spacing and emoji shown as pictures are ignored; names that differ in any other
character, such as "C++ · C#", "x² · x2" or "ACME® · ACME", keep both. A link
that was not a labelled row is never shortened, even if its own title contains a
middle dot. The stored title and every target stay unchanged, and a snapshot
with a malformed label is refused whole. Snapshots saved before this change have
no labels, so they show their stored names exactly; to shorten them, ask Setup
to save the overview again from the same model text; when that text is still
available, no new Notion read is needed. Nothing is rewritten automatically.
Earlier versions ignore the label. The full model stays in Notion.

The panel has no qualified app-authorized way to read a page body; the page
fetch it uses for icons is not that proof. The overview is therefore a
revision-labelled, derived snapshot. During a Setup or Settings refresh the
person asked for, the agent reads the model through its existing official
Notion connection and passes the text to the model-only
`osm_save_model_overview` tool. The server derives the groups
deterministically, keeps only labels, groups and links, and discards the text.
There is no polling, live refresh, recursive destination fetch, embedded page,
new credential or chat in the panel. Destinations are not fetched for icons.

Only explicit structure counts: a heading followed by a list of page,
database or Markdown links. Each item either starts with the reference and has
at most a short annotation, or starts with a bold role label ending in one
colon (`**Role:**` or `**Role**:`, or the current Notion fetch's `<b>Role:</b>`
or `<b>Role</b>:`) followed directly by the reference, then any explanation.
References are Markdown links, typed mentions such as `<mention-page>`, or the
generic `<mention url>`, paired or self-closed. A standalone child page may also
be the current fetch's three lines at one depth: `<page url="…">`, its plain
title, `</page>`; any other multi-line shape is counted once as left out. Its
body is not read, up to its close, the next heading outside a code fence, or the
end. An unclosed tag hides the rest of its own section; later sections remain.
User mentions and unknown tags
are never documents; a label in another HTML element, such as `<strong>`, is
counted as left out. A labelled link is named by its role, plus the reference's own
text when it has any. A role label of any length is recognized; only its shown
name is cut to 100 characters. Other references later in that row, such as a Related
mention, are not routes. Prose, policy, evidence, code and quoted links
never become navigation. A row that looks like a source but does not fit this
grammar (a plain `Role:` label, a reference followed by running prose, a bold
label without its colon, or a reference without a link) is never guessed into
a route. It is counted as left out and marks the overview partial, so a valid
section elsewhere cannot make the overview look complete. No heading name is required and nothing is
translated. Ordinary notes beside references that all carry a role label do not
need a choice, so those routes appear directly. A section that mixes unlabelled
references with other items, or a repeated heading, makes the result
`ambiguous`; the person chooses sections once, and that choice is kept apart
from the derived groups and carried to later refreshes of the same model. Removed chosen sections are reported as
`changed`; no explicit list is `unsupported`. Non-HTTPS, credentialed,
relative or overlong links are dropped and counted. Output is capped at 12
groups, 20 links per group and 60 links; a truncated read or capped output is
shown as partial. Additions and removals since the previous snapshot of the
same model are shown.

A failed refresh (`no_access`, `not_found` or `disconnected`) replaces the
earlier links. When Codex reports Notion as not installed, disabled, not
connected or needing attention, the panel hides the links. A check that could
not verify the connection does not hide them on its own, but it never re-shows
links hidden by such a report; only a later Connected status does. The panel cannot observe an account change; the next
refresh shows its result.

Reviewing an overview never writes Codex instructions. **Save pointer** shows
what will change, then uses the existing revision-checked, backed-up
`osm_save_context` write and leaves unrelated instructions intact. The
setup Context step now names its write Save pointer. Beside the saved model,
existing Docs, Skills and Memory links appear below the cards as a compact
**More links** row of chips, each named by its role, showing only filled roles
and still edited in Settings. A saved link that opens the same destination as a
link shown in the model's cards is not repeated. Destinations match only when
their links are identical apart from Notion's copied-link marker (a lone
`?source=copy_link`); a different database view, block or any other query or
fragment keeps the saved link visible, and links are never matched by name. The
stored link and the link it opens are unchanged. With nothing distinct to show
there is no More links block. While Notion is disconnected and the model's
links are hidden, every saved link shows. Without an overview, and for folder
contexts, the earlier layout below is unchanged.

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
that metadata. OSM has no Notion server, credential store or custom OAuth.

OSM MCP serves this panel and stores only navigation labels/links. Its app-only
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
stay in their chosen home. The panel displays destinations, not live records or
counts. Source entry does not create a workspace or establish business readiness.

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
- osm_sources: explicit model read of the context, navigation with revisions and the overview snapshot.
- osm_save_sources: app/model navigation replacement, scoped to current context.
- osm_save_model_overview: model-only save of a derived operating-model overview; no Notion read or pointer change.

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
Context switch in Settings, automatically writes its managed context block (OSM markers) there,
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

The overview snapshot is one file, CODEX_HOME/aios/overview/model.json, replaced
by each refresh. It holds the model link and title, the reported revision, read
time, any section choice, and bounded groups, labels and links. It uses the same
bounded read, locking, atomic rename and fail-closed checks; an invalid or
symlinked state is shown as needing attention and is never overwritten.

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
The overview snapshot is derived and has no backup: remove
CODEX_HOME/aios/overview/ to clear it or recover from an invalid file, then
refresh through Setup. Older builds ignore that folder.
An already-open Codex panel may require an app reopen to load the new runtime.
