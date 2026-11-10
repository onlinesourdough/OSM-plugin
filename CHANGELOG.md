# Changelog

## 0.32.0 — 2026-11-10

Minor release. Settings gains a Manage access shortcut, Home gains an optional Content source, and
Built into OSM becomes a readable Settings page. No change to how OSM reads: it still reads only through
its own connection, never writes to Notion, and never creates Content. Dependencies are unchanged, and
the package's entry points are unchanged. Checked as source, fixtures and the bundled stdio server; see Limits.

### Settings: Manage access in Notion

- **Manage access in Notion** opens Notion through the host's open-link contract. It opens this connection's
  own access page when Setup saved a link for it, only while the live connection is the same bot and
  workspace; otherwise it opens the verified home page and gives the real path: Settings → Connections →
  OSM → Manage access (or Edit access) → select pages → Save. No link is built from identifiers, and a
  developer page that shows the credential is refused. A host that cannot open the link says so.
- After a successful open, the first real return (a focus or visibility change at least 1.5 s later) runs
  one fresh status and access check, never a poll; that check is the only refresh Manage access owns, so
  closing Settings adds none. OSM adds no permission writes, API, token or editor.
- The old "page ••• menu → Add OSM" instruction, which is wrong for an existing connection, is replaced and
  kept only as a short fallback for a first share.

### Home: an optional Content source, and "More in Notion"

- A Content store appears as a source (`content` role) only when the selected definition names an existing
  Content route and OSM's own connection proves access; it then lists, reads, searches and goes Back like
  Docs. Home's status names it only as a neutral routing entry; its saved title, link and label come back
  only inside its own list result, so a denied or failing route shows nothing of it. Absent or denied, nothing
  of it is shown. Existing projections stay valid.
- "Elsewhere in Notion" is now "More in Notion". Shared Content methods and templates have their own Git
  home, [OSM-content](https://github.com/onlinesourdough/OSM-content).

### Settings: Built into OSM

- Built into OSM opens its own Settings page listing the installed methods; choosing one reads its text,
  with Back to the list and to Settings. The read takes a method's name only and is checked against the
  package's own skills folder (no path, no symlinked folder or file, bounded size, all checked before any read).
  `osm-data-context` 3.1.0 maps the Content
  route and the access link in Setup.

### Housekeeping

- README and docs state what is qualified, precisely: in the installed 0.31.3 on one macOS Codex host Home
  displayed and read through OSM's own connection; other hosts (Windows included), writes, timed callers
  such as Dreaming, and browser sign-in are not qualified.
- The fallback mark in the page is the hub mark, `assets/branding/osm-icon.svg` (the source of
  `assets/icon.png`); the old pixel-bread banner moved unchanged to `docs/history/branding`. A private
  preview checkpoint left the repository root.
- Release channel: `.github/release-channel` (`prerelease`, the default, or `stable`) is read from the tagged
  commit by the existing workflow, so a stable release is a reviewed commit and the same validated plain
  `vX.Y.Z` tag. Existing releases and their flags are never edited.

### Limits

- Not qualified: the native panel with these changes, a normal installation of this version, hosts other than
  macOS Codex, writes through OSM's connection, timed or scheduled callers and browser sign-in.
- The publisher stays inactive and bound to v0.31.3 until a new tag exists; the public guide's last verified
  edition is v0.30.0.

## 0.31.3 — 2026-11-10

Pilot patch. The macOS Keychain read now waits up to fifteen seconds instead of five. The
first read after the Keychain has been idle or locked was measured at about seven seconds on
a real Mac, so a valid item was reported as `keychain_timeout`. The deadline is still finite:
`execFile` stops a read that never answers and the state stays `keychain_timeout`. Nothing
else in the reader changed: the same fixed `security` executable, the one OSM item, the opt-in,
the mode checks and the rule that no error carries OS text or the credential. No new feature,
no caching, no identity fallback, no skill change (all 18 skill versions unchanged), no change
to the package's entry points, and no change to the UI: its copy, layout and styles are those of
0.31.2, and only the version in the page and the server bundle differs.

### Limits

- A tool call keeps the host's default request budget (sixty seconds in the MCP SDK the sidebar
  bundles; the app sets no tool timeout). A fifteen-second read plus the Notion identity read,
  which has its own fifteen-second abort, fits it. The host's own tool limit is outside this
  repository and was not inspected here.
- Checked as source and with a fake child process; not run against a real Keychain, a real
  Notion workspace or a normal installation of this version.

## 0.31.2 — 2026-11-10

Pilot patch. Home, the saved-links view and Settings now look and read like Setup, and an
empty mapped source has its Open action. A visual and navigation change only: no new feature,
no change to access, connection, mode or mapping, no skill change (all 18 skill versions are
unchanged) and no change to the package's entry points. Checked as source and fixtures; see Limits.

### Setup-style continuity (Home, saved links, Settings)

- One shared base gives every button and field the surrounding font. A blanket Home rule
  had out-ranked the Home component styles (breadcrumb links lost their size and muted colour),
  and some native controls had no font reset at all; both are gone.
- Setup's hierarchy applies throughout: 15px medium labels, regular rows, 24px page titles.
  Each Home source head carries Setup's filled circle numbered by the source's place in the
  definition (decoration only; headings and names stay the source's own title), followed by
  the source icon. The saved-links view uses the same card.
- "Open ‹Source›" is Setup's filled Continue button and keeps Setup's 32px height, wrapping a long
  title inside the card; "Load more" is the secondary button.
- In Settings, "Saved links" and "Built into OSM" are rows with an icon, a label, a one-line
  description, the count beneath it and one chevron, with no second chevron or native triangle.
  Keyboard behaviour is unchanged.

### Empty sources open

- An empty mapped source, such as a new Memory, says "Nothing here yet." and shows the same
  Open action as a populated one. It opens that source's own empty list with Open in Notion and
  reads nothing more. A source that is denied, unsupported or unavailable still shows its state
  and recovery with no Open action.

### Limits

- Not qualified against a real Notion workspace or Keychain item, in the native Codex panel or in
  a normal installation of this version. The real first-use read through OSM's own connection
  is still pending.
- The public Notion guide's last verified projection is still v0.30.0; this release does not
  advance it.

## 0.31.1 — 2026-11-10

Pilot patch. First use of Home through OSM's own connection on a normally installed
Mac. In 0.31.0 the packaged setup exposed no per-context opt-in (the Keychain route
turned on only with an environment variable the package does not set), and the selected
root could not be read before a projection existed. Checked as source, with fictional
data behind a fake transport, through the bundled stdio server and the package
validators; see Limits.

### Connection and first use

- The macOS Keychain route is turned on per context by one small non-secret setting,
  saved with `osm_save_connection_route` from the owner's recorded selection of the
  internal connection (`aios/panel/<hash>.connection.json` under `CODEX_HOME`). It is
  revision-checked, backed up, atomic, refuses symlinks and a non-Notion context or an
  official mapping, and reads no credential. `OSM_NOTION_KEYCHAIN=1` still works. The
  secret stays in the private Keychain item the owner adds, reusing the existing
  connection's credential without rotating it; OSM creates nothing.
- `osm_connection`, Home's gate and the Settings check now say why the route cannot be
  used: `unsupported_host`, `not_enabled`, `not_connected`, `keychain_blocked`,
  `keychain_timeout` or `unavailable`. A Mac without the setting is `not_enabled`, no
  longer `unsupported_host`. Text only, no layout or style change.
- With no projection yet, `osm_context_home` is a bounded bootstrap read of only the
  selected root through the same identity check, returning its bounded definition text
  and the evidence `osm_save_home_projection` needs (bot and workspace, context and
  revision). An optional `check` reads access, title and property names and types of up
  to eight destinations the root's own text names. No search, no other page, no write.
- Setup and Data & Context name this order and the one private human step (patch bumps:
  `osm-setup` 3.0.3, `osm-data-context` 3.0.2). The browser connection document now
  holds a reviewable owner-action and deployment proposal; nothing is registered or
  deployed.

### Limits

- Not qualified against a real Notion workspace, the real Keychain item and its macOS
  prompt, the native Codex panel or a normal installation of this version.
- Browser sign-in is not configured: it needs OSM's own registered client and a secure
  backend, which the proposal describes and does not provide.
- The Keychain exit statuses on a real Mac and the real API's responses to the bootstrap
  read are unproven until that connection is used for a real first task.

## 0.31.0 — 2026-11-10

Pilot prerelease. OSM becomes a Notion-only context foundation with a selected-home
Home panel in the Codex sidebar and a new Dreaming skill. The shipped set is 18
skills (22 in 0.30.x). It builds on released 0.30.1 and was checked as source and
fixtures and in a synthetic browser preview with fictional data. It is not
qualified in the native Codex panel, against live Home reads through OSM's own
connection on a real host, or with browser sign-in; see Limits.

### Home in the Codex sidebar (#74, #82)

- Home opens the selected Data & Context home: its root icon and title, a search
  field, and one card with a section per source in definition order. Each section
  shows up to three titles from its first read and, for every readable source,
  an `Open ‹Source›` action that opens the full list. Empty sources say so; a
  source that is denied, unsupported or rate-limited keeps its state line and
  recovery with no Open action. The root page's body is never loaded on the
  overview. The source list pages with an explicit Load more and a 50-row cap, and
  notes withheld or partial results.
- Search matches page titles inside each mapped readable source, at most five per
  source, with a clear per-source note when a source could not be searched
  completely: an incomplete or failed search never says nothing matched. A pasted
  Notion link opens only when it is inside a mapped source; an outside page
  discloses no metadata and a 404 stays neutral about whether it exists or is shared.
  Back restores the query, the result row and focus. There is no workspace search.
- The reader shows Back, a breadcrumb, Copy link and Open in Notion, then mapped
  properties and bounded text, headings, lists and code. Unsupported blocks,
  sub-pages and truncation stay visibly partial. It never edits.
- One gear opens Settings: connection status with the actual check time and Check
  again, the selected home, Saved links (manual fallback links that grant nothing
  and change no access), Built into OSM (the installed package's methods; listing
  one does not run it), the separate optional Notion plugin and agent help.
- Home uses Setup's palette, type, controls and card; Setup itself is unchanged
  and Home shows no step numbers. Access is rechecked when Home opens, when the
  context changes, on explicit Try again or Check again, when a hidden panel
  returns (at most every 30 seconds) and after Settings closes; there is no polling.
- Gates are specific and lead somewhere: Reconnect Notion, Your home page can't be
  read, and Continue OSM Setup (no home mapped yet, a different connection or a
  projection that needs attention). Healthy Home shows no connection pill.

### Connection and access

- Home reads only through OSM's own internal Notion connection, never through the
  official plugin or another identity, also after a denial. It is a read-only REST
  adapter pinned to Notion API `2026-03-11` with bounded lists and bodies. The
  credential is read from a dedicated macOS Keychain item only when
  `OSM_NOTION_KEYCHAIN=1` is set; on any other host Home reports itself unavailable
  and saved links work as before. Browser sign-in is not configured: it needs OSM's
  own registered client and a secure backend. See `docs/home-connection.md`.
- The model tools `osm_connection`, `osm_context_home`, `osm_context_list` and
  `osm_context_read` share that service and credential.
- Home's sources come from the Data and Context definition. Setup generates a
  projection of one revision (`osm-home-projection/1`), saved as its own per-context
  file, that changes only with a new revision. The definition routes and never
  grants; only the verified connection authorizes a read. The recorded connection
  mode is never switched. Support material the definition names is kept out of
  Home and search by one check for every list and read, which refuses what it
  cannot resolve.
- A connection or account change, or a missing current scope, clears Home and
  rechecks status once; the saved links stay out of view until Setup maps the new
  connection, and their edits are kept. A status read for another context is not
  applied. An article shows only the answer to its own read.

### Notion-only core and the 18-skill set (#88)

- `osm-context` is now `osm-data-context` and `osm-maintain-context` is now
  `osm-manage-data-context`; `osm` routes the old names and ships no alias skill.
  Manage Data & Context is one method for manual, task-time and scheduled use, also
  maintaining an existing Content store without a Content module. Setup is a single
  conductor and never creates Content.
- Check, Update and Select model are internal references under `skills/osm/references`.
  Check is read-only; update and rollback record the exact before and after
  revision and keep user choices; model advice is given only on request.
- Provider selection, existing-home, vault and Obsidian setup, the managed `AIOS.md`
  file home, the file bridge, folder-home Sync and the owner file-home templates are
  out of the active flow. A legacy folder or vault home is recognized read-only with
  migration guidance in the update reference; nothing is converted, mirrored or
  cleaned up silently. The retired records stay under `docs/legacy-file-home`.
- Content and Diffusion Studio left the package; their drafts and tests are kept under
  `docs/content-drafts` (not shipped).
- The OSM Context Architecture (`skills/osm-data-context/references/architecture.md`) is
  the one contract for a customer's root, single definition and core Knowledge, Memory
  and Skills roles. It covers meaning, authority and time, finance completeness, the
  preparation lifecycle and pipeline agreement, placement, access roles, the home write
  policy (#73), the record lifecycle (#72) and retrieval. A home keeps one current record
  per topic and scope, revised in place; Revised and Review due are written only for a
  meaningful change.
- Manage Data & Context classifies incoming material as durable, provisional or
  source-only, flags ambiguous placement and unsettled authority conflicts instead of
  merging them, advances a checkpoint only after readback and retries under the same
  identity. A run returns one needs-attention list and no global health score.

### OSM Dreaming (#93)

- `osm-dreaming` is deliberate reflection across useful completed or changed work
  between sessions. It selects inputs, checks conclusions against their sources and
  hands every write to Manage Data & Context and any reusable method change to Manage
  Skills, with no second writer, scheduler, store or model choice. Task-time capture is
  unchanged. A session still active when discovered stays pending by its stable
  identity and is selected again once complete, so a created-since position cannot skip
  it. A direct owner decision can be durable at its first occurrence, and a later source
  edit never overrides an owner correction.
- Source only: the existing scheduled caller keeps its installed method until a
  separately reviewed installation and cutover under #73.

### Documentation and publisher source (#85)

- The README, docs index, overview and architecture state what is declared,
  fixture-tested, native-tested and released. Twelve dated lifecycle records moved
  unchanged to `docs/archive`.
- `docs-publisher/` holds a per-artifact ownership manifest, an impact diff, a publishing
  stage with readback and an inactive workflow template. It is source and fixtures only:
  not active, no Notion write, no credential, no qualified public reader. Its released
  edition binds the published v0.30.1 at its exact commit; the public Notion guide was
  not advanced. Recording 0.31.0 follows its tag as a separate reviewed binding.

### Checks

Validator inventory and no-alias controls, skill version rename mappings, footprint,
caller-graph and responsibility rehearsal, the context-architecture rehearsal (cases 1
to 91 with a reference-runner exercise for late-finishing sessions), the publisher
rehearsal with release-binding scenarios that follow the manifest rather than a literal
version, and the sidebar test suite. These are fixture and source proof, not native or
live proof.

### Skill versions

New `osm-dreaming` 1.0.0. Changed: `osm` 4.1.0, Setup 3.0.2, Data & Context 3.0.1,
Manage Data & Context 3.0.0, Manage Skills 3.0.0, Write Code 2.1.0, Build 2.0.3, Create
Project 5.0.2, Interview 2.0.1, Orchestrate workers 2.0.1, Review 2.0.1, Ship 2.0.1 and
Spec 2.0.1. Unchanged at 2.0.0: Clarify, Human Writing, Risky Changes and Triage.

### Upgrading

- Update `osm@online-sourdough` through your app and read back its version, then start a
  fresh conversation. There is no background updater, and an update in one app does
  not update another.
- A scheduled caller that invokes `osm-maintain-context` must be retargeted, in the same
  job with its cadence and scope unchanged, to `osm-manage-data-context` before you
  update; follow `skills/osm/references/update.md`. Explicit callers of `osm-context`,
  `osm-check`, `osm-update` and `osm-select-model` move to their new owners.
- Pointing that job at Dreaming is separate and optional, and only after a reviewed
  installed version has an invocation you have checked.
- Owner homes are untouched; nothing is uploaded, restored or migrated.

### Limits

Observed before release in disposable native installs of the frozen candidate, with no
model calls, no copied credentials and normal profiles untouched: Codex CLI 0.167 installed
0.31.0, listed 18 enabled OSM skills and booted the sidebar server with the reviewed runtime,
and the Claude Code, Pi 1.0.4 and Gemini CLI 0.42 native rehearsals passed for 18 skills.
Not qualified: the native Codex panel's rendering, clipboard and visibility events, Home reads
on a real host through OSM's own connection and scope grants, browser sign-in, curation by an
owner's own agent, a caller cutover, a second host using the same context and timed Dreaming
runs. The publisher is inactive and the public Notion guide's last verified projection is
v0.30.0.

## 0.30.1

Update the separately selected Agentic Systems framework and Agentic Foundation
routes following the owner-selected Factory rebrand. OSM remains an independent
package. Compatible wording and reference corrections bump only the four affected
skills; setup, access and execution behavior stay unchanged.

## 0.30.0 — 2026-10-23

- Rename AIOS to The Onlinesourdough Method (OSM). The plugin identity is now
  `osm` (`osm@online-sourdough`); the marketplace stays `online-sourdough`. The
  20 method skills move from `aios`, `aios-*`, `clarify`, `human-writing` and
  `write-code` to `osm` and `osm-*`, each with a major version bump that keeps
  its history (for example Update 2.0.3 → 3.0.0). Content and Diffusion Studio
  keep their names and get patch bumps (1.0.2) for their own titles. Update any
  explicit callers, such as `/osm:osm-setup` or `$osm-context`.
- The `osm` entry shows as `OSM:context-and-methods` and stays optional: it
  brings in owner context and methods only when a task needs them.
- The Codex sidebar MCP server, its tools (`osm_*`), UI resource and titles use
  OSM. The overview is now `docs/osm.md`.
- Upgrade: install `osm@online-sourdough` and read back its version, disable
  `aios@online-sourdough` through the app's supported control before
  fresh-session acceptance, then retire `aios` once nothing depends on it. If
  acceptance fails, disable `osm` and re-enable `aios`. Updating `aios`
  never installs `osm`. Owner data needs no migration: `AIOS.md`,
  `AIOS_FORMAT`, `~/.AIOS`, the `<!-- AIOS:BEGIN -->` block and saved Codex
  panel links keep their names and stay readable.
- OSM 0.30.0 is not the retired OSM 0.1.x package, although three skill names
  match. Identity migration now classifies packages by source and version.

## 0.29.0 — 2026-10-13

- Remove the Design, Review Design and OpenPencil Workbench skills
  (`design`, `review-design`, `openpencil-workbench`) and their helper tests.
  AIOS now ships 22 skills. Update any explicit callers of the old names.
- Migration: existing projects' `DESIGN.md` and `design/` files are untouched.
  If you want a design method, install a separate design plugin (for example
  OpenPaperDesign); AIOS does not install or depend on it. Without one, AIOS
  does the visual work directly or reports the missing method.
- The before/after rule remains: for a visible UI change, Build's review
  handoff compares a real baseline and candidate capture of the same state,
  viewport and data. Content and Diffusion Studio are unchanged.
- Routing becomes host-neutral for visual work: AIOS 2.7.0, Create Project
  4.1.0 and Spec 1.3.0 route to an installed design method if the host provides
  one. Build 1.1.4, Check 2.2.1, Manage Skills 1.3.1, Setup 1.8.1 and Update
  2.0.3 drop links to and claims about the removed skills; the legacy
  design-system route is marked retired. The sidebar is unchanged apart from
  its version.

## 0.28.1 — 2026-10-10

- Correct Design's forced OpenPencil companion wording: select a sufficient
  available route for the task, including project-local HTML/source. Keep
  working optional workbench routes and report missing capabilities explicitly.
  Semantic direction stays in `DESIGN.md`; existing tokens/components/code own
  implementation truth. Editable delivery needs observed edit preservation,
  save/reopen and export proof, plus implementation mapping when requested.
- Clarify the existing reference-led polish pass and its review: preserve
  identity/behavior, borrow selected composition traits, retain necessary text
  and inspect the full rendered page and relevant states. Design and Review
  Design advance to 1.2.1; no new skill, editor dependency or runtime behavior.
- Retain a bounded synthetic service-page rehearsal and dense counterexample
  in the [design evidence](docs/evidence/design-polish/README.md). These do not
  establish customer improvement, model activation or editor compatibility.

## 0.28.0 — 2026-10-10

- Retire the Project Foundation skill (`aios-project-foundation`). To prepare a
  new or existing software project for reliable engineering, use the separately
  usable [Factory Foundation](https://github.com/arcitai/factory/tree/main/foundation/factory-foundation)
  skill directly in Codex or Claude; T3 Code is not required. AIOS does not
  install it, depend on it or copy its content. Update any explicit callers of
  the old name. AIOS now ships 25 skills.
- Keep Create Project for content, research, business and software workspaces,
  with Git optional, and keep small coding work direct with Write Code. When a
  substantial engineering foundation is needed and no such method is selected,
  AIOS reports the gap. Create Project 4.0.0 no longer applies a bundled
  engineering contract to software seeds; AIOS 2.6.2 and Write Code 1.1.1
  update their routes.
- Refer to [Factory](https://github.com/arcitai/factory) by its current name
  and explain its relationship to AIOS: Factory provides Foundation, AgentOps
  and ADLC methods for T3 Code and native coding agents, and neither package
  depends on or installs the other. The sidebar is unchanged apart from its
  version.

## 0.27.0 — 2026-10-10

- Add a chat-bubble button beside Settings, in setup and on the dashboard, that
  opens the AIOS GitHub repository. A failed open shows a retryable message.
- Group Docs under a Context heading in Settings and note that a context switch
  applies immediately while Docs, Skills and Memory changes apply with Save.
  Settings no longer repeats visible Optional labels; None still clears a slot.
- Show the dashboard Context as a section like Skills and Memory, with Primary
  and Docs rows that display each destination's own icon and title.
- Give the dashboard and Settings slightly more room and separate the Settings
  header and actions with spacing instead of divider lines.

## 0.26.2 — 2026-10-09

- Keep Notion connection, page and icon reads working after Codex refreshes an
  installed plugin. CLI helpers use a stable temporary directory instead of
  inheriting the replaceable plugin cache as their working directory.

## 0.26.1 — 2026-10-09

- Display Notion emoji and built-in page/database icons consistently in setup,
  Settings and the dashboard, including existing saved destinations. Avoid
  duplicate emoji in older labels and keep navigation usable if icons fail.
- Read missing icons only for selected pages through the existing Notion
  connector. Return only identity/icon metadata and keep source maps unchanged.
  Custom/uploaded icons retain their label; external tracking hosts are excluded.
- Show the Docs name once when it matches its Notion source; keep destination
  hints for manual links.
- Use the same bundled Geist Pixel Square font as onlinesourdough for a simple
  onlinesourdough wordmark at the lower left, with the font license included. Keep native typography for controls.

## 0.26.0 — 2026-10-09

- Choose Context, Docs, Skills and Memory from searchable Notion page dropdowns
  using the already-connected official Notion plugin. No second login or model turn.
- Keep discovered page names and links as UI metadata only; preserve manual
  provider entry, source isolation and explicit context-switch confirmation.
- Bound page requests, discard stale searches, reject automatic approvals and
  close idle transports. Require Codex CLI 0.161.0+ for direct connector calls.
- Update shared Setup 1.8.0 and Context 1.6.0 guidance with the real page-picker flow.

## 0.25.0 — 2026-10-09

- Refine the sidebar around Meetings: a quiet dashboard, named source selectors
  and a separate Settings drawer. Use consistent controls, spacing and hover.
- Keep all numbered setup sections visible and revisitable; preserve drafts
  while navigating, with explicit save and discard behavior.
- Show optional Personal and Team slots for Skills and Memory. Preserve the
  existing Memory destination; add `teamMemory` only when selected.
- Expose a native settings entrypoint using the same configuration interface.
  Source selectors use saved destinations, without cross-plugin page discovery.
- Older releases reject the optional `teamMemory` field. Clear that navigation
  slot with 0.25 before downgrading, or restore a reviewed earlier map backup.

## 0.24.0 — 2026-10-08

- Include the reviewed Build/Review/Ship handoff guidance from main (#42).

- Restore complete numbered source setup with section dividers, Continue, Back
  and a final dashboard. Remove the provider dropdown; alternatives stay available.
- Open saved Context, Docs, Personal/Team Skills and Memory destinations from
  three simple dashboard sections. Hide unused Team skills for solo setups.
- Save only navigation names and links locally, scoped to context identity.
  Preserve revisions and backups; never inherit another context's destinations.
- Let explicit Setup register verified destinations through AIOS MCP, reusing the
  separate official Notion connector. No panel-triggered chat or content mirror.
- Cover source isolation, stale drafts, failed saves, optional sources, reopened
  dashboards, direct links and the complete no-chat onboarding flow.

## 0.23.0 — 2026-10-08

- Restore the 0.21.0 visual layout and SDK controls.
- Replace the conversation-driven wizard with Notion status and one context link.
  Existing context opens directly; Continue saves a new personal default without
  sending a message. Remove source pickers, polling, Setup guide and Edit setup.
- Keep official Notion separate. Docs, Personal/Team Skills, Memory and Spaces
  remain in the customer's home. Explicit Setup still handles business onboarding.
- Preserve instructions with bounded reads, stale-write checks, private backups
  and atomic saves. A saved link does not imply source access or setup readiness.
- Replace mailbox tests with direct persistence, no-chat interaction, failure,
  concurrency and recovery checks; retain independent connection-state coverage.

## 0.22.0 — 2026-10-08

- Keep AIOS and the official Notion plugin separate; remove the embedded app
  binding. Distinguish missing plugin, disabled plugin, disconnected account
  and callable connection without resetting any account.
- Follow the Codex host theme and Meetings control style: Notion, Context/Docs,
  Skills and Memory steps, then a source-link overview. Keep secondary choices
  under More options.
- Support Personal and Team skills through Setup, Context, Manage Skills and
  Notion templates. Reuse suitable sources, preserve real access boundaries
  and avoid an empty team database for solo owners.
- Add agent-assisted Notion page choices and source-map readback through the
  visible conversation, with bounded temporary results and no second auth.
- Route selected inputs to the same Setup skill; no new business-data store,
  background sync, hidden chat or automatic context migration.

## 0.21.0 — 2026-10-07

- Add a small host-themed Codex sidebar app with Notion connection status, the
  saved context link and Start setup / Continue setup using the existing skill.
- Keep connection checks read-only through Codex app-server; connect through the
  official account page. No auth store, business-data mirror or setup-state database.
- Bundle the MCP App and local server; Node.js 22+ is required, with no consumer
  dependency installation. Other clients continue to use the same skills.
- Use onlinesourdough consistently in publisher labels. Preserve marketplace identity.
- Verify protocol discovery, isolated first run, failure states, synthetic UI
  interactions and the existing packaging checks. See the sidebar evidence limits.

## 0.20.0 — 2026-10-07

- Connect the native Codex Set up action to AIOS Setup and declare Notion as an
  optional official app connection. Codex owns sign-in and connection state.
- Check selected-page access separately; resume disconnected, read-only and
  existing setups without duplicate homes or forced reconnects.
- Name the shared Notion entry AIOS, with one customer-owned Docs/Skills/Memory
  map, Spaces and selective retrieval. Rename its template to notion-aios.md.
- Use the supported Codex manifest without a shadowing portable root: Codex
  0.160.1 ignores app bindings under that root. Other native formats and the
  shared 26 skills remain; no UI runtime, custom MCP or background job is added.
- Setup is 1.4.0; Context is 1.3.0; the AIOS documentation route is 2.6.1. Existing context homes and host pointers
  remain unchanged by package updates.

## 0.19.0 — 2026-10-05

- Add provider-neutral Context 1.2.0 and make Setup 1.3.0 the single onboarding
  entry from installation and connection to the first useful task. Notion is
  the recommended starting point for solo founders, leaders and small teams;
  existing context homes remain supported and are never migrated by an update.
- Ship one adaptable Operating Model template with full-page Docs, native
  personal Skills, Memory and Spaces. Reuse real knowledge for Offers, Demand
  and Operations; Memory can start empty. Shared methods stay in the plugin.
- Keep the app instruction short and read relevant context on demand. Client
  setup preserves the consultant's personal default. Durable maintenance happens
  during work without a local mirror, custom server or mandatory schedule.
- Publish bounded Notion and native Codex evidence with explicit limits.
  Preserve recovery through immutable releases and customer-owned records.

## 0.18.0 — 2026-10-02

- Strengthen Write Code 1.1.0 with cohesive responsibilities, explicit
  dependencies, domain and I/O boundaries, invariants, concurrency, partial
  failure and resource ownership. Preserve proportionate scripts and tests;
  route project/security foundations to their existing canonical owners.
- Retain matched baseline/candidate native trials and independent behavioral
  readback. Package release and installed adoption are verified separately.
- Preserve the 25-skill inventory and supported owner formats from 0.17.0.

## 0.17.0 — 2026-10-02

- Retire Create System. Reusable methods use Manage Skills; independently
  maintained solutions keep their ordinary project lifecycle and ownership.
  AIOS now exposes 25 skills from the same native source.
- Broaden Create Project to 3.0.0: establish a useful workspace, context and
  simple structure for software, content, learning or business work. Git,
  GitHub and repository templates are optional; sidebar controls are not required.
- Keep verified APT acquisition, transfer/recovery and software document
  criteria in the conditional repository-seed reference. Existing work is
  maintained in place. Project Foundation 1.1.1 addresses engineering readiness,
  separate from workspace creation and an independently selected execution host.
- Preserve Software & Defence Factory as a separate method and work environment.
  AIOS can support software work directly; choosing Factory grants no shared
  credentials or automatic execution authority. No hooks are installed or enabled.
- Advance AIOS routing to 2.4.1 and Setup's retired-method map to 1.0.2.

## 0.16.0 — 2026-10-01

- Add Clarify 1.0.0 as an independently selectable explanation method in AIOS.
  Use concrete examples and visuals when they improve understanding; ordinary
  explanations stay in the conversation and HTML is no longer compulsory.
- Keep visualization rendering with the available native tools and keep
  Clarify separate from Design. AIOS routing advances to 2.4.0 and exposes
  26 skills from the same source in every native package.
- Retire the active Global Skills acquisition route. Shape Offer and the
  former guardrail implementation remain in the public Global Skills archive;
  neither is included in AIOS. Skills Atlas is also retained as a public archive.

## 0.15.1 — 2026-10-01

- Replace the plugin icon and README banner with the pixel logo, cream
  background and brown ink from onlinesourdough.com.
- Keep the existing skills and installation paths unchanged.

## 0.15.0 — 2026-10-01

- Make Interview 1.1.0 explicitly restate goals and the underlying problem for
  thinking aloud or requested understanding; reuse corrections and ask only
  what changes the next action. Clear work retains its direct path.
- Let Spec 1.2.0 select a small local trial for a material unresolved choice or
  requested alternatives. Design retains visual exploration; UI interaction
  and other workflows need relevant observations. No compulsory prototype,
  editor, schema or parallel agents.
- Update AIOS routing to 2.3.2 and retain bounded positive/negative decision
  probes plus native observations. Package adoption and release remain separate.

## 0.14.1 — 2026-09-26

- Keep Project Foundation independent: remove the external runtime setup route
  and retain application infrastructure, security and delivery responsibilities.
- Share maintained project code standards and design-system ownership with
  Create Project; preserve existing canonical documents and tool-enforced rules.

## 0.14.0 — 2026-09-24

- Add Project Foundation 1.0.0 for repairing MVP/legacy engineering foundations
  and a requested transition to an independent Software and Defence Factory.
  Working setup, meaningful checks, remote compute and non-production delivery
  need real evidence; documents and initialization alone do not prove readiness.
- Share the project/document content contract with Create Project 2.1.0. Preserve
  canonical legacy sources, concise AGENTS guidance, template attribution and
  the distinction between a new seed and a qualified application. Keep documents
  current with the changes they describe.
- Define the application CI profile: required relevant PR checks before merge,
  complete batches every three hours, exact-revision skip evidence, one small
  idle control job and manual full runs. Keep branch, environment and actual
  factory patch/PR handoff responsibilities explicit without adding a controller.
- Advance AIOS routing to 2.3.0 and native package metadata to 25 skills. Owner
  format and existing installations remain independent of project preparation.

## 0.13.0 — 2026-09-22

- Keep AIOS focused on business productivity. Software & Defense Factory remains
  an independent product with its own skills and runtime; no factory dependency,
  additional skill or rename is introduced.
- Clarify shared behavior and bounded refactoring in Write Code 1.0.2, preserving
  repository architecture, caller policies and small-script simplicity.
- Add an optional before/after method owned by Design, with genuine baselines,
  comparable views, selected captures and honest limits. Design and Review
  Design advance to 1.2.0; automation and PR publication stay project-owned.
- Add concrete editing examples to Human Writing 1.1.0 for filler, inflated
  claims, forced contrasts, repetition and hedging, without mechanical bans or
  invented voice. Keep all 24 canonical skill identities and owner formats.
- Require fresh status and rendered-canvas checks in OpenPencil Workbench 1.0.2
  at startup, resume and live handback. Use one Codex built-in browser tab by
  default, preserve recoverable work during diagnosis and avoid a second browser.

## 0.12.0 — 2026-09-21

- Rename `aios-onboard` to `aios-setup` (`AIOS:setup`), preserving home,
  migration, native installation and continuity responsibilities. Update
  explicit callers on adoption; no duplicate alias or owner-format change.
  The new canonical skill identity starts at 1.0.0.
- Add `aios-interview` 1.0.0 for requested exploration and material uncertainty
  at the start of work. Keep clear tasks moving, use one blocking question
  during execution and reuse accepted answers in Setup and Spec. Extract the
  shared question/wait/resume procedure from setup into Interview.
- Organize README around the Agentic Content and Design Systems: context,
  skill chains, project artifacts and optional external workbenches. Cover all
  24 public skills and explain working through Codex's browser, including the
  distinct OpenPencil canvas and limited Diffusion Studio companion.
- Advance AIOS to 2.2.0 and Spec to 1.1.0 for conditional Interview routing;
  patch Check, Maintain Context, Manage Skills and Update for the renamed
  setup references. Update native metadata, package checks and the selected-read
  benchmark without changing its ceilings or historical baseline.

## 0.11.0 — 2026-09-18

- Add a conditional upstream guide for Taste design/style/image skills and Taste
  Code composition references. Keep examples and catalogs with their publishers;
  record selected revisions and continue with native AIOS methods when optional
  sources are unavailable. No new dependencies, installer or automatic updater.
- Connect inspected reference traits to accepted design choices and rendered
  review; make redesign preservation explicit and retain OpenPencil as the
  optional editable companion. Advance design and review-design to 1.1.0.
- Clarify native plugin namespaces and the separate identity of personal skills,
  including caller/registration reconciliation. Advance Manage Skills to 1.0.2.
  Personal skill cleanup is a separate owner-authorized action, never an install
  side effect. Keep the same 23 public skills and owner formats 1 and 2.
- Standardize all 23 skill titles and Codex display names as `AIOS:skill-name`,
  with lowercase hyphenated suffixes and compatible canonical invocation names.
  Apply patch version bumps to the remaining skills for their display changes.

## 0.10.3 — 2026-09-14

- Keep onboarding turns active while an asynchronous question awaits an answer,
  including after independent work finishes. Use permitted interruptible waits;
  a timeout never substitutes for a reply or an explicit skip, pause or cancel.
- Accept answers sent as ordinary messages and preserve context on interruption.
  Do not claim a question form survives turn completion. Advance Onboard and
  Check to 2.0.2 with a pending-answer acceptance scenario; no format change.

## 0.10.2 — 2026-09-14

- Require an available, permitted native question tool during onboarding.
  Respect runtime and mode restrictions, preserve open replies, and keep
  asynchronous questions pending until answered. Explain conversational
  fallback when no tool is usable or its call fails.
- Advance Onboard and Check to 2.0.1 with a matching acceptance scenario.
  The other 21 skills and owner formats are unchanged.

## 0.10.1 — 2026-09-13

- Keep the versioned overview at `docs/aios.md` with the installed plugin.
  Remove the public export scripts, artifact workflow and Resources dependency.
  Advance only the AIOS routing skill to 2.1.1 for the corrected documentation
  route; the other 22 skills retain their versions. No owner-format change.
- Add a tag-triggered GitHub Release workflow. Validate the package, local
  overview, changelog entry and tag version before publishing a prerelease.
- Explain native plugin updates, explicit private owner Sync and independent
  project/System repositories in the README diagram and ownership table.
  Preserve the `aios` installation identity and clarify active-session limits.

## 0.10.0 — source candidate

- Add `write-code` 1.0.0 for code of any size, including scripts, shell snippets,
  SQL, tests and automation. Keep code-quality criteria and proportionate
  verification in one compact method with automatic selection enabled.
- Route AIOS and Build code work through that method; Review applies the same
  criteria read-only. Advance AIOS to 2.1.0, Build to 1.1.0 and Review to 1.2.0;
  unchanged skills retain their versions. No owner-format change.
- Require useful behavioral proof: real-interface checks for UI/UX, meaningful
  regression tests for logic, contract checks for APIs and actual safe invocation
  for scripts. Avoid irrelevant unit tests and unnecessary generated scaffolding.
- Keep one 23-skill native package and update its local, versioned overview.
  Public-site adoption remains separate from source/package delivery.

## 0.9.0 — 2026-09-13

- Bundle a version-labelled overview and a short local documentation route;
  references load only for the selected question.
- Check documentation against the package version and prepare public exports
  with immutable source, version and checksum metadata during CI/release.

- Include design and content as five focused skills with portable helpers,
  preserving source judgment, review, provenance and optional editor routes.
- Use the native app's project and workspace. Remove mandatory AIOS project
  registration; keep Spaces as context and Systems as optional specialists.
- Default working material to project-local design/ and content/ when needed.
  Align the project and system template routes with this model.
- Create neutral owner format 2 without repository registries and retain
  format-1 compatibility. Installation does not migrate owner data.
- Keep one 22-skill source across native packages. Update documentation,
  migration boundaries, version checks and installation rehearsals.


## 0.8.0 — source candidate

- Add the portable Agent Plugins manifest and native Claude Code/Copilot,
  Cursor and Gemini metadata alongside Codex and Pi. All use the same 17 skills.
- Make native installation independent of an owner home or global bridge.
  Owner work reuses its established home or checks the default when none is known.
- Keep installation scoped to the selected app. Remove Pi's ambient-skill
  exclusion from setup defaults; preserve existing explicit configuration.
- Rewrite getting started around native installation, update and removal.
  Distinguish verified CLI behavior from documented and untested routes.
- Advance `aios`, `aios-onboard` and `aios-check` to 1.1.0. Human writing remains
  1.0.1 and applies across prose formats. No owner-data format change.
- Correct Manage Skills' Pi owner-registration reference to preserve ambient
  discovery and existing routes; advance that skill to 1.0.1.

## 0.7.1 — source candidate

- Clarify human-writing's general priority: familiar words, direct sentences
  and easy understanding across prose formats and genres.
- Keep text as short as understanding allows while preserving requested depth,
  necessary explanations, consistent terminology, precision and qualifications.
- Bump only human-writing to `metadata.version: "1.0.1"`; the other 16 skills
  retain their independent versions. No format-specific focus or new workflow.

## 0.7.0 — source candidate

- Simplify shared tracking and Spec bookkeeping while preserving native goal
  rules, acceptance, carried authorization and completion of authorized work.
- Make verification and skill management proportional to the changed boundary;
  preserve format, backup, source identity, recovery and delivery protections.
- Start independent `metadata.version: "1.0.0"` histories for all 17 skills,
  with schema and Git-baseline maintenance checks.
- Bundle `human-writing` as the default for substantive prose, with narrow
  discovery, evidence-preserving edits and no additional approval gate.

This source version is not evidence of release, installation or adoption.
Earlier release history remains in GitHub Releases and Git history.
