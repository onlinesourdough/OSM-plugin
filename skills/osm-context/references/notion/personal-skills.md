# Personal and team skills in Notion

Manage Skills owns the lifecycle. Resolve the approved operating guide before
authoring. Owner-specific, cross-project methods belong as native Notion skills;
shared OSM methods belong in this plugin, and project-specific methods in the
project. Reuse a sufficient existing method before creating another.

Resolve Personal/Team audience separately from the business Space. Prefer a
single native Skills source with approved Audience views when permissions fit;
reuse separate private/team sources when needed. Record the team method's
accountable owner and change authority. Reading a shared method does not grant
permission to edit, promote, publish or change its automatic-use policy. A
personal preference cannot silently override the approved team procedure;
clarify a material conflict with the responsible owner. Keep retrieval within
the actual connected user's access. Notion permissions enforce access, not labels.
Promoting a personal skill to Team requires explicit scope, review of private
content/references and verified permissions; ordinary onboarding grants no sharing.

Use the native Skill Creator for authoring mechanics and validation. Notion is
the canonical destination for this provider; any local authoring directory is
temporary staging. Preserve the skill's identity, invocation policy, supporting
files and dependencies. Updating one skill does not authorize an inventory-wide
sync or installation of its dependencies.

## Create, import or edit

For creation or promotion to Current, use the approved owner's mapping and the
[schema contract](schema-and-templates.md) for completeness, identity and scope.

1. Inspect the destination and current capability map. Read Notion's current
   Skills documentation and `notion://docs/skills` resource. Use native
   upload/download tools when actually exposed; advertised account access alone
   is not callable capability. Preserve descriptions, owners, scope, source
   versions, child references and files.
   Reuse an existing native Skills home, resolved by identity. For an authorized
   new collection, use the supported native Skills type (`database_type:
   "skills"` where the connection offers it, under the
   [native database contract](schema-and-templates.md#native-databases-and-meetings)),
   preserving its native fields; add only useful owner metadata. A Docs Type tag
   or a database named Skills alone is not this collection.
   On relocation, move the existing pages rather than duplicate their methods.
   Verify property mapping, native status, automatic-use policy, children and
   attachments, then repair guide/view routes before retiring the old view.
2. Prefer complete native package import/export. With page tools only, create a
   page and mark it as a native skill with the supported create/update/convert
   operation. The page body is the current method. Preserve supporting text as
   linked child reference pages and binary resources as attached files. Rewrite
   relative links to their verified new destinations; retain a path map and a
   dated original package for recovery. Preserve UI/policy metadata as a file.
   This is page-based execution, not proof of a byte-identical native export.
3. Fetch the skill and each necessary reference. Check the complete source-file
   inventory against the migration map. If any required file is missing or
   inaccessible, keep the prior working registration active for that skill and
   report the gap; do not silently discard files or substitute a summary.
4. Update the guide's small skill directory with name, trigger and exact URL.
   Search/index lag does not block known-URL retrieval. An exact replay should
   reuse the existing page. Re-read before changing an existing skill; preserve
   concurrent edits and source provenance. Keep previous snapshots recoverable.
5. Test a bounded representative use with the actual available tools. Future
   authorized personal/team-skill creations and edits follow this same destination
   policy. Do not turn ordinary facts into skills or update skills on a timer.

## Discovery and execution

The real sequence is: an existing skill source page → native skill designation
→ visibility in Notion's Library → enabled for the person and the intended
surface → discovered when the connection can call discovery → loaded when
relevant → executed within the user's request and available tools. Skill pages
stay in their source; pages created in a native Skills database are designated
automatically, keeping their descriptions and files. Library is Notion's own
surface over those sources, reached in the current UI from the sidebar's
Library menu → Skills; point people there and build no second activation
interface.

Before claiming native behavior, read the current `notion://docs/skills`
guidance and the tool catalog the connection actually exposes. Report these as
separate states: native skill designation, enablement for the selected user,
automatic-use setting, page access, discovery through the connection, native
invocation, available references and resources, and a local export or
execution copy. One does not prove another, and Notion's own documentation does
not prove what an external connection exposes. The `mcp` and `notion_ai`
surfaces can have different enabled sets, so a count in a Notion AI view does
not show MCP enablement.

Notion permissions decide who can read, edit or share a skill page, including
access inherited from a parent, the workspace or a team; a restrictive-looking
view or a private-sounding label does not remove a broader grant. A connection
acts only within its signed-in identity's access. Enabling a skill grants
neither page access nor any extra authority, and each coworker needs their own
access, sign-in and enablement.

When `notion-get-enabled-skills` is exposed, use it at session start to find
enabled skills. Enablement is per user and separate from designation. Where a
page create or update tool exposes a skill-designation flag, the flag alone
establishes designation; it is not evidence that the current user has the skill
enabled or that an active session loads it. Change enablement only for agreed
skills, within existing scoped authority, through a supported tool or the Notion
UI, then read back the selected account's state. When
`notion-update-enabled-skills` is offered, its documented contract chooses the
enabled surfaces (MCP and Notion AI, both by default). Without it, do not infer
surfaces from a designation flag or a download; a supported UI readback
establishes only the state it actually shows. “Use automatically” lets the provider load a skill when relevant;
it does not run, schedule or install it in another host. Sessions already
running keep the skills they started with; do not force a restart or new chat.

When enabled-skill, enablement, download or search tools are absent, say so,
naming the connection and host; another connection on the same or another host
may expose them, so follow Setup's
[connection check](setup.md#connection-for-native-skills-discovery) before
concluding. Ordinary search or fetching the exact skill page and its required references
from the model's list still works, but it is a page fallback, not native
enabled discovery, and it creates no installed skill in Codex or another host. Never fabricate a call or claim
slash-command discovery for page-only skills. Record which route the owner's
model uses. A small directory is routing metadata, not a copied payload. How an
external agent actually uses a skill is evidenced separately on that host.

A download is a copy, not a synchronized second source. Use a documented
download only when the connection actually exposes it; never fabricate one.
If local script execution requires a package, use a supported download/export,
inspect the exact revision, then stage the minimum files in the task workspace.
Validate file paths before extraction and inspect executable content before use.
Do not execute a download merely because it arrived from Notion. The cache is
disposable; edits must return to the canonical skill through this procedure.
If the required export/tool is unavailable, report the capability gap and keep
the established working route until it is resolved.

Remove only an old registration whose ownership and target are proven, after
its replacement works. Preserve the source in the preview backup; avoid two
active canonical bodies with the same identity. Rename/removal updates the
directory and affected callers, preserving both history and later edits.
