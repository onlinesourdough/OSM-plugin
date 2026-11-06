# Codex context management and native Memories

Read only when the user requests or the task materially depends on these Codex
context capabilities. Apply the shared [configuration procedure](harness-configuration.md),
preserve an off choice and keep portable OSM context independent.

The [official configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
documents notes and searchable task history as experimental context management.
As checked 2026-09-05, it is off by default and requires ChatGPT sign-in on
Plus, Pro or Pro Lite. Recheck eligibility and installed-client support before
offering this scoped config.toml change, and apply only with explicit opt-in:

```toml
[features.context_management]
experimental_mode = true
```

Reconcile an existing features table rather than appending conflicting TOML.
Preserve model/provider, unrelated keys and existing choices. Check effective
configuration and, in a fresh eligible task, actual feature availability. CLI
recognition or a true flag does not prove that the active desktop task exposes
notes/history; report that capability NOT VERIFIED until observed. Do not force
compaction or inspect private history merely to manufacture proof.

These task-context facilities are separate from cross-chat Memories and
Computer History. They neither enable those options nor replace the Notion
home and its routed owner context. OSM works without them. This is Codex-only
guidance: do not translate the key into Pi settings or introduce a runtime shim.

For native Memories, inspect the effective `features.memories` flag and supported
`memories.generate_memories`, `memories.use_memories` and relevant source-scope
settings, plus the app's Personalization controls and per-chat `/memories`.
The per-chat choice can differ from global settings. If legacy keys exist,
verify their supported meaning before replacing them; do not add both old and
new flags to guess at compatibility. Use `codex features list` only to inspect
known/effective feature state, not as proof that a background memory pass ran.
Preserve an off choice; enabling requires user intent. A chosen off state does
not require deleting generated memory or session files. Do not copy those stores
into OSM or rely on editing them to control the feature.
[Native memory controls](https://learn.chatgpt.com/docs/customization/memories)
are separate from OSM's Memory and Notion context.
