# Set up a Notion context home

Use when the owner chooses Notion as the context home. OSM supplies methods;
Notion holds company knowledge and personal/team skills; the harness supplies tools
and permissions. Code and operational records keep their existing source.
No server, custom MCP, database service or local owner folder is required.

Read the complete current [Notion setup guide](https://developers.notion.com/prompts/setup)
and the relevant Skills documentation it links. Record the applied version and
date; a newer remote guide is a review input, not authority to replace policy.
Use [operating boundaries](../../../osm-manage-data-context/references/operating.md) throughout the setup.

## Start after installation

OSM Setup leads this route. Accept an ordinary request such as
“Use OSM Setup to set up my Notion; start at [URL].” Stay in this flow; the owner
need not invoke Context, Manage Skills or Check separately.
Superseded default: the official plugin as the setup route. New setups use the
internal root-only connection in the [architecture](../architecture.md#access-roles)
and Setup's [bootstrap](../../../osm-setup/references/bootstrap.md); the official
route below stays an explicit alternative, never a fallback.
OSM and the official Notion plugin are separate. Use native installation,
enablement and connection status plus available tools; do not create a second MCP, login page,
token store or connection tracker. If status is unavailable, say unknown and
try the selected page through the existing tool. An installed plugin is not
proof of a connection, and a connection is not proof of page access.

| Observed state | Next action |
| --- | --- |
| Not installed or not connected | Offer the official Notion plugin through native discovery/connection controls. The owner completes sign-in and access choices. Resume here afterward. |
| Connected, home not selected | Ask for the existing starting page; do not scan the workspace to choose one. |
| Connected, selected page readable | Verify workspace and page identity; reuse this connection and continue. |
| Connected, selected page denied or missing | Explain the specific page/access gap. Keep the chosen home; do not reconnect, switch accounts or create a replacement automatically. |
| Read works, writes unavailable | Continue discovery and prepare the concrete changes; hold writes and report the access needed. |
| Setup already exists | Check its routes and the requested gap; preserve IDs, wording and the existing pointer. |

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

Apply the [business coverage check](../../../osm-setup/references/business-context.md) to the selected
sources. Map Offers, Demand and Operations, including relevant brand, source
access and responsibility, before declaring the task ready. Resolve concrete
gaps through short questions; do not require full coverage to begin a task that
needs only one area. Reuse actual methods and allow Memory to start empty.

## Establish the destinations

Verify the connected workspace/account and available tools. Qualify reads,
inserts and updates once across the selected stores and their nested pages
(Knowledge, Memory, Skills, any selected existing Content store and the control records), not per store
or per write. Reuse the owner's
work destinations and memory structure when suitable. A human Business home or
Docs library keeps its structure and is no longer a curation destination; see
[human originals](../architecture.md#human-originals-and-selected-excerpts). Inspect
canonical pages and database schemas, not only keyword search. If none exists,
create the smallest useful home, memory destination and personal-skill route
within the authorized scope. Use native Notion skills, not an ordinary database
that merely labels pages as skills. Preserve existing pages and unknown blocks.

Make the home usable by people: preserve ordinary Docs/Document Hub navigation
and templates. Prefer full-page databases reached from the existing home;
inline dashboards are optional, not a setup requirement. Reuse a native Skills
destination and a memory destination when suitable; add only a missing useful
destination, not an obligatory three-database hierarchy or an extra OSM hub.
Preserve Spaces as business/brand scopes within one owner home, including
sub-brands and shared context. Projects use their native workspaces. Start with
a Space property and useful views; a separate Space database is conditional.
For properties, hierarchy, native templates and integrity checks, apply the
[schema contract](schema-and-templates.md) to the existing workspace.
Split large imports into coherent, independently editable topics with clear
titles, stable source identity and provenance. A view tag does not confer
native skill status or permissions. Inspect the rendered home and use its
filters before claiming usability. Keep technical guidance and recovery out
of everyday navigation. Retire replaced structures only within cleanup authority,
after source mapping, reference repair and verified recovery.

Select accessible owner context with the user or existing task authority.
Import durable facts with their provenance, source dates and uncertainty;
import date is not confirmation date. Link live business sources instead of
replicating them. Do not scan hidden histories, credentials, whole drives or
unrelated chats. Put detailed artifacts in their actual Docs/project destination.

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
and the [Notion skill lifecycle](../../../osm-manage-skills/references/notion-skills.md). Preserve every
supporting file and repair references before retiring an old registration.

## Starting in a messy workspace

Begin with one real workflow and its outcome, source owner and review point.
Inspect the selected home and relevant databases, not the whole workspace.
Record exact IDs: two pages called Docs need not be the same destination.
Reuse suitable native Skills and Memory; a human Document Hub stays a human
library, not the curation destination. Create only missing destinations under
the agreed root. Existing unclassified documents stay usable
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

For a new setup, create the root from the neutral
[Data & Context template](../../assets/data-and-context-root.md); its native
children need no second link list. Superseded default: the packaged
[OSM page](../../assets/notion-osm.md) as the entry. An existing OSM page keeps
working until an explicit [migration](../migration.md). For such a page, keep the familiar
layout: where Docs, Skills and Memory are, where business topics are covered,
what Spaces mean, how to start work
and where results go. Fill the customer-specific links, Space map, sources,
review/write agreements and recovery route from verified evidence. Put exact
database/view IDs, field mappings and connection exceptions in its collapsed
agent notes. Keep icons, titles and useful local wording. The customer owns
this instance; package updates do not regenerate it or replace its agreements.

The plugin owns the reusable page layout and setup procedure. Resources explains
how to use them. The customer does not have to copy a long setup prompt or build
an instruction page from scratch. The page is the everyday map after onboarding;
installation instructions and test receipts belong in the setup handoff.

Link the host directly to the root entry to avoid reading a whole library or
database each session. No page name is mandatory.
Keep detailed source, schema and skill procedures in the shared plugin; retain
only the owner's actual mappings and exceptions in the guide.

Use the existing setup authority for this guide. Keep the host's persistent
instruction a thin pointer using [the bridge](../../assets/bridge.md) and the selected
[native adapter](../../../osm-setup/references/adapters.md). Preserve other
instructions and repository isolation. Never embed private IDs in plugin source.
Verify the guide first, then change only the owned bridge and selected plugin
registration. Leave the previous home as inactive recovery during a preview.
The pointer is installed once at the intended scope, not rewritten whenever
an offer, source or skill changes. Those changes belong in the context home.
Change the pointer only for an authorized entry move or host/scope change.

Record the owner's write policy once, in the definition's `write_policy`: Setup
proposes whole-home across the selected home and its real descendants, and
records what the owner chooses; it never assumes the grant. Carry that one
policy through the definition, standing rules, connector capabilities and any job
prompt so they agree, and let the host pointer refer to the root rather than
restate it. An existing recorded form (a `protected:` list, an Updates note or a
CONNECTIONS entry) is read and kept, and a rerun never drops a narrower choice.
See the architecture's [home write policy](../architecture.md#home-write-policy).

Make [Manage Data & Context](../../../osm-manage-data-context/SKILL.md) usable at natural task
checkpoints within the recorded read/write policy. No timer is required.
Setup or general upkeep authority does not authorize a recurring task. Use the
host's scheduler only for an explicit recurring-work request with bounded
sources, destinations and cadence; see [maintenance](../../../osm-manage-data-context/references/operating.md#maintenance).
Skill automatic-use settings do not create scheduled runs.

## Prove the result

Run the authorized [acceptance checks](acceptance.md), including a
fresh session that retrieves the correct live context and personal skill.
Import, native discovery and behavioral use are separate claims. Preserve
earlier versions on failed activation, and complete independent work.
If the first task needs no personal method, do not invent a skill to pass a test;
report that use as not applicable and verify any existing migrated methods separately.
Return the entry link, what the customer can now ask, the first real result and
any unresolved source or review decision. Distinguish connection ready, structure
ready, first task verified and correction retained. A structure with no tested
task is a foundation, not completed onboarding. Include concise proof and one
scoped recovery route; do not claim future daily runs have already succeeded.
