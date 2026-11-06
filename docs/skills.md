# OSM skills

OSM ships 22 native skills. Method skills are named `osm` or `osm-*`; their
titles and Codex display names use `OSM:skill-name`: uppercase `OSM`, a colon
without spaces, and lowercase hyphenated names. The display label omits the
redundant leading `osm-` from the canonical name, and the `osm` entry shows as
`OSM:context-and-methods`. Content and Diffusion Studio keep their own names.
Automatic selection uses each skill description; explicit invocation uses the
canonical name and native namespace. OSM 0.30.0 renamed the earlier `aios`,
`aios-*`, `clarify`, `human-writing` and `write-code` skills; Setup earlier
replaced `aios-onboard`. Update explicit callers on adoption. Each
carries an independent quoted `metadata.version`; see
[version maintenance](skill-versioning.md). Repository development methods in
`.agents/skills/` are separate and are not product skills.

| Skill | Responsibility |
| --- | --- |
| [OSM:clarify](../skills/osm-clarify/SKILL.md) | Explain complex topics and decisions with concrete examples and visuals when they help understanding |
| [Content](../skills/content/SKILL.md) | Produce and review content with sources, lineage and reuse evidence when needed |
| [Diffusion Studio](../skills/diffusion-studio/SKILL.md) | Use optional Diffusion Studio for video production |
| [OSM:human-writing](../skills/osm-human-writing/SKILL.md) | Default prose drafting and editing that preserves facts, uncertainty and the user’s voice |
| [OSM:write-code](../skills/osm-write-code/SKILL.md) | Quality and proportionate verification whenever writing or changing code, including scripts and automation; shared criteria for read-only code review |
| [OSM:context](../skills/osm-context/SKILL.md) | Select and maintain the chosen context-home contract; route setup, retrieval and audit to its provider |
| [OSM:context-and-methods](../skills/osm/SKILL.md) | Select relevant context and methods for the current task |
| [OSM:interview](../skills/osm-interview/SKILL.md) | Explore context, challenge assumptions and find direction when requested or materially needed at the start; no routine interruption of execution |
| [OSM:build-work](../skills/osm-build-work/SKILL.md) | Implement and verify accepted work through in-scope fixes and Review |
| [OSM:check](../skills/osm-check/SKILL.md) | Inspect installation, owner format, and discovery |
| [OSM:create-project](../skills/osm-create-project/SKILL.md) | Establish a useful project workspace, context and simple structure; Git is optional |
| [OSM:maintain-context](../skills/osm-maintain-context/SKILL.md) | Maintain owner facts, routes, connections, and explicit continuity Sync |
| [OSM:manage-skills](../skills/osm-manage-skills/SKILL.md) | Manage personal and installed skill lifecycles |
| [OSM:setup](../skills/osm-setup/SKILL.md) | Set up or move an owner home and native bridge |
| [OSM:orchestrate-workers](../skills/osm-orchestrate-workers/SKILL.md) | Prepare and recover delegated workers when the caller retains coordination and acceptance |
| [OSM:risky-changes](../skills/osm-risky-changes/SKILL.md) | Assess consequential changes proportionately |
| [OSM:review-work](../skills/osm-review-work/SKILL.md) | Inspect the final result against its contract; caller acceptance remains separate for delegated work |
| [OSM:select-model](../skills/osm-select-model/SKILL.md) | Assess remaining judgment and select model/reasoning for the accepted work; return capability/cost evidence to the shared task decision |
| [OSM:ship-work](../skills/osm-ship-work/SKILL.md) | Deliver an exactly reviewed result under authority |
| [OSM:spec-work](../skills/osm-spec-work/SKILL.md) | Resolve a substantive OSM work contract |
| [OSM:triage-improvement](../skills/osm-triage-improvement/SKILL.md) | Route a concrete underlying improvement signal |
| [OSM:update](../skills/osm-update/SKILL.md) | Update selected optional specialists or adopt/roll back OSM |

Content preserves its domain standards through focused references
and helpers. The assistant chains relevant skills using the current task and
its accepted result; no workflow engine or fixed chain schema is required.
Working material stays in the project. Optional tool setup is loaded only for
work that uses that tool.

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

Plugin namespaces come from the harness, for example `osm:content`; canonical
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
Update owns native package recovery and selected specialist maintenance;
Maintain Context owns facts, and Check observes state. The
[legacy behavior map](../skills/osm-setup/references/legacy-parity.md) records
older method routes. Domain preservation is documented in the
[content](content-preservation.md) map; the [design map](design-preservation.md)
is historical for the design skills retired in 0.29.0.

## Retired: Project Foundation (0.28.0)

`aios-project-foundation` is no longer shipped. For engineering preparation of
a new or existing software project, use the separately usable
[Agentic Foundation](https://github.com/arcitai/agentic-systems/tree/main/foundation/agentic-foundation)
skill directly in Codex or Claude; T3 Code is not required. OSM has no runtime
dependency on it, does not install it and contains none of its content. Small
coding work stays with Write Code; without a selected foundation method, OSM
reports the gap. Explicit callers of the old name must be updated. The
[Project Foundation note](project-foundation.md) keeps its history.
