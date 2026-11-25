# Codex integration

Setup runs in the conversation. The former private dashboard, pickers,
Settings drawer and record reader are retired. The public method guide is
separate from the owner's private Data & Context home.

## Home

The sidebar entry opens a reading view of the public OSM guide.
It does not select a private home or configure connections. Notion's normal
website refuses third-party iframe embedding; respect that restriction and
the host's built-in workspace preference. The reader renders a checked public
export, including the architecture diagram, inside an MCP App. On opening it
checks the fixed public GitHub export URL; an unavailable update uses the bundled
copy. It loads no private context, account token or connection settings. Links
within the exported guide stay in the reader; other links can be copied without
opening another app. It is a guide reader, not the full Notion editor.
Native viewer qualification is
recorded in [verification](verification.md), separately from a declaration.

## Setup

Install OSM, open a fresh conversation and use **Set up** or ask for OSM Setup.
Setup checks the separate official Notion plugin, the intended account and
a useful read of the selected page. A dedicated connection is optional when
selected-page access is needed. See [Notion access](../skills/osm-setup/references/panel.md).

## Optional scoped Notion adapter

The source is `apps/notion`; the reproducible bundle is `runtime/notion/server.cjs`.
Codex starts the stdio process with Node.js 22+. Consumers install no build dependencies.

| Tool | Purpose |
| --- | --- |
| `osm_sources` | Read saved settings and revisions |
| `osm_save_sources` | Save verified navigation metadata |
| `osm_connection` | Check the selected internal connection |
| `osm_context_home` | Read the selected root or bootstrap its mapping |
| `osm_context_list` | List one mapped section |
| `osm_context_read` | Read a mapped record |
| `osm_save_home_projection` | Save the definition's derived mapping |
| `osm_save_connection_route` | Save the selected context's Keychain opt-in |

The scoped adapter has no dashboard or app-only tools. The separate
`osm_guide` app-only tool serves the public reader. Home projection is the
compatibility name of a derived mapping, not a user interface.
Content remains at its source. The adapter writes no remote Notion content
and borrows no other plugin's credentials. The official Notion plugin works
without this mapping.

## Recovery

Use native controls to refresh or roll back an exact package version. Check
Node.js, declared runtime and discovery before changing authentication.
Close and reopen an existing OSM sidebar view after updating. Its open document
can retain the earlier dashboard while the installed server already provides
the new public guide. If reopening does not refresh it, finish active work and
restart Codex; do not reconnect Notion to repair a stale document.
Optional adapter state uses the brand-neutral `context-state/` directory (ordinary official Notion setups need no local state), while earlier `aios/panel/` or `osm/panel/` files and `AIOS:BEGIN` bridge blocks remain readable automatically.
Correct source routes in the definition, then let Setup regenerate the mapping.
Preserve IDs, revision-checked backups and later owner edits.
See [connection limits](home-connection.md) and [recovery](recovery.md).
