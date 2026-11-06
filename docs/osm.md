# The Onlinesourdough Method

OSM version: 0.31.0

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

OSM is the shared method; your context home is the Notion home you own for your
context. In Codex, open **OSM** in the sidebar. Numbered setup steps save your Context,
Docs, Personal/Team Skills and Memory destinations, then open your dashboard.
All setup sections remain visible and revisitable. Existing context opens the
dashboard immediately; Settings opens a separate drawer. Connected Notion
selectors list accessible pages by name and support search. Saved sources and
manual links remain available; page listings fetch no page bodies. Selected destinations can read icon
metadata via the official fetch tool; the remaining response is discarded.
Clicks open destinations or save links directly; they never send a chat message.
A saved link does not prove remote access or complete business onboarding.

For help organizing a new or messy workspace, explicitly invoke **Set up** or
ask for OSM Setup. That skill checks access, reuses useful destinations and
helps with the first task. Personal and Team skills retain actual permissions;
Audience and Space are not access control. A new Notion entry is called **OSM**
by default; existing entries and customer names remain theirs.

[Data & Context](../skills/osm-data-context/SKILL.md) engineers the Notion home: its
root, one definition and the core Knowledge, Memory and Skills stores, reusing
what exists and creating only what is missing. [Manage Data & Context](../skills/osm-manage-data-context/SKILL.md)
retrieves, takes in and curates context afterwards, for a manual request, a task
checkpoint or an existing scheduled run. The host keeps a short pointer to the
approved entry; the agent reads only relevant sources and personal methods.
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
required. The Codex panel is a bundled local MCP process managed by Codex, using
Node.js 22+ and the installed Codex CLI for connection status. It reads
connection metadata, the short pointer and a private navigation map of
names/links scoped to that context. No source bodies are copied. Explicit Setup
registers verified destinations through OSM MCP after using the Notion
connector. Data & Context retrieves the actual source when a task needs it.
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

Clear writing and code quality are included methods. Visual design
uses an installed design method if the host provides one; otherwise the
assistant does the work directly or reports the missing method. Write code
applies to application code, scripts and automation, with verification suited
to the change. The native app owns
projects and sessions; OSM adds no second project register. Spaces hold relevant
business context, while optional specialist Systems keep their own upkeep.
Design and writing working material stays in the project.

For a visible UI change, Build's [review handoff](../skills/osm-build-work/references/review-handoff.md)
compares a real baseline and candidate capture of the same state, viewport and
data. Human Writing includes concrete
editing examples while preserving the author's meaning, evidence and voice.
Write Code helps distinguish useful sharing from superficially similar code
and keeps refactoring scoped to the affected behavior.

## Connected work methods

[Clarify](../skills/osm-clarify/SKILL.md) owns explanations of complex topics and
decisions: a useful mental model, concrete examples and visuals when they help.
It uses the available visualization tools for presentation and can return a
short text answer. It is independently selectable and needs no design process
or compulsory HTML artifact.


[Interview](../skills/osm-interview/SKILL.md) helps establish shared context and
direction when requested or materially needed at the start. It reuses known
answers, challenges assumptions and returns a useful next action. Clear work
already underway needs no interview. [Setup](../skills/osm-setup/SKILL.md)
uses that conversation when needed while retaining installation, home readiness
and continuity. Setup replaces the former `osm-onboard` entrypoint.

Thinking aloud can start with Interview restating the goal and underlying problem
before asking only what changes the next action. Spec can resolve a material
solution choice through a [small local trial](../skills/osm-spec-work/references/local-trials.md).
Visual variants use an available canvas or preview; a runnable interaction or sample workflow can
resolve other choices. These steps are conditional and reuse accepted answers;
ordinary work gains no mandatory interview, prototype or parallel agents.

The shared delivery path is Spec → Build → Review → authorized Ship. Spec
reuses interview decisions. These methods connect only where the accepted result
needs them. Project setup, context maintenance, skill management and package
updates retain their focused owners; check, update and model advice are
references under `osm`. Reusable methods use Manage Skills; the former Create System entrypoint
is retired.

[Create Project](../skills/osm-create-project/SKILL.md) establishes a useful
workspace, context and simple structure for content, learning, business work or
software. A folder can be sufficient; Git, GitHub and a template are optional.
Native sidebar/project controls are conveniences rather than a required OSM
registration. Existing useful files and locations survive.

Small coding work stays direct with Write Code and the shared lifecycle.
Workspace or template creation alone does not prove an application ready.
AIOS 0.28.0 retired the former Project Foundation skill: engineering preparation
of a new or existing software project uses the separately usable
[Agentic Foundation](https://github.com/arcitai/agentic-systems/tree/main/foundation/agentic-foundation)
skill directly in Codex or Claude; T3 Code is not required. When no such method is selected, OSM reports the
gap rather than improvising an engineering contract.

[Agentic Systems](https://github.com/arcitai/agentic-systems) is an independent package of
Foundation, AgentOps and ADLC methods, such as implement and review, for T3 Code
and native coding agents. OSM and Agentic Systems are independent packages: neither
depends on nor installs the other. An operator may select Agentic Systems for a project,
carrying its accepted scope and sources while preserving each environment's own
instructions, credentials and execution controls. Human involvement does not
itself enforce a filesystem or tool boundary.

Content production and video are not part of OSM. Content and Diffusion Studio
left the package in 0.31.0; their history is kept as non-shipped drafts in the
source repository's `docs/content-drafts/README.md` (not part of the package), a record of five
configurable areas (setup, intake, prepare, produce and distribute, learn), not a
plugin or required pipeline. Where an owner chooses a separate Content method,
Notion editorial and Kit are the current selected tools and HyperFrames is an
unqualified video candidate only. AIOS 0.29.0 no longer ships design skills;
existing project `DESIGN.md` and `design/` files are unchanged.

In Codex, the built-in browser can show local design/application previews.
Browser surfaces supplement the project files and native tools that perform the
work.

## Skill names

Method skills use `osm` or an `osm-` prefix, such as `osm-build-work`, and show
as `OSM:build-work`; a plugin-qualified host may show `osm:osm-build-work`. OSM
0.31.0 renamed `osm-context` to `osm-data-context` and `osm-maintain-context` to
`osm-manage-data-context`, and folded Check, Update and Select model into
references under `osm`; `osm` routes the old names and ships no alias skill. Each skill declares its canonical
name; the harness owns its native namespace. Personal methods keep their own
names and ownership. Renames update the body, callers and native registration
together.

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
