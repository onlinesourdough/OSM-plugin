# Claude Code package and Copilot CLI compatibility

Use for authorized installation in the chosen harness. Installing the method
and onboarding the user's context are separate operations. Preserve existing
skills, settings, permissions and account configuration. Apply the shared
[adapter boundary](adapters.md) and [package lifecycle](adapter-portability.md)
to that harness only.

## Package and discovery

The repository's `.claude-plugin/plugin.json` declares the OSM package identity and points to
`./skills/`. Its marketplace is `online-sourdough`, with one plugin, `osm`,
whose source is `./` relative to the repository root. The root `skills/` is the
only canonical instruction payload: the declared skills with their supporting resources.
`.claude-plugin/` holds metadata only. No wrappers, symlinks, hooks, MCP servers,
agents, background processes, settings overrides or installation scripts are
part of this adapter. Harness-managed cache copies are installation artifacts.

These identifiers serve different purposes:

| Identifier | Meaning |
| --- | --- |
| `osm@online-sourdough` | Marketplace plugin installation identity |
| `skills/osm-setup/SKILL.md` | Portable source path; sibling Markdown links remain relative to this payload |
| `osm-setup` | Portable skill name in frontmatter |
| `/osm:osm-setup` | Claude Code's plugin-qualified invocation |
| `/osm:osm-human-writing` | Another Claude invocation; the plugin prefix applies to every skill |

Resolve portable method names through the chosen harness's actual discovery.
Claude's slash-command namespace does not rename the files or require rewritten
relative links. A plain `/osm-setup` is not the promised Claude plugin entrypoint.
Source files or a successful plugin listing alone do not prove that
all declared skills are available in a session. Inspect component inventory and fresh
session discovery; skill descriptions enable selection, while bodies and
supporting references are loaded as needed. Discovery does not prove successful
method execution. See [Claude skills](https://code.claude.com/docs/en/skills) and
[plugin reference](https://code.claude.com/docs/en/plugins-reference).

## Install in Claude Code

For a reviewed source containing these manifests, use the
repository marketplace or a local checkout of that release. Existing private
repository access must work through the user's normal Git setup; never collect
tokens, copy credentials or change authentication to make installation work.
Inspect `claude plugin marketplace list` and `claude plugin list --json` first.
Reuse a matching registration. If `online-sourdough` points elsewhere, resolve
that source conflict without replacing unrelated marketplace entries.

```sh
claude plugin marketplace add onlinesourdough/OSM-plugin
claude plugin install osm@online-sourdough --scope user
claude plugin list --json
claude plugin details osm@online-sourdough
```

For a reviewed local checkout, replace only the first command with
`claude plugin marketplace add /absolute/path/to/OSM-plugin`. Use one source.
The GitHub shorthand follows the repository's default branch; it is not a
release pin. For exact release selection, use a checkout at the reviewed ref
and verify the installed version. A raw URL to `marketplace.json` cannot resolve
the relative `./` payload. Native `project` or `local` scopes are alternatives
when those are the chosen installation scope. Restart Claude Code after changes
and check the namespaced skills. Installation is confined to Claude Code.
See [marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) and
[installation scopes](https://code.claude.com/docs/en/plugins-reference#plugin-installation-scopes).

For a subsequent authorized update at a task boundary:

```sh
claude plugin marketplace update online-sourdough
claude plugin update osm@online-sourdough --scope user
claude plugin list --json
claude plugin details osm@online-sourdough
```

With a local source, first select the reviewed checkout. Keep package versions
increasing for new releases; a successful no-change update is not evidence of
a version transition. Rollback uses the previous reviewed source and native
uninstall/reinstall, followed by version and discovery readback. To uninstall:

```sh
claude plugin uninstall osm@online-sourdough --scope user
claude plugin list --json
```

To replace `aios@online-sourdough`, follow the
[switch procedure](migration.md#switch-from-aios-to-osm). Disable the old
package before the restart and fresh-session check, and keep it restorable:

```sh
claude plugin disable aios@online-sourdough --scope user
claude plugin enable aios@online-sourdough --scope user   # rollback only
```

Use the original scope for lifecycle commands. Remove the marketplace with
`claude plugin marketplace remove online-sourdough` only when that registration
is no longer needed. Preserve user context and unrelated settings. Bridge
removal, if separately requested, follows the shared adapter's owned-block rule.

## GitHub Copilot CLI

GitHub documents `.claude-plugin/plugin.json` and
`.claude-plugin/marketplace.json` as supported legacy plugin locations and
supports the `skills` directory field. These manifests provide a documented
compatible route without another instruction copy. OSM ships no competing root
manifest. The marketplace remains
`.claude-plugin/marketplace.json`. Only install in Copilot CLI when it is the
chosen harness:

```sh
copilot plugin marketplace add onlinesourdough/OSM-plugin
copilot plugin install osm@online-sourdough
copilot plugin list
```

The local marketplace alternative is
`copilot plugin marketplace add /absolute/path/to/OSM-plugin`. Inspect existing
registrations first as above. Use `copilot plugin marketplace update online-sourdough`,
then `copilot plugin update osm@online-sourdough` for the selected Git source;
local directory-source plugins load live in a fresh session. Uninstall with
`copilot plugin uninstall osm@online-sourdough`, then read back the list.

Copilot documents skill deduplication by frontmatter name, with project and
personal skills preceding plugin skills. Do not assume Claude's `/osm:...`
invocations apply there. Inspect Copilot's actual skill discovery and report
collisions; do not disable or override other skills to make OSM win. Native
Copilot installation and session discovery have not been rehearsed by this
adapter's Claude-only check. See the official
[Copilot CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference).

## Context setup

After method installation, the user can ask in ordinary language to set up OSM
for their work; `/osm:osm-setup` is Claude's explicit entrypoint. Continue the
shared [setup method](../SKILL.md), which selects Interview only when needed,
existing-home discovery, supported format checks and first useful task. Installing
this plugin creates no owner home, personal bridge or hidden agent and grants no
additional access. Keep owner data outside the plugin cache.

For an authorized Claude personal default-home change, the native user instruction
entrypoint is `~/.claude/CLAUDE.md`, under `CLAUDE_CONFIG_DIR` when configured.
Use the shared adapter's small bridge procedure and preserve existing content.
This package does not install it automatically. For Copilot, resolve its native
instruction entrypoint before any context write; Claude packaging compatibility
does not prove a Claude instruction bridge is discovered there. Never apply
another harness's skill exclusions or configuration changes during this setup.
See [Claude's configuration directory](https://code.claude.com/docs/en/claude-directory)
and [settings](https://code.claude.com/docs/en/settings).

Project instruction loading is version-gated; this was checked on 2026-10-27
against [Claude Code memory](https://code.claude.com/docs/en/memory). From
v2.1.277 the default, `claude-md-or-agents-md`, reads a project `AGENTS.md` only
when no `CLAUDE.md`, `.claude/CLAUDE.md` or `CLAUDE.local.md` exists in the
working directory or above; `~/.claude/CLAUDE.md`, a managed `CLAUDE.md` and
`.claude/rules` do not count and load alongside it. With both formats present,
only the `CLAUDE.md` files load unless one imports `@AGENTS.md` (a kept import is
never read twice) or Project instructions is `claude-md-and-agents-md`, honoured
only in user settings, a `--settings` file or managed settings (plugin ID
`cc-plugin-agents-md@builtin` from v2.1.285, `agents-md@builtin` before). Before
v2.1.277, with the built-in plugin disabled, in some first sessions after an
upgrade and, before v2.1.281, in some sessions such as Bedrock or telemetry
disabled, only `CLAUDE.md` loads; use an `@AGENTS.md` import there.
`AGENTS.local.md`, `AGENTS.override.md` and `.agents/` are never read.

Keep one shared `AGENTS.md`. Add an `@AGENTS.md` import only where a `CLAUDE.md`
must also exist or direct support is unavailable; never copy its content, print
it from a SessionStart hook or tell Claude in words to read it. Call a bridge
loaded only with the client and version, the instruction files present, the
Project instructions value and where it was set, and an observed load in a fresh
session (the `AGENTS.md loaded` session line, or `/memory` from v2.1.280);
otherwise report it unverified. Instruction loading proves no credential, access,
permission, ingestion or timed run.

## Author verification and evidence limits

Official sources above were checked on 2026-09-13. Installed Claude Code 2.1.139
exposes `plugin validate`, `list --json`, `details`, marketplace controls and
scoped install/update/uninstall. Check local help when versions differ; current
documentation includes features newer than this CLI.

Run `python3 tests/native-claude-rehearsal.py` from the author repository for
native schema validation, rejection of an invalid component type, and the
skill inventory check. Its read-only
`claude --setting-sources user --plugin-dir /absolute/path/to/OSM-plugin plugin details osm`
also verifies inline discovery against the current manifest: `osm@inline`, the
selected version and skill inventory,
0 agents, 0 hooks and 0 MCP servers. The inventory prints short component names;
that display does not establish unqualified slash invocations. This uses
temporary state, launches no model session and does not install anything.
The test is excluded from the product payload.

The optional `python3 tests/native-claude-rehearsal.py --install-lifecycle`
creates a unique retained fixture beneath
`../portability-research/claude-fixture`. It rehearses local marketplace add,
install/list/details, cached skill byte comparison, a fixture-only version
update, uninstall and preservation of an unrelated fixture skill and setting.
It copies only the public method payload and native manifests into the fixture.
Its command output and retained state are author evidence, not product assets.
Review private paths before sharing logs. The fixture tests a local source;
it does not prove GitHub invitation/access, release availability or model behavior.

Isolation is documented through
[`CLAUDE_CONFIG_DIR`](https://code.claude.com/docs/en/env-vars), which redirects
settings, history and plugins, including the directory-specific credential store
described in [authentication](https://code.claude.com/docs/en/authentication).
The check preserves `HOME`, passes no credential/provider environment variables,
runs with only its isolated user settings (`--setting-sources user`), and disables
nonessential traffic and CLI auto-update only within the test process.
It does not read or copy real config
or credentials. Managed machine policy still applies.

The lead completed the isolated local-source lifecycle on Claude Code 2.1.139:
installation, 22-skill inventory, cached byte equality, a fixture-only version
transition, uninstall and preservation of the sentinel skill/setting passed.
No model execution or live GitHub installation is claimed by this fixture.
