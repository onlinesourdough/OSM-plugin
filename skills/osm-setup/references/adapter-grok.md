# Grok Bot

Use the [native adapter boundary](adapters.md) for an authorized install or
pointer change in Grok Bot. The package has one canonical `skills/` source.
Grok Bot installs that source as a Cursor-format plugin and reads each
`SKILL.md` (YAML frontmatter `name` and `description`, then the markdown
body). OSM adds no second skill tree, loader, hook, executable extension or
MCP server. Package registration creates no owner home. Preserve existing
skills, settings and owner data.

Grok Bot is a personal-assistant layer: day-to-day overview, intake, writing,
reminders and coordination. Those tasks do not require a coding repository.
When a task is clearly inside an independent project, that project's own
instructions still apply. Other assistant work uses the selected Notion home.

## Manifest

`.cursor-plugin/plugin.json` is the Cursor-format manifest Grok Bot's plugin
catalog installs. Its `skills` field is `./skills`. That file is sufficient.
This repository adds no Grok-specific manifest, root `plugin.json` or
marketplace file. Grok Bot's catalog is the host's own listing. It is separate
from the Codex marketplace and from a Cursor Teams or Enterprise import. See
[Cursor plugins](https://cursor.com/docs/plugins).

Install OSM from the Grok Bot plugin catalog, then read back the installed
version and the seven skill names. This repository has not executed that
catalog install. Do not invent a CLI install command.

## Tools

Use the host's built-in tools first: the Notion connector (official Notion
MCP), Slack, GitHub, the Linux shell and the browser. Verify a scoped read of
the intended root. A connector badge is not readiness. Leave the optional
Codex macOS Keychain adapter (`.codex-plugin/mcp.json`, `runtime/notion`)
unselected. Grok Bot cannot run hooks, so do not add a `hooks` directory or a
session hook to load the pointer.

A routine is a scheduled prompt. It can call
[Dreaming](../../osm-dreaming/SKILL.md) when the owner explicitly requests a
schedule. The routine prompt is the mandate. The skill does not create the
routine. A subagent is a native worker for
[Council](../../osm-council/SKILL.md). The lead keeps the result, decisions,
Prime and Log.

## Context pointer

Grok Bot has no `AGENTS.md` or `CLAUDE.md`. For an authorized home adoption,
save the shared [context pointer](../../osm-data-context/assets/bridge.md) as
one durable memory fact: a standing instruction the assistant stores itself.
Fill `Data and Context:` with the verified Notion root URL. Keep the
`<!-- AIOS:BEGIN -->` and `<!-- AIOS:END -->` markers. They are compatibility
keys. When the root moves, update that same fact. Keep a single fact, keep
the markers, and point `Data and Context:` at the owner's private root.

The fact holds no company data and grants no access. Report it loaded only
after a fresh session recalls it. Recalled text in the setup session alone
is unverified.

## Maintenance

Refresh or remove OSM through the plugin catalog. Removal leaves the Notion
home and the memory fact in place. Edit or remove that fact only under
explicit cleanup, and only while it still matches the managed pointer.
Catalog discovery and model behavior remain separate from this document.
