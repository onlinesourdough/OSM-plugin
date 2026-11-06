# Set up a Notion context home

Use when the owner chooses Notion as the context home. OSM supplies methods;
Notion holds company knowledge and personal/team skills; the harness supplies tools
and permissions. Code and operational records keep their existing source.
No server, custom MCP, database service or local owner folder is required.

The official [Notion setup guide](https://developers.notion.com/prompts/setup) is
the upstream recipe Setup follows. Read it in full during setup or a deliberate
update, not every session, along with the relevant Skills documentation it
links; if it cannot be read, say so and do not claim it was followed. Record its
adopted version and link, and any local deviations, in the model; that is
separate from the model's own revision. A newer upstream version is a review
input: reconcile it deliberately and never overwrite customized rules or reset
an existing setup. Before a native Memory or Skills operation, also read the
current `notion://docs/memory` or `notion://docs/skills` resource and the
actual tool catalog the connection exposes. A guide describes a contract; it is
not a callable tool or a grant. Claims about native behavior rest on what the
current provider exposes, not on this procedure.
Use [operating boundaries](operating.md) throughout the setup.

## Start after installation

OSM Setup leads this route. Accept an ordinary request such as
“Use OSM Setup to set up my Notion; start at [URL].” Stay in this flow; the owner
need not invoke Context, Manage Skills or Check separately.
OSM and the official Notion plugin are separate. Use native installation,
enablement and connection status plus available tools; OSM ships no Notion
server, login page, token store or connection tracker. If status is unavailable,
say unknown and try the selected page through the existing tool. An installed
plugin is not proof of a connection, and a connection is not proof of page access.
For native Skills discovery, follow [the connection check](#connection-for-native-skills-discovery).

| Observed state | Next action |
| --- | --- |
| Not installed or not connected | Offer the official Notion plugin through native discovery/connection controls. The owner completes sign-in and access choices. Resume here afterward. |
| Connected, home not selected | Ask for the existing starting page; do not scan the workspace to choose one. |
| Connected, selected page readable | Verify workspace and page identity; reuse this connection and continue. |
| Connected, selected page denied or missing | Explain the specific page/access gap. Keep the chosen home; do not reconnect, switch accounts or create a replacement automatically. |
| Read works, writes unavailable | Continue discovery and prepare the concrete changes; hold writes and report the access needed. |
| Setup already exists | Check its routes and the requested gap; preserve IDs, wording and the existing pointer. |

### Connection for native Skills discovery

Check the host that will actually do the work: its connected identity and
workspace, and the tools callable in that chat. A desktop connection says
nothing about a remote machine's configuration, sign-in or tools. Inspect only
the relevant host configuration, keep unrelated settings, and never read, copy,
print or move credentials.

1. **Reuse a working connection.** If the current Notion connection, from the
   official plugin or an existing direct one, can call
   `notion-get-enabled-skills` and a read-only call succeeds, use it. Do not add
   another server, rename a working one or start a new sign-in.
2. **Name a missing capability precisely.** Plugin metadata, a Connected badge
   or a successful sign-in does not mean a tool is callable; one connection can
   read pages while lacking discovery. Ordinary reads stay useful; say exactly
   which tool is missing on which connection. Do not assume the gap is
   permanent or diagnose its cause.
3. **Offer the supported direct path when needed.** Notion's hosted MCP endpoint
   `https://mcp.notion.com/mcp` can be connected directly. In Codex, within the
   existing setup authority, that is `codex mcp add <unused-name> --url
   https://mcp.notion.com/mcp`, then `codex mcp login <name>`; reuse an existing
   server for that endpoint instead of adding a duplicate. Keep the official
   plugin and its skills. Notion's CLI and its deprecated local MCP server are
   not needed for this.
4. **Sign-in is its own step.** The person approves it in the browser for the
   intended identity and workspace. Give the exact action when it is pending.
   Never move tokens between machines, act as another account, enable extra
   skills or widen access to pass a check.
5. **Refresh without disruption.** Prefer the host's supported refresh that keeps
   current work running. Do not stop an app server, restart other agents or ask
   for a new chat by default; if the host truly needs a later session, say so
   and leave the timing to the person. A command-line configuration is not
   proof that an open desktop chat can use the tool.
6. **Verify in the target chat.** Confirm the identity, that
   `notion-get-enabled-skills` is callable there, and read its result for the
   MCP surface. An empty result shows discovery works, not that any skill is
   enabled. Loading and using a relevant skill is separate proof.

Report each state on its own, with host and time and no credentials:
connection configured; sign-in pending, denied or done; tool exposed, missing
or failing; discovery verified or failed; approved fallback in use. None of
them, nor a saved pointer, is a general "ready". When discovery stays
unavailable, use the model's exact Skills route as the stated fallback; it is
not enabled-skill discovery.

The owner signs in through the host; never ask for credentials in chat.
Check only capabilities needed for this setup and do not write a throwaway page
just to detect permissions. After an authorized real write, read it back.
On cancel or failure, preserve completed work and resume from the unresolved
step. Only independent work can continue before missing access is resolved.

Reuse what the conversation and selected home already establish. Resolve only
missing decisions: where to start, which businesses/brands belong together and
one task worth improving. Help choose that task from the inspected work rather
than making a long intake form a prerequisite. If the task remains undecided,
the authorized structure can proceed; label the first-use test pending.

Explain the concrete mapping in ordinary language: what already works, what
will be added and which source needs an owner's decision. A compact before/after
table is enough. Continue reversible in-scope setup under existing authority;
ask only about unresolved facts, conflicts or actions outside that scope.
Keep the customer's task and any persistent pointer scoped to that customer.

Apply the [business coverage check](../business-context.md) to the selected
sources. Map Offers, Demand and Operations, including relevant brand, source
access and responsibility, before declaring the task ready. Resolve concrete
gaps through short questions; do not require full coverage to begin a task that
needs only one area. Reuse actual methods and allow Memory to start empty.

## Establish the destinations

Verify the connected workspace/account and the account, destination access and
action capabilities separately. Discover the existing operating model, Memory,
Skills, document and work destinations and the host's instruction mechanism by
reading narrowly; do not harvest chats or build an inventory. Show the concrete
reuse/create/change decision before writing.

OSM is the product and the owner's home; the **AI Operating Model** is the
one approved guide, built from the [model template](../../assets/notion-osm.md),
and the host pointer targets it directly. For a new setup, follow the upstream
guide and store the model as a page in an appropriate private document database:
reuse a suitable private Docs destination, or propose the smallest approved one.
A small **OSM** home page can link to the model and to useful context and work;
it is navigation only, moves nothing and grants no access. Add only the useful
destinations the owner selects: About, Memory, Skills and, only from chosen
collaboration preferences, a Soul. An existing workspace keeps its names, IDs,
structure, root placement, work systems and private/team boundaries. Identify
an existing guide by role and ID, even if it is titled AIOS, OSM or is an ordinary
page, and reuse it where it is; its location alone is not a defect, and a title
never proves a missing page or justifies a duplicate. Create a minimal private
Docs destination only when a new setup genuinely needs one and the owner
approves it; never create a database merely to match a diagram or to relocate
an existing guide, and add no empty hierarchy. Move a resource only when its identity,
meaningful metadata, relations and access survive and the move is authorized;
otherwise link it in place. Verify provider-controlled native placement.
Use native Notion skills, not an ordinary database that merely labels pages as
skills. Preserve existing pages and unknown blocks.

For Tasks, Projects, Skills and Meetings, apply the
[native database contract](schema-and-templates.md#native-databases-and-meetings):
reuse the resolved existing destination first, use a supported native type only
for an authorized missing one, and keep native type, page templates, a person's
My Tasks sources and Meetings settings apart.

Resolve Memory by exact identity before any write, using the
[schema contract](schema-and-templates.md#memory-identity-and-provenance). An
approved existing custom store stays canonical until an explicit, recoverable
migration. An empty native alias neither hides it nor starts a second store;
new native Memory starts only with a real authorized save, never placeholder
facts. If native save is unavailable or rejects the documented shape, report
the exact missing capability and continue through the approved existing store.

Make the home usable by people: preserve ordinary Docs/Document Hub navigation
and templates. Prefer full-page databases reached from the existing home;
inline dashboards are optional, not a setup requirement. Reuse a native Skills
destination and a memory destination when suitable; add only a missing useful
destination, not an obligatory database hierarchy or an extra hub.
Spaces are optional. Preserve existing scopes within one owner home, such as
businesses, brands and sub-brands, teams or areas of personal life, and reuse
their existing property (Space, Area or similar) and relationships. Record what
is common and what is specific to a scope, and fetch only what the task needs.
Projects use their native workspaces. There is no mandatory common taxonomy or
Spaces database, sources need not share identical fields, and unscoped records
are not implicitly shared. A Space, Area or Audience label or a filtered view is
neither a Notion permission boundary nor a Teamspace.
For properties, hierarchy, native templates and integrity checks, apply the
[schema contract](schema-and-templates.md) to the existing workspace.
Split large imports into coherent, independently editable topics with clear
titles, stable source identity and provenance. A view tag does not confer
native skill status or permissions. Inspect the rendered home and use its
filters before claiming usability. Keep technical guidance and recovery out
of everyday navigation. Retire replaced structures only within cleanup authority,
after source mapping, reference repair and verified recovery.

Select accessible owner context with the user or existing task authority.
Imports cover only named, accessible sources in the approved proposal; running
Setup does not authorize harvesting conversation history, importing every
artifact or copying every installed plugin skill into Notion. Import durable
facts with their provenance, files, source dates and uncertainty, deduplicate
and verify; import date is not confirmation date. Link live business sources
instead of replicating them. Do not scan hidden histories, credentials, whole
drives or unrelated chats. Put detailed artifacts in their actual Docs/project
destination. The upstream guide's daily loop and optional agent registry are
not automatic onboarding: a schedule needs the owner's explicit choice and a
supported host mechanism, and a registry entry proves no access or recall.

Before migrating, verify a recoverable backup and inventory exact sources,
destinations and machine registrations. Record private mappings outside this
distributed plugin. Deduplicate by source identity and destination, not title
alone. If a write's result is uncertain, read the destination before retrying.
Changed source or destination requires reconciliation; never overwrite blindly.

For skills, distinguish Personal from Team and record the accountable owner.
Reuse one native Skills database with Audience views when its permissions fit;
keep private/team destinations separate when access differs. A solo setup needs
no empty team database. Do not infer sharing consent from a Team label.

Migrate selected personal or team methods through [Manage Skills](../../../osm-manage-skills/SKILL.md)
and the [Notion skill lifecycle](personal-skills.md). Preserve every
supporting file and repair references before retiring an old registration.

## Starting in a messy workspace

Begin with one real workflow and its outcome, source owner and review point.
Inspect the selected home and relevant databases, not the whole workspace.
Record exact IDs: two pages called Docs need not be the same destination.
Reuse the suitable Document Hub, native Skills and Memory; create only missing
destinations under the agreed home. Existing unclassified documents stay usable
without bulk tagging, moving or declaring them authoritative. Link the few
relevant sources and fill genuine context gaps from documented evidence.

Give people one short entry and ordinary full-page destinations. Prove that the
first workflow finds the right fact and method, produces a reviewable result
and, if one arises, retains a real authorized correction without duplication.
Otherwise report correction proof pending; never create a decision to pass.
Expand to another Space
or source when work needs it. These destinations establish a context foundation;
they do not by themselves redesign operations, automate workflows or integrate
transactional data. Cleanup of unrelated clutter is a separate scope.

## Establish ongoing use

Create or update the AI Operating Model using the packaged
[model template](../../assets/notion-osm.md): how to use it, its context
sources, work and output systems, any Spaces already in use, and the complete
read/write policy. List each source as a labelled row under its own heading so
people, agents and the panel overview find the same routes. Fill links, Spaces,
write agreements, capability limits and recovery from verified evidence; put
exact IDs, field mappings and connection exceptions in its collapsed agent
notes. The owner chooses its name. Keep icons, titles and local wording. The
owner owns this instance; package updates never regenerate it or replace its
agreements, and an old template version alone requires no change.

The model is the complete contract: another connected agent must be able to
read and maintain this context from it without installing OSM. The plugin
keeps only reusable setup and provider procedures; installation notes and test
receipts belong in the setup handoff, not the model.

Link the host directly to the model so ordinary work reads it, not the whole
home or a database. Reconcile upstream guidance, retired method names and stale
routes deliberately during an authorized update; never replace policy
automatically.

Use the existing setup authority for this guide. Keep the host's persistent
instruction a thin pointer using [the bridge](../../assets/bridge.md) and the selected
[native adapter](../../../osm-setup/references/adapters.md). Preserve other
instructions and repository isolation. Never embed private IDs in plugin source.
Verify the guide first, then change only the owned bridge and selected plugin
registration. Leave the previous home as inactive recovery during a preview.
The pointer is installed once at the intended scope, not rewritten whenever
an offer, source or skill changes. Those changes belong in the context home.
Change the pointer only for an authorized entry move or host/scope change.

Make [Maintain Context](../../../osm-maintain-context/SKILL.md) usable at natural task
checkpoints within the approved read/write policy. No timer is required.
Setup or general upkeep authority does not authorize a recurring task. Use the
host's scheduler only for an explicit recurring-work request with bounded
sources, destinations and cadence; see [maintenance](operating.md#maintenance).
Skill automatic-use settings do not create scheduled runs.

## Prove the result

Run the authorized [acceptance checks](acceptance.md), including a
fresh session that retrieves the correct live context and personal skill.
A saved pointer is configuration; verify separately that a fresh session
actually follows it. A setup replay with no change writes nothing: no config,
connection, skill, instruction or database is added again.
After any route change, refresh the dashboard overview from the model.
Import, native discovery and behavioral use are separate claims. Preserve
earlier versions on failed activation, and complete independent work.
If the first task needs no personal method, do not invent a skill to pass a test;
report that use as not applicable and verify any existing migrated methods separately.
Return the entry link, what the customer can now ask, the first real result and
any unresolved source or review decision. Distinguish connection ready, structure
ready, first task verified and correction retained. A structure with no tested
task is a foundation, not completed onboarding. Include concise proof and one
scoped recovery route; do not claim future daily runs have already succeeded.
