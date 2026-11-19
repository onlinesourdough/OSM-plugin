# Adapting the Data & Context root

The neutral starting layout for one customer-owned root. Setup fills it from
verified sources under the [Context Architecture](../references/architecture.md);
it does not copy that contract into the page. Replace every bracketed
instruction or omit its optional line before use. The title is the owner's
choice; "Data & Context" is only the default. If a root or an older entry already
exists, adapt it: keep its identity, title, icon, local wording and compatible
definition fields, and never regenerate owner choices from this template.

Native child pages and databases (the knowledge store, Memory, Skills and the
maintenance pages) appear on the root itself. Do not add a second manual link
list to them; the definition names them by exact ID.

Before saving, verify the root and destinations, the recorded scope and write
policy, and every selected source's account, reader and agreement. Where a
scheduled job is selected, verify the route to its existing checkpoint. Name
coverage gaps explicitly. Refer to the agreement for source authority, cadence
and freshness details. Map selected chat history as a source with its exact
host or account, scope and reader.

The page starts at the next heading.

# Data & Context

## Data and Context Definition

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
    content: {id: "[id]"}  # optional; only when the owner selects Content
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
      placement: "[direct | projection | both]"
      reader: "[route that reads it, or none]"
      agreement: "[exact pipeline agreement ID; required for recurring work]"
      # Readiness is observed state, kept in progress records, never here.
  references:
    - "[deeper domain contract or supporting page by ID]"
```
