# Codex configuration and instructions

Use for relevant Codex base settings and instruction precedence. Apply the
shared [configuration procedure](harness-configuration.md). Optional context,
memory and computer capabilities use their separate routes from that index.

Resolve `CODEX_HOME` when configured; otherwise use `~/.codex/config.toml`.
Inspect the active profile, command-line overrides, trusted project config and
app/session selections before assuming that file controls the current run.
Managed policy may restrict user choices. Check effective global/local AGENTS.md
and AGENTS.override.md separately from config; preserve existing instruction
precedence. Use the current [config basics](https://learn.chatgpt.com/docs/config-file/config-basic)
for the running client's loading order, rather than hard-coding one order for
all versions. Existing profiles and provider definitions are not OSM assets.

| Area | Inspect and preserve | Change/verification boundary |
| --- | --- | --- |
| Command approvals | `approval_policy` and active approval profile/overrides | `never` changes prompting, not business authorization or OS permission. Reproduce it only when the user's chosen baseline calls for it. |
| Filesystem/network access | `sandbox_mode` or the version's supported permission-profile mechanism | `danger-full-access` is an explicit unrestricted choice, never an onboarding default. Do not mix incompatible mechanisms or bypass managed constraints. Verify actual access to the chosen home. |
| Models/providers | Effective model, provider, reasoning/profile and existing nonsecret definitions | Preserve unless the owner requests a default change; then use [model advice](../../osm/references/model-advice.md). Do not install a provider, migrate credentials or pin a personal choice in OSM. |

Check key support and allowed values against the current
[configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
and local help. Do not convert one client's access settings into another
client's unrelated always-allow controls. Technical access never grants a send,
publish, payment or broader destination authorization.

## Native task-list exposure

For normal Codex setup acceptance or changed tracking capability evidence, use
[checklist and goal acceptance](codex-tracking-acceptance.md). It owns version/
schema/help checks, authorized default-off repair and actual runtime evidence;
configuration readback alone does not establish tool availability or visible UI.
