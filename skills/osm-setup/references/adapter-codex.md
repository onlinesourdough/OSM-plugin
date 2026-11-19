# Codex package and bridge

For authorized Codex installation, registration or bridge repair, apply the
[adapter boundary](adapters.md). Read [configuration](harness-codex.md) only for
settings/precedence beyond the bridge, or [desktop acceptance](adapter-codex-desktop.md)
when workspace or New Chat behavior matters.
Normal Codex setup also runs [checklist and goal acceptance](codex-tracking-acceptance.md).
On package update/repair, reuse its dated evidence unless runtime/version or
capability evidence changed, is missing or uncertain; do not repeat global setup.

Install through Codex's UI or CLI using the repository marketplace. Use main
for a tracking install or the requested reviewed immutable ref for a fixed
version; never substitute a branch for that ref.

`.codex-plugin/plugin.json` declares the shared skills, native Setup entry and
optional OSM Notion adapter. Notion stays a separate official plugin; Codex owns its
authentication and connection UI. Setup verifies selected-home access. OSM
ships no Notion app binding or auth wrapper. Its optional internal-connection
adapter is separate from the official plugin.
`.agents/plugins/marketplace.json` points to this same package root. For an authorized local pilot, substitute the
verified repository path:

```sh
codex plugin marketplace add /absolute/path/to/OSM-plugin
codex plugin add osm@online-sourdough
```

For the public release repository, the account can instead add
`onlinesourdough/OSM-plugin --ref REVIEWED_REF` as the marketplace source, then
install the same selector. A reviewed immutable commit/tag must exist first.
Read installed marketplace identity before reusing a conflicting name. Do not
create a personal marketplace for this repo distribution. Start a fresh task
and verify the declared package skills are discoverable once. Use the
[identity migration](migration.md) before replacing an older Method selector or
legacy/global registration; a matching skill name does not establish ownership.
To replace `aios@online-sourdough`, follow its
[switch procedure](migration.md#switch-from-aios-to-osm): disable `aios` by
writing only `plugins."aios@online-sourdough".enabled = false` through Codex's
version-checked `config/value/write` API before the fresh task, and write
`true` to restore it. Do not edit `config.toml` or caches directly.

Only for an authorized personal default-home change, use ~/.codex/AGENTS.md
(respect configured CODEX_HOME). Client setup follows the shared scope rule.
Inspect AGENTS.override.md: it can shadow the normal
file. Preserve it and unrelated AGENTS instructions; do not delete or overwrite
an override to make discovery pass. Under setup authority, propose/apply the
same small managed block in the effective file, documenting the exception.
If precedence or conflicting instructions cannot be safely resolved, report
the exact blocker instead of claiming setup passed. Personalization and its
backing instructions are one surface, not two independent policies.
