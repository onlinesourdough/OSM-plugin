# The Onlinesourdough Method

<img src="assets/icon.png" alt="OSM" width="56" height="56">

OSM gives your AI assistant a Notion home for business context, decisions and
reusable skills. Install it in the agent app you already use and start with
one useful task.

[Install](#install-in-your-app) · [Try one task](#start-with-a-real-task) · [Setup guide](docs/starter.md)

## Your data and context

**Data is the material you work with:** documents, notes, customer records and
other information in your existing tools. **Context explains what it means:**
how your business works, your goals, decisions, standards and what a useful
result should achieve. **Skills describe how the assistant should work**, such
as finding context, writing clearly or requesting a second opinion.

You choose a home for the context you want to keep. Operational data stays in
its source systems; the agent uses the relevant sources through access you have
authorized. OSM helps it find that context, apply useful methods and retain
reviewed learning. It does not upload all your data, connect every account or
grant access merely because you installed a plugin.

Prime finds the smallest relevant context for a task,
Log saves lasting changes at a useful checkpoint, and Dreaming checks recent
work and selected sources between tasks. Your Notion home keeps the definition
and databases. The short host instructions link to it and prefer the host's
built-in workspace and tools, including its side panel where available.

Authorised Notion pages and their accompanying replies use the destination's
useful format, with the point first and relevant evidence kept readable.

That foundation can support different tasks and AI apps. You can reuse what
already works, add context when a real task needs it and improve the methods as
you learn. Start with one useful task rather than organizing everything first.

The method supports business context, decisions, writing and collaboration.
Projects own
their source, engineering standards, design and delivery configuration.

## Why I built this

I built The Onlinesourdough Method to give AI assistants a useful foundation:
relevant data, business context and reusable ways of working, kept in sources
I control.

The method installs as a native plugin in Codex and Claude Code and adds reusable
skills for context, onboarding, writing and collaboration. It builds on open formats
such as Agent Skills and on what those apps already provide, so I mostly write
methods and small adaptations, with little code to maintain.

Your context stays in a home you choose, in Notion. The app
provides the models, tools and permissions; the method helps the assistant find and
maintain the context it needs.

I am Gustav Online (https://gustavonline.com/), the founder of
onlinesourdough (https://onlinesourdough.com/). For optional hands-on help,
The Fermentary (https://onlinesourdough.com/fermentary/) offers ongoing 1:1 work
with me on your data, context and AI workflows.

## How OSM helps

| Need | Skill |
| --- | --- |
| Connect a Notion home and complete a first task | Setup |
| Retrieve relevant context in a new session | Prime |
| Save a lasting decision at a useful checkpoint | Log |
| Review recent work and maintain context between tasks | Dreaming |
| Explore an unresolved goal or decision | Interview |
| Draft or edit user-facing prose | Human Writing |
| Get another agent's independent review or bounded help | Council |

Use the [skill index](docs/skills.md) for entrypoints and the
[architecture](docs/architecture.md) for the shared context procedures.

[Agentic System](https://github.com/arcitai/agentic-system) is an open-source framework for
building and operating agentic systems. It brings Foundation, AgentOps and domain
methods together across software, BI, defence and research, using T3 Code and
native coding agents where appropriate. The method and Agentic System are
independent; neither depends on nor installs the other. The project carries its
accepted scope and relevant sources between them, while the selected environment
owns tools, access and execution protection.

For engineering preparation of a new or existing software project, use
[Agentic Foundation](https://github.com/arcitai/agentic-system/tree/main/foundation/agentic-foundation)
directly in Codex or Claude; T3 Code is not required for that. OSM does not
install it or copy its content. Without a selected foundation method, OSM
reports the gap instead of improvising one.

Visual design uses an available design method.
Content and video production methods live in the optional
[OSM Content library](https://github.com/onlinesourdough/OSM-Content).
Core Setup resolves its data foundation without installing editorial methods.

## Install in your app

Upgrading an older installation? Read [Earlier names](docs/osm.md#earlier-names)
for the supported migration; existing context homes keep their own names.


OSM is open source under the MIT license. Install directly from this public
GitHub repository; no invitation is required. Your app uses its normal Git
setup. Never paste access tokens into a chat.

Choose the channel that matches your app:

- **Use the native plugin** when your app supports native plugins or skill packages (Codex, Claude Code, Pi, Gemini CLI, Copilot CLI, Cursor) for offline `SKILL.md` discovery and native skill pickers.
- **Use the public OSM MCP server** (`https://mcp.onlinesourdough.com/mcp`) in MCP-capable apps without those plugin formats (such as OpenBot, Grok Bot or custom MCP clients).
- **Keep your official Notion connection separate** in both cases — OSM supplies the public method, while your official Notion plugin/MCP owns access to your private `AI Operating Model`.

The plugin commands below follow the repository's current `main` branch, which can be ahead of the latest release. For a fixed version, including a client qualification, select a reviewed tag or commit using the [installation guide](docs/native-installation.md).

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

### MCP server (OpenBot, Grok Bot and other MCP apps)

Apps that support MCP without the plugin formats above can connect directly to the public, open-source [OSM MCP server](docs/mcp-server.md):

- **Latest release:** `https://mcp.onlinesourdough.com/mcp`
- **Pinned release:** `https://mcp.onlinesourdough.com/v0.39.1/mcp`
- **Health & SHA-256 verification:** `https://mcp.onlinesourdough.com/health`

It is **public, stateless, read-only and login-free**: it stores no user data, logs no requests, rejects credentials/cookies, and never accesses Notion. Your official Notion MCP remains separate and owns your Notion home. Because MCP-only apps do not install local `SKILL.md` files, keep the same six-line short host instructions (from `osm_get_setup_guide`) in the app's persistent instructions or standing memory as the backbone pointing to your `AI Operating Model`.

You can also run it offline over stdio (`node apps/mcp/stdio.mjs`), locally over Streamable HTTP (`node apps/mcp/http.mjs`), or self-host the included zero-dependency Cloudflare Worker (`apps/mcp/wrangler.jsonc`). See [apps/mcp/README.md](apps/mcp/README.md).

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

In Codex, **OSM** in the sidebar opens a reader for this public method guide.
It does not display private context or configure your connections. Use Setup in
the conversation to establish or change your own home.
For a new or messy workspace, ask:

> Use OSM Setup to set up my context. Start here: [page link]. Help me choose
> the first useful task and reuse what I already have.

You can also choose **OSM:setup** in Codex's skill picker. Bare `/setup` may
select a different installed plugin. Setup is a conversation: it asks only
what is missing, helps locate the material for one useful task, and builds your
**AI Operating Model** with the existing method icons. No API key is needed for
the ordinary official Notion connection. You can work through it yourself,
prepare before a client session, or continue with a facilitator from saved answers.

Setup adapts the neutral [Data & Context root](skills/osm-data-context/assets/data-and-context-root.md)
(see the [Context Architecture](skills/osm-data-context/references/architecture.md); an existing
[OSM page](skills/osm-data-context/assets/notion-osm.md) keeps working) with your Spaces and
working agreements.

The definition is a gateway: it names each source's purpose, account, access
route, permitted use and retention. An AI-native accounting tool or CRM can be
queried directly. Reading a source does not grant permission to copy it into
Notion, including through a summary or a worker brief. Operational records remain
in their owning systems. Retain only permitted useful context and source pointers. The plugin supplies
methods; it does not provision every integration or start a daily pipeline.
See the [versioned overview](docs/osm.md) and
[connection and sidebar limits](docs/sidebar.md) for the delivered behavior.

## Start with a real task

For a first run using your own Notion home, follow the
[two-chat starter](docs/starter.md). It covers installation, the first
scoped read and checking that a decision survives a fresh chat.

The [agent workspace guide](docs/native-installation.md#start-with-a-clean-agent-workspace)
covers instructions, tool access and approvals for Codex, Claude Code,
Antigravity, Cursor, Pi and Grok Bot.

After installation, try:

- “Help me understand what we decided about this customer.”
- “Save this decision for the next conversation.”
- “Ask another agent to review this result using these sources.”
- “Make this draft easier to understand without losing its meaning.”
- “Set up OSM for my work. My current focus is …”

Writing, Interview and Council can help with supplied inputs before a personal context home is set up.
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
| MCP server (OpenBot, Grok Bot, MCP apps) | `https://mcp.onlinesourdough.com/mcp` tracks the latest published release; switch `/vX.Y.Z/mcp` when pinning a release | Remove the `osm` MCP server entry in your app |

Pinned versions and local sources need their own update selection. In Pi, use
the exact registered source from `pi list` when removing a pinned install.
See [native installation, recovery and tested limits](docs/native-installation.md)
before replacing an existing registration. A separately configured owner bridge
is not removed by the package manager.

After a Codex update, close an already open OSM sidebar view and open OSM again.
An open view can retain the previous dashboard even after the new guide is
installed. The current sidebar presents the public method guide; personal
onboarding runs through Setup in conversation.

## Repository structure

| Folder | Contains |
| --- | --- |
| `skills/` | Eight discoverable skills and four supporting reference folders |
| `apps/mcp/` | Zero-dependency, login-free MCP server (Cloudflare Worker + local stdio/HTTP) |
| `apps/notion/` | Public guide reader and optional scoped Notion adapter source |
| `runtime/notion/` | Reproducible, ready-to-run build |
| `docs/` | Installed overview, user guides, maintenance and dated evidence |
| `docs-publisher/` | Public source bindings, frozen originals and export checks |
| `assets/` | Shared icon and architecture artwork |

Native plugin declarations live in the named host manifest folders at the root.
The [architecture](docs/architecture.md) explains the responsibilities.

## More

Start with the [documentation guide](docs/README.md) for method concepts,
installation, contributor material and dated evidence. The
[versioned overview](docs/osm.md) travels with the plugin, so agents can read
it locally without depending on a website. The public setup page on Resources
is written in Notion. It does not supply the running agent's skills.

[GitHub Releases](https://github.com/onlinesourdough/OSM-plugin/releases) owns
published versions. Open issues and draft pull requests describe work in
progress, not installed capabilities. Contributors start with [AGENTS.md](AGENTS.md).
OSM is open source under the [MIT license](LICENSE).
Inspired by layered data refinement, including the medallion pattern associated
with Databricks, and by semantic models as used in Microsoft Fabric and Power BI.
The Data and Context Definition is OSM's small agreement about meaning, source
ownership and retention. This is an independent method. It does not reproduce a
lakehouse, a warehouse or a metric layer, and it does not claim those products'
guarantees. The [Context Architecture](skills/osm-data-context/references/architecture.md)
keeps the working rule.

[The Onlinesourdough Method](https://gustavanderson.notion.site/The-Onlinesourdough-Method-40d6d2e17f568124af82ceb93dabf77a)
is the public method guide, with the definition template, source handling
and diagrams. The human setup page is the
[OSM setup guide](https://resources.onlinesourdough.com/collection/in-practice/osm-setup-guide/)
on Resources. The repository versions the installable plugin and technical
implementation. Follow the installed skills or their matching Git tag for
execution. The [publication procedure](docs/publication.md) records the exact
source bindings and automation limits.
Shared Content methods and templates have their own repository,
[OSM Content](https://github.com/onlinesourdough/OSM-Content).

For host-specific observations and limits, see [verification](docs/verification.md)
and [Codex integration](docs/sidebar.md). Evidence for a scheduled Dreaming run
belongs to the particular installed version, caller, identity and schedule.

Upgrading from AIOS? Use [Earlier names](docs/osm.md#earlier-names) for the
supported switch and recovery procedure. Existing owner-data filenames and
storage keys stay compatible.
