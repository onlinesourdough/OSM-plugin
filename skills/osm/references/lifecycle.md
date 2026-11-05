# Track one outcome through delivery

Use before substantive multi-step work or implementation, on scope change and
at handoff/completion. Small one-step answers skip planning. Input: accepted
requirements, proof, scope/action authority, current phase and lead/worker
linkage. Keep one contract and one live requirements list; contract/evidence
pointers may persist separately. The lead's default model remains the user's configured choice.

User instructions take precedence over this method's preferences within actual
system/developer and tool constraints. Carry forward accepted decisions and
scope/action authority across phases and continuation. Complete authorized
implementation, relevant checks, fixes and Review before stopping. A phase label,
first implementation or optional missing capability is not a blocker. If a real
missing decision, permission or required capability holds an action, name that
action, the requirement's source and what is needed; continue independent work.

## Shared method and execution

Before costly production, identify the accepted result, proof, continuation and
completion boundary. Honor explicit preparation or execution requests; a cheaper
route cannot narrow the outcome. Use the existing contract and relevant sources
to decide whether to answer here, prepare a usable handoff or complete production.
Continue under existing authority unless a material choice remains unresolved.
Task size, domain and phase alone select no destination or extra artifact.

[Model advice](model-advice.md) supplies model/reasoning suitability
for that work. Its capability/cost evidence may reopen this decision; it does not
define the deliverable or take over responsibility for continuation. Keep source
ownership distinct from the app, harness or session doing the work.

Spec, Build, Review and Ship are shared OSM plugin skills. The repository's
AGENTS, specialist skills, requirements, checks and recovery records supply
local truth. Resolve shared skills through the current harness; do not copy,
wrap, rename, symlink or vendor them into each System or Project. Plugin
discovery is independent of filesystem ancestry and supplies no runtime
dependency, personal context or additional authority. Read only the active
phase and conditional references needed for the change, once per revision.

Continue in the current task by default, including substantive repository work,
design exploration and closely coupled changes. A task opened directly in a
System or Project is already its execution owner and needs no lead, launch
contract or handback to begin. A current task may work across authorized roots
sequentially after reading each root's local instructions and verifying identity.
Use isolation where concurrent work warrants it; retain one writer per overlapping
change. Do not confuse the canonical owner with the choice of session.

Delegate only when a separable result has clear inputs, allowed scope and proof,
and the expected gain in capability, independent evidence, context isolation or
useful parallel progress outweighs launch, context transfer, coordination,
review and retry cost. Task size, another repository or a bounded edit alone
does not establish that gain. Preserve a healthy context-rich session when
transfer would mostly repeat discovery. No universal token or performance
advantage is claimed for either execution mode.

Delegation with retained caller coordination/acceptance selects
[Orchestrate workers](../../osm-orchestrate-workers/SKILL.md).
[User-owned continuation and whole-task handoff](continuation.md) belong to this
shared lifecycle. Load that procedure only for a selected/requested handoff;
it owns the usable prompt, receiving context and supported transfer. A new-task
request alone does not select orchestration; native authorization rules still apply.
Otherwise stay here and do not load orchestration. Prefer a scoped review pass in the same
task unless a distinct reviewer is requested or materially improves confidence;
consequential output may require independent evidence. Review remains a separate
inspection of the final subject, even when the same session performs it.

## Native tracking SOP

Use an available native plan/task-list tool for substantive multi-step work;
native planning does not require Plan mode. Inspect its actual invocation rules
and keep one concise plan for the accepted outcome, including pending Review
and authorized delivery. Reuse current tool
and task evidence; recheck availability only when it changes or a call fails.
Update the plan when progress, scope or a blocker materially changes, and at
handoff/completion. Obey the tool's status and concurrency constraints; no
extra call or numbered progress report is required for every substep.

Inspect call results and any exposed readback. Success proves the call, not
visible UI or independently stored state; disclose a material evidence limit
once, without turning an empty response into a work blocker. If the tool is
unavailable or fails, report that state and use one narrow existing file
fallback (for example `docs/todo.md`), creating it only if needed. When native
tracking returns, reconcile the same requirements and retire the file as a
live list. Do not maintain duplicate live lists or silently change global
configuration; authorized setup/repair uses [configuration guidance](../../osm-setup/references/harness-codex.md#native-task-list-exposure).

Added scope preserves still-active requirements and authority; reopen affected
completed items and invalidate their old proof. At handoff/completion, map the
accepted requirements to current evidence or an explicit unresolved status.
Worker completion cannot complete pending caller Review, approval or delivery.
Report the useful result, material gaps and next action; claim native state
only when observed. Keep durable contract/evidence pointers where the owning
repository needs them, without duplicating the live plan.

## Native goals are separate

Inspect actual goal state and invocation rules when controls exist. Reuse a
compatible unfinished goal and carry its identity, objective and explicit user
request through scope changes, worker handoffs and continuation. A phase change
is not a new request boundary: do not erase earlier authority as “no new request”.
If activation requires an explicit request and none exists, do not create a goal.
No goal request does not disable native planning. A skill or lead preference
cannot supply user/system/developer consent required by the actual goal tool.

When explicitly requested for this work and supported, invoke creation/reuse
under those rules and verify returned identity/objective/state; no new goal per
phase or budget unless requested. A worker carries the lead's goal/objective and
authorization, inspects its own state, and creates a narrower goal only when the
accepted request authorizes that worker goal under native rules. Otherwise
acknowledge linkage, not activation. Missing required activation holds dependent
work; report unavailable controls or errors honestly and do not silently substitute a note.
If the runtime genuinely has no native goal controls, label the contract as
non-native; it does not provide native cross-turn continuation.

## Phase use and conditional recovery

[Spec](../../osm-spec-work/SKILL.md) runs the SOP before READY;
[Build](../../osm-build-work/SKILL.md) updates it before implementation or scope
changes; [Review](../../osm-review-work/SKILL.md) checks requirement-to-evidence
coverage; authorized [Ship](../../osm-ship-work/SKILL.md) retains pending delivery
until readback. Keep the same task or selected worker, root, contract and applicable goals through
waiting-review and revisions. Completion requires all accepted obligations and
any required independent acceptance; logical waits are not native terminal states.

[Routing](routing.md) selects the owner/workflow before production.
[Orchestration](../../osm-orchestrate-workers/SKILL.md) carries the tracking
state, request authority and bounded worker requirements without widening action
or sidebar authority. Independent repositories use this same tracking SOP with local evidence pointers.

Only for interruption or goal-state mismatch, use [recovery](recovery.md#native-state-deadlock).
Its fallback applies only to an
already verified goal state; it does not waive initial activation. Preserve
healthy sessions, one writer, pending approvals and exact action authority.
