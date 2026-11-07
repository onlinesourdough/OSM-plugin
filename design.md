# OSM Home

OSM opens the person's selected Notion Data & Context page inside Codex. Its
actual title, icon and readable content are the main surface. A small gear opens
setup, OSM's connection and access controls. Browse reveals the mapped sources
and their records. This is a reading surface, not a second editable Notion home.

The owner's latest page-centered direction supersedes the earlier sparse
dashboard. Public examples below are fictional. Preserve original page names,
hierarchy, text, icons and existing stores; do not infer a role from a title.

## Editable source and scope

OpenPaperDesign Paper **3438e04fc0d64ffe**, project library `repo`, is saved in
[Paper/3438e04fc0d64ffe/paper.json](Paper/3438e04fc0d64ffe/paper.json).
Open it through the native Paper Home project library. Its `00 Flow index`
page maps the complete flow set; numbered artboards below identify coverage.
The original Connected/Setup/Access pages remain reference versions.

This file is the canonical product design guide. The Paper's DESIGN.md points
here and documents only illustration scope. A drawing is not runtime evidence.
“Implemented” means source exists in this branch; it does not claim live Notion,
native Desktop installation, credential qualification or release acceptance.

## Coverage inventory

| Boards | Window / state | Source / issue | Status |
| --- | --- | --- | --- |
| P01–P02 | Actual selected page, compact / wide | `home.mjs`, `home-service.mjs`; #74 | Implemented; synthetic proof |
| P03 | Browse mapped hierarchy and sources | `home.mjs`; #74 | Implemented; mapping is not permission inventory |
| P04 | Record list, expand and paginate | `home.mjs`; #74 | Implemented; no invented global search |
| P05 | Record detail, properties and page blocks | `home.mjs`; #74 | Implemented; bounded reader |
| P06 | Personal skills and built-in methods | `home.mjs`; #83 | Existing; ownership/sharing verification remains open |
| S01 | First use and setup-to-agent action | `app.mjs`; #69/#74/#82 | Implemented; actual host acceptance pending |
| S02 | Agent request accepted / continue in chat | `app.mjs`; #74 | Implemented; does not imply completed setup |
| S03 | Host rejects or lacks chat handoff | `app.mjs`; #74 | Implemented; fixed manual prompt fallback |
| S04–S07 | Four manual navigation steps | `app.mjs`, `index.html`; #58/#69 | Existing; optional official-plugin picker is separate |
| S08 | Picker open and page search | `picker.mjs`; #58 | Existing; official connection clearly labeled |
| S09 | Picker no results / unavailable | `picker.mjs`; #58 | Existing; paste a selected page link |
| S10 | Add/edit link and validation | `picker.mjs`; #58 | Existing; saved link grants no access |
| C01 | Settings drawer | `app.mjs`; #74/#82 | Implemented; OSM controls precede separate-plugin navigation |
| C02 | OSM connection/access disclosure | `home.mjs`; #82 | Implemented; workspace and mapping, no grant checkboxes |
| C03 | Native Notion page connection handoff | Notion UI; #82 | External supported action, not embedded OSM UI |
| C04 | Return from Notion and recheck | `app.mjs`, `home-service.mjs`; #82 | Explicit refresh; no fabricated automatic OAuth callback |
| C05 | Dirty source edits and Save | `app.mjs`; #58 | Existing; context switch is immediate |
| C06 | Discard confirmation / keep editing | `app.mjs`; #58 | Existing; originals remain intact |
| C07 | Context switch confirmation | `app.mjs`; #58 | Existing; pending source edits require disposition |
| C08 | Credential setup / unsupported host | `credential.mjs`; #82 | macOS Keychain opt-in implemented; provisioning manual |
| C09 | OAuth native page picker | Notion authorization; #82 | Planned alternative; no OSM OAuth client/backend configured |
| E01 | Status/page/list/detail loading | `home.mjs`; #74 | Implemented; bounded requests |
| E02 | Empty collection / textless page | `home.mjs`; #74 | Existing; distinguish empty from denied |
| E03 | Source denied / unsupported format | `home.mjs`; #74/#82 | Existing; no connector fallback |
| E04 | Root denied/revoked | `home-service.mjs`; #82 | Implemented; clear stale page content |
| E05 | Different account / connection | `home.mjs`; #82 | Existing suppression; remap through setup |
| E06 | Network/offline/provider error | `home.mjs`; #74 | Existing common unavailable state; no offline detector claim |
| E07 | Rate limited / explicit retry | `home.mjs`; #74 | Existing; no automatic retry loop |
| E08 | Partial page, unsupported block, missing icon | `notion-internal.mjs`; #74 | Implemented fallback; open original in Notion |
| E09 | Concurrent/stale navigation save | `app.mjs`, `sources.mjs`; #58 | Existing; keep draft, load latest |
| E10 | Official-mode / saved-links fallback | `home.mjs`; #82 | Existing; never silently switch identity |

| O01–O02 | Human Connect entry, honest current guide, existing-connection check and cancel | `app.mjs`; #82 | Implemented; OAuth not configured |
| O03–O05 | Own OAuth authorization, native page picker and return/wait | `docs/notion-browser-connection.md`; #82 | Planned; own registration and secure backend required |
| O06–O08 | OAuth cancel/deny/invalid/expired recovery and verified home | `docs/notion-browser-connection.md`; #82 | Planned; current connection must survive failures |

The accepted primary onboarding is human-driven browser authorization, with
optional agent help. The current guide states the provisioning gap honestly.
See [the concrete OAuth dependency and architecture](docs/notion-browser-connection.md).

## Composition and tokens

Use the native Codex theme variables already in `apps/sidebar/styles.css`.
Background `--osm-surface` (#fff / #181818 fallback); primary text `--osm-text`
(#202020 / #ececec); secondary `--osm-muted` (#666 / #aaa); edges `--osm-line`;
hover `--osm-hover`; success and error use existing semantic roles. No KPI cards,
graphs, decorative dashboard modules or new brand palette.

Runtime font is the host's sans-serif with system-ui fallback. Paper uses its
bundled Inter 400/700 as a visual approximation. Page title 30px, reader heading
25px, body 15px with generous line height, controls 13–14px, metadata 12–13px.
Use a 4px spacing rhythm, 24–36px page gutters, and a centered reading column up
to 600px. Compact layouts wrap headers and footers; wide layouts retain the same
content order and readable measure. Do not add a desktop-only sidebar until its
behavior exists. Page and record icons remain associated with their real titles.

Reuse existing button, picker, drawer, tab, list and reader primitives. Controls
have visible keyboard focus; selected tabs differ from hover. Locked saves and
handoff requests disable repeated submissions. Escape/back/closing a reader
preserve useful focus. Native page structure is rendered as bounded text,
headings, lists and code; unsupported blocks remain visibly partial. Editing,
relations and arbitrary embedded Notion views are not claimed.

## Connection and permission contract

OSM Home and model-visible `osm_connection`, `osm_context_home`,
`osm_context_list` and `osm_context_read` use the same service and credential.
OSM's dedicated connection differs from the official Notion plugin. The optional
manual page picker still uses that separate plugin and is labeled accordingly.

The pilot route reads a dedicated macOS Keychain item only after explicit
configuration. No credential is entered in Home, chat, source or a packaged
manifest. Agent assistance is available through a deliberate user action using MCP Apps
`sendMessage`; opening Home never starts a model turn.

Connection controls show the checked workspace, mapped source names and honest
limits. Internal-connection grants are managed in Notion's page `•••` →
Connections UI; removing a link is not revocation. OSM opens the selected page
and gives concise native instructions (the centralized selector is Enterprise-only), then the user refreshes to observe actual
access. The current public REST operation surface has no page-sharing mutation endpoint. Search explicitly cannot provide a complete access inventory; a 404 does not distinguish absent from unshared. OAuth's real Notion page picker is a supported
future route requiring OSM's own registered client and secure backend. It is
visibly planned, never presented as working in this candidate.

Icons come from metadata read through the OSM connection. Emoji/native Notion
icons are rendered directly. Custom/file/external raster icons are read through
a bounded public-address-only image transport, without forwarding API tokens,
and returned inline. Signed URLs/bytes stay ephemeral; an expired/unsupported
image falls back to the title and is refreshed with a new page read. External
SVG icons are currently unsupported; native Notion SVG icons remain supported.

## Research and limits

Checked 7 November 2026: the installed official Notion 3.0.8 package declares
hosted `https://mcp.notion.com/mcp` and an App mapping, with no reusable local
reader UI. No App ID, connection or credential is borrowed. Its hosted MCP uses
the user's permissions, which differs from OSM's selected-page API connection.

Primary sources: [connection permissions](https://www.notion.com/help/add-and-manage-connections-with-the-api),
[authorization and OAuth page picker](https://developers.notion.com/guides/authorization/overview),
[hosted MCP permissions](https://www.notion.com/help/notion-mcp),
[page metadata](https://developers.notion.com/reference/page),
[emoji/custom/native icons](https://developers.notion.com/reference/emoji-and-icon),
and [file URL expiry](https://developers.notion.com/reference/file-object).

Native live access, new credential provisioning, Notion writes and release remain
separate. See `TEST-TOMORROW.md` for exact safe preview entrypoints and evidence.
