---
name: osm-review-work
description: Review a result against its accepted outcome, or audit requested repository drift, without editing.
metadata:
  version: "2.0.1"
---

# OSM:review-work

Use the [native tracking SOP](../osm/references/lifecycle.md) at Review: reconstruct
accepted requirements, carried goal authority and the actual tracking readback
or declared fallback. Map every requirement to final evidence or unresolved
status; pending lead approval/delivery stays pending. Review the affected
workflow in proportion to the accepted contract; do not turn a scoped review
into a broad whole-system scan. Prefer the lead with that context; use a
bounded independent reader when it materially improves confidence and the
harness and task authorize it. Orchestration is a native conditional procedure,
not runtime capability or a replacement writer.


For direct repository work, use local AGENTS, specialist criteria and evidence
without personal context or a second local Review skill. Use the current task
for a proportionate review pass. Delegated work still needs its caller's
independent acceptance; an explicitly required independent reviewer remains
required. Do not invent a lead for a directly opened task.
This review gate is not a new OWNER approval request. Existing action authority
remains valid for its exact scope; ask the owner only for a real missing decision
or permission. Do not stop routine in-scope repairs at intermediate phase labels.
The reviewer reconstructs intent and inspects the actual artifacts and latest proof
for the delivery and affected workflow, including relevant success, denial,
duplicates, failure/recovery and source ownership. Review does not mutate its
subject. Return PASS, REVISE or BLOCKED. A wrong or incomplete task result is
`REVISE` to the same writer and goal with updated requirements; `BLOCKED`
preserves state. Keep delivery defects and underlying improvement signals
separate. A worker's concrete signal or a lead's independent concrete finding
invokes [improvement triage](../osm-triage-improvement/SKILL.md) for its
disposition; no signal
means do not load it, search for a duplicate, take issue action or add a
mandatory disposition workflow. A correct delivery may still have a signal,
and `REVISE` and a signal may coexist.

For skill/procedure changes, check that each shared procedure has one canonical
owner and callers link to it with their trigger and required result. Flag copied
step lists, competing acceptance rules and circular delegation without an
executable owner; do not merge distinct responsibilities just to reduce files.

For a human-facing result or PR, inspect Build's
[review handoff](../osm-build-work/references/review-handoff.md) against the actual
candidate and evidence. Check that the format answers the reader's question about
the change; flag decorative or redundant visuals. Check rendering and useful links; keep
decision-relevant failures visible and distinguish illustration from observation.
This is part of the current review, not another approval step.

For test changes, apply Write Code’s canonical
[test-value rubric](../osm-write-code/references/test-value.md), checking the
protected contract and remaining useful coverage rather than test count.

For code review, including scripts, shell snippets, SQL, tests and automation,
use [Write code](../osm-write-code/SKILL.md) in read-only review mode. Apply its shared
quality criteria to the actual code and current behavioral proof; feed findings
into this gate without editing the subject or starting another Build/Review loop.

When the changed result may materially alter a real-world outcome, read
[Risky Changes](../osm-risky-changes/SKILL.md). It owns the representative
before/after comparison and residual-unknown assessment; this independent
Review still owns acceptance and does not gain Ship authority. Routine edits do
not select it.

Bind PASS to exact artifact hashes (or commit/tree), proof and reviewed contract
revision. Any later relevant mutation invalidates affected evidence and PASS.
The same writer reruns impacted checks on final bytes, then the reviewer
reconciles requirements against those bytes. Test output from before a change
cannot accept the changed result. If only an evidence record changes, hash the
subject separately to avoid claiming self-referential proof.

PASS does not complete pending obligations. Apply the SOP's completion gate;
logical waiting-review is not a native terminal state.

Inspect correctness and failure paths, documentation and command truth,
ownership, unnecessary complexity, relevant security boundaries and recovery.
Source checks do not prove runtime behavior. Do not accept weakened tests as
proof of a fix; an accepted behavior change needs replacement coverage.
For a requested whole-repository health check or accumulated drift assessment,
use [repository audit](references/repository-audit.md). It is not an extra phase
after ordinary changes. Domain-specific reviews and audits stay with their owning skill or specialist.

## Conditional quality checks

Read [contextual quality](references/contextual-quality.md) only for the checks
that affect this result: owner principles for a material recommendation, voice
for owner-facing writing, and actual rendered quality for a visual artifact.
Use selected client sources and accepted task decisions. Missing values remain
missing; do not invent preferences or load unrelated personal context for code
review. Applicable findings join the same gate, not an automatic extra phase.

Before claiming the whole result complete, use
[completeness](references/completeness.md). After PASS, continue to
[Ship](../osm-ship-work/SKILL.md) only for the already authorized action; a
review-only request does not authorize implementation or delivery.
