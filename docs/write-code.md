# Write code

## Engineering criteria revision 1.1.0

The accepted 2 October 2026 scope strengthens the existing general-purpose
method across languages and projects. Baseline: AIOS 0.16.0 at
`082cfe3a9168c06526f9c53f309687a92f3a551b`, write-code 1.0.2. Test that baseline
before editing the skill, then implement and repeat the same bounded trials.

Write-code 1.1.0 makes cohesion, information hiding and explicit dependencies
concrete. Business rules stay independent of framework/provider types and
storage at meaningful boundaries; functions and modules remain valid choices.
Composition, small contracts and repeatable tests do not mandate interfaces,
classes, dependency-injection containers or a new architecture for small work.
Caller-specific authorization, transactions and retries survive extraction.

The revision also names domain invariants, concurrency/atomicity, partial
failure, resource cleanup, bounded work and diagnosable failures. Performance
work follows expected sizes and measurement. Missing project foundations and
changed security boundaries route conditionally to their existing canonical
owners; there is no duplicate setup, security scan or acceptance procedure.

The skill's minor version records a compatible expansion of quality criteria,
with unchanged discovery, authority and lifecycle. AIOS 0.18.0 includes this
revision and preserves the 0.17.0 project-creation changes, 25-skill inventory
and supported owner formats. Package release and installed plugin adoption are
verified separately against the delivered ref; 0.17.0 remains the recovery ref.

### Research used for this revision

- [Robert Martin on SRP](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html):
  cohesive change responsibilities and coupling.
- [Cockburn's original hexagonal architecture](https://alistair.cockburn.us/hexagonal-architecture/):
  separating business rules from external devices through application contracts.
- [Fowler on dependency injection](https://martinfowler.com/articles/injection.html):
  separating configuration from use.
- [The Pragmatic Programmer tips](https://pragprog.com/tips/): knowledge-based
  DRY, decoupling, composition alternatives and resource ownership.
- [Fowler on YAGNI](https://martinfowler.com/bliki/Yagni.html): maintaining
  malleable code without speculative capability.
- [Google code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html)
  and [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html):
  understandable design, meaningful behavioral and integration proof.
- [AWS on idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/):
  retry semantics and side effects.

### Verification scope

Two isolated Codex executions per revision use identical prompts and supplied
files. One implements a decimal CSV CLI, checkout through an existing payment
adapter, and archive-bookkeeping extraction with distinct permission policies.
The other reviews concurrency, failed writes and payment behavior without
changing supplied source. Expected findings are withheld from the reviewer.

The caller independently invokes generated code and checks 20 outcomes: eight
CLI cases, six checkout cases, five permission cases and preserved review-source
hashes. It separately reproduces the review fixture's overbooking and lost-stock
defects using actual disposable SQLite connections. Manual inspection checks
module boundaries and proportionate abstraction; wording matches do not score
quality. Native traces must show the exact local skill read.

These are explicitly selected skill trials, not tests of automatic discovery,
plugin installation, live provider integration, every language or future tasks.
No savings or universal quality guarantee is inferred. Maintained source,
version, footprint and documentation checks provide separate structural proof.

### Observations 2 October 2026

The [matched trial evidence](evidence/write-code-engineering-probe.json) binds
the prompts, supplied/produced files, native skill-read outputs, caller-checker
source, usage receipts and readback to the exact baseline/candidate hashes.
Observed artifact timestamps corroborate baseline completion/readback before
the candidate was saved and prepared; they are not signed native event times.
Codex CLI 0.159.3 used the ordinary account's configured `gpt-6.1-sol` model with
an explicit `high` effort override and disposable workspace-write fixtures.

- Both baseline runs completed before the skill was edited. All 20 independent
  checks passed in each revision; supplied review source stayed unchanged.
- Both revisions kept the CSV CLI in one production file, used the existing
  domain/payment boundaries and shared archive bookkeeping while preserving
  permission differences. The candidate also added ten useful local unittest
  cases. These observations do not establish that every task needs tests.
- Both reviewers reproduced overbooking, lost stock after an insert failure and
  payment failures returned as success. The candidate also considered monetary
  invariants and duplicate-charge risk; real provider/caller idempotency requires
  its actual contract, not an inference from a synthetic SDK.
- Source/package/link validation against the baseline, seven skill-version
  cases, seven documentation cases, the native skill-author validator and
  whitespace, layout and continuity checks passed. The skill grows from 5,114 to
  5,218 bytes; the
  pre-integration worker-build route was 38,079 bytes against the unchanged
  38,099 ceiling. Integration with AIOS 0.17.0 passed the structural checks and
  measures 37,909 bytes against the same ceiling. Matched behavior evidence
  applies to the unchanged
  skill bytes (SHA-256
  `4dabe2e9e4aa814ef1e7f6b43eb007e165821b57c5b453a47af0adcb63a9f56d`).

This is one run per task/revision, with explicit local skill selection and
ambient account tool/skill metadata. Unused optional MCP clients logged OAuth
startup failures in both revisions; the model and fixture execution completed.
There is no claim of empty global context, live-service integration, automatic
discovery, current installed adoption or measured performance improvement.

## Initial release 0.10.0

Implements [issue #9](https://github.com/onlinesourdough/AIOS-Plugin/issues/9),
with the accepted clarification that the skill applies whenever writing code,
including small scripts and automation, rather than only application features.
Baseline: `23d5ab715e5e85f49f39f5f9fd7cd7fe917a39a7` (AIOS 0.9.0).

## Contract and ownership

`skills/write-code/SKILL.md` is the single code-quality method. Its description
enables normal selection for writing, changing or reviewing code of any size.
Scripts, shell snippets, SQL, tests, automation, notebooks, executable
configuration and authored examples are in scope. Invoking an existing tool or
explaining existing code alone does not start a coding workflow.

AIOS and Build route authored code to it; Review uses the same criteria in
read-only mode and retains acceptance. Small tasks remain direct. The method
adds no runtime, worker, owner-context prerequisite, mandatory QA service or
external authority. It uses a single self-contained skill body without extra
reference loading. A wide trigger does not impose a full test suite on each edit.

The method addresses useful comments, modularity, interface contracts, clear
errors and scoped implementation. It rejects unnecessary abstractions,
conversational AI comments, placeholders and misleading fallbacks while
preserving required notices. UI changes require meaningful running-interface
evidence; logic, integrations and scripts use the appropriate behavior boundary.
Draft-only requests do not authorize executing state-changing examples.

## Verification contract

Run the maintained source, layout, continuity, per-skill version and footprint
checks. The source inventory requires 23 skills and routes from AIOS, Build and
Review to the one method. Link validation also runs against the isolated product
payload. The static worker-build journey includes write-code; metadata and
body bytes are reported honestly, without inferring runtime token savings.

For native proof, inspect discovery and actual selected reads. Use disposable
code fixtures for a small script and a read-only review, plus scoped decision
cases for UI versus logic verification and a prose-only negative trigger.
Do not prime discovery probes with the desired skill name or correct finding.
Keep runtime observations separate from source checks and record unavailable
capabilities. Native selection is guidance-based, not a deterministic hook.

## Observations: 2026-09-13

- Source/package/link validation against the baseline, the skill frontmatter
  check, seven skill-version cases, layout and continuity rehearsals, and seven
  public-documentation cases passed. Selected-read ceilings remain unchanged.
  Static startup metadata plus the observed bridge is 4,241 bytes; the selected
  code worker-build path is 37,173 bytes. These are byte counts, not a measured
  task-cost reduction. The new method adds context when selected.
- Native Pi 0.85.1 installed the isolated local package, discovered all 23 skills,
  updated that local-source registration and removed it, preserving unrelated
  fixture skills/settings. This proves package lifecycle behavior, not a new
  version transition or model execution.
- Native Codex CLI 0.154.0 discovered candidate skills through its standard
  project skill directory. An ordinary request for a small CSV-summing script
  selected and read write-code without naming it in the prompt. It produced a
  standard-library script and exercised success/error inputs. Six independent
  readback cases passed, including exact decimals, empty data, invalid input,
  missing column, non-finite values and negatives.
- A separate Codex read-only Review loaded both Review and write-code,
  reproduced a later-page pagination defect and identified inadequate tests.
  It left source bytes unchanged. It did not report the fixture's AI comment
  and unnecessary wrapper: this first observation alone was insufficient proof
  of the quality criteria.
- Following independent review, a focused unprimed review of a functioning
  module assessed correctness, quality and tests. It reported both the needless
  pass-through wrapper and conversational AI comment as concrete low-severity
  findings, accepted the proportionate existing tests and changed no source.
  No instructions were changed merely to obtain this observation. These bounded
  observations do not guarantee that every review reports every quality issue.
- A read-only decision rehearsal distinguished running UI/keyboard checks,
  meaningful logic regression tests, API review and draft-only script authority.
  It is decision evidence, not actual browser operation. A separate prose-only
  request returned the requested sentence without reading write-code or starting
  a code workflow.
- Pi's model request failed before output with an expired authentication token,
  despite its auth-readiness check returning ready. Pi model behavior remains
  unverified; this is not a successful runtime observation. No credentials or
  real owner data were copied into fixtures.

The Codex probes validate native skill discovery and selected behavior from a
project fixture, not a plugin-cache installation. Raw task-local prompts,
traces, fixture hashes and observed results are retained with the implementation
task. Independent review first requested the missing quality observation;
the final acceptance reconciles that evidence separately from product hashes.

## Research adapted

These sources informed the criteria; their text, vendor-specific ticketing and
orchestration workflows are not bundled into the skill:

- [Factory code-review](https://github.com/Factory-AI/skills/blob/21a74dec467a1424e3e067712d004cd987d6a0ce/skills/code-review/SKILL.md):
  correctness, maintainability, API compatibility and useful tests.
- [Factory Automated QA](https://docs.factory.ai/software-factory/automated-qa):
  observable checks of changed browser, CLI and API behavior.
- [Warp review-pr](https://github.com/warpdotdev/common-skills/blob/b811c24365ae505bfc9646458957b886e29110b5/.agents/skills/review-pr/SKILL.md):
  comment/test quality and distinct behavioral coverage.
- [Warp spec comparison](https://github.com/warpdotdev/common-skills/blob/b811c24365ae505bfc9646458957b886e29110b5/.agents/skills/check-impl-against-spec/SKILL.md):
  material commitments reviewed through the existing result.
- [Google code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html):
  useful comments, understandable interfaces and proportionate complexity.
- [Playwright best practices](https://playwright.dev/docs/best-practices):
  assertions about user-visible behavior.

## Delivery and recovery

The package candidate is 0.10.0. Write code starts at 1.0.0; AIOS, Build and Review
advance independently to 2.1.0, 1.1.0 and 1.2.0. Other skills and owner formats are
unchanged. The installed 0.9.0 source remains the recovery point until reviewed
adoption. No editing of an installed cache substitutes for native installation.
The public overview follows the existing versioned export and separate Resources
adoption procedure; a candidate overview is not proof of a site update.
