# OSM's internal Notion connection

Revision: 2026-10-26

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

Grants Setup asks the owner for:

- the OSM root page, which covers its child pages and child databases;
- each existing database the model links to outside that root, such as a team
  Memory or Skills database, shared separately. A link from the model is not a
  grant, and Home reports such a source as inaccessible until it is shared.

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

## Host secret mechanisms

The token may come only from a documented, supported host secret store that
injects it into the OSM server process. OSM writes no token file, asks for none
in chat or the panel, and never returns, logs or saves one.

| Host | Documented mechanism | Status in this release |
| --- | --- | --- |
| Codex | Stdio MCP servers take `env` from `config.toml`, or forward `env_vars` from Codex's own environment ([Codex MCP](https://developers.openai.com/codex/mcp)). No secure store is documented for stdio servers. `bearer_token_env_var` applies only to HTTP servers. | **Unsupported.** Home reports `unsupported_host` and makes no request. |
| Claude Code | A plugin `userConfig` option with `sensitive: true` masks input and keeps the value in the platform's secure credential store. `${user_config.KEY}` substitutes it into the plugin's MCP server `env` ([plugins reference](https://code.claude.com/docs/en/plugins-reference)). | **Supported mechanism, not declared.** The plugin declares no Claude MCP server. Adding one changes host registration and needs native proof, so it is open under #61/#82. There is no native Claude Home. |

`hostCredential()` in `apps/sidebar/home-service.mjs` is the one place a future
host entry would be added, together with that host's declaration and native proof.

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
