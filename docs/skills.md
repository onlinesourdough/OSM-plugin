# OSM skills

The host selects skills by their descriptions and invokes them by their
canonical names, for example `osm-setup`. Codex may display the same skill
as `OSM:setup`. Each entry carries an independent `metadata.version`.
Repository development methods live separately. [Version maintenance](skill-versioning.md)

The standard package exposes eight skill entries. Context setup, curation and
personal skill maintenance are linked procedures. The previous 20-skill package
is available at [v0.33.0](https://github.com/onlinesourdough/OSM-plugin/blob/v0.33.0/docs/skills.md).

| Skill | Responsibility |
| --- | --- |
| [OSM:human-writing](../skills/osm-human-writing/SKILL.md) | Draft or edit an email, SMS, LinkedIn post or other prose so it sounds like the author. |
| [OSM:interview](../skills/osm-interview/SKILL.md) | Interview the user when goals or direction are unclear, or when they ask to think something through first. |
| [OSM:prime](../skills/osm-prime/SKILL.md) | Start a new session in an OSM setup by loading only the relevant Notion context. |
| [OSM:log](../skills/osm-log/SKILL.md) | Save lasting context to Notion when meaningful work ends or the user says remember, log or note this. |
| [OSM:dreaming](../skills/osm-dreaming/SKILL.md) | Reflect between tasks or on a daily schedule: review recent work, catch missed learnings and fix drifted Notion context. |
| [OSM:setup](../skills/osm-setup/SKILL.md) | Set up or resume OSM and its Notion context home, or check and repair a broken install. |
| [OSM:council](../skills/osm-council/SKILL.md) | Ask another agent or model for a second opinion, an independent review or bounded help. |
| [unslop](../skills/unslop/SKILL.md) | Remove AI tells from the agent's own replies, reports and Notion pages. |

Council replaces `osm-orchestrate-workers` in OSM 0.33.0. If you call it
by identifier in a script or saved prompt, update the caller to `osm-council`
when you update the installed package.

The [procedure index](../skills/osm/index.md) also covers
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
| Remove AI tells from the agent’s own text | [unslop](../skills/unslop/SKILL.md) | Human Writing for text sent under the author’s name |
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

At the close of an interview, once the goal is clear, Interview asks one brief
ambition question before its summary: expert depth, the wider purpose and next
outcome, or a useful approach from another field. It selects one angle, accepts
a decline or an answer that changes nothing, and continues. An explicit stop
or skip still ends the interview. The skill links its inspiration without
copying the article.

## Agent text and author text

`unslop` edits the agent's own replies, reports and Notion pages. It fetches
Lauren Tan's MIT pstack method from `cursor/plugins` main at use time with the
host's own tool. No upstream rules are bundled or recalled from memory; a
failed fetch stops that pass. Non-English text uses the language-neutral rules
and skips the English word lists.

Text sent under the author's name, including an email, SMS or LinkedIn post,
belongs to `osm-human-writing`, which preserves approved wording, evidence,
uncertainty and the author's voice. A Notion page written as the agent's report
uses `unslop`; a page drafted for publication under the author's name uses
Human Writing. Neither method grants sending or publishing authority.

## Retired: Project Foundation (0.28.0)

`aios-project-foundation` is no longer shipped. For engineering preparation of
a new or existing software project, use the separately usable
[Agentic Foundation](https://github.com/arcitai/agentic-systems/tree/main/foundation/agentic-foundation)
skill directly in Codex or Claude; T3 Code is not required. OSM has no runtime
dependency on it, does not install it and contains none of its content. Coding
work uses the project's native or selected engineering methods. Explicit
callers of the old name must be updated. The
[Project Foundation note](project-foundation.md) keeps its history.
