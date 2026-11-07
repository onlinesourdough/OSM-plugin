# Native method rehearsal — 7 November 2026

Actual Codex CLI 0.167.0, gpt-6.1-sol, medium reasoning, existing authentication, ignore-user-config, ephemeral, read-only, no tools requested or used. One run, five fictional decision cases. This is observed model decision evidence, not execution of the hypothetical code tests or proof across all models.

1. **Decision: omit the HTML-grep unit test.**
   - **Protected contract:** The button displays “Connect” and performs its intended action.
   - **Likely regression:** The label is misspelled again, or the button stops working.
   - **Coverage gap:** The browser smoke protects the action; it protects spelling only if it checks the accessible name or rendered label.
   - **Chosen boundary:** Use the existing smoke and proportionate review of the typo. If exact wording needs lasting protection, extend that smoke with a visible-label assertion. No test-only export or wrapper is needed.
   - **Evidence limitation:** The supplied description does not establish a label assertion. No checks were executed here.

2. **Decision: omit the private-helper duplicate.**
   - **Protected contract:** The page-list API withholds records the caller cannot access.
   - **Likely regression:** A filtering change exposes an inaccessible record.
   - **Coverage gap:** None identified: the existing boundary table already covers the proposed samples.
   - **Chosen boundary:** Keep the API boundary test. Extend its table if a distinct access scenario emerges; do not add an export solely to test the helper.
   - **Evidence limitation:** Existing protection is described, not independently inspected or executed. Identical helper samples add no demonstrated independent proof.

3. **Decision: add focused redirect-security proof through the loader’s real boundary.**
   - **Protected contract:** An approved public image URL cannot cause the loader to request `127.0.0.1` through a redirect.
   - **Likely regression:** Redirect following bypasses destination validation.
   - **Coverage gap:** No redirect case currently protects this security property.
   - **Chosen boundary:** Invoke the production loader with a controlled transport returning a redirect from a public URL to `http://127.0.0.1/...`. Exercise production redirect handling and destination validation; assert rejection and that no loopback request is dispatched. Block all actual network access. The transport supplies responses and records attempted requests; it must not implement the security decision. Prefer an existing transport seam, without a test-only production export or flag.
   - **Evidence limitation:** First run against unfixed code: require failure because loopback dispatch is attempted or rejection is absent. After fixing validation, require rejection before dispatch. These would be synthetic transport results, not live-network proof. Neither run occurred here; if the unfixed baseline cannot run, report that explicitly.

4. **Decision: reject implementation-pinning tests.**
   - **Protected contract:** Public parsing inputs produce the same outputs and failures after extraction.
   - **Likely regression:** Extraction changes parsing semantics or error handling.
   - **Coverage gap:** None identified beyond the meaningful existing boundary coverage.
   - **Chosen boundary:** Run existing public-contract checks and required checks. Add a boundary case only for a discovered uncovered behavior. Do not expose the helper or assert private call order or local variable names.
   - **Evidence limitation:** Behavior preservation remains unverified here. Existing tests may miss unknown edge cases, but internal assertions do not establish protection for them.

5. **Decision: reject the crash-safety claim and retain the packaging secret scan.**
   - **Protected contract:** Committed data survives the defined crash conditions; packaged artifacts exclude secrets.
   - **Likely regression:** Interrupted persistence loses or corrupts committed data; packaging includes credentials.
   - **Coverage gap:** Map mocks implement saving themselves, so green assertions do not exercise production persistence. The skipped file check supplies no executed filesystem evidence.
   - **Chosen boundary:** Require production persistence against isolated storage, with interruption and recovery checks matching the crash guarantee. A successful file write alone cannot prove crash safety. Keep independently valuable packaging protection.
   - **Evidence limitation:** Reported executed: 100 green tests. Synthetic: Map-backed persistence assertions. Skipped: isolated file-write check. Unavailable: its optional runtime and demonstrated crash-recovery proof. No evidence was independently executed here; test-count reduction cannot repair these gaps.
