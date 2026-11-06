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

The page starts at the next heading.

# Data & Context

[One or two sentences: whose context this is and what it is used for.]

## How to work here

- Ask for a useful result. The agent reads the definition below, then only the
  sources the task needs.
- Records here are curated: evidence, meaning and dates are kept; originals stay
  in their own systems and libraries.
- Your own documents and libraries keep their body, structure and authorship.
  The agent edits one only from your current task, your decision or correction,
  or a source you selected and it processes under your recorded policy. The edit
  stays targeted, it never reorganises or overwrites the document, and it
  implies no new access.
- Access comes from the connection's actual grants, not from links or labels.

## Essential rules

[The owner's complete essential operating rules: action authority, what the
recorded write policy allows where, review points, exclusions and forget
requests. Keep them short; link deeper procedures instead of pasting them.]

## Data and Context Definition

```yaml
definition:
  version: 1
  root:
    title: "[exact root title]"
    role: data-and-context-root
  contract: osm-context-architecture  # plugin reference; not copied here
  destinations:  # native children, and any other store this home names, by exact ID; labels are the owner's
    knowledge: {label: "Knowledge", id: "[id]"}
    memory: {id: "[id]"}
    skills: {id: "[id]"}
    maintenance: {id: "[id]"}  # pipeline agreements and other control records
    content: {id: "[id]"}  # optional; only when the owner selects Content
  # The owner's recorded choice. Setup proposes whole-home and never assumes it.
  write_policy: {choice: "[whole-home | narrower | not yet chosen]", include: ["[exact identities; narrower only]"], exclude: ["[exact identities]"], recorded: "[owner decision source and date]"}
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
      scope: "[selected objects, or a deliberately broader account/workspace-visible scope, by identity]"
      lifecycle: "[current-recurring | historical-one-off | deferred | excluded]"
      placement: "[direct | projection | both]"
      reader: "[route that reads it, or none]"
      agreement: "[pipeline agreement ID, or none]"
      # Readiness is observed state, kept in progress records, never here.
  references:
    - "[deeper domain contract or supporting page by ID]"
```
