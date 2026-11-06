# The Onlinesourdough Method

**Business first. Productivity built in.**

The Onlinesourdough Method (OSM) helps you give your AI assistant a useful
foundation: relevant data, business context and reusable ways of working.
It helps the assistant plan work, build it, review the result and retain useful
decisions. Install it in the app you use. The same 17 skills work from one shared
source, with native packaging for Codex, Pi, Claude Code, Gemini CLI, Copilot CLI
and Cursor.

Small requests stay small. Larger tasks get a clear outcome, the relevant
specialist method and a review before delivery. Your app still provides the
models, tools and permissions.

## Your data and context

**Data is the material you work with:** documents, notes, customer records and
other information in your existing tools. **Context explains what it means:**
how your business works, your goals, decisions, standards and what a useful
result should achieve. **Skills describe how the assistant should work**, such
as planning a task, writing clearly or reviewing a result.

You choose a home for the context you want to keep. Operational data stays in
its source systems; the agent uses the relevant sources through access you have
authorized. OSM helps it find that context, apply useful methods and retain
reviewed learning. It does not upload all your data, connect every account or
grant access merely because you installed a plugin.

That foundation can support different tasks and AI apps. You can reuse what
already works, add context when a real task needs it and improve the methods as
you learn. Start with one useful task rather than organizing everything first.

The method supports business work, decisions, writing and practical automation.
Its code guidance and verification stay proportional to the task. Projects own
their source, engineering standards, design and delivery configuration.

Projects can be content, research, learning, business work or software. Create
Project establishes the useful workspace and context; Git and GitHub are
optional. Small coding work stays direct with Write Code and the shared Spec,
Build and Review. None of this requires a particular sidebar or execution
environment.

## Why I built this

I built The Onlinesourdough Method to give AI assistants a useful foundation:
relevant data, business context and reusable ways of working, kept in sources
I control.

The method installs as a native plugin in Codex and Claude Code and adds reusable
skills for planning, building, reviewing and writing. It builds on open formats
such as Agent Skills and on what those apps already provide, so I mostly write
methods and small adaptations, with little code to maintain.

Your context stays in a home you choose, in Notion. The app
provides the models, tools and permissions; the method helps the assistant find and
maintain the context it needs.

## Agentic systems and skill chains

Select the steps the task needs; these are useful routes, not a fixed ritual.

| Need | Method |
| --- | --- |
| Understand an idea or difficult decision | Interview and Clarify |
| Complete substantial work | Spec → Build → Review → authorized Ship |
| Write clearly | Human Writing |
| Establish a useful workspace | Create Project; Git is optional |
| Connect and maintain owner context | Setup → Data & Context, then Manage Data & Context |
| Add a reusable capability | Manage Skills; optional specialists keep their own ownership |

Read the [skill index](docs/skills.md) for the actual entrypoints and the
[architecture](docs/architecture.md) for responsibilities and selective loading.
The agent loads only the relevant skill and references.

[Agentic Systems](https://github.com/arcitai/agentic-systems) is an open-source framework for
building and operating agentic systems. It brings Foundation, AgentOps and domain
methods together across software, BI, defence and research, using T3 Code and
native coding agents where appropriate. The method and Agentic Systems are
independent; neither depends on nor installs the other. The project carries its
accepted scope and relevant sources between them, while the selected environment
owns tools, access and execution protection.

For engineering preparation of a new or existing software project, use
[Agentic Foundation](https://github.com/arcitai/agentic-systems/tree/main/foundation/agentic-foundation)
directly in Codex or Claude; T3 Code is not required for that. OSM does not
install it or copy its content. Without a selected foundation method, OSM
reports the gap instead of improvising one.

Visual design uses an available design method.
Content and video production are not part of OSM; the
[Content drafts](docs/content-drafts/README.md) record where that work stands.

## Install in your app

Upgrading an older installation? Read [Earlier names](docs/osm.md#earlier-names)
for the supported migration; existing context homes keep their own names.


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
contains the same skills and no executable extension code.

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

Notion is the only supported context home. Setup reuses suitable existing pages
and databases and tests a useful first task. External systems, local files and
repositories stay valid sources. A legacy folder or vault home is read-only; see
[Update](skills/osm/references/update.md) for the migration guidance.
Installation alone creates no context home and grants no source access.

In Codex, open **OSM** in the sidebar to inspect the saved destinations or
revisit setup. Saved links are navigation, not proof of a working connection.
For a new or messy workspace, ask:

> Use OSM Setup to set up my context. Start here: [page link]. Help me choose
> the first useful task and reuse what I already have.

Setup adapts the neutral [Data & Context root](skills/osm-data-context/assets/data-and-context-root.md)
(see the [Context Architecture](skills/osm-data-context/references/architecture.md); an existing
[OSM page](skills/osm-data-context/assets/notion-osm.md) keeps working) with your Spaces and
working agreements.

Operational records remain in their owning systems. Retain useful context and
source pointers rather than copying whole libraries. The plugin supplies
methods; it does not provision every integration or start a daily pipeline.
See the [versioned overview](docs/osm.md) and
[connection and sidebar limits](docs/sidebar.md) for the delivered behavior.

## Start with a real task

After installation, try:

- “Help me turn this idea into a clear plan.”
- “Build the agreed change and review the result.”
- “Turn these sources into a clear article draft.”
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

The public guide, [The Onlinesourdough Method](https://gustavanderson.notion.site/The-Onlinesourdough-Method-40d6d2e17f568124af82ceb93dabf77a),
is a reference projection of released v0.30.0. Git and the installed skills remain the
instructions. Its Content templates are a separate Notion-authored draft edition, and
that edition (not the preserved Git drafts) is the current template source. The skill set
in this working tree is declared and fixture-tested only; it is unreleased and has not been
native-tested or installed. See [What a statement can mean](docs/README.md#what-a-statement-can-mean).

Upgrading from AIOS? Use [Earlier names](docs/osm.md#earlier-names) for the
supported switch and recovery procedure. Existing owner-data filenames and
storage keys stay compatible.
