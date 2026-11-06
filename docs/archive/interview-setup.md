# Interview, Setup and workflow overview

Version: 0.12.0. Baseline: `bd27b98` (0.11.0).

## Accepted result and boundaries

The owner requested a reusable interview experience for first setup, agents,
automations, projects and specialist solutions, with selective model invocation
and no interruption of clear execution. The accepted name for the former
onboarding responsibility is Setup. README must explain the implemented skill
chains in a form useful for understanding and communicating the product.

This task changes the repository source, references, packaging, documentation
and affected author checks. Release, remote publication and replacement of
installed packages are separate actions. Owner formats 1 and 2 and existing
owner files are unchanged. The active task/model is sufficient for this scoped
instruction and documentation change; no model switch or delegated writer is
needed. Progress is held in the native plan, not another live checklist here.

## Responsibility and invocation

Interview owns exploratory conversation and the common question procedure.
Setup owns native installation, home readiness, access verification and the
existing Sync route. Spec owns the executable contract and proof. Callers reuse
accepted decisions; ordinary questions do not start a full interview.

Explicit exploration starts Interview. A model may select it at the start for
material uncertainty about direction after using the known context. Newness
alone is insufficient. In-progress execution asks the smallest blocking
question. Optional broader reflection can be offered at a natural pause and
waits for uptake; it does not stop work or reopen declined exploration.

## Compatibility and recovery

There are 24 canonical public skills. `aios-setup` replaces `aios-onboard`;
explicit invocations and registrations using the old name need reconciliation
when this candidate is adopted. The renamed skill starts its new identity at
1.0.0, retaining the prior implementation's history in Git. Interview also
starts at 1.0.0. No compatibility alias duplicates the discovery surface.

All current package routes point to Setup. The legacy behavior map and pinned
historical benchmark retain old identities as evidence. Recovery uses the prior
reviewed package ref through native controls; no cache or owner-data rewrite.

## Verification

Source/package validation, skill-version transitions, links, package isolation,
the unchanged context-footprint ceilings and the affected setup/continuity
fixtures cover the rename. README is checked against the actual skills and
their conditional routes. A bounded native decision probe covers explicit
interviews, uncertain new work, clear work, a mid-task gap, known setup context,
resumption and interview-only completion. Native observations and final review
are recorded below after running against the candidate.

Observed on 2026-09-21:

- `tests/validate.py --baseline bd27b98`: package, 24 skills, version progression,
  current links, isolated packaging, legacy identities and negative fixtures pass.
- Documentation and skill-version rehearsals: seven tests each pass. Layout
  and synthetic local-Git continuity rehearsals pass, including partial-home
  preservation, hostile content, source identity and target rebinding cases.
- Skill Creator validation passes for Setup and Interview using an ephemeral
  `uv --with PyYAML` environment; system and bundled Python lacked PyYAML.
- All 30 prior Onboard files exist under Setup. Only its entrypoint, display
  metadata, setup procedure, Claude invocation reference and legacy route map
  changed; the remaining moved files are byte-identical.
- README's workflow section links all 24 public skills. Its final-review and
  Sync routes are explicitly procedures, and optional editors are distinguished
  from the included methods.
- Selected-read ceilings pass for the matched routes. The technical setup path
  with accepted context is 32,656 bytes before verification and 42,624 through
  verification. A missing-foundation owner interview adds 5,821 bytes, making
  the full latter route 48,445 bytes. This broader route exceeds the old setup
  comparison; no full-interview context-saving claim is made. These are static
  source counts, not runtime token measurements.

The [retained probe](../evidence/interview-setup-probe.json) contains exact synthetic
inputs, responses and inspected source hashes. Codex CLI 0.155.1 evaluated ten
independent cases in one read-only run, with expected decisions withheld:

| Case | Observed next behavior |
| --- | --- |
| Explicit Danish interview request | One concrete opening question |
| Unclear sales-agent direction at the start | Interview the underlying difficulty before prescribing an agent |
| New agent with complete accepted spec | Build directly |
| New project with accepted plan and destination | Create and implement directly |
| Blocking dataset ambiguity during implementation | One question; continue independent work |
| Setup with accepted owner context and local continuity | Set up from known answers |
| Spec requested after a completed interview | Reuse decisions; produce the requested specification |
| Ordinary-message answer after interruption | Consume the answer and continue without repeating foundation |
| Optional interview declined | Continue the accepted implementation |
| Interview-only user asks to finish | Summarize; do not begin production or persist owner data |

All ten routing decisions matched, and the first responses were inspected for
context use and scope. The source snapshot remained unchanged and exercised
files match the candidate. The run used a runtime-default model; its exact model
ID was not exposed in retained JSON events. This is bounded next-response
evidence, not a multi-turn question-tool or installation test.

These checks do not establish a native package upgrade, end-to-end owner setup,
live connection authentication or model behavior in every supported harness.

## Candidate source review

PASS for the accepted source-only result. The review checked the actual Setup
rename and preserved payload, Interview activation and stop rules, one owner for
the question procedure, reuse by Spec, README coverage, existing source checks
and the independently generated case responses. No unresolved source finding.
Installation, release and real multi-turn behavior remain outside this proof.

Reviewed source SHA-256 (sorted repository paths and bytes, excluding this
self-referential evidence record): `ade934096542185d15a1b17af6b2e575dd21e2fafef928f13f834d709f58e735`.
The retained native observations bind their inspected files separately.

## Authorized release continuation

On 2026-09-21 the owner requested release and installation of the reviewed
change. Delivery targets this repository's existing private `main`, immutable
`v0.12.0` tag and pilot GitHub prerelease, followed by the existing Codex
`aios@online-sourdough` registration. The previous release is `v0.11.0`.
Release review binds the final commit separately; native installation and
fresh discovery are verified after delivery. Owner data and other apps remain
outside this package adoption.

The owner then clarified the README presentation before delivery: show the
Agentic Content and Design Systems as context, coordinated skills, project
artifacts and optional agent-native workbenches. Diffusion Studio parallels
OpenPencil in that role. Explain direct work in Codex's built-in browser while
preserving the implemented boundaries: local previews and OpenPencil's canvas,
versus Diffusion's read-only companion without media-element support. This is
a documentation clarification; the editors' runtime capabilities are unchanged.
