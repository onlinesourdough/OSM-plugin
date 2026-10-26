# Changelog

## Unreleased

- Home in the Codex sidebar: a read-only Context/Skills view of the owner's
  mapped Notion records and personal skills, ported from the approved design
  (#74). Titles open an article in place; Back returns to the list. Shared OSM
  methods are listed, collapsed, from the installed package. Reading a skill
  doesn't run it.
- Home reads only through OSM's own internal Notion connection (#82), never
  through the official plugin. The connection is a read-only REST adapter
  pinned to Notion API `2026-03-11`, with bounded lists and bodies and explicit
  inaccessible, unsupported, revoked and rate-limited states. No host provides a
  supported secret store for it yet, so Home reports itself unavailable and
  saved links work as before. See `docs/home-connection.md`.
- Home's sources come from the AI Operating Model definition. Setup generates a
  projection of one definition revision (`osm-home-projection/1`) and saves it
  as its own per-context file through `osm_save_home_projection`; it changes
  only with a new revision. It records the owner's connection mode. An
  `official_notion_user` projection shows saved links with a note that Home
  can't read through that connection yet; the mode is never switched. Support
  material such as core rules and recovery snapshots is never shown as context.
  Existing saved links load unchanged and are labelled a partial view.
- Context 2.1.0 adds the Home projection procedure. Setup 2.1.0 explains the
  internal connection option.

## 0.30.0 — 2026-10-23

- Rename AIOS to The Onlinesourdough Method (OSM). The plugin identity is now
  `osm` (`osm@online-sourdough`); the marketplace stays `online-sourdough`. The
  20 method skills move from `aios`, `aios-*`, `clarify`, `human-writing` and
  `write-code` to `osm` and `osm-*`, each with a major version bump that keeps
  its history (for example Update 2.0.3 → 3.0.0). Content and Diffusion Studio
  keep their names and get patch bumps (1.0.2) for their own titles. Update any
  explicit callers, such as `/osm:osm-setup` or `$osm-context`.
- The `osm` entry shows as `OSM:context-and-methods` and stays optional: it
  brings in owner context and methods only when a task needs them.
- The Codex sidebar MCP server, its tools (`osm_*`), UI resource and titles use
  OSM. The overview is now `docs/osm.md`.
- Upgrade: install `osm@online-sourdough` and read back its version, disable
  `aios@online-sourdough` through the app's supported control before
  fresh-session acceptance, then retire `aios` once nothing depends on it. If
  acceptance fails, disable `osm` and re-enable `aios`. Updating `aios`
  never installs `osm`. Owner data needs no migration: `AIOS.md`,
  `AIOS_FORMAT`, `~/.AIOS`, the `<!-- AIOS:BEGIN -->` block and saved Codex
  panel links keep their names and stay readable.
- OSM 0.30.0 is not the retired OSM 0.1.x package, although three skill names
  match. Identity migration now classifies packages by source and version.

## 0.29.0 — 2026-10-13

- Remove the Design, Review Design and OpenPencil Workbench skills
  (`design`, `review-design`, `openpencil-workbench`) and their helper tests.
  AIOS now ships 22 skills. Update any explicit callers of the old names.
- Migration: existing projects' `DESIGN.md` and `design/` files are untouched.
  If you want a design method, install a separate design plugin (for example
  OpenPaperDesign); AIOS does not install or depend on it. Without one, AIOS
  does the visual work directly or reports the missing method.
- The before/after rule remains: for a visible UI change, Build's review
  handoff compares a real baseline and candidate capture of the same state,
  viewport and data. Content and Diffusion Studio are unchanged.
- Routing becomes host-neutral for visual work: AIOS 2.7.0, Create Project
  4.1.0 and Spec 1.3.0 route to an installed design method if the host provides
  one. Build 1.1.4, Check 2.2.1, Manage Skills 1.3.1, Setup 1.8.1 and Update
  2.0.3 drop links to and claims about the removed skills; the legacy
  design-system route is marked retired. The sidebar is unchanged apart from
  its version.

## 0.28.1 — 2026-10-10

- Correct Design's forced OpenPencil companion wording: select a sufficient
  available route for the task, including project-local HTML/source. Keep
  working optional workbench routes and report missing capabilities explicitly.
  Semantic direction stays in `DESIGN.md`; existing tokens/components/code own
  implementation truth. Editable delivery needs observed edit preservation,
  save/reopen and export proof, plus implementation mapping when requested.
- Clarify the existing reference-led polish pass and its review: preserve
  identity/behavior, borrow selected composition traits, retain necessary text
  and inspect the full rendered page and relevant states. Design and Review
  Design advance to 1.2.1; no new skill, editor dependency or runtime behavior.
- Retain a bounded synthetic service-page rehearsal and dense counterexample
  in the [design evidence](docs/evidence/design-polish/README.md). These do not
  establish customer improvement, model activation or editor compatibility.

## 0.28.0 — 2026-10-10

- Retire the Project Foundation skill (`aios-project-foundation`). To prepare a
  new or existing software project for reliable engineering, use the separately
  usable [Factory Foundation](https://github.com/arcitai/factory/tree/main/foundation/factory-foundation)
  skill directly in Codex or Claude; T3 Code is not required. AIOS does not
  install it, depend on it or copy its content. Update any explicit callers of
  the old name. AIOS now ships 25 skills.
- Keep Create Project for content, research, business and software workspaces,
  with Git optional, and keep small coding work direct with Write Code. When a
  substantial engineering foundation is needed and no such method is selected,
  AIOS reports the gap. Create Project 4.0.0 no longer applies a bundled
  engineering contract to software seeds; AIOS 2.6.2 and Write Code 1.1.1
  update their routes.
- Refer to [Factory](https://github.com/arcitai/factory) by its current name
  and explain its relationship to AIOS: Factory provides Foundation, AgentOps
  and ADLC methods for T3 Code and native coding agents, and neither package
  depends on or installs the other. The sidebar is unchanged apart from its
  version.

## 0.27.0 — 2026-10-10

- Add a chat-bubble button beside Settings, in setup and on the dashboard, that
  opens the AIOS GitHub repository. A failed open shows a retryable message.
- Group Docs under a Context heading in Settings and note that a context switch
  applies immediately while Docs, Skills and Memory changes apply with Save.
  Settings no longer repeats visible Optional labels; None still clears a slot.
- Show the dashboard Context as a section like Skills and Memory, with Primary
  and Docs rows that display each destination's own icon and title.
- Give the dashboard and Settings slightly more room and separate the Settings
  header and actions with spacing instead of divider lines.

## 0.26.2 — 2026-10-09

- Keep Notion connection, page and icon reads working after Codex refreshes an
  installed plugin. CLI helpers use a stable temporary directory instead of
  inheriting the replaceable plugin cache as their working directory.

## 0.26.1 — 2026-10-09

- Display Notion emoji and built-in page/database icons consistently in setup,
  Settings and the dashboard, including existing saved destinations. Avoid
  duplicate emoji in older labels and keep navigation usable if icons fail.
- Read missing icons only for selected pages through the existing Notion
  connector. Return only identity/icon metadata and keep source maps unchanged.
  Custom/uploaded icons retain their label; external tracking hosts are excluded.
- Show the Docs name once when it matches its Notion source; keep destination
  hints for manual links.
- Use the same bundled Geist Pixel Square font as onlinesourdough for a simple
  onlinesourdough wordmark at the lower left, with the font license included. Keep native typography for controls.

## 0.26.0 — 2026-10-09

- Choose Context, Docs, Skills and Memory from searchable Notion page dropdowns
  using the already-connected official Notion plugin. No second login or model turn.
- Keep discovered page names and links as UI metadata only; preserve manual
  provider entry, source isolation and explicit context-switch confirmation.
- Bound page requests, discard stale searches, reject automatic approvals and
  close idle transports. Require Codex CLI 0.161.0+ for direct connector calls.
- Update shared Setup 1.8.0 and Context 1.6.0 guidance with the real page-picker flow.

## 0.25.0 — 2026-10-09

- Refine the sidebar around Meetings: a quiet dashboard, named source selectors
  and a separate Settings drawer. Use consistent controls, spacing and hover.
- Keep all numbered setup sections visible and revisitable; preserve drafts
  while navigating, with explicit save and discard behavior.
- Show optional Personal and Team slots for Skills and Memory. Preserve the
  existing Memory destination; add `teamMemory` only when selected.
- Expose a native settings entrypoint using the same configuration interface.
  Source selectors use saved destinations, without cross-plugin page discovery.
- Older releases reject the optional `teamMemory` field. Clear that navigation
  slot with 0.25 before downgrading, or restore a reviewed earlier map backup.

## 0.24.0 — 2026-10-08

- Include the reviewed Build/Review/Ship handoff guidance from main (#42).

- Restore complete numbered source setup with section dividers, Continue, Back
  and a final dashboard. Remove the provider dropdown; alternatives stay available.
- Open saved Context, Docs, Personal/Team Skills and Memory destinations from
  three simple dashboard sections. Hide unused Team skills for solo setups.
- Save only navigation names and links locally, scoped to context identity.
  Preserve revisions and backups; never inherit another context's destinations.
- Let explicit Setup register verified destinations through AIOS MCP, reusing the
  separate official Notion connector. No panel-triggered chat or content mirror.
- Cover source isolation, stale drafts, failed saves, optional sources, reopened
  dashboards, direct links and the complete no-chat onboarding flow.

## 0.23.0 — 2026-10-08

- Restore the 0.21.0 visual layout and SDK controls.
- Replace the conversation-driven wizard with Notion status and one context link.
  Existing context opens directly; Continue saves a new personal default without
  sending a message. Remove source pickers, polling, Setup guide and Edit setup.
- Keep official Notion separate. Docs, Personal/Team Skills, Memory and Spaces
  remain in the customer's home. Explicit Setup still handles business onboarding.
- Preserve instructions with bounded reads, stale-write checks, private backups
  and atomic saves. A saved link does not imply source access or setup readiness.
- Replace mailbox tests with direct persistence, no-chat interaction, failure,
  concurrency and recovery checks; retain independent connection-state coverage.

## 0.22.0 — 2026-10-08

- Keep AIOS and the official Notion plugin separate; remove the embedded app
  binding. Distinguish missing plugin, disabled plugin, disconnected account
  and callable connection without resetting any account.
- Follow the Codex host theme and Meetings control style: Notion, Context/Docs,
  Skills and Memory steps, then a source-link overview. Keep secondary choices
  under More options.
- Support Personal and Team skills through Setup, Context, Manage Skills and
  Notion templates. Reuse suitable sources, preserve real access boundaries
  and avoid an empty team database for solo owners.
- Add agent-assisted Notion page choices and source-map readback through the
  visible conversation, with bounded temporary results and no second auth.
- Route selected inputs to the same Setup skill; no new business-data store,
  background sync, hidden chat or automatic context migration.

## 0.21.0 — 2026-10-07

- Add a small host-themed Codex sidebar app with Notion connection status, the
  saved context link and Start setup / Continue setup using the existing skill.
- Keep connection checks read-only through Codex app-server; connect through the
  official account page. No auth store, business-data mirror or setup-state database.
- Bundle the MCP App and local server; Node.js 22+ is required, with no consumer
  dependency installation. Other clients continue to use the same skills.
- Use onlinesourdough consistently in publisher labels. Preserve marketplace identity.
- Verify protocol discovery, isolated first run, failure states, synthetic UI
  interactions and the existing packaging checks. See the sidebar evidence limits.

## 0.20.0 — 2026-10-07

- Connect the native Codex Set up action to AIOS Setup and declare Notion as an
  optional official app connection. Codex owns sign-in and connection state.
- Check selected-page access separately; resume disconnected, read-only and
  existing setups without duplicate homes or forced reconnects.
- Name the shared Notion entry AIOS, with one customer-owned Docs/Skills/Memory
  map, Spaces and selective retrieval. Rename its template to notion-aios.md.
- Use the supported Codex manifest without a shadowing portable root: Codex
  0.160.1 ignores app bindings under that root. Other native formats and the
  shared 26 skills remain; no UI runtime, custom MCP or background job is added.
- Setup is 1.4.0; Context is 1.3.0; the AIOS documentation route is 2.6.1. Existing context homes and host pointers
  remain unchanged by package updates.

## 0.19.0 — 2026-10-05

- Add provider-neutral Context 1.2.0 and make Setup 1.3.0 the single onboarding
  entry from installation and connection to the first useful task. Notion is
  the recommended starting point for solo founders, leaders and small teams;
  existing context homes remain supported and are never migrated by an update.
- Ship one adaptable Operating Model template with full-page Docs, native
  personal Skills, Memory and Spaces. Reuse real knowledge for Offers, Demand
  and Operations; Memory can start empty. Shared methods stay in the plugin.
- Keep the app instruction short and read relevant context on demand. Client
  setup preserves the consultant's personal default. Durable maintenance happens
  during work without a local mirror, custom server or mandatory schedule.
- Publish bounded Notion and native Codex evidence with explicit limits.
  Preserve recovery through immutable releases and customer-owned records.

## 0.18.0 — 2026-10-02

- Strengthen Write Code 1.1.0 with cohesive responsibilities, explicit
  dependencies, domain and I/O boundaries, invariants, concurrency, partial
  failure and resource ownership. Preserve proportionate scripts and tests;
  route project/security foundations to their existing canonical owners.
- Retain matched baseline/candidate native trials and independent behavioral
  readback. Package release and installed adoption are verified separately.
- Preserve the 25-skill inventory and supported owner formats from 0.17.0.

## 0.17.0 — 2026-10-02

- Retire Create System. Reusable methods use Manage Skills; independently
  maintained solutions keep their ordinary project lifecycle and ownership.
  AIOS now exposes 25 skills from the same native source.
- Broaden Create Project to 3.0.0: establish a useful workspace, context and
  simple structure for software, content, learning or business work. Git,
  GitHub and repository templates are optional; sidebar controls are not required.
- Keep verified APT acquisition, transfer/recovery and software document
  criteria in the conditional repository-seed reference. Existing work is
  maintained in place. Project Foundation 1.1.1 addresses engineering readiness,
  separate from workspace creation and an independently selected execution host.
- Preserve Software & Defence Factory as a separate method and work environment.
  AIOS can support software work directly; choosing Factory grants no shared
  credentials or automatic execution authority. No hooks are installed or enabled.
- Advance AIOS routing to 2.4.1 and Setup's retired-method map to 1.0.2.

## 0.16.0 — 2026-10-01

- Add Clarify 1.0.0 as an independently selectable explanation method in AIOS.
  Use concrete examples and visuals when they improve understanding; ordinary
  explanations stay in the conversation and HTML is no longer compulsory.
- Keep visualization rendering with the available native tools and keep
  Clarify separate from Design. AIOS routing advances to 2.4.0 and exposes
  26 skills from the same source in every native package.
- Retire the active Global Skills acquisition route. Shape Offer and the
  former guardrail implementation remain in the public Global Skills archive;
  neither is included in AIOS. Skills Atlas is also retained as a public archive.

## 0.15.1 — 2026-10-01

- Replace the plugin icon and README banner with the pixel logo, cream
  background and brown ink from onlinesourdough.com.
- Keep the existing skills and installation paths unchanged.

## 0.15.0 — 2026-10-01

- Make Interview 1.1.0 explicitly restate goals and the underlying problem for
  thinking aloud or requested understanding; reuse corrections and ask only
  what changes the next action. Clear work retains its direct path.
- Let Spec 1.2.0 select a small local trial for a material unresolved choice or
  requested alternatives. Design retains visual exploration; UI interaction
  and other workflows need relevant observations. No compulsory prototype,
  editor, schema or parallel agents.
- Update AIOS routing to 2.3.2 and retain bounded positive/negative decision
  probes plus native observations. Package adoption and release remain separate.

## 0.14.1 — 2026-09-26

- Keep Project Foundation independent: remove the external runtime setup route
  and retain application infrastructure, security and delivery responsibilities.
- Share maintained project code standards and design-system ownership with
  Create Project; preserve existing canonical documents and tool-enforced rules.

## 0.14.0 — 2026-09-24

- Add Project Foundation 1.0.0 for repairing MVP/legacy engineering foundations
  and a requested transition to an independent Software and Defence Factory.
  Working setup, meaningful checks, remote compute and non-production delivery
  need real evidence; documents and initialization alone do not prove readiness.
- Share the project/document content contract with Create Project 2.1.0. Preserve
  canonical legacy sources, concise AGENTS guidance, template attribution and
  the distinction between a new seed and a qualified application. Keep documents
  current with the changes they describe.
- Define the application CI profile: required relevant PR checks before merge,
  complete batches every three hours, exact-revision skip evidence, one small
  idle control job and manual full runs. Keep branch, environment and actual
  factory patch/PR handoff responsibilities explicit without adding a controller.
- Advance AIOS routing to 2.3.0 and native package metadata to 25 skills. Owner
  format and existing installations remain independent of project preparation.

## 0.13.0 — 2026-09-22

- Keep AIOS focused on business productivity. Software & Defense Factory remains
  an independent product with its own skills and runtime; no factory dependency,
  additional skill or rename is introduced.
- Clarify shared behavior and bounded refactoring in Write Code 1.0.2, preserving
  repository architecture, caller policies and small-script simplicity.
- Add an optional before/after method owned by Design, with genuine baselines,
  comparable views, selected captures and honest limits. Design and Review
  Design advance to 1.2.0; automation and PR publication stay project-owned.
- Add concrete editing examples to Human Writing 1.1.0 for filler, inflated
  claims, forced contrasts, repetition and hedging, without mechanical bans or
  invented voice. Keep all 24 canonical skill identities and owner formats.
- Require fresh status and rendered-canvas checks in OpenPencil Workbench 1.0.2
  at startup, resume and live handback. Use one Codex built-in browser tab by
  default, preserve recoverable work during diagnosis and avoid a second browser.

## 0.12.0 — 2026-09-21

- Rename `aios-onboard` to `aios-setup` (`AIOS:setup`), preserving home,
  migration, native installation and continuity responsibilities. Update
  explicit callers on adoption; no duplicate alias or owner-format change.
  The new canonical skill identity starts at 1.0.0.
- Add `aios-interview` 1.0.0 for requested exploration and material uncertainty
  at the start of work. Keep clear tasks moving, use one blocking question
  during execution and reuse accepted answers in Setup and Spec. Extract the
  shared question/wait/resume procedure from setup into Interview.
- Organize README around the Agentic Content and Design Systems: context,
  skill chains, project artifacts and optional external workbenches. Cover all
  24 public skills and explain working through Codex's browser, including the
  distinct OpenPencil canvas and limited Diffusion Studio companion.
- Advance AIOS to 2.2.0 and Spec to 1.1.0 for conditional Interview routing;
  patch Check, Maintain Context, Manage Skills and Update for the renamed
  setup references. Update native metadata, package checks and the selected-read
  benchmark without changing its ceilings or historical baseline.

## 0.11.0 — 2026-09-18

- Add a conditional upstream guide for Taste design/style/image skills and Taste
  Code composition references. Keep examples and catalogs with their publishers;
  record selected revisions and continue with native AIOS methods when optional
  sources are unavailable. No new dependencies, installer or automatic updater.
- Connect inspected reference traits to accepted design choices and rendered
  review; make redesign preservation explicit and retain OpenPencil as the
  optional editable companion. Advance design and review-design to 1.1.0.
- Clarify native plugin namespaces and the separate identity of personal skills,
  including caller/registration reconciliation. Advance Manage Skills to 1.0.2.
  Personal skill cleanup is a separate owner-authorized action, never an install
  side effect. Keep the same 23 public skills and owner formats 1 and 2.
- Standardize all 23 skill titles and Codex display names as `AIOS:skill-name`,
  with lowercase hyphenated suffixes and compatible canonical invocation names.
  Apply patch version bumps to the remaining skills for their display changes.

## 0.10.3 — 2026-09-14

- Keep onboarding turns active while an asynchronous question awaits an answer,
  including after independent work finishes. Use permitted interruptible waits;
  a timeout never substitutes for a reply or an explicit skip, pause or cancel.
- Accept answers sent as ordinary messages and preserve context on interruption.
  Do not claim a question form survives turn completion. Advance Onboard and
  Check to 2.0.2 with a pending-answer acceptance scenario; no format change.

## 0.10.2 — 2026-09-14

- Require an available, permitted native question tool during onboarding.
  Respect runtime and mode restrictions, preserve open replies, and keep
  asynchronous questions pending until answered. Explain conversational
  fallback when no tool is usable or its call fails.
- Advance Onboard and Check to 2.0.1 with a matching acceptance scenario.
  The other 21 skills and owner formats are unchanged.

## 0.10.1 — 2026-09-13

- Keep the versioned overview at `docs/aios.md` with the installed plugin.
  Remove the public export scripts, artifact workflow and Resources dependency.
  Advance only the AIOS routing skill to 2.1.1 for the corrected documentation
  route; the other 22 skills retain their versions. No owner-format change.
- Add a tag-triggered GitHub Release workflow. Validate the package, local
  overview, changelog entry and tag version before publishing a prerelease.
- Explain native plugin updates, explicit private owner Sync and independent
  project/System repositories in the README diagram and ownership table.
  Preserve the `aios` installation identity and clarify active-session limits.

## 0.10.0 — source candidate

- Add `write-code` 1.0.0 for code of any size, including scripts, shell snippets,
  SQL, tests and automation. Keep code-quality criteria and proportionate
  verification in one compact method with automatic selection enabled.
- Route AIOS and Build code work through that method; Review applies the same
  criteria read-only. Advance AIOS to 2.1.0, Build to 1.1.0 and Review to 1.2.0;
  unchanged skills retain their versions. No owner-format change.
- Require useful behavioral proof: real-interface checks for UI/UX, meaningful
  regression tests for logic, contract checks for APIs and actual safe invocation
  for scripts. Avoid irrelevant unit tests and unnecessary generated scaffolding.
- Keep one 23-skill native package and update its local, versioned overview.
  Public-site adoption remains separate from source/package delivery.

## 0.9.0 — 2026-09-13

- Bundle a version-labelled overview and a short local documentation route;
  references load only for the selected question.
- Check documentation against the package version and prepare public exports
  with immutable source, version and checksum metadata during CI/release.

- Include design and content as five focused skills with portable helpers,
  preserving source judgment, review, provenance and optional editor routes.
- Use the native app's project and workspace. Remove mandatory AIOS project
  registration; keep Spaces as context and Systems as optional specialists.
- Default working material to project-local design/ and content/ when needed.
  Align the project and system template routes with this model.
- Create neutral owner format 2 without repository registries and retain
  format-1 compatibility. Installation does not migrate owner data.
- Keep one 22-skill source across native packages. Update documentation,
  migration boundaries, version checks and installation rehearsals.


## 0.8.0 — source candidate

- Add the portable Agent Plugins manifest and native Claude Code/Copilot,
  Cursor and Gemini metadata alongside Codex and Pi. All use the same 17 skills.
- Make native installation independent of an owner home or global bridge.
  Owner work reuses its established home or checks the default when none is known.
- Keep installation scoped to the selected app. Remove Pi's ambient-skill
  exclusion from setup defaults; preserve existing explicit configuration.
- Rewrite getting started around native installation, update and removal.
  Distinguish verified CLI behavior from documented and untested routes.
- Advance `aios`, `aios-onboard` and `aios-check` to 1.1.0. Human writing remains
  1.0.1 and applies across prose formats. No owner-data format change.
- Correct Manage Skills' Pi owner-registration reference to preserve ambient
  discovery and existing routes; advance that skill to 1.0.1.

## 0.7.1 — source candidate

- Clarify human-writing's general priority: familiar words, direct sentences
  and easy understanding across prose formats and genres.
- Keep text as short as understanding allows while preserving requested depth,
  necessary explanations, consistent terminology, precision and qualifications.
- Bump only human-writing to `metadata.version: "1.0.1"`; the other 16 skills
  retain their independent versions. No format-specific focus or new workflow.

## 0.7.0 — source candidate

- Simplify shared tracking and Spec bookkeeping while preserving native goal
  rules, acceptance, carried authorization and completion of authorized work.
- Make verification and skill management proportional to the changed boundary;
  preserve format, backup, source identity, recovery and delivery protections.
- Start independent `metadata.version: "1.0.0"` histories for all 17 skills,
  with schema and Git-baseline maintenance checks.
- Bundle `human-writing` as the default for substantive prose, with narrow
  discovery, evidence-preserving edits and no additional approval gate.

This source version is not evidence of release, installation or adoption.
Earlier release history remains in GitHub Releases and Git history.
