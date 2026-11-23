# Codex checklist and goal acceptance

Use during Codex setup acceptance. On repair/update/resume, reuse dated proof
unless runtime, config, tool exposure or capability evidence changed or is
missing/uncertain. Do not preload other harness or optional-feature guides.

1. Record date, installed client version (`codex --version` for CLI), runtime/
   session surface and current official schema/help. CLI version does not prove
   desktop runtime version. Compare callable tools/invocation rules with installed
   help and the [official schema](https://learn.chatgpt.com/docs/config-schema.json).
   Removed/renamed tools or keys are unsupported/unknown gaps, not permission
   to use old syntax or claim activation from an old setting.
2. Inspect both native checklist and goal controls. For the real setup task,
   invoke the available checklist tool with the accepted steps and maintain it
   as progress or scope materially changes, following its actual constraints.
   If absent, maintain one checklist in task evidence, or a temporary workspace
   file when appropriate and authorised; neither is an alternate context home.
   Read goal state through an exposed read control; report gaps/errors.
   Goal creation/reuse follows actual rules and explicit carried authority for
   real work only. Never create a test goal for setup.
3. Preserve explicit settings choices. The schema checked 2026-09-09 defines
   `tools.update_plan.enabled` default `false`; the official
   [0.152.0 release notes](https://github.com/openai/codex/releases/tag/rust-v0.152.0)
   confirm planning default-off. This is dated support evidence, not a guarantee
   for future clients. If the installed version still supports it and current
   setup/repair authority covers enabling the tool, use the shared
   [configuration procedure](harness-configuration.md) for only:

   ```toml
   [tools.update_plan]
   enabled = true
   ```

   Preserve explicit off without that authority, comments and unrelated settings;
   do not duplicate tables. Routine work cannot silently reconfigure globally.
   Missing tools do not establish a Plan-mode or model-effort cause.
4. After an authorized change, parse/read back the scoped config and use current
   supported strict-config/config-load checks. Separate unrelated doctor failures
   from config-load results. Check actual exposure next turn or a fresh session
   when needed, then invoke the real checklist tool. Do not infer availability
   in another worker/desktop surface or create a goal to force a check.
5. Return dated evidence for both checklist and goal capabilities: supported
   setting/choice, callable control, result/readback and separately observed UI.
   Call success is not visible UI; empty results do not prove stored state.
   Report unavailable/unverified capabilities with a narrow next action or
   preserved off choice. Do not invent activation or block useful local work
   solely because optional native controls are unavailable.
