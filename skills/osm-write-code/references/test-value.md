# Choose proof before adding tests

Before adding or materially changing a test, state briefly:

1. The observable behavior, invariant or independent contract it protects.
2. A credible regression that would fail it.
3. Why existing coverage would miss that failure.
4. Whether it needs a production export, flag or wrapper used only by tests;
   prefer exercising the real boundary instead.

If the same contract already has useful protection, omit the duplicate or extend
its existing case/table/fixture. Another test layer needs a distinct transport,
persistence or lifecycle risk. Keep independently valuable security,
compatibility, packaging and integration proof. Test count is not evidence value.

Do not derive expected values from the subject, repeat private call order, or
let mocks implement the very behavior being asserted. A behavior-preserving
refactor should keep boundary tests useful. A tiny reversible change can use
existing proportionate checks without adding a suite or framework.

For a defect, demonstrate failure before the fix and success after it when
practical; state unavailable baseline proof. Required checks still run. Report
executed, skipped, synthetic and unavailable evidence separately. Review applies
this same rubric to the result rather than demanding a new test for every edit.

A task-selected test audit may consolidate low-value coverage only after naming
what useful protection remains. No suite cleanup, deletion quota or extra
tooling is implied.

Adapted to OSM's existing workflow from the [OpenClaw authoring gate](https://github.com/openclaw/openclaw/blob/main/.agents/skills/test-audit/SKILL.md)
and [audit guidance](https://github.com/openclaw/openclaw/blob/main/.agents/skills/test-audit/references/audit.md),
reviewed 7 November 2026. OSM does not require that package or Factory.
