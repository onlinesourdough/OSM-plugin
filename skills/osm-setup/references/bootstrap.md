# Bootstrap and resume before a connection exists

The resumable first-run sequence for a Data & Context root under the
[Context Architecture](../../osm-data-context/references/architecture.md). Show the
current step, a concrete next action and truthful evidence. Resume at the first
unfinished step; never repeat completed ones or ask an accepted question again.
This text describes the sequence; executing it depends on the selected host and
runtime.

1. **Workspace.** A usable Notion account and workspace is a prerequisite
   outside OSM. Do not build account creation or training into the plugin.
2. **Root.** The owner selects or creates one blank root (suggest
   "AI operating model"), or explicitly selects an existing compatible home. An
   internal token cannot bootstrap an ungranted first root: the person creates or
   selects that page first, unless a separately authorized existing route can.
   Select the root by its link or ID through the selected connection; reading it
   never requires an unselected broader connector.
3. **Connection.** Reuse a working connection and the owner's recorded choice.
   For new ordinary user setup, check the official Notion plugin in the selected
   host. When installation is authorized, install it through the supported route
   if missing, guide sign-in and verify the account with a scoped safe read.
   Read the selected root through that plugin and record its verified URL in
   the short host pointer. A
   dedicated connection is an option when a selected team workflow, worker or
   unattended job needs a distinct identity or access scope. A team member can
   use their own authorized Notion account. For a selected internal connection,
   guide its creation, exact selected-page scope and secure credential input and storage.
   Never paste a token into chat, owner pages, logs or source files.
   Choose a secret store suited to the customer's OS and runtime, test
   unattended availability, fail closed on access loss, and define refresh,
   revocation and recovery; one platform's choice is not another's contract.
   OSM's existing internal route uses macOS Keychain (see the
   [panel reference](panel.md)): the owner provisions the item privately, reusing
   the existing selected connection's credential without rotating or revoking it,
   and approves the OS prompt. For that route, the agent saves the non-secret route setting from
   the recorded selection and reads the root through `osm_context_home`.
4. **Qualify the runtime.** On the pinned selected runtime, qualify read,
   create, update and readback once across the selected stores and nested pages;
   inherited access for new records; and denial of an outside page. Use a useful, real, idempotent write. A connection name, a
   badge or a readable UI is not end-to-end readiness. Resolve failures without
   widening access.
   On each harness claimed as supported, check inherited account and
   desktop-delivered connectors as well as local MCP/plugin settings, qualify
   the unattended run's effective tool set in its real launch mode, and report
   any limit the host cannot enforce.
5. **Build.** Setup builds or adapts the one definition and only useful
   destinations inside the chosen boundary. A newly generated root body begins
   with the definition and then its native databases. Existing roots follow the
   owner's request and write policy. Explain onboarding in the conversation.
   Discover actual tools, accounts and
   canonical owners; ask what the customer uses and which outcomes matter; record
   each source's placement and lifecycle choice. Record the owner's write policy
   once in the definition (whole-home is proposed, never assumed; an existing
   recorded form is read and kept) and give the connector, the job prompt and
   each pointer the same policy by reference. Verify one meaningful first task
   and its replay without duplicate objects.
   For each selected source, select its transport and format recipes once,
   including content egress and processor retention, or report the precise
   missing capability. Record its coverage policy: selected objects/channels or
   a deliberately broader account/workspace-visible scope, with exclusions and a
   bounded initial lookback; if the chosen credential cannot realise that
   coverage, show the limitation and choose a supported recipe. For a structured
   source, review each mapping's meaning and its default for values not yet
   seen, record the stable ID or documented composite key its items use, and
   hold a lossy or uncertain mapping; correct historical totals alone do not
   qualify a mapping.
6. **Show state.** Report current coverage, the qualified reader and source-route
   states and the actual last scheduled result, each as its own readiness state.
   Establish maintenance only under the owner's recurring-work authority. A saved
   schedule, a manual proof and actual timed use are different states; an
   unchanged run makes zero writes.
   An authorised source that is currently empty shows as configured/empty with
   its content path unexercised, not as an onboarding failure; a deferred source
   stays deferred until its activation condition is met. Report a structured
   source's numerical fidelity and its completeness as separate states; matching
   totals are not complete coverage.

Each step's evidence stays distinct from the next: a qualified runtime is not a
built definition, and a built definition is not a working schedule.
