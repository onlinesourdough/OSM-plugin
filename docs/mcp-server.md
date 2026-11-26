# OSM MCP Server

OSM ships one reviewed method from GitHub (`skills/` and `docs/osm.md`) through two complementary channels, always paired with your separate official Notion connection:

| Option | What it provides | When to use it |
| --- | --- | --- |
| **Native plugin** (`.codex-plugin`, `.claude-plugin`, `.cursor-plugin`, `gemini-extension.json`, Pi) | Local `SKILL.md` files, native pickers/slash commands and offline discovery | **Best default** for apps with native plugin support (Codex, Claude Code, Pi, Gemini CLI, Copilot CLI, Cursor). |
| **Public OSM MCP server** (`https://mcp.onlinesourdough.com/mcp`) | Live read-only access to the exact same reviewed GitHub release over MCP, with zero login and no manual ZIP repackaging | **Best fit** for MCP-capable apps without those native plugin formats (such as OpenBot, Grok Bot or custom MCP clients). |
| **Official Notion MCP / connector** (separate) | Authorized read/write access to your private Notion workspace and `AI operating model` | **Always separate.** OSM MCP only serves the public method; your official Notion connection owns your private context. |

## Live endpoint and version pinning

- **Latest reviewed release:** `https://mcp.onlinesourdough.com/mcp`
- **Pinned release:** `https://mcp.onlinesourdough.com/v0.39.1/mcp` (refuses mismatched versions with `404` instead of silently serving different instructions)
- **Health and checksum:** `https://mcp.onlinesourdough.com/health`

## Backbone on MCP-only apps (OpenBot, Grok Bot and similar)

Because MCP-only apps do not install local `SKILL.md` files, they still need a lightweight backbone telling the agent to use OSM and where your Notion home lives:

1. Connect the public OSM MCP server (`https://mcp.onlinesourdough.com/mcp`) — no account or API key required.
2. Connect your official Notion MCP / connector separately.
3. Put the same six-line short host instructions (returned by `osm_get_setup_guide` and kept in [`skills/osm-data-context/assets/bridge.md`](../skills/osm-data-context/assets/bridge.md)) in the app's persistent instructions or standing memory (for example OpenBot agent instructions / `AGENTS.md` or Grok Bot persistent instructions), pointing `Data and Context:` to your verified Notion `AI operating model` URL.

That way the agent loads OSM Prime, Setup, Log, Dreaming, Human Writing, Unslop, Interview or Council on demand from OSM MCP and reads/updates your private context through your own official Notion connection.

## Privacy and trust boundary

- **Zero login and zero authentication.** You never sign in to OSM MCP, and HTTP requests carrying `Authorization` or `Cookie` headers are rejected with `400`.
- **Zero user data and zero logging.** The server is stateless and read-only; it serves only the public, open-source OSM method text compiled from the reviewed repository release.
- **Separate from your Notion workspace.** OSM MCP never receives Notion tokens or customer context. Your official Notion MCP remains a separate connection that owns access to your AI operating model.
- **Verifiable bytes.** Every file and the full bundle carry SHA-256 digests (`osm_version`), and versioned endpoints (`/vX.Y.Z/mcp`) refuse mismatched versions instead of silently serving different instructions.

## Tools

- `osm_get_setup_guide` — fetches `osm-setup` and the short host bridge template.
- `osm_list_skills` — returns the compact 8-skill index (keeps context small).
- `osm_get_skill` — fetches one skill's full `SKILL.md` and reference paths.
- `osm_get_reference` — fetches one bundled reference or `docs/osm.md` by exact path.
- `osm_version` — returns package version, release URL, bundle SHA-256 and privacy policy.

## Running offline or self-hosting

- **Offline local stdio:** `node apps/mcp/stdio.mjs` (zero dependencies, Node.js 22+).
- **Local Streamable HTTP:** `node apps/mcp/http.mjs` (serves `/mcp`, `/v<version>/mcp`, `/health`).
- **Cloudflare Workers (free tier):** `apps/mcp/worker.mjs` + `apps/mcp/wrangler.jsonc` deploy the exact same stateless read-only worker (no secrets, no database, observability logs off). See [`apps/mcp/README.md`](../apps/mcp/README.md).
