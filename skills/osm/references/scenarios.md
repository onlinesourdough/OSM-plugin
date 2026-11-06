# Acceptance scenario route

Use only the scenario set for the affected checkpoint:

- [setup, migration and client entry points](../../osm-setup/references/setup-scenarios.md); or
- [work lifecycle, routing and delivery](workflow-scenarios.md).

A small mechanical fix needs its affected check and diff review, not either
whole set. Evaluate without editing. For each selected case record subject,
checkpoint, observable check, actual evidence and failure action. PASS requires
all applicable checks; missing runtime proof is NOT VERIFIED, never inferred
from wording. Freeze subject hashes separately from the report. Any relevant
later edit reruns the affected checks and invalidates prior acceptance.

| Eval / checkpoint | Observable checks and evidence | Failure action |
| --- | --- | --- |
| Spec readiness / before Build | Use the [Spec-owned readiness gate](../../osm-spec-work/references/readiness.md) | Revise or hold the material gap before Build |
| Setup / before claiming onboarded | Correct home, effective bridge, preserved content/authority, supported format, resolving routes, safe access test or explicit gap, first artifact, cold routing and owner confirmation/correction of generated snapshot/routes | Repair authorized setup or report unavailable evidence; pending confirmation is not full acceptance |
| Completeness / before final handback | Use [Review-owned final completeness](../../osm-review-work/references/completeness.md) | Revise and recheck changed final bytes |
| Publish safety / last before effect | Use [Ship-owned final action checks](../../osm-ship-work/references/publish-safety.md) | Hold unsafe or unauthorized action |
| Reconciliation / after delivery | Read actual destination and compare reviewed content, scope, recovery and measured outcome | Return to the same worker and gate; no premature completion |

Run with synthetic owner data and isolated configuration first. A dry-run is
instruction interpretation; actual cold harness selection and external effects
need separate observed evidence. Do not run destructive cases on real data.
