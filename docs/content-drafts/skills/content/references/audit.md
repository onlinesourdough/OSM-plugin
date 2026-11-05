# Read-only content audit

State the requested scope: repository/workspace, one named outcome, or both.
Do not silently scan every production. Reuse shared OSM Review for generic
repository health; inspect the applicable local instructions, methods, scripts,
tests and Git state. Run only checks known to be read-only, with any disposable
test evidence outside the installed package and actual work data.

For the named outcome, inspect artifacts, [graph](graph.md), provenance, actual
review references and optional handoff. Recompute hashes without editing files.
Check stable identity/version continuity against available prior evidence,
explicit edges, optional targets, exact node approval, freshness and the four
supervised/not-posted handoff invariants. The validator cannot verify a
reviewer’s real decision. Missing evidence is not PASS.

For requested Studio readiness, use [Diffusion](../../diffusion-studio/SKILL.md)
`check` and, if runtime state is in scope, `status`. Report official origin/base,
fork branch/pin, drift or unavailable live heads, cleanliness, package manager,
build, DAPI health and browser limitations separately. Attribute existing public
audit findings and their date; do not invent a clean public audit from local
checks. Never install, build, update, start, repair or stop the editor in an audit.

Return:

```text
Result: PASS | FAIL | BLOCKED
Scope: repository/workspace | one named outcome | both
Checks: actual evidence and status
Evidence gaps: gaps, or none
Smallest next action: one bounded action
```

Return findings to the caller. An already-authorized repair can proceed under
Build after recording the audit result; the audit itself remains read-only.
