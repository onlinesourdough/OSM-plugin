# Ownership

Revision: 2026-11-09

| Responsibility | Owner and canonical truth |
| --- | --- |
| Product instructions, declarations, and neutral assets | OSM maintainer in this repository |
| Implementation and local verification | Current repository task or deliberately selected worker; the 9 November Home revision has one implementation writer |
| Accepted Home design (#74/#82) | Completed Claude Opus 5.5 design in canonical `design.md` and its Paper; implementation does not redesign it |
| Home native visual and host qualification | Coordinating owner task; local implementation tests do not qualify native clipboard, visibility events, live grants or Paper rendering |
| Human review presentation | Build's [review handoff](../skills/osm-build-work/references/review-handoff.md); Review checks claims and Ship verifies the destination. Domain proof remains with its existing owner |
| Requirement tracking SOP offered to users | `skills/osm/references/lifecycle.md` for all phases of the shipped OSM lifecycle; developing this repository follows the root `AGENTS.md` contract with any harness method |
| Task deliverable, continuation and whole-task handoff | Shared OSM lifecycle; Spec clarifies the contract and `osm` model advice supplies model/reasoning evidence on request |
| Exploratory interview and shared question procedure | Interview owns activation, adaptive questioning, waiting and resumption; Setup and Spec reuse accepted answers |
| Notion home contract and core stores | Data & Context owns the common contract and engineers the home; Setup conducts onboarding and calls it |
| Facts, source routes and durable corrections | Manage Data & Context applies the curation procedure under the owner's recorded write policy |
| Consequential-change assessment | `osm-risky-changes`; conditionally routed by Spec and Review |
| Acceptance and delivery instruction | Reviewer bound to an exact artifact; independent caller acceptance for delegated work |
| Private Git destination and release | Authorized OSM maintainer or Ship worker |
| Owner context, personal facts, and access decisions | Client in the chosen context home and authoritative source systems |
| Notion setup and personal/team-skill routing | Data & Context's setup procedure and Manage Skills; client owns content/permissions, harness owns access |
| Owner continuity | Notion holds the home; Manage Data & Context owns named-source reconciliation. Folder-home Sync is retired and a legacy file home is read-only |
| Customer or externally owned documentation | Its source system; OSM may retain only a scoped pointer and freshness boundary |
| Native installation, connections, and cutover | Authorized client or lead using native controls and readback |
| Public documentation projection (Notion guide) and its publisher | Per artifact: Git-owned released packets, Notion-authored Content templates and guide originals, and CI-owned working rows; see [publication](publication.md). The publisher is source and fixtures only |
| Codex sidebar source and bundled runtime | `apps/sidebar` and reproducible `runtime/sidebar` in this repository; Codex owns launch, account access and UI placement |
| Home reader and OSM's internal Notion connection | The AI Operating Model definition owns source identities; Setup generates the Home projection from one revision and records the selected mode; the sidebar reads; Notion grants define what is readable; the local candidate supports an opt-in dedicated macOS Keychain item (see [Home connection](home-connection.md)); preferred browser OAuth remains dependent on OSM's own registration and confidential auth service; native grant and revocation proof stays with approved native holders |
| Projects and optional specialists | Their own working files, deliverables, dependencies, proof and recovery; Git and native project controls are selected when useful, without mandatory OSM registration |
| Software engineering foundation (setup, checks, CI/delivery, engineering documents) | A separately selected method such as [Agentic Foundation](https://github.com/arcitai/agentic-systems/tree/main/foundation/agentic-foundation); the project owns the resulting files. OSM neither ships, installs nor depends on it |
| Writing and code methods | Built-in skills; project files remain owned by the project. Human Writing and Write Code retain prose and implementation responsibilities. Content and Diffusion Studio are outside the package (non-shipped drafts) |
| Selected upstream System installation/code updates | The `osm` update reference's [System maintenance](../skills/osm/references/systems.md) routes authorized work; each System owns compatibility and recovery |
| Complex explanations | Included `clarify`; native visualization tools own their presentation contracts |
| Historical Global Skills and Skills Atlas | Their public archived repositories; only Clarify is adopted in this package |
| Optional autonomous-use guardrails | Native harness controls and reviewed maintained implementations selected for an explicit request; the former Global implementation remains archived |

The product repository is not an owner-data home. Repository specialist methods stay local; generic
development methods come from each contributor's own harness, not from a copy of
the shipped skills. Delegated workers return proposed shared
learning to their caller instead of writing client memory.
