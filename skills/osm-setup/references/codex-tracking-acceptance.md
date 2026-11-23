# Codex checklist and goal acceptance

Run during normal Codex onboarding/setup acceptance. For repair/update/resume,
reuse dated evidence unless the runtime version, configuration, tool exposure or
capability evidence changed, is missing or is uncertain. Check only this Codex
surface; do not preload other harness or optional-feature guides.

1. Record date, installed client version (`codex --version` for CLI), relevant
   runtime/session surface and current official schema/help sources. CLI version
   does not establish desktop runtime version. Compare current callable tools
   and their invocation rules with the installed version's help and
   [official schema](https://learn.chatgpt.com/docs/config-schema.json). Detect
   removed/renamed tools or keys; report an unsupported/unknown gap rather than
   apply old syntax or treat an old setting as success.
2. Inspect both native checklist and goal controls. For the real setup task,
   invoke the available checklist tool with the accepted steps and maintain it
   as progress or scope materially changes, following its actual constraints.
   If absent, maintain one checklist in task evidence, or a temporary workspace
   file when appropriate and authorised; neither is an alternate context home.
   Inspect goal
   state read-only through an exposed read control; record unavailable controls
   or errors. Goal creation/reuse follows the actual rules and carried explicit
   goal authorization for real work only. Never create a test goal for setup.
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
5. Return dated per-capability evidence: supported setting/choice, callable
   control, call result, any state readback, and separately observed UI. A
   successful call proves execution, not visible UI; empty results do not prove
   stored state. Report unavailable/unverified capabilities and the narrow next
   action or preserved off choice. Setup acceptance must account for both
   checklist and goal capability without inventing activation or blocking useful
   local work solely because optional native controls are unavailable.
