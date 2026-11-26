# OSM MCP Server

OSM ships one reviewed method from GitHub (`skills/` and `docs/osm.md`) through two complementary channels:

1. **Native plugins** (`.codex-plugin`, `.claude-plugin`, `.cursor-plugin`, `gemini-extension.json`, Pi) for apps with native plugin and `SKILL.md` discovery.
2. **A minimal, public OSM MCP server** ([`apps/mcp/`](../apps/mcp/README.md)) for MCP-capable apps without that plugin format (such as OpenBot, Grok Bot or custom MCP clients).

## Privacy and trust boundary

- **Zero login and zero authentication.** You never sign in to OSM MCP, and HTTP requests carrying `Authorization` or `Cookie` headers are rejected.
- **Zero user data and zero logging.** The server is stateless and read-only; it serves only the public, open-source OSM method text compiled from the reviewed repository release.
- **Separate from your Notion workspace.** OSM MCP never receives Notion tokens or customer context. Your official Notion MCP remains a separate connection that owns access to your AI operating model.
- **Verifiable bytes.** Every file and the full bundle carry SHA-256 digests (`osm_version`), and versioned endpoints (`/vX.Y.Z/mcp`) refuse mismatched versions instead of silently serving different instructions.

## Tools

- `osm_get_setup_guide` — fetches `osm-setup` and the short host bridge template.
- `osm_list_skills` — returns the compact 8-skill index (keeps context small).
- `osm_get_skill` — fetches one skill's full `SKILL.md` and reference paths.
- `osm_get_reference` — fetches one bundled reference or `docs/osm.md` by exact path.
- `osm_version` — returns package version, release URL, bundle SHA-256 and privacy policy.

## Running and hosting

- **Offline local stdio:** `node apps/mcp/stdio.mjs` (zero dependencies, Node.js 22+).
- **Local Streamable HTTP:** `node apps/mcp/http.mjs` (serves `/mcp`, `/v<version>/mcp`, `/health`).
- **Cloudflare Workers (free tier):** `apps/mcp/worker.mjs` + `apps/mcp/wrangler.jsonc` are ready to deploy as a public read-only mirror (no secrets, no database, observability logs off). No hosted public URL is claimed live until deployed and verified.
