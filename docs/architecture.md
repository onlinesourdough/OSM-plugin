# Architecture

OSM is the data and context module in an agent system. The host supplies
models, tools, workspace, permissions and scheduling. OSM helps the agent
retrieve relevant context, preserve lasting learning and keep it useful.

The [public diagram](https://gustavanderson.notion.site/40d6d2e17f568113a397fb6ecd9b5fff)
shows these responsibilities. Its [editable source](../assets/diagrams/osm-architecture.html)
contains no private routes.

## Seven skills

| Skill | Responsibility |
| --- | --- |
| Setup | Connect the selected route and establish or reuse a useful home |
| Prime | Read the definition and retrieve context the task needs |
| Log | Save lasting decisions, corrections and learning at checkpoints, in the format the destination already uses |
| Dreaming | Review recent and unfinished work, check selected sources and maintain context between sessions |
| Interview | Explore material uncertainty in the goal when needed |
| Human Writing | Write for the reader while preserving the author's voice and facts |
| Council | Ask another agent for a review, second opinion or bounded contribution |

Prime starts a configured session. Log runs at meaningful checkpoints, when
asked, or before a Notion page is written. The page matches the destination's
existing format and leads with what a person needs. Dreaming uses a person or an existing selected daily caller; it
creates no timer. The other skills are selected when useful. The host and
project own ordinary implementation, testing and delivery methods.

## The Notion home

The root begins with one Data & Context definition, then its native database
references. The definition names sources, destinations, access, working
agreements and maintenance routes.

| Store | Responsibility |
| --- | --- |
| Knowledge | The person, business, offers, customers, voice, strategy, numbers and team |
| Memory | Lasting decisions, corrections, constraints and their reasons and evidence |
| Skills | The owner's reusable ways of working |
| Content foundation | Material and production references in the selected existing store, external workflow or proposed empty database; personal methods remain optional |

New-home Setup covers the Content route in its short plan. Reuse an existing
owner, honour deferral, or propose one empty database. Installation and
existing-home resume add nothing. The
[core foundation contract](../skills/osm-data-context/references/notion/content-foundation.md)
keeps one route and minimum schema; the optional Content library adds adapted
editorial methods.

Setup reuses actual identities and suitable native types. Names and fields
can vary. Source dates, imports, substantive revisions and justified review
points retain their different meanings.

CRM, accounting, files, messages, projects and histories retain their originals.
They are read through selected routes when relevant.

## Retrieval and learning

Prime reads the definition and required controls once, queries relevant
metadata, then reads selected bodies. Past decisions use scoped Memory;
unfinished work may need the selected history or project source. Age helps
compare similar evidence and does not replace relevance or source authority.

Log and Dreaming share the curation procedure. They reconcile existing records,
preserve meaningful history, verify writes and leave unchanged records alone.
Verified errors are corrected during work and noted for Dreaming. Daily review
can recover missed learning and useful progress from unfinished or archived work.

Shared details are reference material, not additional discoverable skills:
[home structure](../skills/osm-data-context/index.md),
[retrieval and curation](../skills/osm-manage-data-context/index.md), and
[personal methods](../skills/osm-manage-skills/index.md).

## Access and execution

The official Notion plugin is the normal owner route. A dedicated internal
connection is optional for selected-page access needed by a team, worker or
daily caller. Actual grants determine access; a label or prompt does not
restrict another broader tool exposed by the host.

Codex's optional headless adapter is built from `apps/notion` into
`runtime/notion`. It preserves existing local route and Keychain settings
and supplies scoped reads and revision-checked mapping settings.
See [connection contract](home-connection.md).

A company and a teammate can keep separate homes, including separate Notion
workspaces. Each keeps its own definition and account. Record a deliberately
selected cross-home source with its actual grants and retention; do not merge
private Memory or infer access from a link.

A short persistent instruction selects Prime and the owner's URL, requests Log
and prefers the host's built-in workspace. Save it in the host's instruction
file, such as AGENTS.md or CLAUDE.md, or, if the host has none, in its built-in
persistent memory or standing instructions. Business facts stay in the home.
Independent projects retain their own instructions.

## Collaboration and extensions

Council passes only the task, relevant evidence, constraints, permitted actions
and expected result. One writer owns each overlapping change. The caller
checks returned work. A review and a bounded implementation are distinct tasks.

OSM Content is a separate optional method and library for shaping personal
content workflows. Specialists keep their own tools and responsibilities.
OSM installs no mandatory content editor, cloud service, model runner or
engineering framework.
