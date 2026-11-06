# A useful context home

This contract describes responsibilities, not a mandatory schema. Use it for
setup, moves and structural audits. Ordinary tasks read only relevant routes.
For a Notion root, the [Context Architecture](architecture.md) is the binding
contract; "guide" below means the root entry and its one definition.

| Responsibility | Record in the owner's guide |
| --- | --- |
| Identity and access | Exact Notion account/workspace and root; verified connection and boundaries |
| Knowledge and work | Where maintained facts, original references and deliverables belong; which system owns each |
| Spaces | Business, brand, sub-brand or continuing-area scopes, shared context and useful parent/child relationships |
| Memory | Durable decisions/corrections with reasons, provenance, actual source dates and uncertainty |
| Personal methods | Where to discover the owner's reusable skills and their supporting resources |
| Maintenance and recovery | The owner's recorded write policy, identity/deduplication rule, readback, correction handling and recoverable prior route; see the architecture's [home write policy](architecture.md#home-write-policy) |

One context home can cover multiple Spaces. Projects keep their native workspaces;
they need not become new owner homes. Express Spaces with Notion's useful
properties, relations or routes. Reuse existing concepts. Add a separate
registry only when maintaining the hierarchy needs it. Scope labels are not
access control. Load shared and parent context only when relevant.

Generate or adapt a short owner guide and useful entry templates from verified
sources and accepted choices. Do not manufacture company facts, empty departments
or a parallel truth store. Notion properties and templates belong in
the Notion references; actual values and IDs belong in the customer's workspace.
Use [the thin host pointer](../assets/bridge.md) through the selected native
[adapter](../../osm-setup/references/adapters.md).

People should be able to find and edit their work normally. The agent should
select metadata or an index first, then read only the relevant bodies. The
context home can route to several source systems without centralizing all data.
Links and copied summaries are not live synchronization.

## Maintenance and evidence

For business setup or a foundation audit, use the [business coverage check](../../osm-setup/references/business-context.md).
Map Offers, Demand and Operations to useful sources or explicit gaps. This does
not require a document for each topic, a personal skill or prefilled Memory.

At meaningful decisions, corrections and task checkpoints, use Manage Data & Context
under the recorded write policy or the current task's authority. Reconcile
identity and meaning before creating; keep one current record per topic and
scope, with dated history, and preserve reasons and exclusions. No new durable
knowledge means no write and no date. Missing access leaves an explicit unsaved
change. Facts maintenance changes shared/personal skills only through the skill
lifecycle, and changes approved policy only on accepted owner input. See the
architecture's [record lifecycle](architecture.md#record-lifecycle).

For setup or a material change, verify the selected scope:

- Actual source identity, usable destinations and intelligible Space navigation.
- Preserved existing content and working native templates where supported.
- Exact source references and complete personal-method resources.
- A fresh session retrieves the relevant current fact and selected method.
- An authorized correction is visible on another retrieval; unchanged replay
  produces no duplicate or routine record.
- A missing guide/source is reported without silently changing homes.
- An independent repository task does not preload personal/business context.
- Recovery preserves subsequent edits and the original source responsibilities.

A read-only audit reports PASS, FAIL or NOT VERIFIED for applicable claims; it
does not instantiate templates or repair data. Real setup tests require their
existing task authority. Source checks, synthetic fixtures and live provider
tests remain distinct. A schedule is optional and needs an explicit request;
neither this contract nor a skill guarantees freshness between tasks.
