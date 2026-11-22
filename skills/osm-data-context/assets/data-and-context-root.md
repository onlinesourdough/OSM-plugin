# Adapting the AI operating model home

The neutral starting layout for one customer-owned root. Setup fills it from
verified sources under the [Context Architecture](../references/architecture.md);
it does not copy that contract into the page. Replace every bracketed
instruction or omit its optional line before use. The title is the owner's
choice; the default is exactly **AI operating model**, without translating it
to match the conversation. Change that name only for an owner choice. If a root or an older entry already
exists, adapt it: keep its identity, title, icon, local wording and compatible
definition fields, and never regenerate owner choices from this template.

For a new root and new core stores, use the existing icons in the public guide's
[AI operating model reference](https://app.notion.com/p/40d6d2e17f56816da06ff15c39dcc038).
Reuse those actual asset URLs; do not generate new artwork or replace existing
icons. Apply the appropriate page/database metadata operation and verify the
actual icon. A wrapper-page acknowledgement alone is not proof a database icon
changed. If the tool cannot apply or read it, report that cosmetic gap and
continue useful work without broadening access.

Native child pages and databases (the knowledge store, Memory, Skills and the
maintenance pages) appear on the root itself. Do not add a second manual link
list to them; the definition names them by exact ID.

Before saving, verify the root and destinations, the recorded scope and write
policy, and every selected source's account, reader and agreement. Where a
scheduled job is selected, verify the route to its existing checkpoint. Name
coverage gaps explicitly. Refer to the agreement for source authority, cadence
and freshness details. Map selected chat history as a source with its exact
host or account, scope and reader.

The YAML below is a starting representation, not a mandatory spelling. Keep
one discoverable gateway: inline sources or a direct, named link to the owning
source map/handling agreement. Compatible existing role and query maps remain
valid. Omit an unused empty source list rather than contradict the selected
linked agreement, and never maintain a second editable map.

The next heading supplies the page title property. Omit that heading from the body.
The body begins with the definition and then the native child databases.
Keep this template's authoring instructions and all onboarding prose outside
the generated page body.

# AI operating model

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
