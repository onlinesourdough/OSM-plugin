Use AI to establish a shared data and context foundation for the way your business works. Notion is OSM's supported context home.

Use the Setup skill included with your installed OSM plugin. It guides the conversation and opens supporting instructions when needed.

## Establish the foundation

Find the relevant existing material and decide what should be maintained as shared context. Reuse suitable originals and verified connections. Organize current knowledge, meaningful decisions and personal methods so the next assistant can find them.

Give each topic a clear owner, scope and stable identity. Record source dates and uncertainty where they matter. Keep the current explanation concise, with history behind a separate reference.

Setup supports Notion as the context home. Legacy folder or vault homes are recognized read-only; Setup offers no new file or vault home. Existing projects keep their own sources, standards and working files.

## Use the methods and tools you need

The AI app supplies its models, tools, access and execution environment. Choose the shared methods that help the task and adapt personal skills to your own business. Skills are part of the context, not an extra foundation beside data and context.

Reading instructions, installing a package, connecting an account and proving it works are different steps. Verify the relevant access and a useful first result in the actual environment.

## Install and use OSM

[Install OSM](https://github.com/onlinesourdough/OSM-plugin#install-in-your-app) · [Workspace setup](https://github.com/onlinesourdough/OSM-plugin/blob/main/docs/native-installation.md#start-with-a-clean-agent-workspace)

### Set up through a conversation

1. Install OSM in your agent app, open a fresh chat and ask it to run OSM Setup. In Codex you can also select OSM:setup in the skill picker. Bare /setup can select another installed plugin.
2. Have Setup check whether the official Notion plugin is installed and connected. Install and connect it when needed, then verify the intended account and an existing home or parent page. The ordinary official Notion connection needs no OpenAI API key.
3. Describe your business and choose a useful first task. Share relevant existing material, or let the agent help find it. If you mention notes, a file or a system needed for that task, Setup clarifies its purpose and location before substituting a generic draft. You do not need to know database IDs, schemas or technical paths.
4. Review the short concrete plan: what is reused, what is added and where originals stay. Setup then builds or adapts AI operating model with its definition, needed Knowledge, Memory and Skills roles, and the existing method icons. New-home Setup also resolves Content: reuse its existing owner or propose one empty database. Deferral is the owner's choice. Existing homes keep their identities and choices; resume adds nothing by default.
5. Complete the agreed useful task and check the saved business snapshot. Choose the continuing write policy and intended scope for the short agent instructions. Ask an ordinary question in a fresh chat to verify that the agent can find the relevant context and sources. Add daily Dreaming only when you choose recurring upkeep.

Use the official Notion plugin with a person's authorized account for ordinary work. Select a dedicated connection when a team workflow, delegated worker or unattended job needs a separate identity or a narrower scope. Each person can have their own authorized account. Being a team member alone does not require a new integration. Store credentials in the host or provider credential store.

Prime loads relevant context when starting or resuming work that needs it. Log saves lasting changes at meaningful checkpoints. Dreaming gardens the selected context home between tasks. Council brings in another agent for review or bounded work.

### Work through it your way

Use the same conversation on your own, as preparation before a client session, or with a facilitator. Setup reuses accepted answers and saves genuine gaps so you can resume. A facilitated hour can focus on source preparation, a useful task, one correction and fresh-chat recall. The client's own home and app profile remain separate from the facilitator's.

Codex's bundled OSM tools use Node.js 22 or later. If the host does not provide it, Setup helps establish that prerequisite through the supported route. Use the public guide for explanations and the installed skills for the actual procedure.

### Data & Context definition template

Use the definition and database guidance in <mention url="https://app.notion.com/p/40d6d2e17f56816da06ff15c39dcc038">AI operating model</mention>. Setup adapts that template to the company's actual sources and existing databases.

Replace the placeholders with identities and routes that have actually been verified. Store credential values in the host or provider credential store.

The reference library preserves tagged instructions and supporting source packets. It does not report a visitor's private installed version.

## Add Content when useful

The Content foundation is part of authorised new-home Setup in OSM 0.35.0 or later; follow your installed release until that version is available. It does not automatically install editorial methods. The optional Content companion helps adapt that selected foundation to an existing creative workflow and build personal content skills. Reuse the person's editor, publishing tools and ways of working. Its examples can include Notion for editorial work and a newsletter service for delivery. Choose tools for the actual task and verify the relevant integration before using it.

## Choose the Notion access that fits

| Situation | Useful route |
| --- | --- |
| You use your own Notion account | Connect the official Notion plugin in the agent app and verify the selected workspace. |
| A teammate already has access to shared pages | They connect their own authorized account. Shared pages and database permissions determine access. |
| A worker or job needs access to selected pages only | Use a dedicated connection with its own identity and share only the required root and any separately stored sources. |
| An unattended daily Dreaming job | Select a route that can authenticate in that job's actual runtime. Verify it can read and make the authorized changes without the owner being present. |
| You work for several clients | Select the appropriate client's home, account and permissions for the task. Keep each client's context in its own home. |
| A connection fails or is revoked | Report the affected source and restore the selected connection. A different connected account is a separate choice. |

A company can own its shared AI operating model while employees keep personal homes, including in different Notion workspaces. Each home has its own definition, account, policy and destinations. Record a deliberately selected cross-home source with its actual reader, grants and retention; do not merge private Memory or automatically switch the agent's default home. An employee can use their own authorised Notion account, or a dedicated connection when a narrower identity is needed. A link to the company home creates no access.

A scoped connection limits the pages available through that connection. An agent that can also call a broader account still has that other route. When a workflow needs a technical boundary, configure its actual tools and credentials to match that boundary. Database views and labels help retrieval; Notion sharing controls access.

## Add a provider API key when needed

Start with an existing supported plugin or connection. Add an API key when the chosen tool actually needs one, such as a separate research provider or a dedicated integration. Put it in the host or provider credential store and keep only the provider, account, purpose and secret reference in the definition. Test a small authorized request and the route used by a scheduled job when applicable. Document rotation and revocation alongside that connection.

An API key is an authentication credential. Notion remains the context home. External provider records and data stay in the provider's system. A local project can use an ignored environment file when its supported runtime requires it; persistent personal or scheduled credentials should use the runtime's supported secret storage.

## Short agent instructions

Put this pointer in the selected host's instruction file, such as [AGENTS.md](http://AGENTS.md) or [CLAUDE.md](http://CLAUDE.md). Replace the URL with your own verified home; Prime reads the definition there.

```txt
Use OSM Prime when relevant context is missing at the start or after resuming.
Data and Context: [your verified Notion Data & Context URL]
Always run OSM Log at meaningful checkpoints or when asked.
Use the host's built-in workspace and tools first, including its side panel when available.
Use external apps only when built-in tools can't do the work.
Use the official Notion connector when available; preserve the selected account and any explicit dedicated route.
```

A short description helps the app select a skill; it does not guarantee that every host will invoke it. Keep the verified Data and Context pointer. Reuse relevant verified context in the same conversation, including after compaction when it remains available. A new task, changed scope or stale source may need a fresh lookup. Provider prompt caching is separate: it can reduce repeated-prefix processing, but cached input still uses context space and matching across fresh chats is not guaranteed.

## Agent workspace and tools

Use the host's built-in workspace and tools first, including its browser, terminal and side panel when available. Use external apps when the built-in tools cannot do the work. Keep the same short context pointer in the selected host's instructions, with Prime at session start and Log at meaningful checkpoints or on request.

Full access, action approvals and computer use are host settings. Choose them for the intended task and workspace and verify the effective tools and permissions. [Host setup for Codex, Claude Code, Antigravity, Cursor and Pi](https://github.com/onlinesourdough/OSM-plugin/blob/main/docs/native-installation.md#start-with-a-clean-agent-workspace)

## Creator and optional help

OSM is an open-source method created by [Gustav Online](https://gustavonline.com/) and shared through [onlinesourdough](https://onlinesourdough.com/).

You can use and adapt OSM yourself. If you want hands-on technical guidance, [The Fermentary](https://onlinesourdough.com/fermentary/) offers ongoing 1:1 work with Gustav on your business's data, context and AI workflows. Human support is optional.
