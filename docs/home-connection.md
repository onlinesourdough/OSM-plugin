# OSM's internal Notion connection

Revision: 2026-11-10

Home reads the owner's mapped Notion records through the connection mode the
projection records (#82, #74). This release implements one mode,
`internal_selected_pages`: OSM's own internal connection. The other mode,
`official_notion_user`, uses the separate official Notion plugin, which stays
an optional installation for the user; Home shows that it can't read through it
in this view yet. That transport is a separate decision tied to #61. Home never
switches mode, and never routes a read through another connection, including
after a denial.

## What the connection is

An [internal connection](https://developers.notion.com/guides/get-started/internal-connections)
is a workspace bot that reads only the pages and databases explicitly shared
with it, and their children. Its
[capabilities](https://developers.notion.com/reference/capabilities) control
reading, inserting and updating separately. Home needs **Read content** only.
That describes this panel alone. Home being a read-only view neither limits nor
implies the owner's recorded write policy for agents and the maintenance job,
which the Context Architecture's
[home write policy](../skills/osm-data-context/references/architecture.md#home-write-policy)
defines.

Grants Setup asks the owner for:

- the OSM root page, which covers its child pages and child databases;
- each existing database the model links to outside that root, such as a team
  Memory or Skills database, shared separately. A link from the model is not a
  grant, and Home reports such a source as inaccessible until it is shared.
  Even when shared, Home lists it only when its ancestry up to the workspace
  can be read within the support check's bound. Otherwise it is refused as
  unresolved. This is item (a), pending an owner decision; see
  [Home](sidebar.md#home).

A scoped connection limits only itself. If the same agent can also call a
broader Notion route, such as the official plugin, OSM's scope does not fence
that route.

## API contract

The adapter (`apps/sidebar/notion-internal.mjs`) sends `Notion-Version:
2026-03-11` ([versioning](https://developers.notion.com/reference/versioning),
[2026-03-11 upgrade guide](https://developers.notion.com/guides/get-started/upgrade-guide-2026-03-11))
and uses only these read endpoints:

| Need | Endpoint |
| --- | --- |
| Connection identity | `GET /v1/users/me` ([bot user and workspace](https://developers.notion.com/reference/get-self)) |
| Record with properties | `GET /v1/pages/{id}` ([retrieve a page](https://developers.notion.com/reference/retrieve-a-page)) |
| Selected page body | `GET /v1/blocks/{id}/children` ([block children](https://developers.notion.com/reference/get-block-children)) |
| Database and schema | `GET /v1/databases/{id}`, `GET /v1/data_sources/{id}` ([database](https://developers.notion.com/reference/retrieve-a-database), [data source](https://developers.notion.com/reference/retrieve-a-data-source)) |
| Title lists | `POST /v1/data_sources/{id}/query` ([query](https://developers.notion.com/reference/query-a-data-source)) |

Bounds:

- Title search queries use the mapped title property and saved view filter in
  an AND intersection, with at most five results per mapped source. Page-list
  search filters verified titles. Related and support routes are never searched;
  pasted links reveal no metadata before membership/containment pass. No global
  search or separate connector is used.
- Lists read ten results per request and follow `next_cursor` only when asked.
  `request_status.type: "incomplete"` is shown as a partial list, and no total
  is ever computed.
- Bodies read up to 120 blocks, three levels deep, in at most twelve requests.
  Child pages and child databases are labelled and never opened. Synced blocks,
  tables, media, `unsupported` and other unrendered blocks show as content that
  can't be shown here.
- Mentions show as a placeholder, and relations, rollups, formulas, people and
  files aren't resolved, because any of them can name a source outside the grant.
- Each property shows up to 4,000 characters; a longer one marks the article as
  partial.
- A trashed root page counts as unreadable, so Home is not reported connected.
- Support containment reads a record's parent pages, at most three per item.
  For a data-source record, it also reads the source's schema (`GET
  /v1/data_sources/{id}`, whose `database_parent` locates the database); it never
  reads a database or a parent data source. A parent that can't be read leaves
  the item unresolved and refused. So an external database stays hidden until
  its whole ancestry can be read within three ancestor-page steps. That is item
  (a), unresolved and pending an owner decision.

[Status codes](https://developers.notion.com/reference/status-codes) map to fixed
states, and no Notion message passes through, since a 404 message can name the
connection:

| Status | State |
| --- | --- |
| 401 | not connected or revoked |
| 403, 404 | inaccessible, never empty |
| 400 | unsupported |
| 429 | retry later. Notion's `Retry-After` is capped at 60 s. There is no automatic retry ([request limits](https://developers.notion.com/reference/request-limits)). |
| Other | unavailable |

Every Home call reads the identity again. A different bot or workspace from the
mapping returns `account_changed`, and the panel then clears its lists, bodies
and sections.

## Host credential route (macOS Keychain)

The route reads one generic-password item from the macOS Keychain, service
`com.onlinesourdough.osm.notion` and account `osm`, through the absolute system
`security` executable with a fifteen-second bound (`apps/sidebar/credential.mjs`), long enough for the slower first read after the Keychain was idle or locked (measured at about seven seconds on a real Mac), and short enough to fit a tool call's default sixty-second budget beside the Notion identity read. A read that never answers is stopped and reported as `keychain_timeout`. The
secret stays in the server closure and never reaches Home, tools, errors or saved
files. The credential is the existing selected internal connection's own; OSM never
creates it, copies another tool's, or reads another item.

**Turning the route on.** The installed package's MCP declaration
(`.codex-plugin/mcp.json`) sets no environment, so the packaged setup had no exposed
per-context opt-in: `OSM_NOTION_KEYCHAIN=1` reached the server only if someone edited
the installed cache or set host-wide state, neither of which a normal install should
need. The OpenAI documentation reviewed covers a config file for a local script and
installed-server policy overrides, and does not establish a general environment override.
That is a gap in what the documents show, not a claim that Codex cannot configure an
environment. The route is therefore one small non-secret setting per context, which the
owner's recorded selection of `internal_selected_pages` turns on through
`osm_save_connection_route`:

- It is the file `aios/panel/<context hash>.connection.json` under `CODEX_HOME`
  (default `~/.codex`), beside that context's links and projection. It holds the
  format, the context identity, the route name, the mode and `enabled`. No
  credential, identity or page content.
- It is saved with the same guards as the links and projection: whole replacement,
  revision-checked, one lock, the replaced bytes backed up, an atomic rename, no
  symlink or hard-linked file, and a recheck that the context is unchanged. Saving
  the same value is a no-op. A damaged file reads as off and can be replaced.
- It belongs to one context. Another context has another file and stays off.
  Turning it on is refused for a non-Notion context and when the saved Home mapping
  selected the official connection; turning it off is always allowed. The mapping's
  mode is still checked before any credential is requested.
- It reads no credential, creates no Keychain item, grant or account and bypasses no
  OS prompt. `OSM_NOTION_KEYCHAIN=1` in the server's environment keeps working as the
  earlier explicit pilot opt-in.

**What the human does.** Only the private part: reuse the credential of the existing
selected connection, adding it to Keychain Access under the service and account above,
and approve any macOS prompt. Do not rotate or revoke that connection to fill the
Keychain: other authorized callers of it must keep working. Never paste the credential
in chat, a terminal, the frontend or a file, read or copy the maintenance tool's or the
official plugin's credential, or create another connection. This is guidance; OSM
provisions nothing and asks for no second selection of the mode or the root.

**Why it can or cannot be used.** `osm_connection`, Home's gate and the Settings
check name the actual reason:

| State | Meaning | Next |
| --- | --- | --- |
| `unsupported_host` | Not macOS | None here yet; saved links still work |
| `not_enabled` | macOS, route off for this context | Setup saves the route from the recorded selection |
| `not_connected` | No Keychain item, or Notion returned 401 | Add or restore the item privately |
| `keychain_blocked` | Keychain locked, or the prompt was declined (`security` exit 36, 51 or 128) | Unlock or approve, check again |
| `keychain_timeout` | No answer in fifteen seconds, and the read was stopped; a prompt may be waiting | Approve, check again |
| `unavailable` | Any other failure | Try again later |

No state carries `security`'s text, a Notion message or the credential. The exit
statuses are the low byte of macOS's OSStatus codes; an unrecognised status is
`unavailable`, never guessed. Non-Mac hosts stay unsupported.

**Before a projection exists.** The projection is generated from the definition, which
lives in the root page, so reading the root needs no projection. With the route on,
`osm_connection` reports `unmapped` with OSM's own bot and workspace, and
`osm_context_home` becomes a bounded bootstrap read of only the root the owner already
selected as the context home: the same identity check, no search and no other page. It
returns the root's bounded content (the definition, as untrusted source content) with
the connection identity, the context and its revision and the projection's revision,
which `osm_save_home_projection` takes as its evidence. Its optional `check` names up to
eight destinations the root's own text names, and returns each one's access, title and,
for a data source, property names and types; never values or bodies. An ID the text does
not name is not requested; a destination outside the grant reads as inaccessible. The
check does not grant, and does not apply containment: every later list and read still
applies the support check and the grant. A root longer than the read bound returns
`truncated: true`, and nothing is mapped from a partial definition. A damaged projection
or the official mode never opens this path.

Home and the agent's `osm_connection`, `osm_context_home`, `osm_context_list` and
`osm_context_read` share the same service and identity checks. These are read
operations only. The source mapping is an application boundary, not a complete
inventory of Notion grants or a restriction on other installed connectors.

The preferred human onboarding is browser OAuth with OSM's own registered
integration and Notion's native page picker. The current Connect dialog honestly
states that browser sign-in is not configured. The registration, owner decisions,
callback and token-custody proposal, plus why hosted MCP PKCE is not an equivalent
scope, are in [browser connection architecture](notion-browser-connection.md). No
shared client secret, new app, account or backend is included or activated here.

## Proven and unproven

The fixture tests prove the logic against a fictional workspace behind a fake
transport:

- allowed and denied reads;
- revocation, account change and scope change;
- the bounds;
- hostile text;
- that the token appears in no output;
- that nothing is requested without the saved route, per context, and that each
  Keychain failure is its own state;
- the bootstrap read, its named-destination checks and the path from route to
  projection to a useful read, including a different bot or workspace being refused.

The fixtures do not prove:

- that the real API behaves the same way;
- how mentions resolve for unshared pages;
- real grants and revocation;
- Codex or Claude native behaviour;
- the Keychain prompt on a real Mac;
- Setup writes through this connection.

Those need approved native holders under #61, with a synthetic workspace.
