# Codex setup and dashboard

The panel opens a saved context on the dashboard. New setups use four visible,
revisitable sections: Notion, Context (entry and optional Docs), Skills and
Memory. Skills and Memory each show optional Personal and Team destinations.
The first context save enables Docs; Continue saves progress and Finish opens
the dashboard. Apply accepts an edited link into the draft. Section navigation keeps
unsaved drafts. Settings opens a separate drawer, also available through the
native settings entrypoint. Save commits edits; closing a changed drawer offers
a discard choice. Switching context loads that context's own sources.

OSM and the official Notion plugin remain separate. Native status checks
installation, enablement and connection; Connected does not prove page access
or a complete business setup. Once connected, choose the Context page from the
searchable dropdown. Docs, Skills and Memory use the same page selector. Initial
suggestions include favorites and top-level pages; search finds other accessible
destinations. Only names and navigation metadata are fetched. Existing saved
sources and manual links remain available when useful.
Panel buttons never start a chat or agent.

For requested business onboarding, this skill verifies the home, reuses Docs,
Skills and Memory, preserves Spaces and access, and proves a useful task. Register
verified personal destinations through Context's
[dashboard-link procedure](../../osm-context/references/panel-links.md).
A consultant's client task never changes their personal default or its links.
Personal/Team source labels grant no access. Keep one suitable Memory source;
add a separate team destination only when the actual setup needs it.

Home's reader uses OSM's own internal Notion connection: a bot limited by Notion
to the pages and databases explicitly shared with it, and their children. Offer
it as the selected-pages option, separate from the official plugin's full-user
access. Its token comes only from a supported host secret store, never chat or
the panel. Hosts without one report Home as unavailable; continue with saved
links. A scoped connection does not limit any other Notion route the agent can
use. Save Home's view mapping with Context's
[dashboard-link procedure](../../osm-context/references/panel-links.md#home-view-mapping).

The panel stores navigation names and links, and the Home mapping's identities and labels. Company information remains
in its source; shared methods remain in the plugin. Its saved link is not an
approval of retrieved instructions. Context reads the actual entry before use.
Earlier saves remain after a later failure. Stale edits keep their draft and
require reconciliation; they must never silently adopt a new revision.
