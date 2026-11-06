# Spaces, properties and templates

Map these roles onto the owner's existing Notion structure. This is a small
starter contract, not a mandatory schema or a fixed set of company documents.
Keep actual values, page IDs, templates and source mappings in the owner's guide.
Use the owner's chosen language consistently in setup labels and explanations.

## One home, multiple Spaces

A Space scopes business, brand, sub-brand or continuing-area context within one
OSM. A project is concrete work in a native workspace/repository; it can belong
to a Space without another OSM installation or a parallel project register.
Preserve the owner's actual hierarchy and explain it in the guide. Shared context
applies across areas, but is retrieved only when relevant.

For a small set of Spaces, reuse a select/multi-select property with the same
approved names across the relevant destinations. Include child Spaces in a
parent view deliberately; tags do not implement automatic inheritance. A new
Space updates the guide's map, matching options and affected views together.
Use multiple values only when the same item truly applies to each.

Reuse an existing Spaces relation if suitable. Introduce a separate Spaces
database only when a growing hierarchy or shared Space metadata justifies it
and the task authorizes that schema. Map existing records before converting
property types. A Space is not necessarily a Notion Teamspace; neither tags,
relations nor filtered views enforce access permissions.

## Minimal record roles

Preserve sufficient existing equivalents rather than adding synonymous fields.
Show the title and Space in everyday views; expose Type/Status where useful.
Keep technical identity, provenance and import metadata in page details.

| Destination | Useful fields | Meaning |
| --- | --- | --- |
| Docs (optional) | Title, Space, Type, Status; Key and Source for managed context | Existing knowledge and useful outputs |
| Native Skills | Native name, Description and supporting files; Space, Status, Audience, Owner, Key and Source | Personal and team methods |
| Native Memory | The provider's fields: Type, Source, Last updated by | Durable facts, decisions, corrections and lessons |
| Existing custom Memory | Title, Space, Status, Key, Evidence and known source date | The same role while it stays canonical |
| Native Tasks or Projects | The native type's canonical properties, such as status, assignee and due date, plus useful local fields | Actual work; live state stays on the record |
| Meetings | The workspace's default meeting-notes destination | Meeting notes; AI recording and summaries are separate |

Suggested Docs Type values: Context (reusable facts/constraints), Source (an
original business reference), Document (a plan, proposal, research or other
output). Keep an existing Category if it describes useful document formats;
do not require people to maintain overlapping classifications.

Suggested Status values: Current (selected for use), Needs review (incomplete or
uncertain), Superseded (retained history). Current is not a fresh verification
of every fact. Keep unclassified existing documents available without silently
promoting them to current context. Do not invent empty mandatory profile,
strategy or department pages; add a topic when real work requires it.

Skills use Audience = Personal or Team, mapped to an existing equivalent field
when available. Audience is separate from Space: an Operations method may be
personal or used by the team. Owner identifies the person responsible for the
method; use a native person field when the owner is known. Team methods need an
accountable maintainer and agreed change/review authority before becoming Current.
Keep one native Skills database with Personal/Team views when permissions fit.
If privacy differs, reuse separate private/team destinations or native verified
page access. A filter is never an access boundary. Never move or share personal
skills automatically. Existing personal records are classified only from evidence;
unclassified records are not implicitly team-approved. A solo owner needs no
team database or invented employee. Team templates/views are added when useful.

Notion page IDs are actual stable identity. Key is a logical deduplication name,
retained through renames, not a database-enforced unique constraint. Keep existing
keys; new managed items may use scoped prefixes. Ordinary documents need no
artificial key. Evidence (Source in Docs and older custom stores) records the
exact original source/owner decision and date; unknown dates stay unknown. An
original Source document can own its provenance. Keep source date, import date
and last check distinct.

## Memory identity and provenance

Memory has one canonical store. Resolve the native alias and any approved
existing custom store by exact identity, never by title. The memory guidance
describes fetching the `memory` alias to resolve the native Memories database
and About page, created on the first save; after that, use the exact database,
data source and page identities and the schema the connection actually returns.
Until a fetch returns them, that is documented behavior, not an observed result.
An empty native alias does not mean there are no memories: a nonempty approved
custom store stays canonical, its own access is checked separately, and the
empty alias neither starts a second store nor authorizes replacing or migrating
it. New native Memory is initialized only by a real authorized save, never
placeholder facts. Supported native behavior is what the current
`notion://docs/memory` guidance and exposed tools show; these rules do not
establish it.

Native Memory, per its current contract: Type is Profile, Preference, Work,
People or Notes; Source names the creating client and is preserved on edits;
Last updated by names the client making the current edit. The importing or
editing agent is not the original author. A custom store keeps its source
evidence in a separate Evidence field or the body; it never repurposes native
Source for evidence. Unknown original authors and dates stay unknown. Preserve
IDs where supported, source/import/confirmation distinctions, relations, useful
history and attachments.

Search and query before saving; keep one independently editable topic per
entry; correct the owning entry rather than adding a contradictory one. Search
can lag, so a save is confirmed only by fetching the written page directly, not
by a search hit. Ordinary search or a page fetch reaches a named destination; it
is not a native memory search.

Check each intended native action on its own. Before a native create, compare
the documented create shape with the signature the connection's create tool
actually exposes. If they disagree, or create is unavailable or rejected, report
the exact mismatch or missing capability and hold that create. Do not try other
parameter shapes, options or clients to find one that works, and invent no call
shape or new store. A missing create or dedicated search tool does not by itself
show that a separately supported update of an exact existing entry is
impossible. Any update still needs the intended entry's verified identity and
access, the relevant native contract and action capability, a current read with
conflict handling, scoped authority and a direct readback; an update tool in the
catalog is not evidence of a successful Memory update or its provenance. A
refused or failed action stays refused. Use an approved existing custom store
only within its own observed access, write action and readback. Adopting native
Memory for an existing custom store is an explicit, recoverable migration.

Keep a short About page that links to the memories supporting it, reusing a
compatible existing profile. Change it with targeted edits that keep the
owner's own text. When a specific or more recent memory conflicts with the About
summary, the memory wins and the summary is corrected. For provider-managed
Memory, follow the returned native About contract. Avoid competing canonical
profiles.

Use native page mentions for ordinary references. Add a native relation only
for a useful record relationship, such as Memory's Related docs pointing to the
Docs a decision affects. Resolve exact page IDs; matching titles or Space names
is not a foreign-key relationship. Links do not synchronize source systems.

## Native databases and Meetings

Five things stay separate: a database's native type; its page templates and
default template; native skill designation on a page; a person's enabled skills
and automatic-use setting; and permissions, connector capabilities and actual
execution. Evidence for one is not evidence for another.

**Resolve before creating.** Find the existing destination through the model,
the selected home and relevant schemas, and reuse it by database and data-source
identity, including a renamed, translated or differently placed one. A similar
title or matching columns does not prove native type, and fetched schema or
views may not show it: use supported metadata or the native UI, and when the
connection cannot establish it, say so and resolve only the ambiguity that
matters. Preserve ownership and sharing.

**Create only what an authorized setup needs.** When the connection's
`notion-create-database` accepts a `database_type`, a missing Tasks, Projects or
Skills database uses `database_type: "tasks"`, `"projects"` or `"skills"`.
That option replaces a custom `schema`; never pass both. These are type values,
not shared database IDs: read back the created database, its data source and
its canonical properties, then add only useful authorized fields. Record the
returned identities in the model so a rerun reuses them. Do not create a suite
of empty databases because the types exist. Typed creation is not conversion:
an existing populated database keeps its rows, IDs, fields, statuses, relations,
views and sharing, and converting it is a separate, scoped, recoverable step
used only through a supported in-place path. If none is available, keep the
approved source and state the limit. An uncertain or partly completed creation
is inspected before any retry.

**Tasks and My Tasks.** An empty My Tasks is not evidence that the task database
lacks native type. Check, in order: the source's identity and native state with
its mapped status, assignee and due-date fields; whether the person selected
that source under My Tasks (Configure your task sources, or its current
equivalent), which is separate from database type and views; and whether rows
meet that person's assignee and active-status filters. Select the existing
source rather than creating a database, a linked copy or a conversion. Change an
assignee or status only for the person's intended assignment; never assign,
reopen or recreate tasks just to fill the view. A solo owner can assign tasks to
themselves while asking agents to do the work; connecting Codex or Claude Code
creates no Notion person, and an assignee does not start an agent. Exclude
trashed records from active counts and never restore one as an incidental fix;
when a query disagrees with the page or view, reconcile before editing or
reporting. Verify that the same records then appear with their IDs and fields.

**Meetings.** There is no `meetings` database type. Reuse the workspace's
default meeting-notes destination, set in Notion's settings (Notion AI, Default
meetings database, or the current equivalent); if that setting is UI-only,
explain it and verify it by supported means. A current-user meeting-notes tool
may exist and may require Notion AI. Storing and opening notes is separate from
AI recording, transcription and summaries.

**Plans and limits.** Basic setup, context and skills work must stay useful on
the capabilities the current connection actually has, including Free or
education plans with an external agent. Check real restrictions rather than
assuming every tool is available or paid. AI Meeting Notes and AI search may
need eligible paid access or a limited trial, and a daily cap is not a free
allowance. An external agent's own subscription is separate. A missing premium
feature is reported where relevant and never blocks unrelated work or forces an
upgrade.

## Native templates for humans and agents

Reuse useful templates. Suggested additions, only where missing:

| Template | Defaults | Body prompts |
| --- | --- | --- |
| Document / existing New doc | Type = Document; Needs review | Existing useful structure; preserve it |
| Context | Type = Context; Needs review | Facts/constraints, applicability, sources and uncertainty |
| Source | Type = Source; Needs review | What it owns, original content or exact source, currency/limits |
| Personal skill | Needs review; Audience = Personal | Trigger, inputs, procedure, output/checks, references and limits |
| Team skill (when needed) | Needs review; Audience = Team; accountable Owner | Trigger, procedure, output/checks, references and change authority |
| Decision | Needs review | Decision, reason/source, effect and review trigger |

Leave Space unset unless the specific template or view has a known scope.
Never hardcode a reusable Key, source date or decision into every new record.
Set a sensible default template through supported controls; keep template
repetition off unless recurring work was explicitly requested.

Database templates are native entries in the New menu, not sample documents
labelled as templates; they are not the database's native type. Resolve template
IDs from the selected database itself and use its default template where
appropriate. Use the UI if the connector cannot create/register them.
Verify registration, defaults and an instantiated record before claiming that
workflow works. Application may be asynchronous; wait for readback, not merely a
successful create response. If it remains unpopulated, retain that draft and use
the native template UI or explicitly populate the inspected fields/content;
read back before retrying so a delayed application cannot duplicate content.
A personal-skill template must preserve or establish
native skill designation through supported tools; a template alone proves none.
See [personal skills](personal-skills.md) for invocation and supporting files.

## Integrity during writes and checks

Before creating or promoting managed context, a skill or memory to Current:
inspect the schema, confirm title, approved Space, unique logical Key, meaningful
content and source/provenance. Check exact identity, key and meaning against
existing records, including superseded items, before creating another. Use only
relevant metadata and fetch affected pages. Source date is required only when
known; preserve evidence rather than inventing a value to pass a check.

Templates assist entry; they do not enforce required fields or uniqueness. A
read-only Check reports missing fields, duplicate keys, mismatched Space options
and broken relations/routes. It does not repair them or create test data.
Maintenance repairs only within the task or standing write policy. Unchanged
reconciliation produces no write. Do not claim transactional concurrency locks.

For authorized schema migration, take a before snapshot of the affected schema,
records and record count, and preserve IDs, original content, relations, files
and useful templates. Make one schema transition at a time and read it back
before any dependent change; never rename a property and reuse its old name in
one unchecked batch. Tool success alone is not proof. After each step verify
there is one intended property and that every record kept its values, and
reconcile values and counts against the snapshot before retiring an old field,
option or route. Check native property descriptions in the UI. Keep the guide's
routes and schema mapping consistent with the final state.
