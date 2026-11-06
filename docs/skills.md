# OSM skills

OSM ships 17 native skills. Method skills are named `osm` or `osm-*`; their
titles and Codex display names use `OSM:skill-name`: uppercase `OSM`, a colon
without spaces, and lowercase hyphenated names. The display label omits the
redundant leading `osm-` from the canonical name, and the `osm` entry shows as
`OSM:context-and-methods`. Automatic selection uses each skill description;
explicit invocation uses the canonical name and native namespace. OSM 0.30.0
renamed the earlier `aios`, `aios-*`, `clarify`, `human-writing` and
`write-code` skills; Setup earlier replaced `aios-onboard`. OSM 0.31.0 renamed
`osm-context` to `osm-data-context` and `osm-maintain-context` to
`osm-manage-data-context`, folded Check, Update and Select model into
references under `osm`, and moved Content and Diffusion Studio out of the
package. Update explicit callers on adoption; `osm` routes the old names and
there is no alias skill. Each carries an independent quoted `metadata.version`;
see [version maintenance](skill-versioning.md). Repository development methods in
`.agents/skills/` are separate and are not product skills.

State: this describes the working tree, the unreleased `0.31.0`. It is declared and
fixture-tested, and not installed or native-tested. The released v0.30.0 ships 22
skills; see [GitHub Releases](https://github.com/onlinesourdough/OSM-plugin/releases).

| Skill | Responsibility |
| --- | --- |
| [OSM:clarify](../skills/osm-clarify/SKILL.md) | Explain complex topics and decisions with concrete examples and visuals when they help understanding |
| [OSM:human-writing](../skills/osm-human-writing/SKILL.md) | Default prose drafting and editing that preserves facts, uncertainty and the user’s voice |
| [OSM:write-code](../skills/osm-write-code/SKILL.md) | Quality and proportionate verification whenever writing or changing code, including scripts and automation; shared criteria for read-only code review |
| [OSM:data-context](../skills/osm-data-context/SKILL.md) | Engineer the Notion Data & Context home: root, one definition and the core Knowledge, Memory and Skills stores; never creates Content |
| [OSM:context-and-methods](../skills/osm/SKILL.md) | Explain OSM and route to the relevant method; hosts the internal check, update/rollback and model-advice references |
| [OSM:interview](../skills/osm-interview/SKILL.md) | Explore context, challenge assumptions and find direction when requested or materially needed at the start; no routine interruption of execution |
| [OSM:build-work](../skills/osm-build-work/SKILL.md) | Implement and verify accepted work through in-scope fixes and Review |
| [OSM:create-project](../skills/osm-create-project/SKILL.md) | Establish a useful project workspace, context and simple structure; Git is optional |
| [OSM:manage-data-context](../skills/osm-manage-data-context/SKILL.md) | Retrieve, take in and curate owner context and repair routes, schema and the definition; one method for manual, task-time and scheduled use |
| [OSM:manage-skills](../skills/osm-manage-skills/SKILL.md) | Manage personal and installed skill lifecycles |
| [OSM:setup](../skills/osm-setup/SKILL.md) | Set up or resume the Notion Data & Context foundation, from access to a useful first task |
| [OSM:orchestrate-workers](../skills/osm-orchestrate-workers/SKILL.md) | Prepare and recover delegated workers when the caller retains coordination and acceptance |
| [OSM:risky-changes](../skills/osm-risky-changes/SKILL.md) | Assess consequential changes proportionately |
| [OSM:review-work](../skills/osm-review-work/SKILL.md) | Inspect the final result against its contract; caller acceptance remains separate for delegated work |
| [OSM:ship-work](../skills/osm-ship-work/SKILL.md) | Deliver an exactly reviewed result under authority |
| [OSM:spec-work](../skills/osm-spec-work/SKILL.md) | Resolve a substantive OSM work contract |
| [OSM:triage-improvement](../skills/osm-triage-improvement/SKILL.md) | Route a concrete underlying improvement signal |

Three procedures live under `osm` instead of separate entries:
[check](../skills/osm/references/check.md) (read-only inspection),
[update and rollback](../skills/osm/references/update.md) (including guidance for
a legacy file or vault home) and
[model advice](../skills/osm/references/model-advice.md) (only on request).
Content and Diffusion Studio are not part of the package; their history is kept
as [non-shipped drafts](content-drafts/README.md). The assistant chains relevant
skills using the current task and its accepted result; no workflow engine or fixed
chain schema is required. Working material stays in the project.

## Triggers and calls

One owner per operation. "Calls" lists what a skill may hand work to; nothing in the
Setup, Data & Context, Manage Data & Context and Manage Skills chain calls back into
Setup. The check in `tests/responsibility-rehearsal.py` keeps this table's owners
consistent with the skill text.

| Trigger | Owner | Calls |
| --- | --- | --- |
| Explain OSM, pick a method, use a retired name | [OSM:context-and-methods](../skills/osm/SKILL.md) | Any owner below (routing only) |
| Set up or resume the foundation | [OSM:setup](../skills/osm-setup/SKILL.md) | Interview (only if context is missing), Data & Context, Manage Data & Context, Manage Skills |
| Engineer the Notion home | [OSM:data-context](../skills/osm-data-context/SKILL.md) | None |
| Retrieve, take in or curate context; scheduled upkeep | [OSM:manage-data-context](../skills/osm-manage-data-context/SKILL.md) | Data & Context (its contract), Manage Skills (method changes only) |
| Create or change a personal or team method | [OSM:manage-skills](../skills/osm-manage-skills/SKILL.md) | None in the context chain |
| Explore direction | [OSM:interview](../skills/osm-interview/SKILL.md) | Spec (reuses answers), Manage Data & Context (durable owner facts only) |
| Resolve a work contract | [OSM:spec-work](../skills/osm-spec-work/SKILL.md) | Interview, Risky Changes, Orchestrate workers, Build; model advice |
| Implement accepted work | [OSM:build-work](../skills/osm-build-work/SKILL.md) | Write Code, Review, Orchestrate workers; model advice |
| Inspect the result | [OSM:review-work](../skills/osm-review-work/SKILL.md) | Risky Changes, Write Code, Ship, Triage |
| Deliver a reviewed result | [OSM:ship-work](../skills/osm-ship-work/SKILL.md) | Review |
| Delegate to workers | [OSM:orchestrate-workers](../skills/osm-orchestrate-workers/SKILL.md) | Triage; model advice |
| Start a project workspace | [OSM:create-project](../skills/osm-create-project/SKILL.md) | Spec, Build, Review, Write Code, Human Writing, Manage Skills |
| Route an improvement signal | [OSM:triage-improvement](../skills/osm-triage-improvement/SKILL.md) | Ship |
| Assess a consequential change | [OSM:risky-changes](../skills/osm-risky-changes/SKILL.md) | None |
| Write prose, code or an explanation | [Human Writing](../skills/osm-human-writing/SKILL.md), [Write Code](../skills/osm-write-code/SKILL.md), [Clarify](../skills/osm-clarify/SKILL.md) | None |
| Inspect installation or state (read-only) | [check](../skills/osm/references/check.md) | None |
| Update, roll back, or move off a legacy home | [update](../skills/osm/references/update.md) | None |
| Model advice, only on request | [model advice](../skills/osm/references/model-advice.md) | None |

The [systems and workflow overview](../README.md#agentic-systems-and-skill-chains) connects these entrypoints
by purpose and result. Interview owns adaptive exploration and a shared question
procedure; Setup owns home and harness readiness. Spec reuses interview answers
and owns the execution contract. Neither installation nor a new project alone
requires an interview.

AIOS 0.29.0 no longer ships Design, Review Design or OpenPencil Workbench.
For visual work, use an installed design method if the host provides one;
otherwise do the work directly or report the missing method. Existing projects
keep their `DESIGN.md` and `design/` files. Build's
[review handoff](../skills/osm-build-work/references/review-handoff.md) keeps
the before/after rule: compare a real baseline and candidate capture of the
same state, viewport and data.

Plugin namespaces come from the harness, for example `osm:osm-setup`; canonical
skill names remain portable. Personal methods keep their owner's chosen name
and use the existing Manage Skills rename/discovery procedure; no OSM prefix
is required. They remain separate from the distributed package. Shared Review
already owns contextual principles, voice and visual checks; reuse it where a
personal evaluator adds no distinct requirement.

Write code also applies directly to small code requests. Build invokes it for
any code it authors, and Review uses its criteria without editing. It does not
introduce a second lifecycle or require unit tests for every UI change. See the
[implementation and verification record](write-code.md).

Create Project establishes a workspace for the actual work; Git and a repository
template are optional. Manage Skills owns reusable specialist
methods. Independently maintained solutions keep their local ownership and
ordinary project lifecycle. No mandatory OSM registration is created.
The update reference owns native package recovery and selected specialist
maintenance; Manage Data & Context owns facts, and the check reference observes
state. The [legacy behavior map](../skills/osm-setup/references/legacy-parity.md)
records older method routes. The [content](content-preservation.md) map is
historical for the Content method that left the package in 0.31.0; the
[design map](design-preservation.md) is historical for the design skills retired
in 0.29.0.

## Retired: Project Foundation (0.28.0)

`aios-project-foundation` is no longer shipped. For engineering preparation of
a new or existing software project, use the separately usable
[Factory Foundation](https://github.com/arcitai/factory/tree/main/foundation/factory-foundation)
skill directly in Codex or Claude; T3 Code is not required. OSM has no runtime
dependency on it, does not install it and contains none of its content. Small
coding work stays with Write Code; without a selected foundation method, OSM
reports the gap. Explicit callers of the old name must be updated. The
[Project Foundation note](project-foundation.md) keeps its history.
