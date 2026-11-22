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

1. Install OSM in your agent app, open a fresh chat and ask it to run OSM Setup.
2. Have Setup check whether the official Notion plugin is installed and connected. Install and connect it when needed, then verify the intended account and a page you can read.
3. Describe your business and choose a useful first task. Setup reuses suitable existing pages and databases, then helps build your AI operating model home with its definition, Knowledge, Memory and Skills. In OSM 0.35.0 or later, its short new-home plan also resolves the Content foundation: reuse the existing Notion or external owner, defer, or propose one empty database. The home starts with its definition, followed by the native databases. Installation and existing-home resume add nothing.
4. Let Setup adapt the definition and database properties to your business. Map each original system, its approved access route, permitted use and retention. An AI-native CRM or accounting tool can be queried directly; its records need no Notion copy. Establish the short instructions for your agent app.
5. Complete the first task, save one lasting decision through Log, and ask for that decision and its source in a fresh chat. Add daily Dreaming when useful.

Use the official Notion plugin with a person's authorized account for ordinary work. Select a dedicated connection when a team workflow, delegated worker or unattended job needs a separate identity or a narrower scope. Each person can have their own authorized account. Being a team member alone does not require a new integration. Store credentials in the host or provider credential store.

Prime starts a session with relevant context. Log saves lasting changes at checkpoints. Dreaming reviews recent work and maintains context between sessions. Council brings in another agent for review or bounded work.

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
Always start with the OSM Prime skill.
Data and Context: [your verified Notion Data & Context URL]
Always run OSM Log at meaningful checkpoints or when asked.
Use the host's built-in workspace and tools first, including its side panel when available.
Use external apps only when built-in tools can't do the work.
```

## Agent workspace and tools

Use the host's built-in workspace and tools first, including its browser, terminal and side panel when available. Use external apps when the built-in tools cannot do the work. Keep the same short context pointer in the selected host's instructions, with Prime at session start and Log at meaningful checkpoints or on request.

Full access, action approvals and computer use are host settings. Choose them for the intended task and workspace and verify the effective tools and permissions. [Host setup for Codex, Claude Code, Antigravity, Cursor and Pi](https://github.com/onlinesourdough/OSM-plugin/blob/main/docs/native-installation.md#start-with-a-clean-agent-workspace)
