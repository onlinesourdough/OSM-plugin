# OSM MCP Server (`apps/mcp`)

A minimal, open-source, zero-dependency **Model Context Protocol (MCP)** server that exposes the reviewed Onlinesourdough Method (`skills/` and `docs/osm.md`) over **Streamable HTTP** (Cloudflare Workers or local Node) and **stdio** (offline local Node).

## Why this exists (hybrid distribution)

OSM uses the same hybrid model proven by Notion:

- **Plugin-capable apps** (Codex, Claude Code, Cursor, Gemini CLI, Copilot CLI, Pi) keep the official native OSM plugin from GitHub for native auto-triggering and offline `SKILL.md` discovery.
- **MCP-capable apps without that plugin format** (OpenBot, Grok Bot, custom MCP clients) connect once to the public OSM MCP server (`https://mcp.onlinesourdough.com/mcp`, or pinned `/v0.39.0/mcp`) and receive the exact same reviewed GitHub release — no manual ZIP repackaging, no stale local copies.
- **Keep the short host instructions as your backbone:** Because MCP-only apps do not store local `SKILL.md` files, put the six-line host bridge (from `osm_get_setup_guide`) in the app's persistent instructions or standing memory, alongside your separate official Notion MCP connection.

## Public hosted endpoint

- Latest release: `https://mcp.onlinesourdough.com/mcp`
- Pinned release: `https://mcp.onlinesourdough.com/v0.39.0/mcp`
- Health and bundle checksum: `https://mcp.onlinesourdough.com/health`

## Privacy and security guarantee

- **No login, no authentication, no accounts.** HTTP requests carrying `Authorization` or `Cookie` headers are explicitly rejected with `400`.
- **No user data, no request logging, no tracking.** Worker observability logging is disabled; the server is 100% stateless and read-only.
- **Method-only.** This server never touches Notion or customer workspaces. Your official Notion MCP stays separate and owns your AI operating model.
- **Reproducible from GitHub.** `node apps/mcp/build.mjs` compiles `skills/` and `docs/osm.md` into `bundle.generated.mjs` with per-file SHA-256 checksums and an overall bundle SHA-256 digest. Pinned version routes (`/vX.Y.Z/mcp`) reject mismatched versions with `404`.

## Exposed MCP tools

| Tool | Purpose |
| --- | --- |
| `osm_get_setup_guide` | Returns `osm-setup/SKILL.md` and the short host bridge template |
| `osm_list_skills` | Compact index of all 8 discoverable skills (name, description, version, SHA-256) and 4 reference folders |
| `osm_get_skill` | Full `SKILL.md` and supporting reference list for one skill by exact name |
| `osm_get_reference` | Exact content and SHA-256 of one bundled reference file or `docs/osm.md` |
| `osm_version` | Package version, GitHub release URL, bundle SHA-256, and privacy guarantee |

Clients that support MCP Resources or Prompts can also read `osm://overview`, `osm://skill/<name>`, `osm://ref/<path>`, and the `osm-setup` prompt.

## Build, test and run locally

Requires Node.js 22 or later (zero npm dependencies):

```sh
node apps/mcp/build.mjs
node --test apps/mcp/mcp.test.mjs
```

Run locally over stdio (offline):

```sh
node apps/mcp/stdio.mjs
```

Run locally over Streamable HTTP:

```sh
node apps/mcp/http.mjs
# POST http://127.0.0.1:8787/mcp
# POST http://127.0.0.1:8787/v0.39.0/mcp
# GET  http://127.0.0.1:8787/health
```

## Deploy to Cloudflare Workers (optional public mirror)

`apps/mcp/wrangler.jsonc` deploys the exact same stateless worker on Cloudflare's free tier (no KV, no Durable Objects, no secrets):

```sh
npx wrangler deploy --config apps/mcp/wrangler.jsonc
```
