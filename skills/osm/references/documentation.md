# Read OSM documentation when needed

For an explanation, select the relevant topic below and read only the needed
document or section. Resolve relative links from this file's physical directory.
These files belong to the installed package; they are
available locally without loading the full library into each conversation.
Reading a method to explain it does not start that workflow or load owner data.

| Question | Local source |
| --- | --- |
| What OSM is, its concepts and boundaries | [OSM overview](../../../docs/osm.md) |
| Which OSM version is installed | [Package identity](../../../.codex-plugin/plugin.json); the overview states the same version |
| How work is selected and carried through | [Routing](routing.md) and the relevant part of [the lifecycle](lifecycle.md) |
| How shared methods and owner context connect | The overview's [shared method and owner context](../../../docs/osm.md#shared-method-owner-context), then the selected skill |
| How installation, updates or removal work in a selected app | [Native adapters](../../osm-setup/references/adapters.md) |
| How to set up or check a Notion context home | [Setup](../../osm-setup/SKILL.md), [Data & Context](../../osm-data-context/index.md) and [check](check.md) |
| How Notion context and personal skills work | [Notion operating route](../../osm-manage-data-context/references/operating.md) |
| How owner context and external sources are maintained | [Context curation](../../osm-manage-data-context/references/curation.md) |
| How to update OSM or move off a legacy file home | [Update](update.md) |
| Where the public guide is | The packaged `README.md` links the Notion-authored method guide: the readable explanation, definition template, setup cases and architecture. Git versions the installable skills; use the instructions supplied with the installed edition |

Use already available skill descriptions to select a particular method; open its
instructions only when the question needs them. For a current release, changed
external fact or a gap in the local documentation, use [canonical sources](canonical-sources.md).
Keep the installed version distinct from upstream `main` and newer releases.
The overview and methods travel together in the local package. Native package
updates are separate from owner context; there is no Resources-hosted copy
to fetch. Already-read instructions are not replaced by a later package update.
