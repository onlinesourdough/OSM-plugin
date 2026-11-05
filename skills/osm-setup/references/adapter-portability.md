# Adapter portability and package lifecycle

Read only when moving between supported harnesses, updating, rolling back or
uninstalling the package. Apply the shared [native adapter boundary](adapters.md).

OSM portability means that the same shared `skills/` source can be used through
each harness's native entrypoint. File context can reuse its physical owner
home; Notion context reuses the approved guide URL and verifies access separately
in each client, without copying a local owner mirror. Personal Notion skills
use the [Notion lifecycle](../../osm-manage-skills/references/notion-skills.md).
Thin Codex, Claude/Copilot, Cursor, Gemini and Pi metadata all use
the same skills. Install separately in each chosen harness; no cross-install
hook or shared configuration writer runs. Native discovery and model behavior
need separate evidence in each client. Documentation compatibility is not a
tested installation claim.

When work crosses harnesses, hand off the accepted outcome, bounded relevant
context, exact Project/System root, one-writer and action authority, evidence,
remaining decisions and any improvement signal (or an honest none). The
receiving harness resolves its own entrypoint, permissions, trust and runtime
capabilities before acting. No universal loader, duplicated method body,
background bridge or hidden permission grant is part of OSM.

For update, inspect the selected source and its declared owner-data compatibility;
native package installation/removal does not read or migrate a home. Pin the active task's method version; defer updates until a
task boundary. Use native package update/reinstall targeting the reviewed ref,
then a new task and checks. Product rollback selects the previous reviewed
package; it does not roll back owner data. Native uninstall removes the selected package registration; it leaves owner
data, other harness installs and any separately configured bridge intact.
Remove that bridge only under explicit cleanup scope, and only its unchanged
managed block. Preserve a modified block and show the scoped removal diff.

Sources checked 2026-09-05: [Codex instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
[plugin packaging](https://developers.openai.com/plugins/build/plugins),
[Pi packages](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md),
[Pi skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md).
Local CLI help and installed Pi docs informed the commands. Documentation
support is not proof of successful installation in another environment.
