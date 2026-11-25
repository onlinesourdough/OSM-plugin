An AI operating model is how the business puts AI to work: its goals, people and agents, data, working methods, tools and access, responsibilities, review and ongoing learning. OSM helps set up and maintain this arrangement. The Notion home carries its definition and routes; the actual work also depends on people, agents and the connected systems.

Data and context are the shared foundation within that model. Skills are part of context: reusable ways to carry out and review the work. Goals and vision give it direction; they are not a replacement for an AI strategy. Knowledge, Memory and Skills organize the foundation. Setup also resolves where Content belongs; personal editorial methods remain optional.

The Content foundation described below requires OSM 0.35.0 or later. Follow the installed release's Setup instructions; an earlier release does not acquire this default from reading this page.

## A gateway to your sources

The Data and Context Definition is a compact map inside your AI operating model. It tells the agent which system owns information, when to use it, which approved account and tool can reach it, and what may be processed or retained where. Notion provides a common foundation; it does not need to store every record.

A structured block such as YAML makes the selected routes explicit and consistently readable. Read it once for the relevant scope, then follow the routes the task needs. Reuse verified context while it remains applicable. The block is not executable access control, and formatting it as code does not make an AI host cache it automatically. Provider prompt caching, when available, reuses matching prompt prefixes; cached input still occupies context.

For example, keep the accounting in an AI-native system such as Numina. Prime follows the selected route and the agent queries the relevant current information there. Log may retain a permitted business decision or source pointer; Dreaming may perform a relevant due check. Neither needs a second ledger, invoice archive or recurring report mirror in Notion.

A source can permit a read in an approved environment while prohibiting storage in Notion or another destination. Record that handling rule explicitly. Apply it to Memory, summaries, logs and delegated briefs too. A fictional clinical system could therefore remain the only permitted location for patient records while its definition holds only the approved route and handling requirements. The actual source agreement determines the permitted use; a connection alone does not decide it. Reading source content already processes it in the AI host. These handling instructions guide the agent; they do not configure technical access controls or establish legal compliance. Use only an environment the source's actual policy permits. Material later found in a transcript keeps its original handling rules.

## Storage responsibilities

| Store | Purpose |
| --- | --- |
| Knowledge | Current explanations, goals, audiences, offers, positioning and selected configuration. |
| Memory | Durable decisions, preferences and lessons, with dated reasons and attribution. |
| Skills | Personal or shared ways of working, with their source and selected revision. |
| Content, when selected | Sources, ideas, actual material, channel editions and observed response. |

These are organizational choices, not new pillars. A database may contain evidence and interpreted meaning. A view is a way to find records, not an access boundary.

Keep useful names, native hierarchy and existing icons. New homes use the existing method icons below by default; the owner can customise them. Preserve an existing icon unless its change was requested. These assets require no Content methods, new databases or sharing change.

| Place | Existing method icon |
| --- | --- |
| AI operating model | [Root icon](https://raw.githubusercontent.com/onlinesourdough/OSM-plugin/47c354952b2b0daf9b1b846876d0dfbbe383b65d/assets/icon.png) |
| Knowledge | [Knowledge icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/knowledge.png) |
| Memory | [Memory icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/memory.png) |
| Skills | [Skills icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/skills.png) |
| Content, when selected | [Content icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/content.png) |

Setup applies the actual page or database icon and checks the result. If a tool cannot set it, keep the working home and report the remaining icon step.

## Optional foundation page icons

When you choose foundation topics, these examples reuse the same rounded icon family. They are not a required starter-file set or permission to overwrite your icons. Preserve the actual topic, title and owner choice. Apply an icon through the supported page or database route and verify it; if that route is unavailable, report the remaining step.

| Foundation topic example | Existing family icon |
| --- | --- |
| About | [About icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/definition.png) |
| Soul | [Soul icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/definition.png) |
| Vision | [Vision icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/architecture.png) |
| Principles | [Principles icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/definition.png) |
| Audience | [Audience icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/knowledge.png) |
| Offers | [Offers icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/knowledge.png) |
| Brand | [Brand icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/definition.png) |
| Voice | [Voice icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/definition.png) |
| Priorities | [Priorities icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/work-evaluation.png) |
| Editorial direction | [Editorial direction icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/content.png) |
| Cadence | [Cadence icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/automation-upkeep.png) |
| Formats | [Formats icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/content.png) |
| Quality gate | [Quality gate icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/work-evaluation.png) |
| LinkedIn | [LinkedIn icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/content.png) |
| X | [X icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/content.png) |
| Newsletter | [Newsletter icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/content.png) |
| Source map | [Source map icon](https://raw.githubusercontent.com/gustavonline/gustavonline/2b878911a0ddd8815833d67e7a326bfe186978b2/assets/notion-icons/osm/architecture.png) |

## Create and revise

Find the existing topic, stable identity and scope before creating anything. Accepted new information about the same topic updates the current explanation and Summary. Add genuinely new detail in its proper section.

Create a new record for an independent topic, purpose, scope or lifecycle. A different author alone does not create a new meaning. Split a topic when parts need different maintenance. Preserve original human material and meaningful earlier decisions; clearly historical pages are read when a question needs their reasons or past state.

## Metadata that helps

| Signal | What it means |
| --- | --- |
| Identity, role and scope | Which topic this is, what it owns and where it applies. |
| Status and provenance | What is selected, uncertain, replaced or attributed to a source. |
| Source/evidence time | When the event, observation or source belongs. |
| Revised | When the current record changed in substance. Carried-forward facts may not have been rechecked. |
| Review due | A justified point for reconsidering something temporary or changeable. |

These optional revision/review fields can be mapped to a Notion home. Source, import, publication, processing and released-version dates retain their different meanings. Plain pages can carry a short role, status and revision in their body. An unknown date stays unknown; there is no automatic mass backfill.

## Relevant first, then comparable freshness

Use the current task and selected owner controls, scope, topic and Summary to find useful material. Consider accepted authority and source quality before comparing evidence age. An older current decision can be more relevant than a new suggestion.

A due/flagged view helps identify review candidates. It does not declare their content false. A mechanical edit or a global recency score cannot determine a future task's relevance.

## Keep the foundation useful

Maintain useful new information, source changes and real review signals. Read before editing, make the smallest coherent update and verify it. A run with no useful change leaves content and revision dates alone.

Keep private context and customer material in their chosen home. This guide contains generic methods and reference material; using it does not require making your own foundation public.

## AI operating model home template

A new private home is called AI operating model by default, including when the conversation is in another language. It starts with its Data and Context Definition, followed by its native databases. The owner can choose another name. Existing homes keep their identities and names unless a rename is requested. Setup fills the definition from the company's actual sources and verified destinations; onboarding explanations stay in the conversation.

During authorised new-home setup, include Content in the short plan. Reuse an adequate existing Notion store or authoritative external workflow, or propose one empty Content database where no suitable owner exists. Record a deferral only when the owner actually chooses it; an unanswered proposal remains an unresolved setup choice. An external workflow gets no parallel Notion store. Installation and normal existing-home resume create nothing; a deferred choice is not asked again until its condition is met. No personal Content methods or example records are automatically installed.

The definition is one discoverable gateway. It can hold source entries directly or link to the selected source map and handling agreements. Existing role, field and query maps remain valid. Keep the actual owner, reader, selected scope, permitted use, retention and live-lookup requirements findable without duplicating an editable map.

```yaml
definition:
  version: 1
  root:
    id: "[exact root page ID]"
    account: "[verified Notion workspace or connection binding]"
    title: "[exact root title]"
    role: data-and-context-root
    purpose: "[whose context this is and what it is used for]"
  contract: osm-context-architecture  # plugin reference; not copied here
  destinations:  # native children, and any other store this home names, by exact ID; labels are the owner's
    knowledge: {label: "Knowledge", id: "[id]"}
    memory: {id: "[id]"}
    skills: {id: "[id]"}
    maintenance: {id: "[id]"}  # pipeline agreements and other control records
    content: {id: "[database ID]", data_source: "[data-source ID]"}  # omit for external or deferred
  content:
    outcome: "[existing-notion | external | deferred | new-notion]"
    agreement: "[definition section or exact source agreement; account, scope, field map, retention and triggers]"
    recorded: "[accepted setup plan or existing owner evidence]"
    activation: "[deferred: recorded condition or when requested; omit otherwise]"
  # The owner's recorded choice. Setup proposes whole-home and never assumes it.
  write_policy: {choice: "[whole-home | narrower | not yet chosen]", include: ["[exact identities; narrower only]"], exclude: ["[exact identities]"], recorded: "[owner decision source and date]"}
  controls:
    operating_policy: "[exact policy ID, when a separate page is required]"
    checkpoints: {kind: "[notion-record | runtime-binding]", ref: "[exact existing checkpoint reference for scheduled upkeep]"}
  areas:
    business-and-relationships: {coverage: "[source keys or gap]"}
    work-and-knowledge: {coverage: "[source keys or gap]"}
    communication: {coverage: "[source keys or gap]"}
    finance: {coverage: "[source keys, gap or deferred]"}
    products-market-operations: {coverage: "[source keys or gap]"}
  sources:
    - key: "[stable source key]"
      area: "[area]"
      provider: "[provider]"
      account: "[exact account or workspace identity, or its verified reference]"
      scope: "[selected objects, or a deliberately broader account/workspace-visible scope, by identity]"
      lifecycle: "[current-recurring | historical-one-off | deferred | excluded]"
      placement: "[direct | projection | both]"  # retrieval mode; not permission to retain data
      purpose: "[questions or work this source supports; what it owns]"
      reader: "[approved tool or connection that reads it, or none]"
      permitted_use: "[allowed actions and processing environments]"
      retention: "[source-only, or exact permitted context/output locations and exclusions]"
      freshness: "[when to query the live source or use dated evidence]"
      agreement: "[existing source-handling agreement or this definition section; required for selected recurring checks]"
      # Readiness is observed state, kept in progress records, never here.
  references:
    - "[deeper domain contract or supporting page by ID]"
```

Setup replaces placeholders with verified page and database identities and adapts the routes to the business. The definition points to the original CRM, finance and other systems, with the selected account, scope and permitted use. Credentials stay in the provider or host credential store. Source-handling rules can live in the definition or link to an existing agreement. Using an AI-native source directly requires no separate importer or Notion copy.

## Database fields

Knowledge covers the selected understanding of the person and business, offers, customers and their language, voice, positioning, strategy, relevant numbers, team and source map. Live operational facts stay with their owning systems. These are useful topics, not mandatory columns or a requirement to copy each system into Notion.

These are useful field meanings, not a compulsory migration. Reuse native properties and sufficient existing equivalents. A known classification or evidence basis can be stated in the body when no separate property is needed.

| Store | Useful starting fields and Notion types | Add when useful |
| --- | --- | --- |
| Knowledge | Name (Title), Summary and provenance (Text), Kind, Status and Temporal scope (Select), Evidence from (Multi-select), Space (Multi-select) or Scope (Text), Key (Text) for managed topics | Evidence period, Revised and Review due (Date). Preserve existing Type and Category fields. Unknown dates stay blank. |
| Memory | Name (Title), Key (Text) for managed decisions, Status (Select), Space (Multi-select) or Scope (Text), and an exact evidence reference in Source or Evidence (Text) | Type (Select), Source date, Imported, Revised and Review due (Date), Related docs (Relation). Preserve an existing Source (Select) that identifies the creating agent; use Evidence for provenance and Last updated by for the editing client where selected. |
| Skills | Native Skill name (Title), Description (Text), supporting Files (Files & media) when the method needs resources, Status and Audience (Select), Space (Multi-select) or Scope (Text) | Accountable Owner (Person), Key and Source (Text), Revised and Review due (Date). The method's source/version is distinct from its record revision. |
| Content: new empty store | Title (Title), Key (Text), Type (Select: Source, Content, Edition), Status (Select: no options or default), Summary (Text), Source URL (URL), Source date (Date), Sources and Derived from (self-relations to the same data source) | Editorial fields, workflow states, views and personal methods only when selected. Reuse sufficient existing native equivalents; no compulsory migration. |

Source dates describe the source; importing, substantive revision and technical editing are different events. Review due has a real reason and does not expire a still-valid decision. Add a relation only when its meaning and evidence are clear. A label, view or team audience does not grant access.

For a new Content database, create the non-relation properties and register its exact database and data-source IDs before adding the self-relations. Read back their types and targets. An interrupted setup reuses these identities and adds only missing properties. If the tool cannot create a required native type, preserve the verified store and report that remaining step; do not create a substitute, fake status or sample post.

The definition or its selected source agreement owns one actual Content route and field map. Before writing to an existing store, inspect integrations and publication triggers and verify a non-publishing path. Unknown triggers hold only dependent writes. The optional Content methods reuse this binding, including when an older setup template is selected; their released packets are not silently rewritten. Source, Content and Edition are record roles, not a compulsory production sequence.

Knowledge holds lasting business direction, audience, offers and voice. Content holds selected production references, actual material and editions. Memory holds lasting decisions. Original media and source-only data stay with their owning system.

## How the three context skills use this home

Prime reads the Definition and relevant sources when starting or resuming work that needs them, reusing verified context in the same conversation. Log saves supported lasting changes at meaningful checkpoints or when asked. Dreaming gardens the selected home between tasks: it reviews useful work, recovers missed learning and repairs supported drift in explanations and routes. Each follows the selected home, account and write authority. Your own source records stay with their owner.
