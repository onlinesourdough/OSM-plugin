# The Onlinesourdough Method

OSM version: 0.34.0

**Business first. Productivity built in.**

The Onlinesourdough Method (OSM) supplies portable context and skills to help an
AI assistant work from relevant data and business context, carrying a task from a small request to
a reviewed result. Data stays in its source systems. The chosen context home
explains how the business works and retains useful decisions and personal
methods. Shared skills guide the work; the native app supplies the model, tools
and permissions.

OSM focuses on business work, decisions, clear writing and practical
automation. Projects own their implementation, engineering standards, design,
infrastructure and delivery configuration.

## Your context home

Your context home is the Notion page you own for business context. Open a fresh
conversation and ask for **OSM Setup**, or use the host's **Set up** entry.
Setup checks the official Notion plugin, connects the intended account, reuses
suitable pages and databases, and helps complete a useful first task. Preserve
an existing selected route. A dedicated connection is optional when selected
page access is needed for a team, worker or unattended caller.

The root starts with the Data & Context definition, followed by its native
Knowledge, Memory and Skills databases. Existing names, content and suitable
fields are retained. Personal and Team labels are not access controls.

[Data & Context](../skills/osm-data-context/index.md) engineers the Notion home: its
root, one definition and the core Knowledge, Memory and Skills stores, reusing
what exists and creating only what is missing.
[Prime](../skills/osm-prime/SKILL.md) uses the host's short pointer to find the
smallest relevant context and [Log](../skills/osm-log/SKILL.md) saves lasting
changes after meaningful work or on request. [Dreaming](../skills/osm-dreaming/SKILL.md)
reads the current definition, checks recent work and due sources, and can
correct proven context errors. It uses an existing caller for a daily run.
[Manage Data & Context](../skills/osm-manage-data-context/index.md) owns
retrieval and verified curation for all three. The shared
[host instruction template](../skills/osm-data-context/assets/bridge.md)
prefers the host's built-in workspace and tools, including its side panel
where available.
[Council](../skills/osm-council/SKILL.md) is available for an independent
review or bounded help from another agent. Update saved direct calls to
`osm-orchestrate-workers` to use `osm-council`.
Reuse full-page Docs, native Skills and Memory, with Spaces for business and
brand scopes. Start with one useful workflow in an existing workspace; no
wholesale migration is required.

Notion is the only supported context home. External systems, local files and
repositories stay valid sources or working artifacts, never alternate homes. A
legacy folder, vault or `AIOS_FORMAT` home is recognized read-only: its original
and recovery stay intact, and the [update reference](../skills/osm/references/update.md#legacy-file-and-vault-homes)
explains the incompatibility and the owner-led migration choice. Nothing is
converted, mirrored or cleaned up silently. Shared methods stay in the plugin and
operational records at their source. No local mirror, hosted server or timer is
required. Codex includes an optional headless Notion adapter for an explicitly
selected internal connection. It uses Node.js 22+, preserves compatible local
route settings and macOS Keychain storage, and reads mapped content on request.
Ordinary owner setup uses the separate official Notion plugin. A source name or
stored mapping is not proof of live access.
Installing or updating OSM leaves existing homes intact; use Setup when you
choose to establish one.

## Shared method, owner context

The shared OSM package contains reusable routing and work methods. An owner's
separate context home contains the context they choose to retain: decisions,
connections, personal skills, and owner-specific routes. The package does not
automatically copy that context into repositories or give it to every task.

Independent repositories keep their own instructions, implementation, proof,
and recovery. OSM loads owner context selectively when an owner-level task
needs it; ordinary repository work begins from that repository's local
instructions and accepted inputs.

## Use the relevant source

OSM keeps a boundary between durable owner context and work that belongs to a
customer, project, or external system. Customer documentation stays in its
source system. A task may use an authorized, scoped source directly and retain
only a pointer, purpose, and freshness information when that is genuinely
useful. OSM does not turn external documentation into a copied owner corpus.

If a source is unavailable, stale, inaccessible, or conflicts with another
source, that is an evidence gap—not a reason to invent an answer from memory.

## Native harnesses and access

[Human Writing](../skills/osm-human-writing/SKILL.md) helps with prose while
preserving meaning, evidence and voice. [Interview](../skills/osm-interview/SKILL.md)
helps when an unresolved question changes the next action. Setup uses it when
existing context leaves a material gap. Project work uses the project's own
instructions or a selected specialist. The native app owns projects, sessions
and effective permissions. Verify authority before external actions and confirm
their result at the destination.

The standard package exposes Setup, Prime, Log, Dreaming, Interview, Human
Writing and Council. Context setup, curation and personal skill maintenance
have linked procedures. Update older saved calls to a retired entry to use
the relevant procedure or the project's own workflow. Previous entries remain
available from [v0.33.0](https://github.com/onlinesourdough/OSM-plugin/tree/v0.33.0/skills).

Content production and video are not part of OSM. Content and Diffusion Studio
left the package in 0.31.0; their history is kept as non-shipped drafts in the
source repository's `docs/content-drafts/README.md` (not part of the package), a record of five
configurable areas (setup, intake, prepare, produce and distribute, learn), not a
plugin or required pipeline. Shared Content methods and templates have their own Git home,
[OSM-content](https://github.com/onlinesourdough/OSM-content), which owns their future changes; a Notion
copy is a projection of a stated source revision. Where an owner chooses a separate Content method,
Notion editorial and Kit are the current selected tools and HyperFrames is an
unqualified video candidate only. AIOS 0.29.0 no longer ships design skills;
existing project `DESIGN.md` and `design/` files are unchanged.

In Codex, the built-in browser can show local design/application previews.
Browser surfaces supplement the project files and native tools that perform the
work.

## Skill names

Method skills use an `osm-` prefix, such as `osm-setup`. A plugin-qualified
host may show `osm:osm-setup`. Personal methods keep their own names and
ownership. [Earlier method routes](../skills/osm/index.md#renamed-and-retired-entries)
identify the current procedures for existing callers.

## Earlier names

OSM 0.30.0 is the method previously released as AIOS (`aios`, 0.29.0 and
earlier). It is distinct from the retired OSM 0.1.x packages. Your context home
keeps its stored names: the `<!-- AIOS:BEGIN -->` instruction block and saved
Codex panel links, and a legacy file home keeps `AIOS.md`, `AIOS_FORMAT` and
`~/.AIOS` read-only. Updating needs no Notion migration. At a quiet moment, install `osm@online-sourdough`
and check its version, then disable `aios@online-sourdough` with your app's
supported plugin control (in Claude Code, `claude plugin disable`) before
starting a fresh chat, so only one copy of each skill is active. Remove `aios`
once OSM works and nothing still uses it. If OSM fails, disable it and enable
`aios` again; your context is unchanged. Setup's
[switch procedure](../skills/osm-setup/references/migration.md#switch-from-aios-to-osm)
has the details for each app.

OSM supplies one skill library with native installation metadata for several
agent apps. Install it separately in each app you choose; installation in one
does not configure the others. Each route needs its own verification of
discovery, access, and behavior. The native harness owns the
model, tools, credentials, permissions, settings, and user interface. OSM
neither grants access nor performs actions outside the authority already
available to the user and task.

## Continuity between machines

Notion holds the home across machines: reconnect the selected workspace through
the new harness, verify the exact guide and personal skills, then establish its
thin pointer. Keep dated exports and the setup recovery record for recovery;
this is not automatic replication of every connected business source. A legacy
file home never receives a transfer, Sync or mirror from OSM 0.31.0; its
originals stay as they are.

## Getting started and reading more

Start with a small real task and the context you want the assistant to use.
If you have OSM package access, use the reviewed release and its included
setup and recovery guidance; never paste credentials into a chat. Technical
procedures remain with their owning documentation so this overview stays short.

This overview ships with the OSM version named above and is read only when
needed. Its version travels with the shared methods in the installed package.
The public guide is a reference projection of released editions; the installed
package and its skills are the instructions.
Native package updates are separate from owner context. There is no OSM
documentation or skill runtime on the Resources domain. A newer upstream
release does not replace instructions already read into an active conversation.
Refresh/update the package through your app first, then start a fresh chat.
A new chat alone does not download a plugin update. Personal owner context
and separately maintained skills are independent of the package release.
