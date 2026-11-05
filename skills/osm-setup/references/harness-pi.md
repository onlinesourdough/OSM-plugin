# Pi settings and registrations

Use for relevant Pi base settings, instruction precedence and package/skill
registrations after the shared [configuration procedure](harness-configuration.md).
Package and bridge installation remain in the separately selected Pi adapter;
do not recurse between the two routes.

Resolve `PI_CODING_AGENT_DIR` or the native default `~/.pi/agent`. Inspect global
settings.json, applicable trusted `.pi/settings.json`, launch flags and loaded
AGENTS/override files. Preserve `defaultProvider`, `defaultModel`,
`defaultThinkingLevel`, existing packages, resource selections and custom
fields. Do not translate Codex sandbox/approval keys into Pi. Pi project trust
is a different control; changing `defaultProjectTrust` to always or approving
an entire parent tree must be an explicit owner choice, not a hidden setup step.
Use [Pi settings](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/settings.md)
and installed help for supported settings and native controls. Never read or
export auth stores to prove provider configuration.

Inventory enabled package/skill registrations before adding OSM or owner
skills: old AIOS/OSM paths, duplicate local/Git OSM installs, stale symlinks,
global skill paths and project-local registrations can conflict. Classify which
entry owns each discovered skill. Under setup authority, replace only the
verified obsolete AIOS/legacy registration, preserving original bodies,
nonreserved owner methods and unrelated packages. Unknown collisions require a
decision. Re-read the effective skill list after restart: the declared OSM names
once, owner methods once, supported links intact. OSM adds no global discovery
filter. Preserve ambient and trusted repository-local skills, existing explicit
resource choices and separately selected owner-method registrations. Use the [identity migration](migration.md)
only when that collision is present.
