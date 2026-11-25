## How OSM works

Your agent uses OSM to find relevant business context, save useful learning and keep that context current. The diagram shows seven broad skills and the thin Unslop helper, your Notion AI operating model home and connected sources.

<image source="notion-file-block://4236d2e1-7f56-81cc-99bb-f2fe84c50658/00637f92-2735-4d2b-9218-91723b774b96?space_id=eee27a39-7e8a-48e6-9bd4-f3bc51a333fe&name=osm-architecture.png" />

<toggle>
Mobile overview

<image source="notion-file-block://4236d2e1-7f56-81ba-a4b3-f16902fa44b0/5e7dcdf8-7946-4bf6-aec8-d64f03583369?space_id=eee27a39-7e8a-48e6-9bd4-f3bc51a333fe&name=osm-architecture-mobile.png" />
</toggle>

<toggle>
Editable relationship map · Mermaid

```mermaid
flowchart TB
  SETUP["Setup · establish or reuse the home"]
  SOURCES["Selected original sources<br/>Files, messages, projects, CRM, accounting and native work history"]
  subgraph AGENT["Your agent app · models, tools, workspace and permissions"]
    PRIME["Prime"]
    WORK["Your work"]
    LOG["Log · meaningful checkpoints"]
    INTERVIEW["Interview · when direction is unclear"]
    WRITING["Human Writing · when writing"]
    UNSLOP["Unslop · thin writing helper"]
    COUNCIL["Council · review or bounded help"]
    PRIME --> WORK --> LOG
    INTERVIEW -.-> WORK
    WRITING -.-> WORK
    UNSLOP -.-> WORK
    WORK <-.-> COUNCIL
  end
  subgraph HOME["Your Notion AI operating model home"]
    subgraph DEFINITION["Data and Context Definition · route and authority map"]
    KNOWLEDGE["Knowledge<br/>Start from verified direction and goals<br/>Business context and source map<br/>Maintain understanding through work"]
    MEMORY["Memory<br/>May start empty<br/>Keep genuine decisions and corrections"]
    SKILLS["Personal or team Skills<br/>May start empty<br/>Reuse or adapt your own methods<br/>Shared OSM skills stay in the plugin"]
    CONTENT["Content foundation · OSM 0.35.0+<br/>Reuse actual Notion or external owner, defer, or propose one empty store<br/>Personal methods remain optional"]
    CONTROLS["Selected upkeep controls<br/>Write policy and source agreements<br/>Checkpoints when scheduling is selected"]
    end
  end
  DREAM["Dreaming · garden selected context between tasks<br/>Manual or through a chosen existing automation"]
  SETUP --> HOME
  HOME -->|"Relevant context"| PRIME
  SOURCES -->|"Task evidence"| PRIME
  LOG -->|"Verified lasting context"| HOME
  HOME -->|"Definition and current records"| DREAM
  SOURCES -->|"Changed, unfinished or due work"| DREAM
  DREAM -->|"Recover learning, keep explanations and routes useful"| HOME
```
</toggle>

Prime reads what a task needs. Log saves lasting changes at checkpoints. Dreaming gardens selected context between tasks: useful explanations, decisions and routes for research, writing, content, operations and code. Council provides review or bounded help when useful.

The Definition frame is a route and authority map across the foundation. It does not mean the records are stored inside YAML or that the drawing grants access. Original systems keep their own records and actual permissions.

The diagram separates useful starting context from what grows through actual work. Memory may start empty. Knowledge topics and personal methods are selected for the business; they are not a mandatory file set. Seven broad shared OSM skills and the thin Unslop helper stay in the plugin. New-home Setup resolves the Content foundation in OSM 0.35.0 or later; update the plugin before using that behaviour. Its route can stay external or deferred, with no parallel Notion store. The optional Content module reuses that binding.

A mobile overview and the editable HTML and relationship sources are available on this page.

The layers describe responsibilities, not a mandatory sequence. The foundation supplies relevant context for useful AI work. Learning and accepted changes help maintain it. Connected systems retain their originals.

## 🧩 Content · optional methods

The core foundation resolves where Content belongs. The optional Content library helps adapt personal methods to the owner’s existing workflow, using the same registered route. Source, Content and Edition are record roles, not a compulsory sequence; a short original can stand alone. No editorial method or publication is installed automatically.

See the current material-flow diagram, examples and editable sources in <mention url="https://app.notion.com/p/40d6d2e17f5681219a81e13317a19339">Content build your own setup</mention>. Direction, audience and voice remain in Knowledge; actual production and channel editions stay with their selected owner.

## Editable sources

<toggle>
Responsive diagram · editable HTML

<embed source="notion-file-block://4236d2e1-7f56-81bb-a573-efd6610a3fcf/b3cff46f-3df6-429e-a317-d060adfee244?space_id=eee27a39-7e8a-48e6-9bd4-f3bc51a333fe&name=osm-architecture.html" />
</toggle>

Historical Content material-flow bundle; current diagrams and editable sources are maintained in the linked OSM Content guide.

<file source="notion-file-block://d109739d-6ba8-44f8-81b2-b812755c60fe/b610b8b5-77cf-422b-aef0-c22b3e2122cb?space_id=eee27a39-7e8a-48e6-9bd4-f3bc51a333fe&name=content-material-diagrams-20261105.zip" />

The earlier foundation/diagram source packet is retained below for historical reference.

<file source="notion-file-block://45182f44-5e5b-492e-bbc7-8e45307f324b/d88f3e17-5969-4b82-9d2b-675829343422?space_id=eee27a39-7e8a-48e6-9bd4-f3bc51a333fe&name=osm-diagrams-20261104.zip">
Four editable SVG diagrams, the renderer, the observed onlinesourdough palette and SHA-256 manifest.
</file>

Colours were read from the public onlinesourdough website on <date start="2026-11-04" />: warm paper, brown text and the brown brand accent. The diagram layout uses clear layers and nested responsibilities, following the Agentic Systems reference.
