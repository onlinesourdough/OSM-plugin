# Native AIOS onboarding — issue 38

Historical 0.20.0 evidence. The app binding and initial panel are superseded by
the [0.26.0 sidebar contract](../sidebar.md); Notion is now a separate plugin.

Historical 0.20.0 delivery record. The subsequently requested sidebar is
implemented in 0.21.0; see [the current sidebar contract](../sidebar.md).

Accepted outcome: one short onboarding route in Codex, verified Notion access,
the AIOS name across the customer entry and shared template, and a consistent
Resources guide. Keep existing homes, Spaces, icons and personal methods.
The existing task authorizes review, merge, pilot release, local adoption and
the matching Resources publication. It does not request directory submission.

## Implementation choice

```text
Install AIOS → native Set up → connect Notion if needed
             → select existing home → adapt AIOS page → first useful task
```

Codex owns connection status, authentication and its themed install interface.
The packaged Setup skill owns the subsequent conversation, including missing
business choices and resume. Notion is an optional app binding, so another
context home does not require a Notion account. The binding uses the app ID
verified in the official Notion package and current plugin dependency metadata.
No custom UI, local MCP, token store or connection-state database is added.

Meetings 0.8.77 has its own local MCP/React interface and recording companion;
its installed manifest identifies proprietary source. We inspected the package
structure without copying its implementation or reading meeting records. Its
calendar connections use host-managed app/plugin dependencies. AIOS reuses
the host boundary rather than shipping the Meetings application.

Codex 0.160.1 initially recognized Setup but returned no Notion app when the
Agent Plugins root manifest was present. The pinned loader explicitly skips
app declarations for that format. Removing the shadowing root makes both the
official app and Setup visible through `plugin/read`. AIOS uses the supported
`.codex-plugin/plugin.json` entry; Claude/Copilot, Cursor, Gemini and Pi retain
their native manifests and the same 26 skills. This is a compatibility choice,
not a claim that the root format will never support app bindings.

The default Notion entry is **AIOS** (AI Operating System). Its stable identity
and customer-owned content remain independent of package updates. Resources
explains the journey and pins the shared template; it does not copy its body.

## Verification boundary

Run the ordinary package checks plus `python3 tests/onboarding-rehearsal.py`.
Its negative cases reject a shadowing root, mandatory or substituted provider,
missing/different Setup and an implicit MCP runtime. `--native` separately
checks the real Codex parser and metadata through read-only app-server calls.
It neither installs a plugin nor changes connection grants.

Native metadata is not a screenshot or a completed new-user OAuth flow. The
desktop UI cannot be controlled by the available computer-use interface in
this task. Existing live Notion access can be tested without disconnecting it.
Disconnected/cancelled/read-only scenarios are instruction rehearsals, not
claims that those live account states were created. Source, installation,
retrieval and first-task evidence must remain separate.

The October 7 candidate passes package/version validation against v0.19.0,
documentation, layout, continuity, skill-version and unchanged footprint limits.
The native check observes Notion, Setup and 26 skills in Codex 0.160.1. Claude's
isolated installation, update, uninstall and coexistence rehearsal also passes.
An independent read-only agent followed the four changed/relevant procedures
for six synthetic states: disconnected, denied customer page, read-only,
partially cancelled, unchanged existing setup and an established Obsidian home.
It preserved the selected home and completed work, and introduced no auth reset,
replacement home, broad scan, local mirror or daily job. This checks instruction
interpretation, not a live authentication or full-package review.

Recovery selects v0.19.0 with native controls and restores only unchanged owned
edits. The Notion change retains its URL and icon; its previous content is kept
privately with task evidence. The host pointer does not change. Do not overwrite
later customer edits or change permissions to make a test pass.

## Sources checked October 7, 2026

- [Official plugin packaging](https://developers.openai.com/plugins/build/plugins)
  and [onboarding declaration](https://developers.openai.com/plugins/deploy/submission#configure-onboarding-review-and-publication).
- [MCP Extensions onboarding](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md#plugin-onboarding).
- [Codex 0.160.1 loader](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/core-plugins/src/loader.rs)
  and [native connection checks](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/app-server/src/request_processors/plugins.rs).
- [Official Notion app binding](https://github.com/openai/plugins/blob/main/plugins/notion/.app.json).
- [Notion setup](https://developers.notion.com/prompts/setup): v0.0.2, September 30,
  unchanged; [Notion Skills](https://developers.notion.com/guides/mcp/notion-skills).
