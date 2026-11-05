# Native installation

OSM packages the same shared skills for several agent apps. The installed
manifest and overview identify its version and declared skill inventory.
Install through the selected app's package manager. No OSM installer program
runs, and no other app is configured as a side effect. Owner setup is a separate
conversation.

The [README](../README.md) contains the normal installation commands. They track
the repository's default branch. The repository is public and uses the MIT
license; no GitHub invitation is required. These commands install the package
without changing repository visibility.

## Choose a source and scope

Use one OSM source per app. Read the existing registration before adding one.
Preserve unrelated plugins, personal skills, settings and instruction files.
If the marketplace name already points elsewhere, resolve that conflict rather
than replacing it. A matching skill name alone does not establish ownership.

For a fixed version, replace `REVIEWED_REF` with an existing reviewed tag or
immutable commit. Do not use a version number as though its Git tag exists.

```sh
codex plugin marketplace add onlinesourdough/OSM-plugin --ref REVIEWED_REF
codex plugin add osm@online-sourdough
```

```sh
pi install git:github.com/onlinesourdough/OSM-plugin@REVIEWED_REF
```

```sh
gemini extensions install https://github.com/onlinesourdough/OSM-plugin --ref REVIEWED_REF
```

Claude Code can install from a local checkout at the selected ref:

```sh
claude plugin marketplace add /absolute/path/to/reviewed/OSM-plugin
claude plugin install osm@online-sourdough --scope user
```

Codex and Claude use `osm@online-sourdough` as their installation identity.
Claude's explicit skill calls are namespaced, such as `/osm:osm-human-writing`.
Other apps may expose names differently; use their actual discovery rather
than rewriting the canonical skill files. Native project/local scopes are
available in some apps; use the same scope for later updates and removal.

## Update, rollback and removal

Moving from `aios@online-sourdough` (0.29.x or earlier) to `osm` is a new
selector, not an update. Install and read back `osm`, then disable `aios`
through the app's supported control before fresh-session acceptance: Claude
Code `claude plugin disable aios@online-sourdough --scope user`; Codex, only
`plugins."aios@online-sourdough".enabled = false` through its version-checked
`config/value/write` API, never a wholesale config or cache edit. Retire `aios` after acceptance when
nothing depends on it; on failure, disable `osm` and re-enable `aios`. See the
[switch procedure](../skills/osm-setup/references/migration.md#switch-from-aios-to-osm).

Finish the active task before updating its methods. For a Codex marketplace
that follows a branch:

```sh
codex plugin marketplace upgrade online-sourdough
codex plugin add osm@online-sourdough
codex plugin list --marketplace online-sourdough --json
```

A pinned Codex marketplace continues to follow its configured ref. To change
that ref, record its old source for recovery, remove only that marketplace
registration and add the same source with the new reviewed ref. Then install
its OSM entry and verify the version. The installed plugin remains separate
from marketplace registration. Do not remove unrelated marketplaces or edit
Codex's cache or configuration database.

Pi can replace a pin through another native `pi install` of the same repository
at the new ref. Use `pi list` to verify the exact registered source. For an
unpinned source, `pi update --extension SOURCE` updates only that package;
`pi update --extensions` updates all packages and is not the OSM-only command.

Claude updates its marketplace and then the plugin at the original scope.
Gemini and Copilot have native named-package update commands. Cursor manages
plugins in Customize and refreshes imported sources through its marketplace.
The [README maintenance table](../README.md#update-or-remove) lists these controls.
Local sources and pinned sources have different native update semantics;
an “already up to date” response is not proof of a version change.

Rollback selects the previous reviewed package through the same native controls.
It does not restore owner data. After update or rollback, start a fresh session
and verify the installed version, source and declared skills.

For a released version, select an existing tag from GitHub Releases and verify
the installed manifest against that release. A fixed pin does not advance when
upstream publishes a newer release. A tracking registration still needs the
app's native update to adopt it; OSM adds no updater or background sync.
Some apps refresh discovery between turns or provide reload controls, but an
update cannot erase instructions already read into a conversation. Do not
promise immediate adoption by every active session or another installed app.

Refreshing/updating the package obtains the new files. A fresh conversation
then starts with the current installed methods; starting a new chat alone does
not update the package. If the desktop still reports the previous installed
version after a verified update, use its supported reload/restart and recheck
discovery; do not edit its cache or internal state.

Native uninstall removes the selected package registration. It leaves the owner
home, other apps and separately configured bridges intact. Some clients retain
old caches. Explicit bridge cleanup uses only its unchanged managed block;
custom changes need their own scoped diff. Never delete an owner home to remove
the plugin.

## What the package contains

| File | Native role |
| --- | --- |
| `docs/osm.md` | Version-matched local overview, selected through the OSM documentation route |
| `.codex-plugin/plugin.json` | Codex identity, interface and native Setup skill |
| `.app.json` | Optional official Notion connection managed by Codex |
| `.agents/plugins/marketplace.json` | Codex repository marketplace |
| `.claude-plugin/plugin.json` and `marketplace.json` | Claude Code and Copilot-compatible plugin distribution |
| `.cursor-plugin/plugin.json` | Cursor-format compatibility metadata |
| `gemini-extension.json` | Gemini CLI extension identity |
| `package.json` | Pi package with only `pi.skills` |

Every native declaration selects the same `skills/` source. Codex uses its
supported compatibility manifest because 0.160.1 skips app bindings when a
portable root manifest takes precedence. The package therefore omits that root
manifest. Claude/Copilot, Cursor, Gemini and Pi retain their native metadata.
The optional Notion app is a connection declaration, not an installed runtime
dependency. There are no executable extensions, hooks, settings payloads or
duplicated instruction bodies. See [onboarding evidence](issue-38-onboarding.md).

From 0.21.0, Codex also loads the explicitly declared local sidebar MCP from
`.codex-plugin/mcp.json`. Node.js 22+ must be on the execution host's PATH;
connection checks use its signed-in Codex CLI. The panel has no hosted service
or consumer dependency-install step. Other client manifests still expose skills
only. See [sidebar setup and recovery](sidebar.md).

[Data & Context](../skills/osm-data-context/SKILL.md) resolves the chosen home independently
of installation. Use its [short host pointer](../skills/osm-data-context/assets/bridge.md)
for a verified Notion context entry URL. Notion is the only supported home; no
failure falls back to `~/.AIOS` or another provider. A legacy folder or vault home
is read-only (see the [update reference](../skills/osm/references/update.md#legacy-file-and-vault-homes)).
Package installation creates no home.

## Evidence and limits

The table below records 0.8.0 observations. For the integrated 0.9.0 package,
see [current verification](verification.md).

Native checks are recorded separately from instruction behavior. A successful
install does not prove model performance, account access or full onboarding.

| Route | Evidence for this change | Limit |
| --- | --- | --- |
| Codex | Existing native 17-skill installation; final 0.8.0 adoption is checked separately | CLI evidence does not prove a refreshed desktop task |
| Pi 0.85.1 | Isolated local install, RPC discovery of all 17 skills, native update/removal and preserved sentinel setting/skill | Local update is not a Git version transition or model execution |
| Claude Code 2.1.139 | Native validation, invalid-component rejection, inline and installed inventories, cached byte equality, fixture version transition, removal and coexistence | Local source only; no model request or live GitHub install |
| Gemini CLI 0.42.0 | Native validation, local install, all 17 skills at installed paths, byte equality, fixture version transition, removal and coexistence | Local source only; no model call or live GitHub installation |
| Copilot CLI | Official compatible manifest and marketplace documentation | CLI unavailable here; native lifecycle untested |
| Cursor | Portable and Cursor-compatible manifests match official documentation | Private distribution needs a Teams/Enterprise marketplace; installed old CLI has no plugin controls; UI lifecycle untested |
| OpenCode | Official `skills.paths` configuration can reference the canonical directory | No native instruction-package installer; not plug and play |

Run the author checks from the source repository:

```sh
python3 tests/validate.py --baseline d8a602fd3b25d8380f53951b2fd6883156a86d27
python3 tests/context-footprint.py
python3 tests/native-claude-rehearsal.py --install-lifecycle
python3 tests/native-pi-gemini-rehearsal.py pi
python3 tests/native-pi-gemini-rehearsal.py gemini
```

Native rehearsal scripts are author tools, excluded from distribution. They use
temporary `CLAUDE_CONFIG_DIR`, `PI_CODING_AGENT_DIR` or `GEMINI_CLI_HOME`, retain
evidence outside the package, preserve the operating-system home, and make no
model calls. They never copy credentials. Native folder-trust prompts concern
only the disposable fixture. Managed machine policy can still constrain a run.

Source validation checks equal identity/version, the one skill source, manifest
field types, package inventory and absence of implicitly discovered runtime
components. Negative fixtures reject version drift, split sources and hooks.
The pre-existing selected-read ceilings remain unchanged.

## Official references

Packaging follows the [Agent Plugins standard](https://agent-plugins.org/) and
[OpenAI's plugin guide](https://developers.openai.com/plugins/build/plugins).
The native routes follow [Pi packages](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md),
[Claude plugins](https://code.claude.com/docs/en/plugins-reference),
[Gemini extensions](https://geminicli.com/docs/extensions/reference/),
[Copilot plugins](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference),
[Cursor plugins](https://cursor.com/docs/plugins) and
[OpenCode skills](https://opencode.ai/docs/skills/). Sources were checked on
13 September 2026; inspect current native help when the client version differs.
