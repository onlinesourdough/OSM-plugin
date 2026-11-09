# OSM's internal Notion connection

Revision: 2026-11-09

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

## Host credential route in the local candidate

The local candidate adds an explicit macOS Keychain opt-in. It does not change
any installed profile. With `OSM_NOTION_KEYCHAIN=1` in the OSM server's existing
configuration, `apps/sidebar/credential.mjs` reads only the generic-password item
with service `com.onlinesourdough.osm.notion` and account `osm`, using the absolute
system `security` executable with a five-second bound. The secret remains in the
server closure and is never sent to Home, tools, errors or saved projections.
Without opt-in, or on another OS, the route remains `unsupported_host`.

Provisioning is manual for this pilot. In macOS Keychain Access the human creates
or selects the dedicated OSM item and enters the credential privately. Do not
reuse another integration's credential or paste a key in chat/terminal history.
A missing item means not connected; a locked/denied/timed-out store means the
connection could not be checked. OS prompts belong to the human. No credential
was provisioned or accessed as part of this candidate's synthetic tests.

Home and the agent's `osm_connection`, `osm_context_home`, `osm_context_list` and
`osm_context_read` share the same service and identity checks. These are read
operations only. The source mapping is an application boundary, not a complete
inventory of Notion grants or a restriction on other installed connectors.

The preferred human onboarding is browser OAuth with OSM's own registered
integration and Notion's native page picker. The current Connect dialog honestly
states that browser sign-in is not configured. The precise registration,
confidential-client callback/backend and token-custody dependency, plus why
hosted MCP PKCE is not an equivalent scope, are in
[browser connection architecture](notion-browser-connection.md). No shared client
secret, new app, account or backend is included or activated here.

## Proven and unproven

The fixture tests prove the logic against a fictional workspace behind a fake
transport:

- allowed and denied reads;
- revocation, account change and scope change;
- the bounds;
- hostile text;
- that the token appears in no output.

The fixtures do not prove:

- that the real API behaves the same way;
- how mentions resolve for unshared pages;
- real grants and revocation;
- Codex or Claude native behaviour;
- Setup writes through this connection.

Those need approved native holders under #61, with a synthetic workspace.
