# Ownership

Revision: 2026-10-26

| Responsibility | Owner and canonical truth |
| --- | --- |
| Product instructions, declarations, and neutral assets | OSM maintainer in this repository |
| Implementation and local verification | Current repository task or deliberately selected worker |
| Human review presentation | Build's [review handoff](../skills/osm-build-work/references/review-handoff.md); Review checks claims and Ship verifies the destination. Domain proof remains with its existing owner |
| Requirement tracking SOP offered to users | `skills/osm/references/lifecycle.md` for all phases of the shipped OSM lifecycle; developing this repository follows the root `AGENTS.md` contract with any harness method |
| Task deliverable, continuation and whole-task handoff | Shared OSM lifecycle; Spec clarifies the contract and Select Model supplies model/reasoning evidence |
| Exploratory interview and shared question procedure | Interview owns activation, adaptive questioning, waiting and resumption; Setup and Spec reuse accepted answers |
| Context home contract and provider selection | Context owns the common contract; concrete provider procedures adapt it to the selected home |
| Facts, source routes and durable corrections | Maintain Context applies the chosen provider's curation procedure |
| Consequential-change assessment | `osm-risky-changes`; conditionally routed by Spec and Review |
| Acceptance and delivery instruction | Reviewer bound to an exact artifact; independent caller acceptance for delegated work |
| Private Git destination and release | Authorized OSM maintainer or Ship worker |
| Owner context, personal facts, and access decisions | Client in the chosen context home and authoritative source systems |
| Provider setup and personal/team-skill routing | Context's selected setup procedure and Manage Skills; client owns content/permissions, harness owns access |
| Owner continuity scope | Client under explicit consent; Maintain Context owns named-source reconciliation, with Git Sync only for managed AIOS file homes |
| Customer or externally owned documentation | Its source system; OSM may retain only a scoped pointer and freshness boundary |
| Native installation, connections, and cutover | Authorized client or lead using native controls and readback |
| Codex sidebar source and bundled runtime | `apps/sidebar` and reproducible `runtime/sidebar` in this repository; Codex owns launch, account access and UI placement |
| Home reader and OSM's internal Notion connection | The AI Operating Model definition owns source identities; Setup generates the Home projection from one revision and records the selected mode; the sidebar reads; Notion grants define what is readable; the host's documented secret store owns the token (none supported yet, see [Home connection](home-connection.md)); native grant and revocation proof stays with approved native holders |
| Projects and optional specialists | Their own working files, deliverables, dependencies, proof and recovery; Git and native project controls are selected when useful, without mandatory OSM registration |
| Software engineering foundation (setup, checks, CI/delivery, engineering documents) | A separately selected method such as [Factory Foundation](https://github.com/arcitai/factory/tree/main/foundation/factory-foundation); the project owns the resulting files. OSM neither ships, installs nor depends on it |
| Design and content methods and helpers | Built-in domain skills; project files remain owned by the project. Design owns semantic direction and the selected companion; existing tokens/components/code own implementation truth. Review Design checks actual selected proof; Human Writing and Write Code retain prose and implementation responsibilities |
| Selected upstream System installation/code updates | OSM Update [System maintenance](../skills/osm-update/references/systems.md) routes authorized work; each System owns compatibility and recovery |
| Complex explanations | Included `clarify`; native visualization tools own their presentation contracts |
| Historical Global Skills and Skills Atlas | Their public archived repositories; only Clarify is adopted in this package |
| Optional autonomous-use guardrails | Native harness controls and reviewed maintained implementations selected for an explicit request; the former Global implementation remains archived |

The product repository is not an owner-data home. Repository specialist methods stay local; generic
development methods come from each contributor's own harness, not from a copy of
the shipped skills. Delegated workers return proposed shared
learning to their caller instead of writing client memory.
