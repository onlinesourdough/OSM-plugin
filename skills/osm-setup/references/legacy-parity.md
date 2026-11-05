# Legacy behavior and current public routes

This is a behavior map, not a requirement to ship one entry per old file.
The 17 core template methods were inspected separately from optional external
Global Skills. Current native skills are organized by responsibility; smaller
checks and conditional procedures live with the workform that owns them.
Client facts and personal methods are not copied into this package.

| Legacy method | Public route and canonical procedure | Disposition and preserved behavior |
| --- | --- | --- |
| aios | [osm](../../osm/SKILL.md), [Setup](../SKILL.md), [Check](../../osm/references/check.md), [Manage Data & Context](../../osm-manage-data-context/SKILL.md), [Update](../../osm/references/update.md) | Split by trigger: owner coordination and shortest justified route stay in `osm`; setup/resume, state inspection, context mutation and package adoption each use their focused owner; independent repositories remain local-first |
| aios-build-work | [Build](../../osm-build-work/SKILL.md) | Keep: verified repository root, current-task execution by default, one writer, linked lead/worker goals when explicitly required, bounded contract, relevant local checks and evidence |
| aios-create-project | [Create Project](../../osm-create-project/SKILL.md) | Broadened: useful project workspace and context without mandatory Git; a selected repository seed retains verified source, documented creation and independent ownership |
| aios-create-system | [Manage Skills](../../osm-manage-skills/SKILL.md), [Create Project](../../osm-create-project/SKILL.md) | Retired: reusable methods use skill management; a new independently maintained solution uses ordinary project creation and its own requirements, ownership and proof |
| aios-evaluate-completeness | [Review](../../osm-review-work/SKILL.md), [final completeness](../../osm-review-work/references/completeness.md) | Embed: explicit requirement-to-final-evidence gate before done; also used proportionately by ordinary AIOS handback and Ship reconciliation |
| aios-evaluate-publish-safety | [Ship](../../osm-ship-work/SKILL.md), [final action check](../../osm-ship-work/references/publish-safety.md) | Embed: exact content, identity, authority, privacy, claims and commitments checked last before effect |
| aios-evaluate-spec-work | [Spec](../../osm-spec-work/SKILL.md), [readiness](../../osm-spec-work/references/readiness.md) | Embed: explicit pre-Build gate for maturity, evidence, source preservation, local invariants and bounded READY contract |
| aios-onboard | [Setup](../SKILL.md), conditional [Interview](../../osm-interview/SKILL.md) | Renamed: setup/resume, sourced context, first useful result and native readback stay in Setup; exploratory conversation uses Interview when needed |
| aios-review-work | [Review](../../osm-review-work/SKILL.md) | Keep: PASS/REVISE/BLOCKED; independent caller acceptance when delegated, latest-byte evidence, same-writer revision and any applicable worker goal active through waiting-review |
| aios-route-agentic-content-system | [osm](../../osm/SKILL.md), [System routing](../../osm/references/routing.md) | Retired from the package in OSM 0.31.0: Content is a separate, tailored method outside OSM. Its history is kept as non-shipped drafts; external publication remains separately authorized |
| aios-route-agentic-design-system | [osm](../../osm/SKILL.md), [System routing](../../osm/references/routing.md) | Retired in AIOS 0.29.0: the design method embedded here earlier was removed from the package. Visual work uses an installed design method if the host provides one, otherwise direct work or a reported missing method; existing project `DESIGN.md` and `design/` files stay in their project |
| aios-route-business-constraint | [osm](../../osm/SKILL.md), [business routing](../../osm/references/routing.md) | Embed: current Offer/Operations/Demand constraint, Eliminate/Automate/Delegate and smallest owner; no mandatory business interview |
| aios-ship-work | [Ship](../../osm-ship-work/SKILL.md) | Keep: exact Review plus authority, same writer/goals rather than a Ship goal, destination readback, recovery and three outcome states |
| aios-spec-work | [Spec](../../osm-spec-work/SKILL.md) | Keep: four maturities, ten evidence dimensions, preserved sources, one authorized goal plus concise todo, worker linkage only when delegated and one readiness gate |
| aios-sync | [Manage Data & Context](../../osm-manage-data-context/SKILL.md) | Retired with the file home in OSM 0.31.0: folder-home Sync is not an active route; a legacy folder or vault home is read-only and the [update reference](../../osm/references/update.md) has a legacy-home section with the migration guidance |
| aios-triage-improvement | [Triage improvement](../../osm-triage-improvement/SKILL.md) | Keep: concrete-signal trigger, lead disposition, sanitized deduplicated brief, authorized issue/comment and exactly-once readback without changing the primary gate |
| aios-update | [Update](../../osm/references/update.md), [identity migration](migration.md) | Keep: independent package-adoption intent, pinned release, native registration, collision proof and rollback; no legacy updater runtime |

## Whole snapshot inventory

An exhaustive `SKILL.md` file inventory at accepted legacy commit
`ca1ba807716d1a992889f02d41cddf94fdee9f32` contains exactly the 17 rows above.
It contains no personal, System, Project or Global Skill body. The old README and
instructions name three optional methods without bundling them; broader accepted
migration evidence also accounts for the two other historical Global methods:

| Named external method | Current owner/disposition |
| --- | --- |
| `clarify` | Adopted as native [Clarify](../../osm-clarify/SKILL.md) in AIOS 0.16.0 for complex explanations and optional visuals; the former mandatory HTML output is intentionally adapted |
| `manage-skills` | Its accepted responsibility moved to native [Manage Skills](../../osm-manage-skills/SKILL.md); no external body existed in the snapshot to migrate |
| `orchestrate-workers` | Its accepted responsibility moved to native [Orchestrate workers](../../osm-orchestrate-workers/SKILL.md); no external body existed in the snapshot to migrate |
| `route-models` | Retired at historical change `8b81375`; current model advice lives in [model advice](../../osm/references/model-advice.md), without restoring a model catalog |
| `shape-offer` | Retained in the public Global Skills archive; not adopted or actively routed by AIOS |

Four private personal methods were retained through owner migration and current
discovery; their bodies remain owner-controlled and are not enumerated in this
product source. Six Project Template development methods and eight Pi setup
methods likewise remain with those independent repositories. Synthetic test names such as
`owner-workflow`, `global-helper`, `system-method` and `project-method` are
fixtures proving preservation boundaries, not shipped methods. This inventory
does not infer the contents of any historical populated owner home from the
template's placeholder owner files.

Useful native workforms beyond the direct legacy keep rows:
[Check](../../osm/references/check.md) for installation/format/harness evidence (a read-only reference under `osm`, as are Update and model advice) and
[Manage Data & Context](../../osm-manage-data-context/SKILL.md) for durable facts/routes,
and [Orchestrate workers](../../osm-orchestrate-workers/SKILL.md) for an actual
lead worker plan, launch or recovery. [Manage Skills](../../osm-manage-skills/SKILL.md)
owns personal skill placement/discovery and reviewed capability adoption,
update, removal and rollback.
They are distinct from artifact Review and package Update. OSM 0.1.x's `osm`,
`osm-onboard`, `osm-check` and `osm-maintain-context` map to those current workforms;
OSM 0.30.0 reuses three of those names for different bodies, so classify by source
and version, never by name ([identity migration](migration.md));
the old umbrella's lifecycle is now directly invocable as Spec/Build/Review/Ship.

Conditional [principles, voice and visual checks](../../osm-review-work/references/contextual-quality.md)
belong in Review. They retain observable judgment but use the selected client's
sources, not the author's preferences. Clarify is now independently discoverable in this package; the former offer
method remains archived. Neither is a prerequisite for unrelated work. Native management, orchestration and triage are conditional
routes; none grants a worker runtime or external issue authority.

The public count is an outcome of responsibility boundaries, not a target.
Creation, setup, inspection, context mutation, skill management, worker
orchestration, lifecycle phases, improvement triage and package adoption retain
focused discovery entries because their triggers or effects differ. The three
legacy evaluations are phase-owned gates, so separate auto-discovery would add
competing owners. Business and specialist routing share one owner-coordination
job: `osm` selects the relevant context and method. Included specialist skills
own their domain process; selected external specialists retain their own
interfaces. The old routes do not require a registry or a second project type.

## Migration consequences

Use this map only after [origin and collision checks](migration.md). A matching
name does not make an existing skill this package's property. Preserve original
bodies and unknown metadata. Adapt a retired caller only to a proved current
route with the same intent and gate, keeping all other bytes unchanged.
Verify the new link/invocation and record transformed hashes separately from
originals. Identical replay is a no-op; later edits are conflicts. Non-product
methods and every System/Project's implementation stay with their own owner.

Intentional adaptations include asset-based neutral setup, seed-owned creation
interfaces, optional local-first Git, native package updates, no mandatory
runtime helpers, and native goal/tool controls only within their actual
invocation rules. Missing optional methods never fabricate a runtime or block
an otherwise supported native route.

## Shared-method revision (0.4.0)

The historic lead/worker vocabulary above records the retained responsibilities.
Current execution selection belongs to the shared lifecycle: ordinary repository
work stays in its task, shared plugin phases replace local generic copies, and
worker linkage/caller acceptance apply only to actual delegation.
