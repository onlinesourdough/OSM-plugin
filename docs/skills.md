# OSM skills

OSM 0.33.0 contains 20 native skills. Method skills are named `osm` or `osm-*`; their
titles and Codex display names use `OSM:skill-name`: uppercase `OSM`, a colon
without spaces, and lowercase hyphenated names. The display label omits the
redundant leading `osm-` from the canonical name, and the `osm` entry shows as
`Procedure index`. Automatic selection uses each skill description;
explicit invocation uses the canonical name and native namespace. OSM 0.30.0
renamed the earlier `aios`, `aios-*`, `clarify`, `human-writing` and
`write-code` skills; Setup earlier replaced `aios-onboard`. OSM 0.31.0 renamed
`osm-context` to `osm-data-context` and `osm-maintain-context` to
`osm-manage-data-context`, folded Check, Update and Select model into
references under `osm`, and moved Content and Diffusion Studio out of the
package. It also adds `osm-dreaming` (#93), a new skill with no earlier name.
Update explicit callers on adoption; `osm` routes the old names and there is no
alias skill. Each carries an independent quoted `metadata.version`;
see [version maintenance](skill-versioning.md). Repository development methods in
`.agents/skills/` are separate and are not product skills.

The standard package exposes seven skill entries. Context setup, curation and
personal skill maintenance are linked procedures. The previous 20-skill package
is available at [v0.33.0](https://github.com/onlinesourdough/OSM-plugin/blob/v0.33.0/docs/skills.md).

| Skill | Responsibility |
| --- | --- |
| [OSM:human-writing](../skills/osm-human-writing/SKILL.md) | Default prose drafting and editing that preserves facts, uncertainty and the user’s voice |
| [OSM:interview](../skills/osm-interview/SKILL.md) | Explore context, challenge assumptions and find direction when requested or materially needed at the start; no routine interruption of execution |
| [OSM:prime](../skills/osm-prime/SKILL.md) | Start with the smallest relevant context in the selected scope |
| [OSM:log](../skills/osm-log/SKILL.md) | Save lasting changes at a meaningful checkpoint or on request |
| [OSM:dreaming](../skills/osm-dreaming/SKILL.md) | Review changed work and selected sources, repair confirmed context errors and surface open progress between sessions through a manual or existing native caller |
| [OSM:setup](../skills/osm-setup/SKILL.md) | Set up or resume the Notion Data & Context foundation, from access to a useful first task |
| [OSM:council](../skills/osm-council/SKILL.md) | Ask another agent for a read-only review or delegate bounded work with a scoped brief |

Council replaces `osm-orchestrate-workers` in OSM 0.33.0. If you call it
by identifier in a script or saved prompt, update the caller to `osm-council`
when you update the installed package.

Three procedures live under `osm` instead of separate entries:
[check](../skills/osm/references/check.md) (read-only inspection),
[update and rollback](../skills/osm/references/update.md) (including guidance for
a legacy file or vault home) and
[model advice](../skills/osm/references/model-advice.md) (only on request).
Content and Diffusion Studio are not part of the package; their history is kept
as [non-shipped drafts](content-drafts/README.md), and shared Content methods and
templates have their own Git home, [OSM-content](https://github.com/onlinesourdough/OSM-content). The assistant chains relevant
skills using the current task and its accepted result; no workflow engine or fixed
chain schema is required. Working material stays in the project.

## Triggers and calls

One owner per operation. "Calls" lists what a skill may hand work to; nothing in the
Setup, Data & Context, Prime, Log, Manage Data & Context, Dreaming and Manage Skills chain calls back into
Setup, and nothing calls back into Dreaming. The check in `tests/responsibility-rehearsal.py` keeps this table's owners
consistent with the skill text.

| Trigger | Owner | Calls |
| --- | --- | --- |
| Explain OSM, pick a method, use a retired name | [Procedure index](../skills/osm/index.md) | Any owner below (routing only) |
| Set up or resume the foundation | [OSM:setup](../skills/osm-setup/SKILL.md) | Interview (only if context is missing), Data & Context, Manage Data & Context, Dreaming (optional upkeep), Manage Skills |
| Engineer the Notion home | [Data & Context setup](../skills/osm-data-context/index.md) | None |
| Retrieve, take in or curate context | [Context curation](../skills/osm-manage-data-context/index.md) | Data & Context (its contract), Manage Skills (method changes only) |
| Start a configured session | [OSM:prime](../skills/osm-prime/SKILL.md) | Manage Data & Context (retrieval only) |
| Save lasting context at a checkpoint | [OSM:log](../skills/osm-log/SKILL.md) | Manage Data & Context (authorized writes) |
| Review recent work and repair context between sessions | [OSM:dreaming](../skills/osm-dreaming/SKILL.md) | Manage Data & Context (all writes), Manage Skills (method changes only) |
| Create or change a personal or team method | [Personal skill maintenance](../skills/osm-manage-skills/index.md) | None in the context chain |
| Explore direction | [OSM:interview](../skills/osm-interview/SKILL.md) | Active specification method when needed, Log (durable owner facts only) |
| Get another agent’s review or bounded help | [OSM:council](../skills/osm-council/SKILL.md) | Native workers or a selected CLI; model advice when needed |
| Write prose for its intended reader | [Human Writing](../skills/osm-human-writing/SKILL.md) | None |
| Inspect installation or state (read-only) | [check](../skills/osm/references/check.md) | None |
| Update, roll back, or move off a legacy home | [update](../skills/osm/references/update.md) | None |
| Model advice, only on request | [model advice](../skills/osm/references/model-advice.md) | None |

A project can use its own instructions or an installed specialist for development,
design and delivery. Older saved direct calls to Build Work, Create Project,
Clarify, Review Work, Risky Changes, Ship Work, Spec Work, Triage Improvement
and Write Code need a project-specific replacement. The old bodies remain on
the v0.33.0 tag. The former `osm`, `osm-data-context`,
`osm-manage-data-context` and `osm-manage-skills` entries map to procedures in
the [index](../skills/osm/index.md#renamed-and-retired-entries). Keep pinned
scheduled callers on their verified version until the replacement Dreaming
caller has been tested.

Plugin namespaces come from the host, for example `osm:osm-setup`. Personal
methods keep their owner's names and permissions. The
[legacy behavior map](../skills/osm-setup/references/legacy-parity.md) records
the earlier routes.

## Retired: Project Foundation (0.28.0)

`aios-project-foundation` is no longer shipped. For engineering preparation of
a new or existing software project, use the separately usable
[Agentic Foundation](https://github.com/arcitai/agentic-systems/tree/main/foundation/agentic-foundation)
skill directly in Codex or Claude; T3 Code is not required. OSM has no runtime
dependency on it, does not install it and contains none of its content. Small
coding work stays with Write Code; without a selected foundation method, OSM
reports the gap. Explicit callers of the old name must be updated. The
[Project Foundation note](project-foundation.md) keeps its history.
