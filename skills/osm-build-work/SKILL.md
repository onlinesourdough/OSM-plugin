---
name: osm-build-work
description: Implement and verify accepted work through in-scope fixes and Review.
metadata:
  version: "2.0.2"
---

# OSM:build-work

Start from a READY [Spec](../osm-spec-work/SKILL.md) or an already accepted
contract. Return to Spec only for a material gap. Deliver the whole authorized
result through implementation, relevant verification, Review and requested Ship.
A small mechanical edit needs its scoped diff and affected check.

Before implementation, use [Model advice](../osm/references/model-advice.md) to
reconcile the Spec decision with the accepted work and current runtime. Reuse
current task evidence; if Build starts from an accepted contract without a
selection, make that proportionate assessment now. Continue on a sufficient
authorized route without adding a routine confirmation.

Use the [shared lifecycle](../osm/references/lifecycle.md) before substantive
implementation and on scope change. Reuse the current requirements, goal
authorization and evidence; reopen affected completed items. Conditional
recovery does not waive initial activation when the accepted work requires it.

Continue in the current task by default. For repository work, verify the exact
root, branch, local AGENTS, accepted inputs and available tools before mutation.
Use that repository's specialist workflow and local proof/recovery contract;
do not preload personal owner context or look for a second local Build skill.
Owner-level work uses [routing](../osm/references/routing.md) to select its owner.
Use [Orchestrate workers](../osm-orchestrate-workers/SKILL.md) for justified
delegation with retained caller responsibility or worker recovery. The shared
lifecycle owns whole-task handoff; repository ownership alone requires no delegation.
Keep one writer for each overlapping change.

## Implement and verify

For any code written or changed, use [Write code](../osm-write-code/SKILL.md),
including scripts, shell snippets, SQL, tests and automation. It owns code-quality
criteria and verification by changed surface; apply them proportionately even
to small one-off code. Reuse the result in this Build and its existing Review.

Choose evidence for the changed behavior and risk. Reproduce a behavioral defect
at the nearest safe representative boundary when practical; otherwise state the
reproduction limit and verify the strongest meaningful regression. Do not weaken
checks to obtain green. A changed accepted contract needs rationale and replacement
coverage. Instruction changes may use validators or scoped rehearsals; design,
content and data work use domain proof rather than compulsory software tests.

Preserve unrelated tracked, untracked and ignored work. Use the existing working
stack unless a material [technology decision](../osm-spec-work/references/technology.md)
changes it. Keep affected README, routes, interfaces, runbooks and evidence
current. Add runtime layers only for an actual responsibility. Follow the
accepted [security contract](../osm/references/security.md) when its boundary
applies; ordinary work gains no scan ritual.

Prove final bytes through the real interface or an appropriate validator,
including relevant failure, denial, duplicate and recovery behavior. Fix in-scope
findings and rerun affected checks. Repeat or broaden sufficient verification
only for a relevant change, failure or unresolved concern. Report unavailable
required proof honestly; continue independent work.
For substantive results, prepare a concise [human review handoff](references/review-handoff.md).
Continue to [Review](../osm-review-work/SKILL.md) within this task; a phase label
or the first successful test is not a completion boundary.

For delegated work only, return the orchestration handback once to the caller
and retain the same worker through any revision. Direct work has no invented
lead or waiting-review handoff. Existing action authority carries across phases;
it does not expand destinations or permissions.
