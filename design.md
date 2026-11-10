# OSM Home

OSM Home shows the person's selected Notion Data & Context home inside Codex:
a quiet overview of the sources that home's definition routes to, title search,
and a simple reader for one page at a time. One gear opens Settings for OSM's
connection, the selected home and saved links. Home is a bounded reader, not a
second editable Notion and not a Notion clone.

Revision 9 November 2026 follows accepted owner feedback: Home resembles the
official Notion plugin's simple content experience, but scoped to the selected
home instead of global recents, favorites or greetings. Setup is the approved
visual source. Home, the source list, the reader, gates and Settings use its
palette, type, weights, radius, rhythm and state grammar (see
[Shared foundation](#shared-foundation-setup)), so the product keeps one
expression from first use to daily reading. Public examples are fictional.
Preserve original page names, hierarchy, text, icons and stores; never infer a
role from a title.

## Editable source and scope

OpenPaperDesign Paper **3438e04fc0d64ffe**, project library `repo`, is saved in
[Paper/3438e04fc0d64ffe/paper.json](Paper/3438e04fc0d64ffe/paper.json). Open it
through the native Paper Home project library and start at page
`R0 · Revision 9 Nov · start here`. Pages R1–R4 hold this revision's flows and
states. Page R5 shows the Setup foundation carried to Home and Settings and
governs the visual expression wherever it differs from R1–R4. Page A1 is the
generic Data & Context architecture for #93; it is not a Home screen, and any
owner-specific configuration view is kept in a private Paper outside this
repository. Pages 00–05 and the three Reference pages are preserved earlier versions.

This file is the canonical product design guide. The Paper's DESIGN.md points
here and documents only illustration scope. A drawing is not runtime evidence.
Status words in this guide:

- **Implemented** means source exists in this branch.
- **Synthetic-accepted** additionally means the designer accepted its rendering in
  the browser preview with fictional fixture data.
- **Planned** means designed but not built.

None of these claims the native Codex panel, live Notion, credential
qualification, installation or release. Implementation evidence and check
results live in [verification](docs/verification.md).

## Definition → overview contract

1. **One source of structure.** The selected root's Data and Context Definition
   revision is authoritative. Setup derives the existing `osm-home-projection/1`
   from exactly one revision ([home-map.mjs](apps/sidebar/home-map.mjs)): it
   validates IDs and field names, sorts by `order` then `key`, and is replaced
   whole only when the revision changes. It is a compatibility cache, not an
   authorable menu: Home never edits it, adds dashboard configuration, or
   regenerates navigation on load.
2. **Routing is not a grant.** The definition says where to look. Only OSM's own
   connection, verified for identity on every call, authorizes a list or read.
   A denial stays a denial: Home never retries through the official Notion
   plugin's connection or any other identity.
3. **Overview sections** are the projection's sections with role `profile`,
   `documents`, `content`, `memory` or `skills`, in projection order. Role `content`
   is an optional existing Content store: it appears only when the selected
   definition names that route and OSM's own connection proves access, and then
   lists, reads, searches and goes Back exactly like Docs. Status names it only as a
   neutral routing entry (its saved title, link and label arrive only inside its own
   list result), and it is drawn only after that list proves access; absent, denied
   or failing, it shows nothing, not even its label. Role `related` becomes “More in Notion” links that open Notion and are never read. Role
   `support` is never listed, read, searched or counted on Home.
4. **Titles and icons come from the source.** A section heading shows the list
   result's `source` title and icon (data source metadata); the projection label
   stands in only while loading or when the source has none. Rows are the
   verified list items with their own icons. Skills rows show their description
   field when the definition maps one.
5. **Unknown stays unknown.** Where the definition does not state a role, view or
   field, Home does not guess from a title. Such a source is not shown on Home;
   Setup reports it. The definition is neither a complete page tree nor a grant
   inventory.
6. **Preview and Open.** Every source preview uses its first existing list
   response, with no extra request, and shows up to 3 rows at every width.
   - **Listed source:** always ends with “Open ‹Source›”, which opens its in-Home
     source list. It appears whether or not more rows exist.
   - **Empty readable source:** shows “Nothing here yet.” and the same “Open
     ‹Source›” (0.31.2), so a mapped Memory with no records opens like a populated
     Skills. Its list repeats that it is empty and offers Open in Notion; opening it
     reads nothing more.
   - **Denied, unsupported, rate-limited or unavailable source:** keeps its state
     line and existing recovery, with no Open action, no count and no metadata
     beyond the projection label.

## Surfaces

**Home overview (H01, H02, R5).** Setup's page header carries the home: root
icon in the brand slot and the root title as the screen title, with the gear as
the header's icon button. There is no separate “OSM” label and no connection
pill. Activating the title opens the root page in the reader. Below it come the
search field, then one card with a section per source in definition order:

- **Section head:** source icon in the 20px leading slot and the source title as
  the row label. It is not interactive.
- **Panel:** up to 3 record rows, then the right-aligned “Open ‹Source›”.

Related links follow the card under “More in Notion”. No root body is shown
on the overview. Compact and wide are the same single 600px column; wide only
adds side margin. Home never shows step numbers.

**Source list (H03).** The destination of “Open ‹Source›”. It uses the reader
bar (the header is hidden): a labeled Back (“Back to Home” or “Back to search
results”) and the breadcrumb `root / source`, with the root dropped at compact.
Below the bar come:

- the source icon and title, in the screen-title style;
- “Open in Notion ↗”;
- one card holding all verified rows (existing 50 row cap);
- a right-aligned “Load more from ‹Source›” while a cursor remains;
- the existing withheld/partial notes.

**Search (Q01–Q02).** “Search titles or paste a Notion link.” Typing (300 ms
debounce, in-flight coalescing) queries page titles in each overview source
through OSM's connection. For a data source this is a data source query with the
mapped title property `contains` the text, combined with the saved view filter.
For a page-list source it uses the already verified page titles. At most 5
matches per source, grouped in definition order under the source heading.
Support material and unresolved containment are excluded by the existing
predicate. This is title search only, not Notion's workspace search. While a
query is active, the root title collapses so results follow the field. Esc
clears the search and returns to the overview.

Each searched source shows:

| Answer | Under the source heading |
| --- | --- |
| Complete, no hits | Nothing; the source is omitted |
| Hits, complete | Rows only |
| `hasMore` | Rows if any · “‹Source› couldn’t be searched completely” · “Open ‹Source›” (no Try again; a retry returns the same bounded page) |
| `partial` | Rows if any · “‹Source› couldn’t be searched completely” · Try again |
| `withheld > 0` | Rows if any · “N pages here can’t be read with OSM’s connection.” |
| Failure state | “‹Source› couldn’t be searched right now” · Try again |

When these combine, the incomplete note comes before the withheld note, followed by one
action; “Open ‹Source›” wins over Try again. Results use the overview's card,
heads and rows. “No titles in this home match
“…”.” appears only when every readable overview source has answered the
current query, every answer is complete and empty, and none has `hasMore`,
`partial`, `withheld` or a failure. Otherwise there is no global sentence:
“Searching…” shows only while a request is pending, and when nothing is pending
only the per-source notes show.

A pasted Notion link opens the reader when a single page metadata read places
it in a mapped source. Otherwise Home shows “This page isn’t part of your Data &
Context home” with Open in Notion. A 404 does not distinguish absent from
unshared, so that case says “OSM can’t open this page here” rather than
asserting either.

Back from a reader opened by a link returns to that search view: the URL stays
in the field, and one result row appears under its source heading, built from
the reader's own verified answer (`key`, `id`, title, icon only; never the URL,
the locate response, the body or the link). Focus moves to that row, or to the
field if there is none. Returning never re-runs locate or read. The page opens
again only when the row is activated.

- **Read still pending:** “Searching…” shows while it is in flight.
- **Inaccessible or unsupported:** the outside/can’t-open copy.
- **Unavailable or rate limited:** “couldn’t be searched right now · Try again”, where Try again re-runs locate only on request.

The field and the view always agree: whenever Home resets to the overview
(context, scope or account change, revoke, explicit reload or event recheck),
the field is emptied and any pending search is cancelled. Result rows live only
in their search view and are never persisted.

**Reader (R01–R03).** One bar replaces the OSM bar: Back (labeled with its
destination), breadcrumb, Copy link and Open in Notion ↗. Because Home uses the
600px Setup column at every width, the bar uses one composition everywhere: Back
and the breadcrumb on the first row, the actions right-aligned on a second row
when they do not fit. The breadcrumb is `source / page` from the projection, not
Notion's parent chain; the root segment is not shown in the bar (Back and the
source list reach it), and no leading separator remains. Segments other than the
current page are buttons. Crumbs navigate without adding
history. The root crumb clears history and search. The source crumb opens the
source list and keeps the previous entry, so Back still returns to the view that
opened the reader. Back never opens a page by itself.

Body: actual icon (32px) above the title, the title in the screen-title style
(wraps, never truncated), a muted type line (existing `meta`), mapped properties
(Decision, Why, Fact, Evidence), then text, headings, lists and code in the
same 600px column. Unsupported blocks, sub-pages and truncation stay visibly partial.
Back restores the previous Home view and focuses the opener. Copy link copies
the page's Notion URL and announces “Link copied” in a status region that clears
after about 2 s. If the clipboard is refused, the URL is shown selected for
manual copy.

**Settings (T01–T03).** Opened only from the gear; the accepted structure stays.
Order:

1. **Notion connection:**
   - **Connected:** “Connected · ‹workspace›” with “Checked at HH:MM when Home opened”, Manage access in Notion ↗, one short note of the Settings → Connections path, and Check again.
   - **Not connected:** Connect Notion as the primary button, opening the existing honest guide (O02), the plain statement that browser sign-in needs OSM’s own registration and backend, and Check again.
   - **No verbose copy:** no mapping inventory or agent-first copy in either state.
2. **Data & Context home:** the existing context picker in its standard Setup
   form: a bordered 32px field showing the current home's icon and title, with
   the chevron. It opens the existing picker and its confirmations. Below it, one
   hint: “Definition revision ‹rev› routes Home to N sources. It routes; access
   comes from OSM’s connection.”
3. **One card with two rows**, using Setup's row heads without numbers:
   - **Saved links:** summary names each category that has at least one saved
     link, once and in this order: Docs, Skills, Memory (personal or team slots
     both count as their category), joined with “ · ”; “None” when nothing is
     saved. It opens the Saved links sub-view.
   - **Built into OSM:** a row with a line icon, the label, a one-line description
     and, beneath it, the summary “N methods”, then one chevron. Like Saved links
     it opens its own Settings page (title “Built into OSM”, “‹ Settings” back):
     the installed package's methods, name then description, with “From the
     installed OSM package. Reading a method here doesn’t run it.” Choosing one
     opens its text on a further page (title is the method's name, “‹ Built into
     OSM” back); Back returns to the list with focus on that method, and Back
     again to Settings with focus on the row. The text comes from the package's
     own skills through a name-checked, size-bounded read, shown as text. There
     is no nested menu, no second chevron and no enable, run or ownership control.
4. **Separate Notion plugin:** the optional picker only, with Setup's existing
   status row.
5. **Get help from your agent**

**Saved links (T03).** The former “Edit link…” is the saved-navigation link
editor in [picker.mjs](apps/sidebar/picker.mjs). It saves Docs, Skills and
Memory navigation links through `osm_save_sources`; it is not a permission
editor and grants nothing.

- **Placement:** a Settings sub-view with ‹ Settings.
- **Purpose text:** “Quick links for opening your sources when Home can’t read Notion. Saving a link doesn’t share a page with OSM or change access.”
- **Labels:** Docs, Personal skills, Team skills, Memory and Team memory.
- **Footer:** Cancel/Save appear only in this view, with the existing Apply, Save and discard behavior.

Setup's manual steps (S04–S07) keep the editor as the required fallback.

## Status, refresh and states

Home shows status only when it changes what the person can do: nothing while
healthy; one inline line for a source that is empty, withheld, denied or rate
limited; a full gate only when the connection or home page fails. Every message
leads somewhere: Settings, Notion, Check again, Try again or saved links.

Refresh is event-based. Home checks status on panel open and context change
(existing), once when a hidden panel becomes visible again (`visibilitychange`,
at most once per 30 s), and after Settings closes following a connection
action. Check again (Settings, X05) and Try again (rate limited, unavailable)
are explicit. No timers or polling. During a recheck the previous state stays,
dimmed, with “Checking access…”; content changes only after a successful check.
Home never says access was added without an actual successful read. The
existing one-automatic-recovery budget and invalidation rules in
[home.mjs](apps/sidebar/home.mjs) remain.

| State | Home shows | Board |
| --- | --- | --- |
| Loading | “Opening your home…”, disabled search | X01 |
| Empty source | “Nothing here yet.” under that source | X02 |
| Withheld rows | “N pages here can’t be read with OSM’s connection.” | H03, X03 |
| Source denied | “OSM’s connection can’t read ‹source›.” · one line of Settings → Connections → OSM → Manage access guidance · How to share it › (opens the source in Notion) | X03 |
| Rate limited / unavailable | Source line with Try again; full gate if status fails | X03, E06–E07 |
| Not connected / removed | “Reconnect Notion”: “OSM isn’t connected to Notion, or its connection was removed, so nothing from your home is shown.” One primary Open connection settings; ghost Show saved links and Get help from your agent | X04 |
| Different connection | Existing suppression; nothing from the home or saved links shown | X04, E05 |
| Home page unreadable | “Your home page can’t be read”, naming “your home” because a failed root check exposes no verified title · one primary Manage access in Notion ↗ · ghost Check again and Get help from your agent | X05 |
| Returning from Notion | Recheck on visibility; previous state dimmed until answered | X06 |
| No projection yet | Existing Continue Setup gate with Connect first | E10, S01 |

Every gate uses Setup's opening composition:

- **Title:** the gate title in the page header.
- **Copy:** in the intro style.
- **Actions:** one row, with one primary button first and ghost buttons after it, as in “Connect Notion · Set up with agent”.

## Fixture versus product

[preview-home.mjs](apps/sidebar/preview-home.mjs) is a fictional browser
fixture, not live proof. It now uses visibly sample data (“Northwind · Sample
home”, “Sample …” titles), and icons that are emoji, raster, missing and
native SVG, so it can exercise icon placement and the listed states.

This revision fixed these product problems:

- The root page body led Home.
- Navigation hid behind a disclosure and tabs.
- Home carried a connection pill and meta controls.
- Settings nested the connection behind a toggle.
- The reader lacked a breadcrumb and Copy link.
- Previews showed only two rows.
- Home had no search.

The 9 November cohesion correction fixes these:

- Home drifted from Setup in title size and weight: a Home button reset inherited
  the weight.
- Home used its own text-button, search and section styles, and a wider two-column
  layout.
- Memory lost its Open link when it had exactly the preview count.
- Built into OSM used a native triangle plus a chevron.

An installed Home projection was missing at the latest owner check. That is a
real Setup state, not a design gap, and no credential or grant was changed.

## Coverage map

Issues: #74 Home reading, #82 connection and access, #58 saved links and
picker, #83 skills. No new issue.

| Boards | Flow / state | Source / issue | Status |
| --- | --- | --- | --- |
| R0 | Revision index and contract | design.md | Design |
| R5 | Setup foundation carried to Home and Settings | design.md Shared foundation; `styles.css`, `index.html`, `home.mjs`, `app.mjs` | Implemented; synthetic-accepted, including the reader-bar and Saved links summary corrections |
| H01–H02 | Overview compact / wide, light / dark | `home.mjs`, `index.html`, `styles.css`; #74 | Synthetic-accepted |
| H03 | Source list, Load more, withheld | `home.mjs`, `home-service.mjs`; #74 | Synthetic-accepted |
| Q01–Q02 | Title search, no match, pasted link, link Back, incomplete sources | `home.mjs`, `home-service.mjs` search/locate; #74 | Q01/Q02 synthetic-accepted; link Back and incomplete-source rules implemented, not image-reviewed |
| R01–R02 | Reader compact / wide, breadcrumb, Back, Copy, Open | `home.mjs`; #74 | Synthetic-accepted; host clipboard unverified |
| R03 | Memory fields, partial, Link copied | `home.mjs`, `notion-internal.mjs`; #74 | Implemented; fields/partial not image-reviewed |
| T01–T02 | Settings connected / not connected | `index.html`, `app.mjs`, `home.mjs`; #82 | Synthetic-accepted |
| T03 | Saved links sub-view (moved Edit link) | `picker.mjs`, `app.mjs`; #58 | Synthetic-accepted |
| X01 | Loading | `home.mjs`; #74 | Implemented; not image-reviewed |
| X02–X03 | Empty, source denied / retry | `home.mjs`; #74/#82 | Synthetic-accepted |
| X04–X05 | Not connected / removed, root unreadable | `home.mjs`; #82 | Synthetic-accepted; different-connection gate not image-reviewed |
| X06 | Recheck on return | `home.mjs`; #82 | Implemented; host `visibilitychange` unverified, not image-reviewed |
| S01–S10 | First use, agent help, manual steps, picker | `app.mjs`, `picker.mjs`; #58/#69/#74/#82 | Existing, reused |
| C03–C09 | Native grant, recheck, edits, discard, switch, Keychain, OAuth picker | #58/#82 | Existing/planned, reused |
| E05–E10 | Different account, network, rate limit, partial, stale save, saved links | #58/#74/#82 | Existing, reused |
| O01–O08 | Human Connect, guide, planned OAuth flow | `app.mjs`; [browser connection](docs/notion-browser-connection.md); #82 | O01–O02 implemented; O03–O08 planned |
| P01–P06, C01–C02 | Page-first Home, access disclosure | — | Superseded references |

### Design acceptance

On 9 November 2026 the designer accepted the browser preview's fidelity to this
guide for a private synthetic candidate. That covers the render corrections
B1–B8, then F1–F3 (the source-list bar, the not-connected gate, and Settings
when not connected), checked against actual screenshots with fictional data.
No design blockers remain for that candidate.

That acceptance covered layout and behavior before the Setup-foundation cohesion
correction (R5). The new visual expression, the always-present “Open ‹Source›”
and the Built into OSM row are implemented. After the session hold, the designer
reviewed actual browser screenshots (320px and wide, light and dark, including a
long-title fixture) and accepted the cohesion, Open Memory, the Built into OSM row
and long-title containment. Sonnet then made the two bounded corrections stated
above (one reader-bar composition at every width; Saved links summary by
category). The final browser check shows the wide reader crumb in full and “Docs ·
Skills · Memory”. At 320px that summary ellipsizes visually with its full
accessible text kept, which the final independent review accepted as
nonblocking.

It is not acceptance of:

- The native Codex panel, or clipboard and visibility events in the host.
- Live Notion.
- OAuth, which is planned.
- Paper pixels.
- Installation or release.

## Shared foundation (Setup)

Setup ([index.html](apps/sidebar/index.html) `#setup` and its rules in
[styles.css](apps/sidebar/styles.css)) is the approved design source. Every OSM
surface uses these values. Where an older Home rule differs, the Setup value
wins.

| Role | Value |
| --- | --- |
| Colour | `--osm-surface`, `--osm-text`, `--osm-muted`, `--osm-line`, `--osm-line-strong`, `--osm-hover`, `--osm-success`, `--osm-danger` with their light/dark fallbacks; host theme first. No other palette, KPI cards, graphs, carousels or decorative modules. |
| Font | Host `--font-sans`, `system-ui` fallback; base 14px/1.5. One family everywhere. |
| Screen title | 24px/600/1.2, letter-spacing −0.4px; 22px at ≤440px. Used for Setup “Get started”, the Home root title, gate titles, the source list title and the reader title. |
| Row label | 15px/500, as on Setup steps. Used for source heads and Settings card rows. |
| Body | 14px/400, for record titles, intro and gate copy (muted) and reader text (line-height 1.6). |
| Reader heading | 15px/600 |
| Small label | 13px/500, for field labels, all buttons and the current breadcrumb. Settings section titles are 13px/600. |
| Hint | 12px muted, for hints, row summaries, descriptions and meta. Breadcrumb links are 13px muted. |
| Status | 13px; connected uses `--osm-success`. |
| Container | `main` max-width 600px, padding 48/36/40; 28/20/32 at ≤440px. The same for Setup, Home, source list, reader and gates. |
| Header | `.page-header`: title left, 32px ghost icon buttons right, 28px below. |
| Controls | `.btn` 32px, padding 0 12px, radius 8px, 13px/500: `btn-primary` (filled dark), `btn-secondary`, `btn-ghost`. Icon buttons are 32×32. `.form-control` and `.picker` are 32px with radius 8px and a 1px `--osm-line` border. Menu radius 10px, option radius 6px. |
| Card | `.osm-card`: 1px `--osm-line`, radius 14px, rows divided by 1px `--osm-line`. Row head min-height 52px, padding 0 16px, gap 12px, 20px leading slot, label then right summary. Panel padding 4/16/16/48px, so content aligns under the label (16px left when the row has no leading slot). Actions in `.step-actions`: right-aligned, gap 8px, 16px above. |
| Record row | `.row`: min-height 40px, padding 0 12px, radius 8px, margin 0 −12px; 18px icon, gap 8px; description on a second line in the hint style. |

**States.**

- **Hover:** `--osm-hover` background.
- **Keyboard focus:** `box-shadow: 0 0 0 1.5px var(--osm-line-strong)`, plus the hover fill on ghost buttons and rows. Hover and focus stay distinct from selection.
- **Disabled:** opacity .5.
- **Filled dark** (`--osm-text` fill, `--osm-surface` text) has exactly two uses: the open Setup step number, and the single primary button on a screen.
- **Expanded:** shown by its panel, as on Setup steps. No triangles.

**Element mapping.**

| Element | Setup primitive |
| --- | --- |
| Home header | `.page-header` + `.brand`: root icon (24px) in the brand slot, root title as the `h1`, gear as `btn-ghost icon` |
| Search | `.form-control`, full width, 16px below |
| Sources and search results | One `.osm-card`. Each source is a section with a non-interactive head (Setup's filled 20px circle numbered by the source's place in the definition, then the source icon and label), a panel of `.row` records, and `.step-actions` with `btn-primary` “Open ‹Source›” (0.31.2; the same filled Continue button). State lines are hints; Try again is `btn-ghost`. |
| Source list | Reader bar; title in the screen-title style with the 24px icon inline, gap 10px; `btn-ghost` “Open in Notion ↗”; one `.osm-card` of `.row`s; `btn-secondary` “Load more from ‹Source›” in `.step-actions` |
| Reader bar | Back `btn-ghost icon`; breadcrumb `nav`; `btn-ghost` Copy link and “Open in Notion ↗” |
| Gates | Header title, `.intro` copy, actions row as on Setup's opening |
| Settings | Existing drawer head and section titles. Connection actions in one row: `btn-secondary` “Manage access in Notion ↗” or, when not connected, `btn-primary` “Connect Notion”, then `btn-ghost` “Check again”. Then the standard context picker, the two-row card, and `btn-ghost` “Get help from your agent”. |

Home keeps no type or button rules of its own:

- **Button resets:** `font: inherit` resets apply only to non-`.btn` buttons.
- **Removed Home styles:** title-size overrides, text-button and `.more` link styling, the borderless search and `.primary` buttons.
- **Width:** Home keeps the 600px Setup column. No wider Home container and no two-column grid.

Search is a combobox over a results list (Arrow keys, Enter opens, Esc clears);
the breadcrumb is a `nav` with the current page `aria-current`. Locked saves and
handoff requests disable repeated submissions; Escape and Back preserve useful
focus. Editing, relations and arbitrary embedded Notion views are not claimed.
Paper approximates with its bundled Inter 400/700 (600 drawn as 700, 500 as
400); runtime uses the host font.

## Connection and permission contract

OSM Home and model-visible `osm_connection`, `osm_context_home`,
`osm_context_list` and `osm_context_read` use the same service and credential.
OSM's dedicated connection differs from the official Notion plugin. The optional
manual page picker still uses that separate plugin and is labeled accordingly.

The pilot route reads a dedicated macOS Keychain item only after the owner's
saved per-context route setting (or the earlier explicit pilot variable). The
Setting is non-secret and made from the owner's recorded selection. Missing
opt-in, missing item, locked or declined Keychain and a timeout are separate
states. No credential is entered in Home, chat, source or a packaged
manifest. Human Connect is primary; agent assistance is available through a
deliberate user action using MCP Apps `sendMessage`; opening Home never starts
a model turn.

Internal-connection grants are managed in Notion's page `•••` → Connections UI;
removing a saved link is not revocation. OSM opens the selected page and gives
concise native instructions (the centralized selector is Enterprise-only), then
rechecks on return. The current public REST surface has no page-sharing
mutation endpoint. Search cannot provide a complete access inventory; a 404 does
not distinguish absent from unshared. OAuth's real Notion page picker is a
supported future route requiring OSM's own registered client and secure
backend. It is visibly planned, never presented as working in this candidate.

Icons come from metadata read through the OSM connection. Emoji/native Notion
icons render directly. Custom/file/external raster icons are read through a
bounded public-address-only image transport, without forwarding API tokens, and
returned inline. Signed URLs/bytes stay ephemeral; an expired/unsupported image
falls back to the title and is refreshed with a new page read. External SVG
icons are unsupported; native Notion SVG icons remain supported.

## Research and limits

Checked 7 November 2026: the installed official Notion 3.0.8 package declares
hosted `https://mcp.notion.com/mcp` and an App mapping, with no reusable local
reader UI. No App ID, connection or credential is borrowed. Its hosted MCP uses
the user's permissions, which differs from OSM's selected-page API connection.
The official plugin's home layout (greeting, search, recents and favorites
carousels, top breadcrumb with Copy link and Open in Notion) informed this
revision's reader and search composition only.

Primary sources: [connection permissions](https://www.notion.com/help/add-and-manage-connections-with-the-api),
[authorization and OAuth page picker](https://developers.notion.com/guides/authorization/overview),
[hosted MCP permissions](https://www.notion.com/help/notion-mcp),
[page metadata](https://developers.notion.com/reference/page),
[data source query filters](https://developers.notion.com/reference/query-a-data-source),
[emoji/custom/native icons](https://developers.notion.com/reference/emoji-and-icon),
and [file URL expiry](https://developers.notion.com/reference/file-object).

Host support for clipboard writes and `visibilitychange` inside the Codex panel
is unverified and must be checked before relying on them. Native live access,
new credential provisioning, Notion writes and release remain separate. See
[the Codex sidebar](docs/sidebar.md) for the safe preview entrypoints. The earlier
preview checkpoint `TEST-TOMORROW.md` is a private historical record kept in Git
history, no longer a file in the repository.
