---
name: osm-write-code
description: Write or change code of any size, including scripts, shell snippets, SQL, tests and automation; apply proportionate quality and verification, also when reviewing code.
metadata:
  version: "2.1.0"
---

# OSM:write-code

Use for authoring, changing or reviewing code, including one-off scripts,
notebooks, executable configuration and examples. Tool invocation or explanation
alone needs no coding workflow.

Use the accepted task, local AGENTS and repository conventions/tools. Keep small
work direct. Build implements and verifies; read-only Review reports through the
existing gate. Add no separate lifecycle or report. Drafting code grants no
execution or external-write authority.

## Code that earns its complexity

- Read surrounding code and interfaces first. Use domain names, clear control
  flow and local type/style rules. Expose meaningful failures; avoid broad
  catches, invented defaults and success-shaped fallbacks that hide defects.
- Keep cohesive responsibilities: gather behavior that changes for the same
  reasons; separate independent policies. Hide internals behind small caller
  contracts. Avoid circular dependencies and hidden shared
  mutable state. Share common behavior, not merely similar syntax.
- At meaningful domain/I/O boundaries, keep business rules independent of
  framework/provider types and concrete storage. Adapters translate
  external data/errors; core contracts express what the caller needs. Supply
  dependencies explicitly when useful, including time/randomness for repeatable
  tests. Follow local architecture/idioms; functions/modules may suffice.
  Prefer composition over inheritance for unrelated policies.
  A real boundary may justify one-caller abstraction; speculative interfaces,
  containers, wrappers and dependencies do not. Small scripts can stay one file.
- Define inputs, outputs, errors and domain invariants. Validate untrusted data
  at boundaries; preserve valid internal states and compatibility, or make the
  accepted change explicit. CLI arguments, stdout/stderr and exit status are APIs.
  Consider authorization, atomicity, concurrent updates, retries/idempotency,
  cancellation and partial failure where they affect correctness. Own resource
  cleanup; bound waits/work where needed. Check expected data sizes and measure
  relevant performance rather than optimizing speculatively. Failures should be
  diagnosable without exposing secrets or sensitive data.
- Comments explain intent, constraints and tradeoffs; document public contracts
  for correct use. Update stale comments. Remove obvious narration, AI
  meta-comments, scaffolding, dead code and fake implementations; preserve
  required notices/generated attribution. Complete relevant failure, empty and
  loading states. Keep changes scoped and affected documentation accurate.

For extraction, inspect affected callers, move a bounded part, verify one caller
then the others before removing old code. Preserve caller-specific permissions,
transactions and retry policies. A substantial setup/delivery foundation gap
uses a separately selected method such as Agentic Foundation, or is reported;
changed sensitive or protected boundaries use the existing
[security contract](../osm/references/security.md).

## Evidence suited to the change

Before adding or materially changing tests, apply the compact
[test-value rubric](references/test-value.md). It owns the decision; use it
before authoring, not as a test-count target after the fact.

Verify at the nearest useful boundary. Test observable contracts/invariants and
distinct regressions, not internal call sequences or redundant cases.
Run required checks without weakening them. Add durable tests for meaningful
behavior, without a coverage quota or a new framework for every snippet.

| Changed surface | Useful verification |
| --- | --- |
| UI/UX, layout or interaction | Exercise the running flow with browser/computer-use tools, including relevant viewports, keyboard/focus, loading and errors. Keep useful screenshots/traces; source or an initial screenshot cannot prove interaction. Avoid styling-only unit tests; protect critical repeated flows with end-to-end tests when warranted. |
| Logic, parsing or state | Test contracts, boundaries and distinct regressions in the existing stack. Reproduce a failing regression before fixing a defect when practical. Exercise core rules independently of external I/O where useful. |
| API, database or integration | Exercise relevant success/failure at the actual boundary with controlled data. Check affected atomicity, concurrency, duplicate/denied operations and compatibility. Distinguish mocks and synthetic adapters from observed integration. |
| Script, CLI or automation | Invoke representative disposable inputs; check results, errors, exit status and relevant repeated runs. State changes use safe fixtures or supported dry runs within authority. Syntax alone is insufficient. |
| Code example or executable configuration | Validate syntax/documented behavior in a safe example when practical. Honor draft-only requests and state unexecuted assumptions. |

After final edits, rerun affected verification; reuse unchanged proof. Report
checks, observed behavior and gaps. Use another suitable authorized tool if a
needed interface is unavailable; never invent PASS or default testing to the
user. Build owns repairs and Review acceptance within the existing task.
