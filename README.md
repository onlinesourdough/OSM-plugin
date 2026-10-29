# The Onlinesourdough Method

**Business first. Productivity built in.**

The Onlinesourdough Method (OSM) helps an AI assistant use relevant context,
carry work from a request to a reviewed result, and retain useful decisions.
Use it for business work, research, content, practical automation and software.
Small requests stay small; substantial work gets a clear outcome and review.

This repository owns the method, its documentation and the native plugin that
puts its 22 skills in your agent app. Your app provides models, tools and
permissions. Your company data stays in the context home and source systems
you choose.

## Why I built this

I built The Onlinesourdough Method to carry useful context, decisions and working
methods between AI apps, so each conversation can build on the work that came before.

The method installs as a native plugin in Codex and Claude Code and adds reusable
skills for planning, building, reviewing and writing. It builds on open formats
such as Agent Skills and on what those apps already provide, so I mostly write
methods and small adaptations, with little code to maintain.

Your context stays in a home you choose, such as Notion or a repository. The app
provides the models, tools and permissions; the method helps the assistant find and
maintain the context it needs.

## Agentic systems and skill chains

Select the steps the task needs; these are useful routes, not a fixed ritual.

| Need | Method |
| --- | --- |
| Understand an idea or difficult decision | Interview and Clarify |
| Complete substantial work | Spec → Build → Review → authorized Ship |
| Create useful content | Content with Human Writing; optional production tools |
| Establish a useful workspace | Create Project; Git is optional |
| Connect and maintain owner context | Setup → Context, Maintain Context and Check |
| Add a reusable capability | Manage Skills; optional specialists keep their own ownership |

Read the [skill index](docs/skills.md) for the actual entrypoints and the
[architecture](docs/architecture.md) for responsibilities and selective loading.
The agent loads only the relevant skill and references.

[Factory](https://github.com/arcitai/factory) supplies separate Foundation,
AgentOps and engineering methods. OSM and Factory can be used independently;
neither installs the other. Visual design uses an available design method.
[Diffusion Studio](skills/diffusion-studio/SKILL.md) is an optional external
video workbench, not an installation requirement.

## Install in your app

OSM is open source under the MIT license. Install directly from this public
GitHub repository; no invitation is required. Your app uses its normal Git
setup. Never paste access tokens into a chat.

Choose one of the routes below. These commands follow the repository's current
`main` branch. For a fixed version, select a reviewed tag or commit using the
[installation guide](docs/native-installation.md).

### Codex

```sh
codex plugin marketplace add onlinesourdough/OSM-plugin
codex plugin add osm@online-sourdough
```

Once the marketplace is available, you can also install OSM from Codex's plugin
browser. Start a fresh task after installation.

### Pi

```sh
pi install git:github.com/onlinesourdough/OSM-plugin
```

Start a fresh Pi session. OSM is a native Pi skill package; it needs no executable extension.

### Claude Code

```sh
claude plugin marketplace add onlinesourdough/OSM-plugin
claude plugin install osm@online-sourdough --scope user
```

Restart Claude Code. You can use ordinary language or call
`/osm:osm-setup` and `/osm:osm-human-writing` directly.

### Gemini CLI

```sh
gemini extensions install https://github.com/onlinesourdough/OSM-plugin
```

Review Gemini's installation prompt, then start a fresh session. The extension
contains the same skills and no executable extension code. Selected content
tasks can use the helpers supplied with their skills.

### Copilot CLI

```sh
copilot plugin marketplace add onlinesourdough/OSM-plugin
copilot plugin install osm@online-sourdough
```

This uses Copilot's documented support for Claude-compatible plugin metadata.
It has not been tested locally.

### Cursor and other apps

Cursor supports OSM's native Cursor plugin format. For private distribution, add
the repository through a **Teams or Enterprise marketplace**, then install OSM
from **Customize**. OSM is not listed in Cursor's public marketplace, and this
installation route has not been tested locally. See the
[Cursor adapter](skills/osm-setup/references/adapter-other.md#cursor).

OpenCode can reference the skill directory through its native `skills.paths`
setting. It currently has no equivalent native installer for this instruction
package, so we do not describe that route as plug and play. See the
[compatibility guide](skills/osm-setup/references/adapter-other.md#opencode).

## Your context home

The shared method and your company context have separate owners and update
paths. A short instruction in your app points to your chosen context entry.
That entry directs the assistant to relevant facts, sources, memory and
personal methods, without loading the whole workspace.

Notion is the preferred starting home for solo founders and small teams.
Setup reuses suitable existing pages and databases and tests a useful first
task. Existing alternative homes keep their own structure and require verified
access. Installation alone creates no context home and grants no source access.

In Codex, open **OSM** in the sidebar to inspect the saved destinations or
revisit setup. Saved links are navigation, not proof of a working connection.
For a new or messy workspace, ask:

> Use OSM Setup to set up my context. Start here: [page link]. Help me choose
> the first useful task and reuse what I already have.

Operational records remain in their owning systems. Retain useful context and
source pointers rather than copying whole libraries. The plugin supplies
methods; it does not provision every integration or start a daily pipeline.
See the [versioned overview](docs/osm.md) and
[connection and sidebar limits](docs/sidebar.md) for the delivered behavior.

## Start with a real task

After installation, try:

- “Help me turn this idea into a clear plan.”
- “Build the agreed change and review the result.”
- “Turn these sources into a finished article.”
- “Make this draft easier to understand without losing its meaning.”
- “Set up OSM for my work. My current focus is …”

You can use the work methods before setting up a personal context home.
Projects keep their own instructions, files, checks and delivery decisions.

## Update or remove

Use the same app and installation scope you originally chose. Finish active
work before changing its methods.

| App | Update | Remove |
| --- | --- | --- |
| Codex | Refresh the OSM marketplace, then reinstall its OSM entry; see the guide below for pinned sources | `codex plugin remove osm@online-sourdough` |
| Pi | `pi update --extension git:github.com/onlinesourdough/OSM-plugin` for a tracking install | `pi remove git:github.com/onlinesourdough/OSM-plugin` |
| Claude Code | `claude plugin marketplace update online-sourdough`, then `claude plugin update osm@online-sourdough --scope user` | `claude plugin uninstall osm@online-sourdough --scope user` |
| Gemini CLI | `gemini extensions update osm` | `gemini extensions uninstall osm` |
| Copilot CLI | `copilot plugin marketplace update online-sourdough`, then `copilot plugin update osm@online-sourdough` | `copilot plugin uninstall osm@online-sourdough` |
| Cursor | Refresh the selected marketplace and manage OSM in Customize | Remove OSM in Customize |

Pinned versions and local sources need their own update selection. In Pi, use
the exact registered source from `pi list` when removing a pinned install.
See [native installation, recovery and tested limits](docs/native-installation.md)
before replacing an existing registration. A separately configured owner bridge
is not removed by the package manager.

## More

Start with the [documentation guide](docs/README.md) for method concepts,
installation, contributor material and dated evidence. The
[versioned overview](docs/osm.md) travels with the plugin, so agents can read
it locally without depending on a website. Resources can display selected
repo-owned documentation; it does not supply the running agent's skills.

[GitHub Releases](https://github.com/onlinesourdough/OSM-plugin/releases) owns
published versions. Open issues and draft pull requests describe work in
progress, not installed capabilities. Contributors start with [AGENTS.md](AGENTS.md).
OSM is open source under the [MIT license](LICENSE).

Upgrading from AIOS? Use [Earlier names](docs/osm.md#earlier-names) for the
supported switch and recovery procedure. Existing owner-data filenames and
storage keys stay compatible.
