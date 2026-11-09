# Verification

On 2026-11-06 the #85 publisher repair (r2, `8c17e94`) was repaired a third time after a second independent
review, which confirmed B-1 and requested changes on two blocking items. The repair head is `e5aa91f`, on
`feat/osm-85-docs-publisher-20261105`; this record is the commit after it. It is local only: nothing was
pushed, published, installed or tagged, no workflow was enabled, and no Notion, schedule or credential
action happened. This entry supersedes the r1 and r2 entries below where they differ; those entries stay as written.

- **G3 was wider than declared.** With no reader enabled, every row stays `pending` after every run, and any
  `pending` row was resumed, so a later hand edit to a row whose write had completed was overwritten. Now a row
  that is `pending` with BodyHash equal to its receipt (the write completed and the row was only held) and a body
  that differs is a conflict, and the edit is kept; this holds with or without a reader. An interrupted or
  refused write (BodyHash differs from the receipt) and a `partial` or `unknown-write` row still resume, which
  remains the declared limit G3. The r1 and r2 statements that a changed page body is a conflict and is not
  overwritten hold only on that basis.
- **Changed skills (R-9).** The r1 entry says changed skills are reported as pending release propagation. They
  were reported only when no row mapped them, which left 15 of 17 skills (every folder that also existed at
  v0.30.0) on a quiet pending-handoff line. The list is now built from all changed `skills/` paths; the
  repair's own `skills/osm` and `skills/osm-setup` changes show in `reconcile --check --base 00d29e2`.
- **Smaller corrections.** The r2 and `ACTIVATION.md` wording that a keyless row makes "every full publish
  blocked" was wrong: the other rows are still written and completed, and the run is red with one blocked
  `(empty Key)` line. A refused retirement now holds the set. An error that stops a run after it may have
  begun writing no longer prints "Nothing was written". `ACTIVATION.md` says that activating the bounded proof
  depends on Root's G1 decision and that its read-only rerun ends at HOLD, exit 4. `docs/publication.md` names
  the holding failures exactly.
- **Evidence for the two blocking items.** Fail-before is the committed `e5aa91f` test files run against the
  `8c17e94` publisher: rc 1, with the held-edit scenario failing on both transports and the changed-skill test
  failing; pass-after is the same files at `e5aa91f`, rc 0. Seven new controls (75 in all, from 68) include
  the reverts of both fixes; each is caught, again four by an exception rather than an assertion (result file
  not written, `RemoteDisconnected` not mapped, non-JSON not mapped, `get` returns no commit). A control the
  new work first let survive (a `pending` row with any other body treated as a conflict) is caught by a refused-write
  scenario. The absent-tag note is now pinned through `reconcile` in a tagless temporary repository.
  The changed-file count from `00d29e2` is still 17.
- **Owner decisions, unchanged:** the skill version bumps (`osm` 4.0.1, `osm-setup` 3.0.1) and whether `release.yml`
  should require the release tag in CI.
- **Checks at `e5aa91f` in a clean clone (`clone-85r3`).** Each ran directly with its exit status captured,
  and all exited 0, including the sidebar build, the no-diff check on `runtime/sidebar`, `npm test` and the
  smoke test; the publisher rehearsal reports 69 rehearsals and 75 controls. `npm ci` was NOT RUN (no network):
  the copied `node_modules` closure was used, so the sidebar steps are non-hermetic. The authoritative table is
  the final-head run in the hand-back. Fixture and static results only; not CI, native, install, Home or live
  Notion proof.
- **Retained evidence:** raw logs, the runner and hashes are kept under the machine-local `evidence-85r3`
  directory of the work area.

On 2026-11-06 the #85 publisher repair (r1, `74fdd03`) was repaired once more after its independent
review, which requested changes on one blocking item (B-1, R-8). The repair head is `64f9951`, on
`feat/osm-85-docs-publisher-20261105`; this record is the commit after it. It is local only: nothing was
pushed, published, installed or tagged, no workflow was enabled, and no Notion, schedule or credential
action happened. This entry supersedes the r1 entry below where they differ; that entry stays as written.

- **B-1 (R-8).** The r1 entry says the affected set is held pending until every member passes. That held
  only for rows that failed during the write. A CI-owned row that failed at plan time (a conflict, an
  unreadable body, a block or a refusal) was outside the set, so the other rows could be written and stored
  `complete` in the same run (a hand-edited page plus one source change touching every row). Now such a row
  holds the rest: no written row is complete in that run, and the hold lifts once nothing fails. The causal
  scenario `a_plan_time_failure_holds_the_written_rows` (both transports) failed on `74fdd03` (rc 1; the
  conflict row and four `written` rows) and passes at `64f9951`. A new control reverts the fix and is caught
  by that scenario; the two controls anchored on the changed line were re-anchored, not weakened.
- **Corrections to the r1 report.** The r1 hand-back said 18 files changed from `00d29e2`; numstat shows 17
  (at `74fdd03`, and 17 at `64f9951`). It also said every control was caught by an assertion, not an accidental
  crash. Four of the 66 were caught by an exception, each the defect's own symptom: result file not written
  (`FileNotFoundError`), `RemoteDisconnected` not mapped (`RemoteDisconnected`), non-JSON not mapped
  (`JSONDecodeError`), `get` returns no commit (`KeyError`). The rehearsal accepts any exception as a
  detection. At `64f9951` there are 68 controls, the same four by exception and 64 by assertion.
- **Also done.** A test and a control pin the "tag not present: not checked (unsupported)" note of
  `reconcile --check`; absent-tag `publish` still fails. `ACTIVATION.md` now lists keyless database rows (every
  full run blocked), the 500 KB payload and UTF-16 2000-character limits (not modelled) under G2, a force-push
  base (CI red with a clean error) and that a hand edit of only the provenance header line is not detected. G3
  (a hand edit in a pending, partial or unknown-write row is overwritten on resume) is unchanged.
- **Checks at `64f9951` in a clean clone (`clone-85r2`).** Each ran directly with its exit status captured,
  and all exited 0, including the sidebar build, the no-diff check on `runtime/sidebar`, `npm test` and the
  smoke test; the publisher rehearsal reports 62 rehearsals and 68 controls. `npm ci` was NOT RUN (no network):
  the copied `node_modules` closure was used, so the sidebar steps are non-hermetic. The authoritative table is
  the final-head run in the hand-back. Fixture and static results only; not CI, native, install, Home or live
  Notion proof.
- **Retained evidence:** raw logs, the runner and hashes are kept under the machine-local `evidence-85r2`
  directory of the work area.

On 2026-11-06 the #85 publisher was repaired after its integrated review of `00d29e2`, which
requested changes (findings R-1 to R-14). The repair head is `0a14885`, on
`feat/osm-85-docs-publisher-20261105`; this record is the commit after it. It is local only: nothing was
pushed, published, installed or tagged, no workflow was enabled, and no Notion, schedule or credential
action happened. This entry supersedes the earlier #85 claims below where they differ (a "serialized
idempotent publishing stage", a row complete after "page, catalogue entry and anonymous access" read back,
and "nothing deletes history"); the earlier entry stays as written.

- **What changed, and what each result can now observe.**
  - *R-1:* public access and catalogue membership are one three-state result (verified, failed,
    unsupported). No reader is qualified, so `NotionTransport` returns unsupported for both and makes no
    public request. **With no qualified reader no live run can reach `complete`**; the run reports HOLD and
    exits non-zero. This is an unmet live gate, listed in `ACTIVATION.md`, `docs/publication.md` and this record.
    The content comparison is a pure function, and a reader can be enabled only by `activation.public_reader`
    in a reviewed commit (null today).
  - *R-2 to R-5, R-8:* the page body is read back (paginated, one normalised line per paragraph) and hashed for
    unchanged, conflict and complete; an unreadable body is never unchanged; a row is created pending, its
    before-source survives a resume, no resume shortcut marks complete, `BodyHash` is written last; bodies are
    written in batches whole or refused (never truncated); the affected set is declared and held pending until
    every member passes.
  - *R-6, R-7:* the job exits non-zero unless every row is written, unchanged, resumed, retired or a recorded
    refusal, and the result file uploads with `if: always()`. The credential-free result says `would-write`,
    `no-source-change` or `unknown-no-receipts`, never written; changed paths map to Keys; CI passes `--base`.
  - *R-9:* the skill-row generator is gone; five documentation rows remain; changed skills are reported as
    pending release propagation; `--only KEY` is the one-row route for a bounded proof. If the owner wants
    working skill rows, that is the owner's explicit decision to record; they were not added back.
  - *R-10 to R-12, R-14:* documents state only what each result observes; the class B ZIP hash and guide
    original checks say `not checked (unsupported)`; the smaller gaps (absent tag, retirement, duplicate and empty
    Keys, class A without a Key, timeouts, error mapping, no redirect following, "unreleased" in the header) are
    closed in source; the R-14 documentation follow-ups are made, with a release-tag check in `reconcile --check`.
  - *R-13:* every publish scenario now runs against both the in-memory fixture and `NotionTransport` through an
    in-memory opener, and 66 mutation controls are part of `tests/publisher-rehearsal.py`; each must be caught.
    The two weak assertions are exact. The responsibility rehearsal gained per-row checks of the triggers table.
- **What this proves, and what it does not.** Fixture and static proof only. The Notion transport has run only
  against `FakeNotion`, an in-memory stand-in, never against Notion. Unknown until a live run: what public pages
  return, whether public HTML contains the body, query consistency after a create, rate limits for pages with
  hundreds of blocks, block limits, API behaviour against the real database, and how long deleted children are
  recoverable. Replacing a body deletes the row's child blocks; no row is deleted.
- **Checks at `0a14885` in a clean clone (`clone-85r`).** Each ran directly with its exit status captured, and
  all exited 0, including the sidebar build, the no-diff check on `runtime/sidebar`, `npm test` and the smoke
  test. `npm ci` was NOT RUN (no network): the copied `node_modules` closure (tar sha256 `a7675ee1…`) was
  used, so the sidebar steps are non-hermetic. The release tags were imported from a Root-supplied bundle by a
  local fetch (v0.29.0 `f7fb831`, v0.30.0 `314dcf1`); the authoritative table is the final-head run recorded
  in the hand-back.
- **Not run.** CI, any native rehearsal, any install, Home or live Notion check, either consumer site, the
  bounded live proof. The preconditions and unmet gates are in `docs-publisher/ACTIVATION.md`.
- **Retained evidence:** raw logs, the runner script and hashes are kept under the machine-local
  `evidence-85r` directory of the work area.

On 2026-11-05 the documentation reconciliation and a source-only documentation
publisher (#85) were added on `feat/osm-85-docs-publisher-20261105`, from the #88
repair head `9de4317`. The code head is `826711c`; this record is the commit after
it. It is local only: nothing was pushed, published, installed or tagged, no workflow
was enabled, and no Notion, schedule or credential action happened.

- **What changed.** The README, docs index, overview and architecture separate declared,
  fixture-tested, native-tested and released states and call the public guide a reference
  projection of v0.30.0; twelve dated records moved unchanged to `docs/archive`; the #88
  repair's carry-in corrections were made (ten validator pins, a record-lifecycle line for
  the relation rule). `docs-publisher/` adds a per-artifact ownership manifest, an impact diff
  with a visible reconciliation result, a serialized idempotent publishing stage, an
  unexercised Notion transport and an inactive workflow template.
- **What the fixtures prove, and what they do not.** An in-memory transport exercises
  unchanged source, a changed reference, rename and retirement, a newer original, missing or
  expired access, a partial update, repeat delivery, refusal to write the Content templates, an
  unknown write read back before a retry, a released edition resolving to its approved commit,
  rows not yet handed to CI getting no write, and a CI-owned row changed by another writer. Eight
  deliberate breakages of the publisher were each detected. None of it is a live publication: the
  Notion transport has never run, the publisher is not active, and no live proof exists.
- **Checks at `826711c` in a clean clone.** Each ran directly with its exit status captured, and
  all 22 exited 0: `validate.py` plain and against `8b8f21a` and `314dcf1`; the documentation,
  onboarding, layout, continuity, skill-version, footprint, responsibility and context-architecture
  rehearsals; the publisher and consumer-selection rehearsals and the credential-free
  reconciliation check; the publisher mutation controls; `git diff --check` from `8b8f21a`; the
  draft node and Python tests; and the sidebar build, no-diff check, tests and smoke test. `npm ci`
  was not run (npm is absent; `node_modules` was copied after the lockfiles compared equal), so the
  sidebar steps are non-hermetic.
- **Not run.** CI, any native rehearsal, any install, Home or live Notion check, either consumer
  site, and the bounded live publication proof. The preconditions that remain are listed in
  `docs-publisher/ACTIVATION.md`.
- **Retained evidence:** raw logs and hashes are kept on the author machine under the
  machine-local `evidence-85` directory of the work area.

On 2026-11-05 the Notion-only core candidate (#88) was repaired after its
integrated source review of `90d912f`, which requested changes (one Major and ten
Minor findings). The repair head is `4bce572`, on
`feat/osm-88-notion-core-20261105`; this record is the commit after it. It is
local only: nothing was pushed, published, installed or tagged, and no Notion,
schedule or credential action happened.

- **What the repair changed.**
  - *Major:* the Setup acceptance scenarios, the home contract and the workflow
    scenarios no longer describe a file home or folder-home Sync as an active
    route. One row keeps the retired file or vault home, read-only.
  - *Checks:* the responsibility rehearsal denies a default-folder path and the
    managed-file phrase in every shipped skill on whitespace-normalized text,
    including the files it used to exempt, and pins each refinement rule with a
    deletion control that was run. It also checks `docs/skills.md` and that curation
    does not link back to Setup. Six validator pins for the retired Sync record
    were restored, ten in total.
  - *Sidebar:* the Settings placeholder is Notion-only, a configured folder or other
    link shows one read-only notice, and the pointer route refuses any new or
    changed target that is not a Notion page while still reading old routes. The
    bundled runtime was rebuilt from source.
  - *Smaller items:* where a needs-attention item with no record goes; a source-only
    input needs a route; new pointers name Manage Data & Context (existing pointers
    are untouched); stale provider, Sync and content wording corrected;
    `docs/skills.md` has a triggers-and-calls table; `docs/skill-versioning.md`
    states the limit for a baseline older than 0.30.0; the native entry fixture is
    built from the shipped Notion pointer and a fictional URL (prepared only).
- **Checks at `4bce572` in a clean clone.** Each ran directly with its exit status
  captured, and all 18 exited 0: `validate.py` plain and against `8b8f21a` and
  `314dcf1`; the documentation, onboarding, layout, continuity, skill-version,
  footprint, responsibility and context-architecture rehearsals; `git diff --check`
  from `8b8f21a`; the draft node and Python tests; the sidebar build, the no-diff
  check on `runtime/sidebar`, its tests and its smoke test. `npm ci` was not run
  (npm is absent; `node_modules` was copied after the lockfiles compared equal), so
  the sidebar steps are non-hermetic.
- **What was not run.** CI, the Claude and Pi/Gemini native rehearsals, any model or
  native run of the entry fixture, any install, Home or live Notion check. This is
  fixture and static proof only, not proof of native discovery, installed behavior
  or live Notion behavior.
- **Carried, not fixed.** The neutral-root Home projection gap and the missing Home
  credential route stay open.
- **Retained evidence:** raw logs and hashes are kept on the author machine under
  the machine-local `evidence-88r` directory of the work area.

On 2026-11-05 the integrated candidate below was repaired after its independent
review (code head `3dcac9b`, from `f544643`; this record is the commit after
it). The review requested changes on two text blockers. Merge preservation, the
versions and the three earlier template and record fixes were not touched, and
no code, build, fixture, harness or runtime changed.

- **What changed.**
  - *Local pilots:* the installability text no longer says the Codex, Pi and
    Gemini routes cannot reach the candidate. Public routes need publication;
    documented local-path pilots exist for Codex, Pi and Gemini as well as
    Claude Code; none was exercised on this candidate; only Codex has the sidebar
    and Home; no installation is authorized here.
  - *Home projection:* the Home projection procedure in `panel-links.md` now
    takes the projection's id and canonical title from the selected root's
    verified stable identity, says the definition's format `version: 1` is not a
    revision, and requires an already recorded revision with known provenance.
    Without that identity or revision, only Home's projection stays unsaved and
    pending, the saved links stay, and Setup and other work continue. Existing
    definitions with a verified id and revision keep working, and `generatedAt`
    is the actual generation time. Setup's `panel.md` conditions the save the
    same way. The template gains no revision field, and no schema, backend or UI
    changed.
  - *Smaller items:* the changelog marks its `Unreleased` and `0.31.0` sections
    both unreleased, to be reconciled before any tag; the architecture's Home
    sentence says Home reads a projection and currently reports
    `unsupported_host`; the earlier record's claim about Home was softened; the
    copied `node_modules` is stated as not integrity-checked and not a fresh or
    hermetic install, and is attributed to my own Home worktree, not the lead's
    checkout; and the scanner's flagged link is stated as the scanner's
    limitation, with the review's own check finding no broken link.
- **Checks on a clean clone of `3dcac9b`.** The context rehearsal gives 80
  positives and 58 valid variants passing and 401 negatives rejected with
  `failures=0`, and its output is identical, once the step wrapper's own lines
  are removed, to the previous final head's. `validate.py --baseline 314dcf1`,
  the documentation, onboarding, layout, skill-version and footprint checks
  pass, and `git diff --check` is clean from `314dcf1` and from `f544643`. The
  footprint journey `codex-package-and-bridge-verification` is 42,781 bytes
  against its 42,793-byte bound, unchanged; no trim was needed. The diff from
  `f544643` names five paths: `CHANGELOG.md`, `docs/verification.md`,
  `skills/osm-context/references/architecture.md`,
  `skills/osm-context/references/panel-links.md` and
  `skills/osm-setup/references/panel.md`.
- **Evidence reused, bound by byte identity.** `apps/sidebar`, `runtime/sidebar`,
  the rehearsal script, its fixtures, `tests/continuity-rehearsal.py` and
  `skills/osm-setup/assets/owner` are byte-identical to `f544643`, so the
  sidebar, continuity and mutation evidence stays bound to its earlier logs and
  was not rerun; `npm` was not used.
- **Carried and not fixed.** C-04 to C-09, INT-05, INT-08, INT-09, R-10, R-11,
  and the dropped parts of R-13, R-14 and R-15 remain open. A neutral root with
  no already recorded definition revision leaves only Home's projection pending.
  CI does not run the context rehearsal.
- **Retained evidence:** the raw logs and their hashes are kept only on the
  author machine, in a machine-local `osm-c1-a1-r1-20261102/evidence-int-r2`
  directory.

On 2026-11-05 a local integrated candidate (code head `f49813b` on
`feat/osm-integrated-candidate-20261105`) merged three inputs, none of them
changed: HL-1 `7d7e2a2` (which includes C1), Home K5 `492a133` and the accepted
PR86 correction `e22925b`. It carries K5's package version `0.31.0`, which is
not released, tagged or installed anywhere, and the higher skill version of each
input: Context 2.2.0, Setup 2.2.0, Maintain Context 2.1.0, Check 3.1.0, Update
3.0.2, Manage Skills 2.0.1. It exists only in a local repository.

- **Commits and conflicts.** A small commit (`2b1b958`) restored the
  accepted-input condition in the root template and recorded two limits in this
  file. The K5 merge (`6285dd2`) conflicted in `CHANGELOG.md`, this file and the
  version lines of the Context and Setup `SKILL.md` files; the PR86 merge
  (`14898ff`) conflicted in `README.md` only. No other file conflicted. Both
  changelog bodies and every existing section here are kept, `README.md` takes
  PR86's text with C1's Setup sentence and the owner's opening, and the sidebar
  runtime was not edited by hand. A last commit (`f49813b`) says that Home's
  read-only view describes the panel and is not the owner's write policy, and
  adds a documentation-index row that reaches the write policy and record
  lifecycle.
- **Semantic check of the merged tree.** There is no `protected-records` outside
  historical text here, no `protected:` key in the root template, no claim that
  writes cover only Knowledge and Memory, and no conflict marker. K5's Home docs
  already say that Home reports `unsupported_host` and makes no request where
  the host has no supported secret store; no text states that Home's internal
  connection works there. My anchor scanner flagged one link in this file,
  `#tracking-sop-revision--2026-09-09`, which predates the integration. The
  flag is the scanner's limitation: its whitespace rule collapses the two
  hyphens. The independent review's own check of 741 relative links found none
  broken, so the GitHub slug is valid.
- **Checks on a clean clone of `f49813b`.** The context rehearsal gives 80
  positives and 58 valid variants passing and 401 negatives rejected with
  `failures=0`, and its output is identical, once the step wrapper's own lines
  are removed, to the HL-1 head's. `validate.py --baseline 314dcf1`, the
  documentation, onboarding, layout, skill-version and footprint checks pass, and
  `git diff --check` is clean from `314dcf1` and from each of the three inputs.
  The footprint journey `codex-package-and-bridge-verification` is 42,781 bytes
  against its 42,793-byte bound, the same as at the HL-1 head; no trim was
  needed and no bound or script was changed.
- **Sidebar.** `npm` is not installed in the sandbox, so `npm ci --offline` could
  not run (command not found). The lockfile of my own Home worktree checkout
  equals the candidate's apart from the root package version fields, and its
  `node_modules` was copied into the clone, not linked. The copied tree was not
  integrity-checked against the lockfile, so this is not a fresh or hermetic
  install. The package scripts' own
  commands were run with `node`: the build leaves `runtime/sidebar`
  byte-identical to the committed one, and the 182 unit tests and the bundled
  smoke pass. `apps/sidebar` and `runtime/sidebar` are byte-identical to K5's.
  These were not run through `npm run` or `npm test` themselves.
- **Evidence reused, bound by byte identity.** `tests/continuity-rehearsal.py`
  (blob `9900f5cc4b35832b323c44ccd477edaa1f2a3840`) and
  `skills/osm-setup/assets/owner` (tree
  `3b95d53d63dc246dc6f4115ec0f6035af5f3f287`) are the same at all three inputs
  and at the candidate, so continuity was not rerun and its passing run stays
  bound to `77f25a9`. The rehearsal script and its fixtures are byte-identical to
  HL-1's, so the mutation runs were not repeated and the HL-1 results stand.
- **Installability.** The README and `docs/native-installation.md` install OSM
  through the app's package manager from the public repository, optionally at a
  reviewed tag or immutable commit. This candidate is local only and has no tag,
  so those public routes cannot reach it until its commits are published. The
  adapter references document local-path routes for an authorized local pilot
  on Codex (`adapter-codex.md`), Pi (`adapter-pi.md`) and Gemini
  (`adapter-other.md`), and `docs/native-installation.md` documents a local
  checkout for Claude Code. None of those routes was run on this candidate, and
  no installation is authorized here. Only Codex has the sidebar and Home, so an
  owner test of the panel means a Codex local pilot with Node.js 22+ and a fresh
  task. An owner trying the method would start a fresh session, ask OSM Setup to
  set up the context, choose and record a write policy, and run Check
  read-only.
- **Home and hosts.** Per `docs/home-connection.md`, Codex is unsupported for
  Home's internal connection (`unsupported_host`, no request is made), and for
  Claude Code the secret-store mechanism is supported but not declared, with no
  native Claude Home. As documented, Home therefore reads no live Notion content
  on any host in this candidate; that was not exercised natively. Saved links
  still work.
- **Carried and not fixed.** C-04 to C-09, INT-05, INT-09, R-10, R-11, and the
  dropped parts of R-13, R-14 and R-15 remain open. A neutral root with no
  already recorded definition revision leaves only Home's projection pending.
  CI does not run the context rehearsal.
- **Retained evidence:** the raw logs and their hashes are kept only on the
  author machine, in a machine-local `osm-c1-a1-r1-20261102/evidence-int`
  directory.

**NOT VERIFIED for the integrated candidate.** Live agent behaviour; real
provider containment, inheritance and permissions; connectors; Setup on a real
home; non-Notion homes; pointer loading; a real multi-hop refresh; a naturally
scheduled run; CI at this head; installed and released states; Home reading live
Notion content on any host. Fixtures prove predicates over fictional data, not
prose.

On 2026-10-28 the C1 Context Architecture candidate (`ff2cfb5` on
`feat/osm-context-architecture-c1`, from `main` `314dcf1`) added the shared
contract, templates, fictional examples and an offline rehearsal. Docs,
templates and fixtures only. The C1-r1 repair (`a93b1a6`) corrected eight
rehearsal checks: seven now reject the review's counterexamples, and the meaning
check now accepts the explicit unknown and evidenced values it had wrongly
rejected. It also added the Claude `InstructionsLoaded` caveat and changed no
contract or template text. The C1-r2 repair (`b25a019`) completed three of those
checks, which a correction review found only partly repaired:

- grant enumeration names its fictional workspace and requires all of that
  workspace's actual grants;
- the glance check needs all six metadata fields present with meaningful values;
- the `.claude/rules` exception is matched by path components for both
  separators.

The C1-r3 repair (`e87667b`) completed the grant check's workspace branch,
which a second correction review found partly repaired: a missing or unknown
workspace now keeps the parent-as-view test, and a non-string workspace value is
reported as missing instead of crashing.

The C1-A1 addendum (`2f44cec`, from `5c60fad`) extends the contract and its
fixtures; it is fixture-level only. It adds fourteen subsections to
`architecture.md`, ten rows to its pipeline-agreement table and one row to its
superseded-defaults table, eight sentences to `bootstrap.md`, one scope line in
the Data & Context root template and two `CHANGELOG.md` sub-bullets. It adds
17 rehearsal checks and cases 49 to 65 to the fixtures. Case 48's closing line
gains a trailing comma, the only existing fixture line that changes.

The C1-A1-r1 repair (`be26bbf`, from `21b8a3f`) corrects twelve of the C1-A1
checks, which a correction review found did not read every contract-bearing
field their fixtures model; it is fixture-level only. It adds six reasons,
seven negatives and three valid variants, corrects the inputs of negatives
51.4 and 54.5 with their expected reasons unchanged, and makes one
`architecture.md` sentence name cancelled originals with archived ones.

**Fixture results.**

- **New rehearsal at `ff2cfb5`:** `tests/context-architecture-rehearsal.py`
  passed 48 positive fixtures, and all 135 negative fixtures were rejected, each
  for its stated reason. That first run was green; it had no pre-fix failure.
- **Rehearsal at `a93b1a6`:** 48 positives and 5 valid variants pass, and 153
  negatives (the 135 plus 18 new ones) are rejected, each for its stated reason.
  Two positives carry root-approved data corrections (the case 34 rendering and
  Memory in case 41's broad grant). Ten older negatives each gained one
  additional reason and kept their expected one.
- **Rehearsal at `b25a019`:** 48 positives and 7 valid variants pass, and 169
  negatives (the 153 plus 16 new ones) are rejected, each for its stated reason.
  The root-admitted case 41 data change is the workspace identity on its 11
  scope records, plus one actual grant record appended to five negatives, so
  that every older reason set stays exact. No other older input or reason
  changed.
- **Rehearsal at `e87667b`:** 48 positives and 7 valid variants pass, and 169
  negatives are rejected; the log is byte-identical to `b25a019`'s, and no
  fixture changed.
- **Harness check:** on a temporary copy, a disabled check and a wrong expected
  reason each failed the harness. For C1-r1, the `8a4a01e` functions accepted
  every new negative and rejected the new case 30 variants. Disabling each of
  the 16 new rules in turn made exactly its own fixtures fail. For C1-r2, the
  `c716e7a` functions accepted the new grant and blank-metadata negatives and
  the three rules near-name and boundary negatives, crashed on a missing Summary
  or Kind, and rejected the Windows rules-file variant. Disabling each of 20
  rules in the three repaired checks in turn made exactly its own fixtures fail,
  one by the intended crash; the mutations of the unchanged checks were reused
  after a source byte-identity proof.
  For C1-r3, the review's two counterexamples were kept as temporary probes, not
  committed fixtures. The `2629c5c` function reported only the missing workspace
  for a linked view given as a grant parent, and raised `TypeError` for a list
  or object workspace value; the repaired function adds `view-as-grant` and
  reports `scope-workspace-missing`, and both probe harness runs pass. The
  committed fixtures do not discriminate this repair: each of the two repair
  mutations is killed only by its probe. The correction review also found that a
  mutation relaxing the evidence-list check from every entry to any entry is not
  killed by them. Both are disclosed coverage limits. Re-running the seven grant
  mutations, each disabling or weakening one rule, made exactly its own fixtures
  fail; the other mutations were reused after an AST byte-identity proof.
- **Repository checks:** these passed on a clean clone of `ff2cfb5`, and again
  on a clean clone of `a93b1a6` (layout and continuity were not rerun there:
  the repair touches none of their inputs):
  - `validate.py --baseline 314dcf1`, including the skill version bumps;
  - the documentation, onboarding, layout, continuity, skill-version and
    footprint checks;
  - `git diff --check`.

  On a clean clone of `b25a019`, `validate.py --baseline 314dcf1`, the
  documentation, skill-version and footprint checks and `git diff --check`
  passed. Onboarding, layout and continuity were not rerun: the C1-r2 repair
  touches none of their inputs.

  On a clean clone of `e87667b`, the rehearsal (log byte-identical),
  `validate.py --baseline 314dcf1` and `git diff --check` from `314dcf1` and
  from `2629c5c` passed. The C1-r3 repair changes only the rehearsal script, so
  the documentation, skill-version, footprint, onboarding, layout and continuity
  checks were not rerun for it: none of their inputs changed.

  On a clean clone of `2f44cec`, the rehearsal (the same log as in the working
  tree), `validate.py --baseline 314dcf1`, the documentation, onboarding,
  layout, continuity, skill-version and footprint checks, and `git diff --check`
  from `314dcf1` and from `5c60fad` passed. The footprint differs from
  `5c60fad`'s in one line, the total of working skill markdown bytes, and
  `git diff --name-only 5c60fad` lists exactly the six paths the code commit
  touches.
- **Sidebar:** the change touches no sidebar input; the sidebar reads only
  `skills/osm-context/assets/bridge.md`. Its build and tests were therefore not
  run.
- **Rehearsal at `2f44cec` (C1-A1):** 65 positives and 32 valid variants pass,
  and 276 negatives are rejected, each for its one expected reason; the raw
  exit is 0 with `failures=0`. None of the 224 result rows of `5c60fad`'s log
  changed or was removed, and 149 rows are added: the 17 positives, 25 variants
  and 107 negatives of cases 49 to 65. For fail-first, the `5c60fad` harness
  run on the new fixtures exited 1 with `KeyError: 'source-recipe'` at case 49,
  after reproducing its 224 baseline rows. With the 17 new check functions
  stubbed to accept everything, exactly the 107 new negatives failed, each
  accepted with no reason, while all 65 positives and 32 variants still passed.
  For mutation, 130 mutations were run on a clean clone, 105 each disabling or
  weakening one reason rule and 25 each removing one variant's acceptance
  clause: each changed exactly its expected result rows and no other, 130 of
  130, and the script was restored byte-identical after every one. These are
  fixture-level results only.
- **Rehearsal at `be26bbf` (C1-A1-r1):** 65 positives and 35 valid variants
  pass, and 283 negatives are rejected, each with its expected reason present.
  The 114 negatives of cases 49 to 65 print exactly that one reason; 15 rows of
  older cases print more than one entry. The
  raw exit is 0 with `failures=0`, and the clean-clone log is byte-identical to
  the working tree's. None of the 373 result rows of `21b8a3f`'s log changed or
  was removed, including those of the corrected 51.4 and 54.5, and 10 rows are
  added: the seven new negatives and three new variants. The 224 rows of
  `5c60fad`'s log are unchanged. Among the top-level statements of `5c60fad`'s
  script only `main()` changed, none was removed and 23 are added; against
  `21b8a3f`'s script only the twelve corrected functions differ.
  For fail-first, the `21b8a3f` harness run on the corrected fixtures exited 1
  with `failures=10`: six new negatives were accepted, 51.8 was rejected for
  another reason and the three new variants were rejected, while the corrected
  51.4 and 54.5 printed `21b8a3f`'s rows. Eighteen temporary probes, not
  committed fixtures, gave the review's `21b8a3f` results before the repair and
  the revised results after it. For mutation, 156 distinct mutated scripts were
  run on a clean clone, with no duplicates: 111 each disabling one reason rule,
  28 each removing one variant's acceptance clause, 3 reverting a corrected rule
  and 14 fold executions checked by the probes. 155 changed exactly their
  expected results. The other, removing variant 51.1's acceptance (raw exit 1),
  also added that reason to negative 51.4, which stays rejected with its
  expected reason; root's recorded exception E-51V1 covers that one row, so the
  result is 155 OK and 1 NOT OK under E-51V1. The script was restored
  byte-identical after every mutation. The 25 earlier variant removals were
  re-derived, and their byte identity with the C1-A1 run is unproven. On a clean
  clone of `be26bbf`, `validate.py --baseline 314dcf1` and the documentation,
  onboarding and layout checks passed. The continuity check first exited 1 (log
  24), because the run's temporary directory lay inside the work tree; under the
  owner-approved D-4 amendment, with a temporary directory outside every Git
  work tree, it exited 0 with the four original PASS lines (log 24d4). The
  skill-version and footprint checks and `git diff --check` from `314dcf1`,
  `5c60fad` and `21b8a3f` passed, and every footprint line except the total of
  working skill markdown bytes equals the C1-A1 baseline's. These are
  fixture-level results only.
- **Retained evidence:** the raw logs and their hashes are kept only on the
  author machine, in machine-local directories that are not portable: C1-r1 in
  `/tmp/claude-1001/osm-c1-r1-repair-evidence.0afjVF` and C1-r2 in
  `/tmp/claude-1001/osm-c1-r2-repair-evidence.mGtbyV`.
  C1-r3's are in `/tmp/claude-1001/osm-c1-r3-repair-evidence.F0k1C8`, likewise
  only on the author machine.
  C1-A1's are in `/tmp/claude-1001/osm-c1-a1-addendum-evidence.fXtFyd`, also a
  machine-local location on the author machine only.
  C1-A1-r1's are in a machine-local `osm-c1-a1-r1-20261102/evidence` directory,
  likewise only on the author machine.

**Not proved here.** Real grants, inheritance, outside denial, host isolation,
instruction loading on any host, adapters, Home consumption and actual timed
success need their own live or native proof. The source-reported reviews in #70
and #72 are design evidence, not verification.

The HL-1 candidate (implementation `77f25a9` on `feat/osm-home-lifecycle-72-73`,
from the C1 head `4ab486f`; commits `83604a1`, `ec9b05e`, `77f25a9`) replaces the
protected-write default with the owner's recorded write policy and adds the
record lifecycle (#72, #73). It changes contract text, templates, fixtures, the
rehearsal and six skill versions (Context 2.2.0, Setup 2.2.0, Maintain Context
2.1.0, Check 3.1.0, Update 3.0.2, Manage Skills 2.0.1). The fixtures prove
predicates over fictional data. The prose needs independent review: the first
review of `70521a1` requested changes, which the repair round below addresses,
and no review of the repaired text is recorded here.

- **First round, rehearsal at `77f25a9`:** 80 positives and 50 valid variants pass, and 387
  negatives are rejected; the raw exit is 0 with `failures=0`. Each of the 96
  negatives of cases 66 to 80 prints exactly its one expected reason, and the 28
  new positives and variants pass. Of the 383 result rows in the C1 head's log,
  the 376 of cases other than 5 and 40 are byte-identical in the new log and none
  is removed. The 7 rows of cases 5 and 40 are the only changed rows; of the
  other new rows, 10 belong to cases 5 and 40 and 124 to cases 66 to 80.
- **Cases 5 and 40, old and new.** Case 5 was "protected control record inside
  the knowledge store" (check `protected-write`, anchor
  `#protected-records-and-writes`): a positive for both workspaces and two
  negatives, each rejected as `protected-write`. It is now "control record under
  the recorded write policy" (check `write-policy`, anchor `#home-write-policy`):
  the positive is a routine in-home control write under an explicit whole-home
  grant; the valid variant is a write to an ordinary record under a narrower
  policy; the negatives are rejected as `excluded-by-policy`, `outside-policy`,
  `no-policy-recorded` and `outside-home`. Case 40 was "daily curation refuses
  canonical Tasks and Projects" (check `daily-writes`) with three negatives. It
  is now "routine upkeep and operational collections" (check
  `operational-upkeep`, same new anchor). It keeps those three negatives, adds a
  valid variant (a targeted correction to a descendant Projects record under an
  explicit grant), and adds six negatives: `excluded-by-policy`,
  `no-policy-recorded`, `link-as-ancestry`, `task-state-changed`,
  `run-report-in-task` and `untargeted-upkeep`. The two workspace fixtures
  replace their `protected` list with a recorded `write_policy` (workspace A
  whole-home, workspace B narrower) and a `maintained` record.
- **Fail-first:** the C1 head's harness run on the new fixtures raised
  `KeyError: 'write-policy'` at case 5, because the check name is new. With each
  of the 17 new or changed checks stubbed to accept everything, all 109 negatives
  of those cases were accepted (each printed ACCEPTED and MISMATCH), every
  positive and variant still passed, and no other case's rows changed.
- **Mutations:** 107 mutated scripts were run on a clean clone: 88 each
  disabling one reason appended by a new predicate, 3 each making the shared
  policy helper return no denial for one of its reasons, and 16 each removing one
  variant's acceptance clause or the multi-hop dependent follow. All 107 changed
  at least their targeted rows, and the script was restored byte-identical after
  every one. In the first clean-clone run at `ec9b05e`, 106 were killed and one
  survived: removing case 75 variant 1's guard changed no row, because the
  variant held no substantive event. `77f25a9` repairs that variant and the
  full set was re-run. The author states that planning had found two reason
  sites (cases 69 and 76) that no negative reached, and `ec9b05e` added one
  negative for each; no retained log shows that planning.
  `task-route-refused` was not mutated: it has no negative at the C1 head or now.
- **Repository checks:** on a clean clone of `77f25a9`, `validate.py --baseline
  314dcf1`, the documentation, onboarding, layout, skill-version and footprint
  checks, and `git diff --check` from `314dcf1` and from `4ab486f` passed, and
  the continuity check passed with a temporary directory outside every Git work
  tree. The footprint journey `codex-package-and-bridge-verification` is 42,781
  bytes against its 42,793-byte bound, so the Setup, curation and
  setup-scenarios additions were cut to one or two lines each. A search found no
  `protected-records` under `skills/` or `tests/` and no `protected:` key in the
  root template. Fragment links resolve as before: 82 are checked (62 at the C1
  head) and the same two stale ones, in `README.md` and this file, were already
  stale there and are unchanged.
- **Not in CI:** the context rehearsal is in neither `AGENTS.md` nor `release.yml`,
  so CI does not guard this contract.
- **Retained evidence:** the raw logs and their hashes are kept only on the
  author machine, in a machine-local `osm-c1-a1-r1-20261102/evidence-hl1`
  directory.

**Repair round after the first review** (commits `c365536` and `d9113b6`; the
record you are reading is the commit after them). The independent review of
`70521a1` requested changes with four blockers, and the lead reproduced all four
(the lead's statement; no retained log).
This round repairs them and a few leftovers; the remaining review follow-ups stay
open.

- **What was repaired.**
  - *Human originals:* an original is now the original artifact or retained body,
    and a Source or index record that points to it is an editable metadata
    record; named-store and control records follow the recorded policy even when a
    person wrote them. The earlier recognition by "human authorship" and the
    "treat it as an original" default are gone. Case 73 now has five variants
    (an owner-written Skill upkeep edit, a selected-source edit to an original, a
    Source record updated while the original keeps its body, a refusal that a
    narrower policy justifies, and a current-task edit) and nine negatives.
  - *Notion operating route:* the maintenance limit applies to what a run reads,
    not to what the policy lets it write, and notices follow the architecture's
    drift rule.
  - *Dates:* case 75 compares real before and after values of the source date and
    Revised, so an unknown date stays null, a single date stays that date, and
    no-op and formatting events leave both unchanged.
  - *This record:* the "review proof for the prose" claim, the attribution of the
    new rows, the unretained planning statement and "one line each" are corrected
    above.
  - *Also:* external operational stores are no longer home containment, and daily
    upkeep reads the recorded policy instead of a superseded allowlist (case 40
    negative 1 now expects `daily-canonical-write`); three more separate-authority
    kinds (source selection, external send, other consequential action); Check's
    pending item for an existing recorded form; the template comment for stores
    the definition names outside the root; "flagged", a substantive completed
    review and the Dependents clauses in the architecture; and three stale phrases.
- **Rehearsal at `d9113b6`:** 80 positives and 58 valid variants pass, and 401
  negatives are rejected; the raw exit is 0 with `failures=0`. Against the log of
  `77f25a9`, 516 rows are byte-identical, 1 is changed (case 40 negative 1, above)
  and 22 are added, each named in the retained row diff. Against the log of the C1
  head, the 376 rows of cases other than 5 and 40 are byte-identical, and the
  other differences are in cases 5, 40 and 66 to 80.
- **Fail-first and mutations:** with each of the 17 new or changed checks stubbed
  to accept everything, every negative of those cases is accepted, every positive
  and variant passes and no other case's rows change. The `70521a1` harness on the
  repaired fixtures raises `TypeError` at case 73. For the predicates and clauses
  this round changed or added, 64 mutated scripts were run on a clean clone: 27
  disabling a reason, 3 on the shared policy helper, 1 putting the external
  operational stores back into `home_stores`, 22 removing a member of one of four
  tuples (including each of the four no-change events) and 11 removing a clause.
  A mutation counts as killed when every row it targets changes; the target list is
  the author's. All 64 were killed, one of them by a harness crash, and the script
  was restored byte-identical after each. The other predicates have identical
  function text in `77f25a9` and `d9113b6`, and their cases' fixtures are
  unchanged, so the earlier mutation results stand for them.
- **Fixtures are read-backs in part.** Many new fixtures state a behaviour as a
  field the predicate reads back, so they prove the predicate's wiring, not agent
  behaviour, and the mutation counts must be read that way.
- **Case 47 and case 73.** The rows of case 47 (task-authorised edit to a human
  document) have no accepted-input selection field: they model default or routine
  writes to a human library against an edit by a task. Case 73 explicitly models
  current-task, owner-decision or selected-source input under the recorded policy.
  Neither fixture proves actual agent behaviour. The old case 47 rows and their
  logs are unchanged and are not redefined.
- **Repository checks:** on a clean clone of `d9113b6`, `validate.py --baseline
  314dcf1`, the documentation, onboarding, layout, skill-version and footprint
  checks, and `git diff --check` from `314dcf1` and from `70521a1` passed; the
  footprint figure is unchanged at 42,781 against 42,793 bytes. A search found no
  `protected-records` under `skills/` or `tests/` and no `protected:` key in the
  root template.
- **Continuity was not rerun.** `tests/continuity-rehearsal.py` keeps blob
  `9900f5cc4b35832b323c44ccd477edaa1f2a3840` and `skills/osm-setup/assets/owner`
  keeps tree `3b95d53d63dc246dc6f4115ec0f6035af5f3f287`, the same as at the C1
  head, and the script reads only itself and those assets. The continuity result
  therefore stays bound to `77f25a9`.
- **Retained evidence:** the repair round's logs are kept only on the author
  machine, in a machine-local `osm-c1-a1-r1-20261102/evidence-hl1b` directory.

**NOT VERIFIED for HL-1.** Real provider containment, inheritance and
permissions, and real connector routes; Setup, rerun, interrupted adoption and
local extensions on a real home; a real non-Notion home and pointer loading; the
changed manual method on a real home, and two real hosts; a real multi-hop
refresh; a real, naturally scheduled run (a run-now, a job API success or a
read-back configuration is not one, and no timer was created); installed and
released states. The owner's pilot evidence and the source chat's reviews are
context, not proof for this candidate.

On 2026-10-29 the package was prepared as OSM 0.31.0 on
`feat/osm-home-internal-notion-74-82`, on top of `e353588`. Only the version
changed.

**What changed.**

- The version is 0.31.0 in the eight package and manifest declarations and in
  the local overview (`docs/osm.md`), and the changelog entry is dated.
- The rebuilt `runtime/sidebar/index.html` and `runtime/sidebar/server.cjs`
  differ from `e353588` only in their four version strings.

**Checks.**

- A second build reproduced both runtime files and the notices byte for byte,
  and the stdio smoke passed.
- Validation (`--baseline 314dcf1` and `--release-tag v0.31.0`), the
  onboarding check and `git diff --check` passed on a clean clone of
  `e353588` carrying exactly these changes.
- The sidebar unit tests and the documentation, layout, continuity,
  skill-version and context-footprint checks read none of the changed files
  and were not rerun; their earlier results stand.

**Not done.** No 0.31.0 tag or release exists yet. Home's internal connection
still reports `unsupported_host` in this build, so internal-mode Home cannot
connect on any host; Home's other behaviour is proven at fixture level only.

**Native proof.** None.

On 2026-10-29 the Sol r9 corrections and the L-2 context binding (`c43c5c8` on
`feat/osm-home-internal-notion-74-82`, on top of `f776dfb`) addressed R9-1 to
R9-3 and L-2 at fixture level.

**What changed.**

- R9-1: an observed account change now holds until Home observes `ready` with
  `mapping: saved`. No other status lifts it: not an official-mode projection
  (which makes no connection check), a missing projection or connection, a
  failed, pending, mapping-less, `unavailable` or `rate_limited` check, or a
  list or read that reports `account_changed`. While it holds, Home shows the
  account-change gate, or for a failed or transient check its own gate with
  Try again, and reads no page icons. A context change ends it for the new
  context.
- R9-2: while it holds, the setup and Settings context pickers leave the
  context page and the saved source pages out of their live results, also
  results already listed or searched, without closing an open list or
  clearing its search. A context switch confirmation that names a saved page
  keeps the choice but hides its question.
- R9-3: choosing the 'Selected page' entry of a pending setup selection keeps
  that selection and its title.
- L-2: when the context route is configured, every `osm_home` status path
  names that context, taken from the same context-route read as its
  projection. Home does not apply a status that names another context: it
  counts as a failed check, which cannot end a held account change, and
  Refresh reads the current context. A status without a context field is
  applied as before. In the product that is the server's error fallback and
  a status read without a configured context route; neither can end a held
  change, which needs `ready` with `mapping: saved`. The synthetic test
  fixtures written before L-2 also carry no context field and stand for the
  panel's own context. Lists and reads were already bound to their context by
  their scope.

**Fixture results.**

- **Fail-first:** the seven R9 tests failed their assertions on an inert copy
  of `f776dfb`. That log's own first-failure check failed (it stopped before
  Node 26's failing-tests recap) and is kept as failed; the raw output was
  checked separately. The three L-2 tests then failed their assertions on an
  inert copy of `f776dfb` with the R9 corrections. No timeouts or runner
  errors.
- **Checks:** 182/182 sidebar unit tests passed on the final sources. The
  build regenerated only `runtime/sidebar/index.html` and
  `runtime/sidebar/server.cjs`, a second build reproduced both byte for
  byte, and the stdio smoke passed, including its new check that the bundled
  server's status names its configured context. Validation
  (`--baseline 314dcf1`), the onboarding check and `git diff --check` passed
  on a clean clone of `c43c5c8`. The documentation, layout, continuity,
  skill-version and context-footprint checks read none of the changed files
  and were not rerun.
- **Limits:** as recorded for `efd43df`. Home in official mode makes no
  connection check, so a newly opened panel does not observe the change. A
  panel notices a context change made elsewhere only on Refresh; until then
  it shows its own saved links as before. A status without a context field is
  not bound. The two residuals disclosed for `efd43df` are corrected.

**Native proof.** None.

On 2026-10-29 the Sol r8 corrections (`efd43df` on
`feat/osm-home-internal-notion-74-82`, on top of `00a9c61`) addressed R8-1 to
R8-4 at fixture level.

**What changed.**

- R8-1: after an observed `account_changed`, Home offers no saved-links path
  and opens no saved target. Settings and setup hide their five saved-source
  fields and show the context without its saved name; both keep the draft and
  an unfinished link and refuse to save source links until Home is ready again
  with a mapping for the current connection. The saved bytes don't change.
- R8-2: the reader shows only the answer to its own request and section;
  invalidation and settlement still run first.
- R8-3: a block text cut at 20,000 characters or 200 rich-text items marks the
  article truncated, so its notice shows. F5 is unchanged.
- R8-4: the Context projection procedure states this phase's verification
  limit instead of citing `osm_home`.

**Changed test expectations.** Two `account_changed` expectations that
described the old behaviour were removed, and each is replaced by a stronger
test: the tuple in the gates test (gate action to saved links) and the state in
the R4-2 test (links view kept after Refresh). The R4-2 removal followed a
stop: the first full run after the fix failed only that iteration (166/167).
No other assertion changed; the 41 base test bodies and the F1 icon control are
byte-identical.

**Fixture results.**

- **Fail-first:** the four R8 tests failed their assertions on the `00a9c61`
  sources; the links-chosen account-change test failed on an isolated
  `00a9c61` export; the three Settings and setup tests failed on an inert copy
  of the uncommitted R8 fix without them; and the setup context picker test
  failed on an inert copy of the uncommitted fix without its one-expression
  change. No timeouts or runner errors.
- **Checks:** 172/172 sidebar unit tests passed on the final sources. The
  build regenerated only `runtime/sidebar/index.html` and `server.cjs`, a
  second build reproduced them byte for byte, and the stdio smoke passed.
  Validation (`--baseline 314dcf1`), footprint, documentation, onboarding,
  layout, continuity and skill-version checks passed on a clean clone of
  `efd43df`, and `git diff --check` passed.
- **Limits:** an open list of saved choices closes as on every Refresh and a
  typed page search is cleared on its next open; hidden fields and the hidden
  links view keep their content in the page; the suppression starts only once
  Home has observed the change.
- **Disclosed for review:** the context pickers keep listing live pages from
  the official connection, which can show the context page under its current
  title; and choosing setup's 'Selected page' entry while suppressed brings
  the saved name back only at the next status refill. No saved byte changes in
  either case.

**Native proof.** None.

On 2026-10-27 the Sol r6 correction (`df5ee99` on
`feat/osm-home-internal-notion-74-82`, on top of `74908c6`) brought reads into
Home's recovery settlement.

**The three request paths.** `osm_home` (`load()`), `osm_home_list` (`list()`,
including Load more), and `osm_home_read` (`read()`). Each now takes part in
settlement:

- A current-generation read that is pending, or that failed (`unavailable` or
  `rate_limited`), keeps the recovery unsettled. This holds even after Back or
  another selection.
- `rearm()` runs again after a read answers validly.

No request, timer, store or transport was added.

**Fixture results.**

- **Checks:** the build passed with no `runtime/sidebar` diff, 163/163 sidebar
  unit tests passed, and the stdio smoke passed. Validation
  (`--baseline 314dcf1`), footprint, documentation, onboarding, layout,
  continuity and skill-version checks all passed on a clean clone of `df5ee99`,
  and `git diff --check` passed.
- **Fail-first on the `74908c6` sources:** each new test was run alone and
  matched exactly one test. The pending-read tests (with and without Back) and
  the failed-read tests (`unavailable`, `rate_limited`) failed their assertions.
  Three tests passed there as coverage only:
  - the successful-last-read test;
  - the old-generation answers test;
  - the section Try again test.
- **Targeted variants on copies:** each coverage-only test failed its assertion
  under the variant it targets:
  - no re-check after a read;
  - no generation check;
  - a section Try again without a reset.
- **No timeouts or runner errors** occurred in this run.

**Native proof.** None.

On 2026-10-27 the Sol r5 correction (`4289942` on
`feat/osm-home-internal-notion-74-82`, on top of `7ff9e18`) re-armed Home's
automatic recovery.

**Cause.** The run 72 brief said the budget "resets only on an explicit refresh,
Try again/retry, or a context change". That wording did not restate the
positive rule, and `7ff9e18` followed it. After one automatic recovery, every
later independent invalidation therefore cleared Home and showed the gate with
no automatic reload.

**Now (R5-1, I2):** one automatic status reload per independent invalidation
episode. `revoke()` spends the budget and marks a recovery active. The budget is
re-armed only when that recovery has settled successfully:

- its status loaded as ready;
- every section it requested answered for the current generation with current
  valid data;
- none of those sections is still pending, failed or invalid.

A ready status alone, or one healthy sibling, is not enough. Refresh, Try again
(the gate's or a section's) and a context change re-arm explicitly. No timer,
store or transport was added.

**Fixture results.**

- **Checks:** the build passed with no `runtime/sidebar` diff, 156/156 sidebar
  unit tests passed, and the stdio smoke passed. Validation
  (`--baseline 314dcf1`), footprint, documentation, onboarding, layout,
  continuity and skill-version checks all passed on a clean clone of `4289942`,
  and `git diff --check` passed.
- **Fail-first on the `7ff9e18` sources:** the two "distinct invalidation
  reloads once more" tests and the section Try again test failed their
  assertions. Four negative controls passed there, because the old code never
  re-arms:
  - ready status alone;
  - one healthy sibling;
  - the FIRST version of the alternating-answers test (corrected in run 74: the
    final, strengthened version was not rerun on `7ff9e18`; only the naive
    variants below exercise it);
  - context change.
- **The negative controls still discriminate.** On temporary copies with naive
  variants, each control failed or timed out by looping:
  - re-arming on any accepted list result;
  - re-arming on a ready status;
  - not resetting on a context change.

**Native proof.** None.

On 2026-10-27 the Sol r4 core corrections (`841e86e` on
`feat/osm-home-internal-notion-74-82`, on top of `fba8dcb`) fixed four cases:

- **R4-1, I1.** A data source whose schema parent is another data source is
  support when either parent ID is support, otherwise unresolved. There is no
  traversal into that source.
- **R4-2, I3.** Links the user chose allow icon reads only on a resolved ready
  status.
- **R4-3, I2.** Accepted results no longer reset the automatic recovery budget;
  only Refresh, Try again or a context change does. That was too narrow:
  recovery was never re-armed. Corrected in run 73; see the entry above.
- **R4-4, I1.** The ancestry bound counts every hop per item, cached or not.

No read was added. (a) and (d) remain unresolved, pending an owner decision.

**Fixture results.**

- **Checks:** the build passed with no `runtime/sidebar` diff, 149/149 sidebar
  unit tests passed, and the stdio smoke passed. Validation
  (`--baseline 314dcf1`), footprint, documentation, onboarding, layout,
  continuity and skill-version checks all passed on a clean clone of `841e86e`,
  and `git diff --check` passed.
- **Read table:** the published read-table cases keep their exact counts.
  Corrected in run 73: counting a hop before the cache lookup can make a deeper
  chain stop earlier with fewer reads. For one such chain, Sol r5 traced 7 page
  reads at `fba8dcb` and 6 at head. That figure is from Sol's source trace and
  its own receipt for the earlier count, not a result of these checks; Sol's
  receipt for the head count was lost to a read-only filesystem.

Fail-first on the `fba8dcb` sources:

- **R4-1 and R4-4:** failed.
- **R4-2:** failed.
- **R4-3, both scope variants:** never terminated, which is the unbounded
  recovery loop itself. Each was killed by its timeout.
- **F1 positive control:** passed.
- **Missing scope-less list case:** already handled at `fba8dcb`, so it passed
  there.

**Native proof.** None.

On 2026-10-27 the Sol r3 repairs (`bf083bc` on
`feat/osm-home-internal-notion-74-82`, on top of the reviewed `65c816d`) enforced
four rules, one shared place each.

- **I1, support containment:** one predicate for every list and read path.
- **I2, invalidation:** `current()` classifies every service state.
- **I3, automatic official reads:** these need positive resolved evidence.
- **I4, persistence:** the reader's UTF-8 byte bound applies before any
  replacement.

**Fixture results.**

- **Checks:** the build passed with no `runtime/sidebar` diff, 143/143 sidebar
  unit tests passed, and the stdio smoke passed. Validation
  (`--baseline 314dcf1`), footprint, documentation, onboarding, layout,
  continuity and skill-version checks all passed on a clean clone of `bf083bc`,
  and `git diff --check` passed.
- **Discrimination:** the new and updated tests run against the `65c816d` sources
  failed exactly the I1 to I4 tests and the read table. The 89 tests that already
  existed, including the F1 positive control, passed there.

The fixture changed in two places to match the service and API contracts:

- **Scripted results carry scope.** Scripted list and read results now carry the
  scope they were read under, as the service's ready results do.
- **Data sources carry `database_parent`.** Fictional data sources now include
  this documented required field.

**Read counts.** A data-source record read now also reads its source's schema:
`read property-only memory` goes from schema 0 to 1. This is the bounded I1
check, which uses the data source's `database_parent`, not a database read. New
rows:

| Case | Reads |
| --- | --- |
| List with support ancestry (5 mapped pages) | 10 page reads, 1 returned |
| Read a page under a support row | 2 page reads |
| Read a page three levels below the root | 4 page reads and 1 body |
| List a data source in a support database | 1 schema read and no query |

**Consequence of refusing unresolved containment** (as corrected in run 72):

- **(a), pending an owner decision.** An external database is not listed until
  its whole ancestry can be read within three ancestor-page steps. Sharing its
  immediate parent alone may not be enough.
- **(d), pending an owner decision.** A page-list row of a data source is
  refused, even when that data source is mapped elsewhere.
- **Withheld as unresolved.** Pages under block parents, and chains needing more
  than three ancestor-page steps.

**Native proof.** None.

On 2026-10-27 the Sol r2 repairs (`121d626`, on top of `80b220d`) addressed the
variants Sol r2 named. Sol r3 found F1 and F2 still incomplete; see the entry
above. F4 and F5 were resolved in r1.

**Fixture results.**

- **Checks:** the build passed with no `runtime/sidebar` diff, 134/134 sidebar
  unit tests passed, and the stdio smoke passed. Validation
  (`--baseline 314dcf1`), footprint, documentation, onboarding, layout,
  continuity and skill-version checks all passed on a clean clone of `121d626`,
  and `git diff --check` passed.
- **Discrimination:** the new tests run against the `80b220d` sources failed
  exactly R2-1, R2-2 (official to internal), R2-3 and the updated read table. The
  internal-to-official refresh test pins unchanged behaviour and passed there.

The variants and their tests:

- **R2-1:** a row of a support data source mapped individually in a context page
  list is not listed (counted, not named) and is refused on read with no block
  request.
- **R2-2:** a refresh from official to internal makes no icon read while the new
  status is pending or after it resolves. A refresh from internal to official
  reads icons only after official resolves.
- **R2-3:** a denial arriving after Back clears the title with one status
  recheck and no loop.

The read table adds the page-list cases: listing one with a support row reads 3
pages and returns 2; reading that row reads only its page.

**What is enforced for support material.**

- A projection that maps a support source or page as context is refused.
- Support pages are left out of context database lists and refused before any
  request.
- Pages whose parent is a support data source are refused at read time, before
  their title, fields or blocks are used.

**Native proof.** None.

On 2026-10-27 the Sol r1 repairs (`3ca28a6`, on top of the reviewed `d7ba06f`)
addressed five findings. Sol r2 later found F1–F3 only partly resolved; see the
entry above.

**Fixture results.**

- **Checks:** the build passed with no `runtime/sidebar` diff, 130/130 sidebar
  unit tests passed, and the stdio smoke passed. Validation
  (`--baseline 314dcf1`), footprint, documentation, onboarding, layout,
  continuity and skill-version checks all passed on a clean clone of `3ca28a6`,
  and `git diff --check` passed.
- **Discrimination:** the new tests run against the reviewed `d7ba06f` sources
  in a temporary export failed exactly the tests for F1 (internal Home), F2,
  F3, F4, F5 and the updated read-count table. The tests that pin unchanged
  icon behaviour for an official-mode projection and without a projection
  passed there too.

The findings and their tests:

- **F1:** internal Home makes no `osm_notion_icons` call, including before
  `osm_home` resolves. Official mode, no projection, and links the user chooses
  keep their icons.
- **F2:** a support row inside a Memory data source isn't listed, and a read is
  refused with only the identity request.
- **F3:** a listed record that becomes inaccessible clears its titles with one
  status recheck and no loop. An initially inaccessible source makes no extra
  call.
- **F4:** a trashed root is `root_inaccessible`.
- **F5:** a property over 4,000 characters marks the article as partial.

The per-case read table gains "Read support row inside Memory": identity 1, all
others 0.

**Native proof.** None, as before. Official-route icon behaviour in a real
Codex panel and real Notion trash and access changes remain unverified.

On 2026-10-26, contract delta 1 (`5559d7f` on
`feat/osm-home-internal-notion-74-82`) made Home a generated projection of one
AI Operating Model definition revision, with an explicit connection mode and
support material excluded. Saved-text sizes, fixture results and native proof
are recorded separately below and support different claims.

**Saved-text size.** The fictional fixture projection (`osm-home-projection/1`,
five context sections) saves as 4,198 bytes against a 32,768-byte limit. This is
a size observation only. The owner's 53.6% entry and 50.0% source-index
reductions are recorded in #69; this repository did not measure them.

**Fixture results.** The build passed with no `runtime/sidebar` diff, 123/123
sidebar unit tests passed, and the stdio smoke passed, including a saved
official-mode projection reporting `official_mode`. Validation
(`--baseline 314dcf1`), footprint, documentation, onboarding, layout,
continuity and skill-version checks all passed on a clean clone of `5559d7f`, and
`git diff --check` passed. New tests cover:

- the projection being replaced only by a new revision and refused without one;
- official mode making no request;
- support material never shown as context;
- synthetic fixture IDs;
- generated links' revision and the partial-view label.

Reads per case against the fictional workspace (fake transport, internal mode):

| Case | Needed sources | Identity | Page | Schema | Query | Body |
| --- | --- | --- | --- | --- | --- | --- |
| Status (identity and mapped root) | 1 | 1 | 1 | 0 | 0 | 0 |
| List profile pages | 2 | 1 | 2 | 0 | 0 | 0 |
| List memory titles | 1 | 1 | 0 | 1 | 1 | 0 |
| Read property-only memory | 1 | 1 | 1 | 0 | 0 | 1 |
| Read About with nested blocks | 1 | 1 | 1 | 0 | 0 | 3 |
| Outside page via page list | 0 | 1 | 0 | 0 | 0 | 0 |
| Outside page via data source | 0 | 1 | 1 | 0 | 0 | 0 |
| Support material | 0 | 1 | 0 | 0 | 0 | 0 |

The same cases in official mode make no request.

**Native proof.** None. This proves no native Codex or Claude behaviour, native
YAML support, internal-connection boundary in a real workspace, official-route
reading or daily run. Those remain open under #61, #69 and #82.

On 2026-10-26 the Home reader and internal Notion connection candidate
(`bbedf80` on `feat/osm-home-internal-notion-74-82`, from `main` `314dcf1`) was
checked with Node 26.12.0 and Python 3. npm was not installed, so the existing
dependencies were used with `node build.mjs`, `node --test *.test.mjs` and
`node smoke.mjs`.

Results:

- **Build:** passed, and the committed `runtime/sidebar` has no diff.
- **Sidebar unit tests:** 115/115 passed, 18 of them in `home.test.mjs` and 12
  new Home DOM tests.
- **Bundled stdio smoke:** passed, including the new tools, `unsupported_host`
  and a mapping save and readback.
- **Rehearsals:** the footprint, documentation, onboarding, layout, continuity
  and skill-version rehearsals passed.
- **`git diff --check 314dcf1 HEAD`:** passed.
- **`validate.py --baseline 314dcf1`:** passed on a clean clone of `bbedf80`. In
  the writer worktree it fails on a sandbox device file at `.mcp.json`, which is
  not part of the repository.
- **Discrimination check:** removing the data-source parent fence from a temp
  copy failed exactly the outside-page test.

The fixtures cover:

- allowed root, child and database reads;
- an outside page denied for fetch, query and linked source, without leaking;
- a linked external database denied until it is granted;
- revocation, account change and scope change clearing everything;
- property-only memory and a second model's names;
- paging and block bounds, and unsupported blocks;
- hostile text;
- the absence of the token from every result;
- old saved links loading unchanged;
- tab keys, Back focus, More, the gates, and the 500/320 px styles.

No live Notion request, token, grant or native Codex or Claude run was made.
Those remain with the approved native holders.

After lead Review on 2026-10-23, the candidate renames the new-customer Notion
template to `notion-osm.md` (page **OSM**, no operating-system framing) and
makes the `aios` → `osm` switch disable `aios` before fresh-session acceptance,
with rollback by disabling `osm` and re-enabling `aios`. `validate.py --baseline
b3bb4d4 --release-tag v0.30.0` passed with new template and switch-procedure
guards and three negative controls, as did the documentation, onboarding,
skill-version, footprint, layout and continuity rehearsals and entry-routing
fixture preparation. Runtime bytes did not change, so the sidebar build and unit
tests were not rerun. Native disable/enable and fresh-session acceptance remain
the lead's native checks.

On 2026-10-23 the OSM 0.30.0 identity candidate (`0a04d0b` on
`feat/osm-identity-62`, from `main` `b3bb4d4`) passed with Node 22.22.3 and
Python 3.14.5: `npm ci --ignore-scripts`, build, 85 sidebar unit tests and the
bundled stdio smoke; `validate.py --baseline b3bb4d4 --release-tag v0.30.0`,
including rename lineage and the new compatibility negative controls; the
documentation, onboarding, layout, continuity, skill-version and footprint
rehearsals; model-selection, intent-trial and entry-routing fixture preparation;
and Claude CLI inline discovery in a temporary config. A second build after
commit left no `runtime/sidebar` diff. New unit tests read a 0.29.0
`AIOS:BEGIN` block and `CODEX_HOME/aios/panel` links without migration. Codex
`plugin/read` in an empty temporary `CODEX_HOME` returned no enabled Setup entry,
because nothing was installed there. Native install, upgrade from `aios`, Codex
UI, fresh-session model behavior and owner adoption are not verified by these
source checks.

On 2026-10-17 the owner checked `1d719a2` in the installed Codex sidebar: the centred
geometry is accepted, but its own greys looked lighter than the neighbouring icons in the
light theme and too dark in the dark theme. The next candidate keeps the geometry, packaged
PNG and tool and server icon delivery, and removes the SVG's own colours so it paints only
with `currentColor`. With Node 26.8.1 and the copied locked dependencies, the updated smoke
failed on the `1d719a2` bundle (its `<style>`) and passed on the candidate. A stdio
comparison found every `tools/list` field, server identity and capability unchanged apart
from the icon bytes, still shared by `aios_open` and the server. Two builds were
byte-identical. The [browser comparison](evidence/icon-56/README.md) is a proxy. Whether
Codex colours the icon like its neighbours has not been observed.

Later on 2026-10-16, with `687f99a` installed and all its bytes verified, the owner's
restarted Codex still showed the AIOS sidebar icon far darker than its neighbours: a second
native failure. `1d719a2` centres the mark and sends one theme-less SVG as both the
`aios_open` tool icon and the server icon, through an owned `tools/list` handler on the SDK's
public low-level server. With Node 26.8.1 and the copied locked dependencies, the bundled
smoke failed on the `687f99a` bundle (no tool icon) and passed on `1d719a2`, including a
rejected invalid argument, Settings, status and saves. A stdio comparison found every
`tools/list` field, server identity and capability unchanged apart from the new
`aios_open.icons` and the changed server icon, which now match. Two
builds were byte-identical. The 83 unit tests were not rerun: none imports the server. The
[browser comparison](evidence/icon-56/README.md) is a proxy. The owner's 2026-10-17 check
above accepted its geometry and failed its colour.

Earlier on 2026-10-16, the owner restarted Codex with #56 candidate `6d3e040` installed. The AIOS
panel looked fine, but the global sidebar icon was almost black on the dark sidebar: a
native contrast failure. Which icon metadata Codex selected is not known. The repair sends
one theme-less adaptive SVG server icon with a neutral fallback colour and keeps the
packaged PNG. The new bundled smoke failed on the `6d3e040` bundle (two icons) and on a
`#8a8a8a` fallback draft (under 3:1 on a light selected background), then passed on the
repair with Node 26.8.1. The rebuild was byte-identical and changed only the icon
expression. The [browser comparison](evidence/icon-56/README.md) is a proxy, not a native
capture. Whether the installed Codex sidebar shows the repaired mark, readable in light
and dark themes, selected and unselected, has not been observed.

On 2026-10-13, the issue #56 icon candidate (still 0.29.0) replaced the plugin icon and
the sidebar server icon with one context-hub mark. The locked sidebar build changed only
the icon expression in `runtime/sidebar/server.cjs`, and a rebuild was byte-identical. Node
26.8.1 ran the 83 sidebar tests and the bundled smoke, which decodes both themed
`serverInfo` icons and still opens the tool and resource. Dependencies were a hash-verified
copy of the main checkout's locked install, not a fresh `npm ci`. The
[browser comparison](evidence/icon-56/README.md) uses the actual emitted payloads and PNGs
and is not a native Codex capture. An installed, reloaded Codex showing the new icon and
still opening AIOS remains unverified.

For the AIOS 0.29.0 design-skill retirement, `validate.py --baseline a14f285` (22 versioned
skills), the seven release Python checks, `skill-version-rehearsal` and the content graph tests
pass. Entry-routing, intent-trial and model-selection runs only prepared fixtures, not native-behavior
proof. Native Claude, Pi and Gemini rehearsals were unavailable to the implementation worker; the
operator separately ran `tests/native-claude-rehearsal.py` on an exact candidate archive in an isolated
Claude config (no model/auth call, no marketplace install), which passed: plugin and marketplace
manifests accepted, a malformed skills type rejected, and inline discovery of aios 0.29.0 with 22
skills and no agents, hooks or MCP servers. Pi, Gemini, the Claude marketplace install lifecycle and
model behavior remain unproven. The locked sidebar
rebuild, `npm test` and installed discovery are verified separately in the release readback.

For the AIOS 0.28.1 design-method candidate, the [synthetic polish rehearsal](evidence/design-polish/README.md)
retains comparable full-scroll service-page views at 1120px/320px in light/dark,
disclosure and form-error states, a dense counterexample, and actual editable
HTML save/reopen, intervening-change preservation and export/reopen observations.
Its check record separates source validation, the unchanged design helper suite
and locked Node 22 sidebar verification from rendered proof. This is writer
evidence, not independent acceptance, model activation, external-editor
compatibility, customer conversion or installed 0.28.1 qualification.

For AIOS 0.28.0, the [Foundation migration](project-foundation.md) retires one
entrypoint and reconciles the current documentation, routing and native package
metadata. The candidate passes the seven maintained Python checks, locked Node 22
build, 83 sidebar tests and bundled smoke. Native installed discovery is a
separate adoption check; an uninstalled package has no enabled Setup entry.
Two fresh T3/Claude 2.1.295 probes did not observe automatic project instructions,
with or without a one-line `CLAUDE.md` import. That pointer was not shipped as a
fix. The pilot explicitly reads canonical `AGENTS.md`; automatic loading on that
invocation remains unqualified. Current Claude documentation supports direct
AGENTS loading and imports, so this is not a claim about every Claude client.
Independent review and the delivered revision belong to the release PR.

On 2026-10-10, the coordinator reported a separate Claude Code 2.1.295 isolated
native lifecycle trial using released public-source snapshots and a fresh private
configuration directory: install 0.27.0, refresh/update to 0.28.0, read native
details, uninstall and remove the marketplace all exited 0. Native list/cache
inventory changed from 26 to 25 skills with Foundation absent; final plugin list
was empty and the shared settings hash was unchanged. No authentication was
copied and no model call or purchase was made. This coordinator-observed result
qualifies that isolated lifecycle through 0.28.0 only, not 0.28.1, model activation,
AGENTS autoload or account-global adoption; it does not replace the earlier
instruction-loading observations above.

The human-review handoff candidate (2026-10-08) links Build, Review and Ship to
one proportional presentation guide and reuses Design's existing visual comparison
method. Source checks cover links, skill versions, layout and context footprint;
the latter reports the conditional guide cost separately from worker launch.
Fresh tool-free Opus 5.5 medium exercises covered a small CLI change with delegated
delivery and a published handoff with inaccessible/mislabelled media and stale
checks. After a brevity refinement, the CLI response used two short paragraphs;
the publication response proposed an in-place repair but still repeated details.
Both publication responses also labelled the removed excerpt “Before (d7)” even
though d7 identified only the old test revision. Independent review caught this
unsupported baseline; use “removed text from the d9 diff” unless its revision is
verified. This is a residual failure, not an all-pass result.
The PR retains actual inputs, outputs, hashes and review. These exercises used
supplied observations; they did not execute repairs, inspect media, establish
native discovery or prove a general improvement over the previous method.
Release and installed behavior remain separate from this source candidate.

A subsequent visual-relevance revision conditionally reuses Clarify and asks
Review to flag visuals that add no understanding. A fresh tool-free Opus context
chose an action/result explanation, a README excerpt and a credential-boundary
diagram for different supplied tasks, and omitted an unchanged phase chart.
This verifies bounded format choices, not real screenshots, interactions or
security behavior. Its recorded input precedes the final wording that Review
flags concerns rather than editing the subject; source review covers that wording.

For AIOS 0.26.0, see [Codex sidebar verification](sidebar.md#verification-and-recovery).
Build and test the pinned author dependencies, check generated runtime equality,
then run the existing source and native onboarding checks. A protocol fixture
does not establish rendered sidebar placement or a new-account OAuth grant.

For AIOS 0.20.0, see [native onboarding](archive/issue-38-onboarding.md) for the
optional Notion connection, native Setup entry, six synthetic decision cases,
Codex parser and Claude lifecycle observations. Run
`python3 tests/onboarding-rehearsal.py`; add `--native` for the separate
read-only Codex check. Desktop rendering and new-account OAuth remain unverified.
Release, installed bytes and live customer access require their own readback.

For AIOS 0.18.0 and write-code 1.1.0, see
[engineering criteria and matched trials](write-code.md#engineering-criteria-revision-110).
The 1.0.2 baseline was tested before editing; identical native tasks and 20
independent checks per revision cover proportional implementation and read-only
review. Source checks and installation/release state remain separate.

For AIOS 0.17.0, see [project creation](project-creation.md) for general workspace
setup, conditional repository seeds, the distinct software-foundation result
and retirement of Create System. The release PR retains source checks,
bounded native observations and independent review; installation/discovery and
release readback remain separate evidence. No hook or Factory qualification is
claimed by this package change.

For AIOS 0.16.0, see [Clarify and retired shelves](clarify.md) for the adopted
explanation purpose, source provenance, two native candidate decision probes
and retirement/recovery boundary. Native package adoption and public archive
state are read back separately after release.

For the 0.15.0 Interview/local-trial change, see
[intent and local trials](archive/intent-and-trials.md) for the accepted boundaries,
baseline/candidate decision probes, ordinary native observations and limitations.
These cover overactivation and selected source reads; the behavioral probes
do not establish installation or a rendered UI comparison. Release and native
adoption are verified separately against the delivered version.

For 0.14.1, [Project Foundation](project-foundation.md) records the independent
project boundary and maintained code/design contracts. Source validation against
0.14.0, documentation, layout, continuity, skill-version and context-footprint
checks pass. These checks verify package routes and contracts, not model behavior
or a live application deployment. Independent review and delivery evidence belong
to the release PR.

For 0.14.0, see [Project Foundation](project-foundation.md) for shared template
content, selected application obligations, CI cadence, runtime boundaries and
the required distinction between source checks and behavioral evidence.

For 0.13.0, see [productivity skill refinements](archive/productivity-refinements.md)
for the accepted five-skill scope, factory boundary and bounded verification.

For the 0.12.0 source candidate, see [Interview and Setup](archive/interview-setup.md)
for the accepted invocation boundaries, rename, README workflow coverage and
bounded proof. The existing source checks now cover 24 canonical skills.
The matched new-home footprint routes have an accepted focus and include the
shared question procedure. An owner interview is conditional; the benchmark
also reports its additional reads and the full setup total with that interview.
It does not treat the broader new conversation capability as a free read.

For 0.11.0, see [design upstream verification](design-upstream.md) for the
optional source contract, inspected revisions, six bounded decision probes and
the separation between source, model-routing and rendered design evidence.

For 0.10.0, see [write-code verification](write-code.md) for the broad code trigger,
shared Build/Review criteria, selected-read impact and native observations.

For 0.9.0, see [integration proof](integration-proof.md) for the preserved domain
methods, project/template changes, actual checks and native evidence limits.

For 0.8.0, see [native installation](native-installation.md) for packaging,
isolated lifecycle commands, actual observations and per-client limits.


For 0.7.0, see [Astra alignment](archive/astra-alignment.md) for the final 17-skill
inventory, individual version checks and bounded native Build/writing probes.
Run `python3 tests/skill-version-rehearsal.py` for the additional metadata and
version-transition tests, and `python3 tests/validate.py --baseline <commit>`
when validating skill version progression. Existing source checks below remain.

For adaptive onboarding 0.6.1, all maintained source checks and unchanged footprint
ceilings pass. Bounded French cold-start baseline/candidate and Danish resumed
conversation probes verify optional source invitations and a sourced concrete
follow-up. They are read-only next-response observations, not complete setup or
live connection/authentication proof. Pi model behavior remains unverified after
the earlier authentication failure. See the [contract and observations](archive/lifecycle-onboarding-foundation.md).

Run the maintained source checks from the repository root:

```sh
python3 tests/validate.py
python3 tests/layout-rehearsal.py
python3 tests/context-footprint.py
python3 tests/continuity-rehearsal.py
```

For model-selection changes, prepare synthetic decision probes with
`python3 tests/model-selection-rehearsal.py prepare /absolute/scratch/path`.
Run the generated prompt and schema through an authorized native evaluator in
an isolated read-only session, then use
`python3 tests/model-selection-rehearsal.py score /absolute/scratch/path/result.json`.
`prepare --baseline REF` supplies the same cases against an existing source
revision. The helper never launches a model or spends account resources itself.
Expected decisions are withheld from the evaluator; inspect explanations as
well as scored fields. Portable-brief cases return actual prompts for inspection
of accepted facts, attachments, judgment and proof without doing the production.
Cases distinguish retained orchestration, whole-task transfer, user-owned
continuation, explicit production here and judgment still required after Spec/Review.
Fixtures supply runtime evidence, so this measures
instruction decisions, not live discovery, switching, installs or task savings.
See the [model-selection record](archive/lifecycle-model-selection.md) for actual results.
Performance claims and authorized comparisons also select the skill's measurement
reference. `context-footprint.py` reports that conditional extra read separately;
the older legacy journeys have no matched measurement route. Portable/whole-task
transfer similarly adds the conditional continuation reference and excludes worker
orchestration when the caller retains no role. Count selected references when making
a claim about that route, rather than treating the default path as its full cost.

`validate.py` checks native declarations, package inventory, skill frontmatter,
relative links, one shared Codex/Pi skill source, the complete legacy-route map,
discovery contracts, owner-template isolation, external-owner coupling,
conditional Risky Changes ownership/routing, optional Guardrails capability
routing without a package dependency or installed claim, and selected security
regressions. It also builds an isolated package copy so author-only files
cannot satisfy product links.

`context-footprint.py` compares representative selected-read paths with accepted
legacy commit `ca1ba807716d1a992889f02d41cddf94fdee9f32`. The checked-in
manifest records every old path, byte count and source hash used by each stage;
pass `--legacy-root /path/to/pinned/checkout` to verify it again. The benchmark
separates the observed bridge plus all skill name/description metadata from
task-selected skill bodies and complete references. New-home stages also count
the format contract, bridge asset and every neutral owner asset; verification
adds both the common acceptance boundary and setup-specific scenarios. Their
legacy stages count the complete shipped `.aios` scaffold. Other matching stages
cover local-first negative preload, owner routing, Spec readiness, worker Build
and basic Check. Every current selected path must be no larger than its legacy
package-owned comparison, and each skill body must stay at or below 8 KiB.

For 0.4.0, rerun the command for exact current counts; current source checks
retain the bounded descriptions and 8 KiB skill-body ceiling. The legacy
comparison remains useful for its stated routes. This change also removes
43 generic local skill bodies and their supporting payloads across the selected
repositories and seeds (62 tracked files, 329,683 bytes before replacement
routing). Those aggregate source bytes are not a per-task context or token
measurement: metadata is discovered first and bodies load conditionally.

These are UTF-8 byte counts and explicit bytes/4 token estimates, not native
runtime token telemetry. Populated owner context is excluded: the accepted
snapshot has only template placeholders, not a populated historical owner
state, and task context varies by outcome. Target-repository AGENTS instructions
are also excluded from both sides. Read the command's current neutral AIOS.md plus
MEMORY.md byte count; it is not a populated owner's context-saving measurement.
Behavior remains separately checked by route/link assertions, positive and
negative scenarios, and current source validation; fewer skills alone is not a
performance result.

For a changed context boundary, native evidence must use a compact matched
baseline/candidate task within each harness, record selected reads and emitted
usage when the harness provides it, and state unavailable token fields plainly.
Use synthetic owner and external-canonical sources: an AIOS docs-only question
must not preload owner context. If the canonical product repository is private,
the native smoke may use only its already-authorized normal read path; absent
access is an explicit gap, never a reason to retrieve credentials or change
visibility. External customer content stays at its source; source changes are
re-read; and read-only memory access stays separate from an explicitly
authorized synthetic correction. These are bounded smoke observations, not a
cross-harness performance guarantee.

`layout-rehearsal.py` uses temporary Git repositories to verify independent
Project/System roots, parent exclusions, and rejection of tracked nested work.

`continuity-rehearsal.py` uses a temporary local bare Git remote and synthetic
owner data to verify the explicit Sync allowlist, absent/empty restore, partial
home refusal, hostile remote content, secret-like content and non-execution of
restored personal files. It also checks personal-skill provenance, nested Git
and symlink stops, target-root rebinding and a stale-history stop. It does not
contact a real remote or owner home, and is not native-agent behavioral proof.
Before calling continuity behavior accepted, run the selected synthetic case in
the target native harness and retain its actual selected reads, staged paths,
target mutations and source/target hashes.

Before a real owner-data migration, record and inspect the actual backup restore,
source and destination hashes and modes, changed-source and changed-destination
cases, symlinks, unknown identities, idempotent replay, and preservation of later
owner edits. This is an operator checklist; this repository does not claim those
observations from an invented migration helper or a current native run.

The automated checks are source and Git-filesystem checks. They do not simulate
a model, mutate a real owner home, install AIOS, change native settings, launch
a worker, or prove desktop behavior. Native acceptance must use the target
harness and report its own exact version, source, and limitations. Historical
acceptance observations remain in Git history and GitHub Releases rather than
being presented as a current automated PASS.

For the routing/System-maintenance change, the accepted contract excludes
behavioral evals, replay and model comparisons. Only `validate.py`,
`context-footprint.py`, whitespace and scoped source consistency review were
run; layout/continuity rehearsals and native execution were not run. Required
routing reads are included in the affected footprint paths. Package/link
validation permits the accepted ADS route label while continuing to exclude
specialist tools/formats and bundled ownership. See the
[lifecycle record](archive/lifecycle-routing-system-maintenance.md) for scope and pending
independent lead acceptance. Daily-use feedback belongs to the user; these
checks do not prove workflow selection, sidebar behavior or live System updates.

For `tracking-sop-2026-09-09`, source/package/link and context-footprint checks
plus static Review are the accepted proof; behavioral model replay/eval and
broad suites are excluded. The initial unavailable-tool fallback [todo.md](todo.md)
is now retired: this resumed worker exposes `update_plan` and its call succeeded
with an empty response. This proves call execution, not independent stored-state
readback or observed UI.
The [lifecycle checkpoint](archive/lifecycle-agents-adoption.md#tracking-sop-revision--2026-09-09)
records incident/source evidence, scope, local 0.3.5 snapshot authority and lead
adoption responsibility. Reduced instruction bytes do not prove better behavior.

## Shared lifecycle (0.4.0)

The [accepted contract](archive/lifecycle-shared-method.md) changes shared execution and
repository ownership. `validate.py` additionally rejects both a copied local
phase and a thin local wrapper in the product repository. Project Template's
creation fixtures verify zero generated generic skills, four native shared
routes, a payload whitelist, existing/dirty-destination rejection and atomic
restore/retained-state behavior. The generated Project has fresh Git history
and no remote; the test does not require plugin discovery to prove that shape.

Domain review and audit methods remain local. Selected System entrypoint checks,
changed-link inspection and the Bachelor specialist-route validator cover the
local contracts. Independent source Review caught and corrected direct-task
recovery's stale lead requirement and stale Bachelor README routes. Runtime
discovery and native package adoption are measured separately after release.

The source baseline demonstrates the duplicate methods and mandatory worker
rules; it is not a matched native performance experiment. Reduced copying and
selective delegation remove those instruction causes. Actual token savings,
long-session quality and behavior across future tasks remain workload-dependent.


## Context and task-result routing (0.6.0)

Prepare ordinary-entry fixtures with
`python3 tests/entry-routing-rehearsal.py /absolute/scratch/path` or add
`--baseline REF` for a matched existing revision. This author-only helper creates
synthetic owner/source/repository files and a read-only package snapshot. It
never starts a model, alters a real setup or preloads skill bodies. Run ordinary
`prompt.txt` input with native skill discovery and the thin `bridge.txt` boundary;
isolate ambient global context and skill registrations per invocation. Record
native selected reads, artifact mutations, source hashes, final answers, usage
receipts, timeouts and provider errors. Tool catalogs alone prove no behavior.

The 2026-09-10 bounded Codex runs exercised cold local onboarding plus a portable
research brief, migrated source identity with a same-title decoy, changed-source
freshness, explicit analysis completion and independent repository isolation.
Onboarding exceeded the operator's 240-second bound on both the 0.5.0 baseline
and 0.6.0 candidates. Local artifacts were produced; matching fresh-session
continuations verified them and completed preparation. This is interrupted and
resumed execution, not an uninterrupted onboarding PASS or speed comparison.
The final context keeps source routes and the unique study-time preference;
current source-owned operational values remain external. The actual portable
prompt preserves service, audience, sources, caveats and the receiving next step
without performing the market study.

An initial migration probe retained a superseded operational copy as historical.
The curation contract was tightened and the final-source rerun removed it,
kept unique knowledge/authority and used the verified migration mapping. A later
fresh run returned the operator-updated source value without changing files.
The analysis returned total net 300 (Studio 140; Workshop 160), no missing
customer IDs or duplicate order IDs. The repository run changed only app.py,
passed the supplied checks and read no owner context. Those last two runs used
an earlier candidate; neither selected the two later changed references
(curation and Spec readiness), so their exercised paths are unchanged.

Native discovery exposed 16 unique AIOS skills in Codex and Pi. Pi's baseline
model request failed with an expired authentication token, both offline and on
a supported normal-start retry. No behavioral Pi comparison is claimed; its
zero-valued error usage is unknown, not zero cost. Native auth readiness alone
was insufficient. No auth store was read/copied or login reset attempted.

The four maintained source checks and affected skill validators pass. Existing
selected-read ceilings are unchanged and now include mandatory context curation
for new-home routes; conditional continuation remains separately counted.
The old 24-case preloaded decision batch was not rerun for this revision and
cannot substitute for these ordinary-entry observations. Exact source identity,
independent Review and native adoption are recorded separately. See the
[lifecycle record](archive/lifecycle-context-routing.md). Synthetic adapter access does
not prove live Notion, provider authentication, desktop cutover or future savings.

## 0.7.0 source candidate

For the accepted instruction cleanup and issue #8, also run
`python3 tests/skill-version-rehearsal.py` and
`python3 tests/validate.py --baseline LAST_REVIEWED_COMMIT_OR_TAG`.
See [version maintenance](skill-versioning.md) for schema scope, compatibility
judgment and Git comparison semantics, and [the scoped evidence](archive/astra-alignment.md)
for actual results and limits. The package remains dependency-free; the new
parser and transition tests are author tooling only.

The Spec description no longer advertises persistent-goal creation as its job.
The former phrase assertion is replaced by resolved links to the single tracking
owner, readiness and Build. Existing goal-activation and recovery checks remain.
Independent behavioral Review must verify that accepted work proceeds without a
new goal request, carried goal requests retain their native rules, empty plan
responses do not imply UI state or stop work, and a real blocker holds only its
dependent action. Static link coverage does not prove these model decisions.

## Versioned local documentation and releases

The package validator checks that `docs/aios.md` is explicitly shipped, has one
version label matching the package, and resolves from the installed documentation
route in an isolated minimal package. Run:

```sh
python3 tests/validate.py --release-tag v0.10.1 --baseline eca5ca6
python3 tests/documentation-rehearsal.py
```

The documentation rehearsal rejects version drift, a missing package entry,
missing or repeated version labels, symlinks, a mismatched release tag and a
missing changelog entry. Native Claude and Gemini fixtures check installed
overview bytes across synthetic updates; Pi checks its registered local source.
These checks make no model-behavior claim. The ordinary-entry fixture retains
the documentation question for selected reads, owner isolation and reported
installed version; retain actual traces separately from static footprint counts.

Tag-triggered CI must complete and the GitHub Release's resolved tag must match
the accepted commit. Native installed version and discovery are separate readback
steps. The Resources deployment separately verifies that retired AIOS URLs no
longer serve the overview or metadata and that the remaining site still works.

## Context homes — 0.19.0

[Notion acceptance](../skills/osm-data-context/references/notion/acceptance.md)
separates package checks, native activation, live retrieval, first-task behavior
and recovery. Setup is the single onboarding entry; Context owns the provider
route. The package now exposes 26 shared skills, including Context 1.2.0 and
Setup 1.3.0. Existing managed-file homes retain their supported procedure.

The October 5, 2026 candidate checks passed package/per-skill validation,
documentation, layout, continuity, skill-version and unchanged footprint limits.
Independent review corrected client setup touching global personal instructions;
the corrected shared and Codex/Claude/Pi scope routes passed review.

Bounded Notion observations cover existing full-page databases, native templates,
personal skills, scoped retrieval and exact page readback. A matched synthetic
Codex onboarding trial covered conflicting offer prices, an archive decoy,
parent/child Spaces, irrelevant missing access and empty Memory. It used local
fixtures and no provider calls, so it does not prove unattended end-to-end
customer provisioning. The final candidate maps Offers/Demand/Operations to
existing knowledge, asks about material gaps and leaves Memory empty.

Historical preview evidence remains in Git history and private recovery;
account-specific IDs and traces stay outside this public repository. Release CI,
installed package identity, fresh-session discovery and live production delivery
are verified separately for the final release. No cross-harness behavior, future
scheduled run or general token/latency saving is inferred from these checks.


## Current-main integration — 2026-11-06 (source only)

The reviewed publisher/context source `5d8bcc805a116277c5f96be3d1c7b3770827860a`
(tree `1b329e0820a2bfd300dcbf510a8e5bf99014cdc5`) was integrated with current
main `5afb77fd7b24dca4c486acdc78e0ed161b9f200c` in a separate worktree. Both
histories remain reachable, including the `00d29e2` regression baseline. The
original source, previous failed runs and two final Opus High source ACCEPTs
remain historical evidence; they do not accept this new integration.

The integration retains the latest data/context explanation and Agentic Systems
routes, the 17-skill Notion-only contract, the released 0.30.1 changelog entry
and the unreleased 0.31.0 candidate designation. Combined owned changes advance
OSM to 4.0.2, Build to 2.0.2 and Create Project to 5.0.2. Publisher implementation,
fixtures, manifest, inactive template, sidebar sources and generated runtime are
byte-identical to `5d8bcc8`; only the already identified G3 explanation in
`publication.md` is clarified. No publisher repair was rewritten.

Actual integration checks on Node 22.23.3 and Python 3.14:

- Locked `npm ci --ignore-scripts --no-fund --offline`: exit 0 (100 packages).
- Sidebar build and generated-runtime no-diff: exit 0; 183 tests and bundled
  stdio/fullscreen/Home-projection/isolated-first-run smoke: exit 0.
- Package validation, including baselines at both integration parents; the nine
  release rehearsals; context footprint; credential-free reconciliation against
  main; and diff whitespace checks: exit 0. Publisher rehearsal: 69 scenarios
  and 75 mutation controls using in-memory stand-ins, not live Notion.
- Preserved non-shipped drafts: 27 Node tests and 14 Python tests passed.
- Local consumer-section rehearsal passed. Neither consumer ran or adopted it.

Earlier results are retained: the first run caught a root/native description
mismatch introduced during integration; it was corrected before the passing
validation. Sandboxed execution could not open the publisher fixture's local
socket, the stdio smoke closed its connection and two draft test files failed.
The same unchanged checks passed in individually scoped execution; no persistent
permission or profile change was made. These failures are not live-service proof.

This is not a release decision. PR #84 Home remains fixture-qualified with no
supported host credential route, and no native Home acceptance is claimed.
PR #86 documentation ancestry is included; consumer adoption remains separate.
Publication stays inactive, with no secret, Notion write or live public reader.
G1 (public content/catalogue reader), G2 (live transport) and G3 (edits during a
partial/unknown write or an incomplete pending write) retain their recorded
limits in `docs-publisher/ACTIVATION.md`. No merge, tag, install, consumer update,
schedule, CI publisher activation or owner-home migration was performed.
Independent Sol High review of the final integrated candidate is recorded in its
PR/handoff; the earlier Opus reviews apply only to the returned source.


### Focused integration corrections — 2026-11-06

Both independent Sol 6.1 High/Standard reviewers requested documentation and
packet corrections at `8e47fcf` / tree `1dacf694`; neither found a new publisher
or runtime defect. The original rejected candidate and findings remain retained.
The corrections restore the unrelated Factory-AI vendor citations, route
recovery to available design/writing/separate Content methods and correct the
latest-package claim. The handoff integrity manifest is refreshed after edits.

Canonical GitHub evidence confirms that v0.30.1 was published as a prerelease
at 2026-11-06T11:46:23Z. Its annotated tag object
`a29969b270a2c64e4394b61118fc310d3864403a` resolves to
`ff1b50e3e052651f4d85bb72c3374e4d45fd6709`. The separately published
`osm-setup-preview-0.30.1-4` is not this 17-skill candidate. The guide and
publisher manifest remain frozen at v0.30.0; no source binding was advanced.

This supersedes the earlier integration's green reconciliation claim as a
present-state readiness claim: that checkout lacked v0.30.1. A tag-incomplete
pass cannot qualify current publication. With the actual newer tag present,
`reconcile --check` rejects the frozen manifest. The changed latest-package
sentence also deliberately fails its old v0.30.0 sentence requirement. The
repository-level publisher rehearsal consequently remains red at its current
reconciliation scenario. Those failures are retained as publication HOLDs;
no assertion, manifest, publisher implementation or inactive workflow was
changed to conceal them. Green local fixture results remain evidence for the
behaviour they actually exercised, not a live or current publication pass.

The raw npm-ci process log was not saved in the original packet. The native
command result recorded exit 0, 100 packages and the locked offline command;
this is retained command evidence, not a new installation or independent rerun.
The 183 sidebar tests and runtime are unchanged; no repeat is needed for these
documentation-only corrections. Local preview packaging and focused correction
checks are recorded against the exact corrected tree in its private handoff.
No native Home/public-reader, live Notion, installation or consumer acceptance
is inferred from preparing that preview.

## 7 November 2026 — explicit test-value decision (#87)

Write Code owns one compact pre-authoring rubric in
`skills/osm-write-code/references/test-value.md`; Build and Review link to it.
Write Code is 2.1.0, Build 2.0.3 and Review 2.0.1. No blanket suite cleanup,
production test-only seam or new testing dependency was introduced.

An actual Codex CLI 0.167.0 run used gpt-6.1-sol with medium reasoning, existing
authentication, ephemeral/read-only execution and no tools. Five fictional cases
elicited concrete decisions: omit/fold duplicates, retain a missing security
boundary, preserve behavior-focused refactor coverage, use existing proof for a
tiny edit and reject mock-only persistence claims while retaining packaging
protection. Prompt and exact output are in `docs/evidence/test-value-87/`.
The run reported 10,846 tokens. This is one observed method rehearsal, not a
cross-model benchmark or execution of the hypothetical tests. No model turn was
used to change owner context. Package validation against e1cd725, 14 skill-version
checks and the responsibility rehearsal passed after the source change.

## 7 November 2026 — page-centered Home and own-connection candidate (#74/#82)

The selected Data & Context page is now Home's primary surface, with real title,
icon and bounded page blocks. Browse is collapsed and does not fetch hidden
source lists. One gear owns connection/setup/access. App and model reads share
one service and identity/mapping checks. The Mac Keychain route requires explicit
opt-in and reads only its dedicated item; no owner credential was provisioned or
read. Current installed owner Home mapping was observed missing, so a separate
maintenance credential was not adopted. The preferred browser OAuth route is
precisely documented but unconfigured; no hosted-MCP scope substitution occurs.

Executed: 190 sidebar cases plus bundled stdio smoke; package validator against
e1cd725; docs/onboarding/layout/continuity/skill-version/responsibility/footprint/
context-architecture and consumer rehearsals. A second build produced identical
runtime artifacts before the final bounded icon/error/contrast corrections;
final affected sidebar checks were rerun after those corrections. A disposable
native Codex install discovered 17 enabled skills, zero errors. This proves
installation/discovery, not native Desktop Home or live Notion access.

An actual public PNG fetch returned 16,946 bytes through the image transport;
synthetic boundary tests reject private destinations, redirects, oversized and
unsupported responses. The IPv4 request family is explicit so Node's connection
selection cannot reinterpret the pinned lookup result. No bearer credential is
sent to image hosts; signed URLs and bytes stay ephemeral. External SVGs retain
a text/title fallback. UI snapshots with fictional data exercised page/list/
reader/Back, settings/access, human check/cancel, rejected agent handoff, changed
account and error retry, light/dark and 320px. Dark primary-button contrast was
repaired and rechecked. The 320px error viewport had no horizontal overflow.

Paper 3438e04fc0d64ffe was saved/reopened through native MCP: 47 editable boards,
9 pages, index and retained references. Artwork revision is
4c0b8145ee80044b1babadbc006ccfa0cdaeaa7f8ce2dcb1bb7aa819fd02ddea.
Canonical design.md maps implemented, external and planned states. Primary,
setup/access and recovery content were inspected through native rendering/DOM;
this does not assert exhaustive pixel acceptance of all boards or live OAuth.

Inherited publisher hold remains visible: reconciliation exits 1 for the frozen
v0.30.0 public binding after v0.30.1. Exhaustive scenario invocation produced 67
passes, two binding failures and 75 caught mutation controls. The publisher code,
manifest, relevant docs binding and rehearsal are byte-unchanged from e1cd725.
No release edition, public row or activation was changed to hide this failure.
See TEST-TOMORROW.md for exact entrypoints, issue disposition and remaining proof.

Final readback: all three runtime files matched an independent rebuild after the final copy/transport changes. A fresh disposable native install discovered 17 enabled skills with zero errors, and all 115 installed product files matched the final staged payload byte for byte. The final sidebar run passed 190 tests plus stdio smoke. The network-gate body was shortened after visual review; no behavior or authorization changed.


## 9 November 2026 — accepted Home overview implementation (#74/#82)

Implemented the accepted `design.md`/Opus handoff in the existing sidebar
components: definition-ordered overview, verified root/source titles and icons,
three/four-row previews, named paginated source lists, scoped title search and
pasted-link membership checks, reader breadcrumbs/Back/Copy link, Settings Saved
links placement, and bounded event-driven access refresh. Root blocks load only
on activation. Sample fixture content is visibly fictional Northwind material.
The design and Paper files were preserved as supplied by the design writer.

Local tests cover title-filter/view-filter intersection, five-result bounds,
stable definition order with no model call, denied/outside/support/unresolved
metadata suppression, search coalescing, query/opener restoration, manual copy
fallback, compact/wide previews, and visibility recheck throttling. Existing
identity/scope invalidation, stale-generation, single-recovery-budget, mapping
revision and SSRF/icon defenses remain tested. Former tab-triggered security
cases now trigger actual paginated source requests; they were retained.

Executed on Node.js 22.22.3: `npm run build --prefix apps/sidebar`,
`npm test --prefix apps/sidebar` (200 tests, zero failures, plus bundled stdio
smoke including the two new app-only tools), and `git diff --check`. An
independent rebuild produced identical runtime files; runtime was generated
only by the sidebar build. Package validator, documentation, onboarding,
layout, continuity, skill-version, context footprint, responsibility, context
architecture and consumer-selection rehearsals passed.

The existing publisher hold is unchanged. `python3 tests/publisher-rehearsal.py`
exits 1 at `reconcile_check_says_what_it_could_observe_and_names_a_noop` with
“the null commit means no base”; `python3 docs-publisher/publisher.py reconcile
--check` exits 1 for the v0.30.0 manifest/public binding versus newer v0.30.1 tag
and the corresponding latest-release sentence. Publisher source, manifest,
release binding, versions and rehearsal were not changed to hide this failure.

No live Notion, native Desktop clipboard/visibility or Paper visual acceptance
is claimed. The coordinator retains that inspection and packaging. A sample
fixture start on unused port 43209 was refused by this sandbox with `listen
EPERM`; no preview was started or existing process replaced. No account, grant,
credential, profile, external record or release was changed, and no commit or
push was made. Native unsupported clipboard falls back to a selected URL;
missing visibility events leave explicit Settings → Check again available.

## 9 November 2026 — Opus render-review corrections B1–B8

Implemented the eight bounded corrections in the designated designer’s
`RENDER-REVIEW.md`: separators follow visible reader crumbs, home/reader titles
wrap, the reader replaces the brand header with its own responsive bar, icons
have the specified spacing and title placement, connected Settings uses the
accepted status/actions/copy, the home picker shows its verified value plus a
Change action, Saved links has a separate drawer view and five distinct labels,
and the root-unreadable gate uses X05 with neutral copy and three aligned
actions. Cheap refinements tighten rows/lists, remove row chevrons, indent skill
descriptions and clear the Copy link status after two seconds. Canonical design
and Paper were not edited by this correction pass.

The root breadcrumb now clears the search field when returning to the overview;
normal Back retains the exact query (including surrounding spaces) and opener.
Global no-match requires complete successful results from every searchable
source. Failed/denied/partial sources cannot produce that claim; partial search
has a named retry line. Existing grant, support-exclusion, identity, scope,
stale-generation and recovery-budget defenses remain in the passing suite.
No service/grant invariant was relaxed. Unverified denied-root metadata is never
used in gate copy or its destination; the gate opens the selected context URL.

Fictional fixture coverage now includes Q01 matches, Q02 no-match and pasted
outside link, H03 a distinct next page plus withheld rows, X02 empty, X03 one
source denied, X04 connection ended/different connection, and T02 OSM’s own
connection not connected while the separate picker remains independent. Emoji,
synthetic raster, native and absent icons appear in list/reader metadata. All
states use the existing test-host scenario/theme/width selectors; production
state is not seeded from fixtures.

Executed on Node.js 22.22.3: sidebar build; all **210 tests, zero failures**, plus
bundled stdio smoke; a repeated build with all three runtime files byte-identical;
package validator; documentation, onboarding, layout, continuity, skill-version,
context footprint, responsibility, context architecture and consumer-selection
rehearsals; and `git diff --check`. The two publisher checks were rerun and retain
the same inherited failures documented above (null-base rehearsal assertion and
v0.30.0/v0.30.1 public binding). Publisher, releases, manifests and versions were
not changed.

This is implementation and local behavior evidence. Fresh compact/wide/dark
screenshots and designated Opus visual acceptance remain with the coordinator.
No browser automation, preview process start/stop, native Paper acceptance,
live Notion access, credentials/grants/profile changes, external writes,
commit, push or deployment was performed in this pass. The required owner-root
read failed with `selected_keychain_credential_unavailable_no_fallback`; work
used the explicit local brief and accepted review without switching sources.

## 9 November 2026 — bounded final Home fixes F1–F3 and search correctness

Applied only the remaining accepted render blockers and the designated Opus
LINK-BACK / INCOMPLETE-SEARCH clarifications. H03 now uses the reader bar with a
named history-aware Back control and hides the page header; its title icon has
an inline 8px gap. The connection-ended gate uses the exact human-first copy,
one primary connection action and two text actions. Not-connected Settings
makes Connect Notion primary, always hides organisation copy and limits the
honest provisioning sentence to the not-connected state. Preview counts now
rerender on the existing compact/wide media-query change without new reads.

The three independently reproduced correctness defects are covered: located
links return to one verified Q01 row with the original URL and row focus;
incomplete/withheld/bounded search answers never assert global no-match; and
Home invalidation clears the query and debounce along with the overview reset.
Only the verified read's id/title/icon survive for the located row, under its
source key; no article fields, blocks, body, link or meta are retained for Back.
Pending reads settle the current search without reopening; failures use the
approved refusal or explicit locate retry. Breadcrumb source navigation leaves
search history intact, while the root crumb clears it. Generation, scope,
query-version and own-request guards precede metadata use; known-page denial
still invalidates Home, including when a restored search-only row is reopened.
Nothing is persisted and no search bounds or connection authority changed.

Added 14 focused app tests, retaining all prior tests. On Node.js 22.22.3,
`npm test --prefix apps/sidebar` passed **224 tests, zero failures**, plus the
bundled stdio smoke. `npm run build --prefix apps/sidebar` passed; a second
build produced byte-identical SHA-256 hashes for all three runtime files.
`python3 tests/validate.py` passed its package/isolation/security checks;
`python3 tests/documentation-rehearsal.py` passed all seven tests.
`git diff --check` passed. Existing dependencies were used; npm ci was not run.
The previously passing unrelated nonpublisher rehearsals were not repeated.
The inherited publisher hold and its existing evidence remain unchanged;
publisher code, manifests, versions and public bindings were not edited.

This is local implementation/test evidence. The coordinator owns the existing
43219 preview, screenshots and final designated Opus confirmation. No preview
process or browser automation was used, and design.md, Paper and
TEST-TOMORROW.md were not edited in this pass. Native host, live Notion,
clipboard/visibility and OAuth qualification remain outside this proof. No
credentials, account, grants, profile, external records, commit, push or release
were changed. The prescribed owner-root read again returned
`selected_keychain_credential_unavailable_no_fallback`; this bounded work used
the supplied local contract and accepted Opus files without a source fallback.

## 9 November 2026 — coordinator acceptance of the private browser candidate

The designated designer, actual Claude Opus 5.5 with High effort and Fast off,
accepted browser rendering corrections B1–B8 and F1–F3 with no remaining design
blocker for this private synthetic candidate. Opus synchronized canonical
design.md and the revision-checked Paper notes. Artwork revision
17d09459e92ccd412ee2939d831fdf364813b8210973a29f2067d4def9378f13
has 14 pages and 65 boards; the nine earlier pages and assets remain unchanged.

The coordinator exercised the browser fixture on port 43219: overview and
reader at compact/wide widths, title search, no-match and outside-link refusal,
reader Back with query and focus restored, Copy link success, Settings and its
Saved links sub-view, pagination with withheld rows, empty/source-denied/
connection-ended/root-denied states, and light/dark themes. Nineteen current
screenshots are retained in the private revision artifacts; earlier screenshots
are kept separately. These are fictional data and a synthetic host.

An independent correctness review reproduced three search/navigation defects,
which were fixed at Medium with focused tests. A separate read-only verification
then found no remaining blocking correctness finding in the inspected paths;
16 targeted executions covering 15 distinct tests passed. Missing-scope
protocol responses still invalidate, and failure handling cannot retain denied
metadata. Product file hashes stayed unchanged throughout that final review.
This is a focused review, not an exhaustive scan of every repository path.

The final writer run passed 224 tests plus stdio smoke and an identical rebuild.
After Opus updated the guide/notes, the coordinator reran package validation,
all seven documentation tests and diff whitespace checks successfully. No
product code changed after the 224-test run.

Native Codex UI/clipboard/visibility, live Home reads, OAuth, Paper pixel
rendering, installation and release remain unqualified. Native Paper screenshot
and control requests timed out; saved artwork and notes were read back through
MCP. The coordinator read the authorized owner root, selected policy and Soul
before context-dependent work. Isolated workers could not repeat the
Keychain-backed lookup and used the supplied bounded brief without an alternate
credential or source. No new grant, account, credential, normal-profile
activation, Notion write, public push or release occurred. The inherited
publisher hold remains unchanged; #74/#82 remain open for native/live adoption.

## 9 November 2026 — Setup-foundation cohesion on Home and Settings (#74/#82)

Implemented the owner's cohesion feedback from the finished Opus design (R5 and
the guide's Shared foundation): Setup is the visual source, and Home, the source
list, reader, gates and Settings now use its type, `.btn`/`.form-control`
controls, `.osm-card` rows and state grammar. The earlier GPT checkpoint
(root icon/title in the page header, one source card with non-interactive heads,
reader/gate/Settings controls, removal of Home's own type and button overrides,
the Built into OSM card row, and adapted tests) was continued, not restarted.
Completed in this pass by the Sonnet 5.5 implementer: the one failing adapted
test (it opened a record the fixture does not define) now exercises keyboard
movement and opens a real record; the Built into OSM summary uses the correct
singular (`1 method`, `N methods`); the expanded row keeps a pointer cursor and
hover because, unlike a Setup step, it collapses again; and `docs/sidebar.md`
describes the new Home and Settings.

Every listed, non-empty source ends with `Open ‹Source›` at every width, so
Memory keeps its link when it has exactly the preview count (three rows at all
widths) and opens the full verified list without another read. Empty sources
show "Nothing here yet." and denied, unsupported, rate-limited or unavailable
sources keep their state line, each without an Open action. Built into OSM
expands and collapses locally (`aria-expanded`, no tool call, message or
network) over the installed package's existing method metadata, with no run,
enable or ownership claim. Identity/scope/account suppression, missing-scope
invalidation, the recovery budget, support exclusion, link Back safe-row,
incomplete-search and query-lifetime rules were not changed; a test confirms
the header's root title and icon disappear on account change and root denial.

On Node.js 22, `npm test --prefix apps/sidebar` passed **228 tests, zero
failures** (the previous 224 plus the new behavior tests, with two superseded
CSS/layout-mirror tests replaced by behavior tests), then the bundled stdio
smoke. `npm run build --prefix apps/sidebar` regenerated only
`runtime/sidebar/index.html`; two further builds produced identical SHA-256
hashes for all three runtime files. `python3 tests/validate.py` passed its
package/isolation/security checks, `python3 tests/documentation-rehearsal.py`
passed all seven tests, and `git diff --check` passed. Existing dependencies were
used; npm ci was not run, and unrelated rehearsals were not repeated. The
inherited publisher hold, versions,
manifests and public bindings were not edited; `design.md` and the Paper were
preserved exactly.

This is local implementation and test evidence in a synthetic browser fixture.
It does not include a fresh designer render review, which the coordinator
requests separately, and the earlier synthetic acceptance does not cover the new
expression. Native Codex UI, clipboard and visibility events, live Notion, OAuth,
Paper pixel rendering, installation and release remain unqualified. No
credentials, account, grants, profile, external records, commit, push or release
were changed.

## 9 November 2026 — coordinator browser check of Setup cohesion

The latest owner feedback selected Setup as the visual source for Home and
Settings and requested a persistent Open Memory action. Opus 5.5 High/Fast off
authored the canonical correction and R5 Paper page before implementation.
The first GPT Medium implementation was stopped when the owner selected
Sonnet 5.5 High for implementation and GPT-6.1 Sol Medium for final review.
Its source checkpoint and raw transcript were preserved. Actual Sonnet 5.5
High resumed the existing Claude design history, completed the checkpoint and
passed 228 tests plus stdio and an identical rebuild. Prior GPT edits are not
relabeled as Sonnet-authored.

The coordinator verified the new browser fixture: Open Memory appears with four
records, opens all four without another list request, reader Back restores its
opener and source Back focuses Open Memory. The custom Built into OSM row
expands/collapses its panel and aria-expanded, with no native triangle or extra
chevron. Setup's approved numbered and filled step circles are preserved.
Light/dark and compact/wide screenshots are retained privately.

Computed browser styles match: Setup, Home, source and reader titles use the
same host sans family at 24px/600, with Setup/Home/gate titles 22px/600 at compact.
Continue and Open Memory both use that family, 13px/500, 32px height and 8px
radius. This is measured browser evidence, not a CSS-string assertion.

The post-implementation Opus screenshot review was actually rejected by the
SDK session limit, with reset reported for 18:20 Europe/Copenhagen. No further
Claude probe, quota reset, payment or substitute designer was used. Fresh
visual acceptance of R5 therefore remains pending. The Saved links row's
short summary can repeat “Personal”; that small copy issue awaits the designer.
Native Paper pixels, native Codex behavior, live Home, OAuth and release remain
unqualified. Publisher, credentials, grants and normal profiles are unchanged.
