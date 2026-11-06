---
name: osm-setup
description: Set up or resume OSM's Notion Data & Context foundation, from installation and access to a useful first task.
metadata:
  version: "3.0.1"
---

# OSM:setup

Conduct onboarding from a connected Notion workspace to a verified home and a
useful first task. Reuse answers; resume at the next gap.

Codex **Set up** or an explicit request starts this skill. Resume accepted setup
and connections. Verify access; a badge or saved link is not readiness. For
package installation or a requested bridge-only change, use the
[adapter route](references/adapters.md). Installation alone creates no home and
needs no global instruction edit. Register verified personal sources with the
[panel](references/panel.md) procedure.

## One path

Setup is the single conductor. Each step has one owner. In the chain of Setup,
Data & Context, Manage Data & Context and Manage Skills nothing calls back into
Setup (Interview links Setup only for a new connection, which is conditional and
outside that chain):

1. **Connection and access.** Inspect exposed connections before proposing one,
   explain the useful read, and guide one supported native connection step under
   current authority. Verify the intended account and a scoped safe read.
   Unavailable or declined access stays an explicit gap while other work
   continues. No secrets in chat or context.
2. **Understand the business.** Use the [business coverage check](references/business-context.md)
   for goals, offers, customers, positioning and systems, reusing what the
   workspace already shows. [Interview](../osm-interview/SKILL.md) only where
   material context is missing, with its
   [owner-context guide](../osm-interview/references/owner-context.md); never a
   fixed questionnaire.
3. **Map selected sources and authority.** Record which systems are sources,
   which are working artifacts and who has authority. External systems, local
   files and repositories remain sources or artifacts, never an alternate home.
4. **Reuse or create.** [Data & Context](../osm-data-context/SKILL.md) engineers
   the home, its definition and the core Knowledge, Memory and Skills roles:
   existing stores are reused by actual ID, only missing ones are created, and
   replay creates no duplicate. Setup never creates Content. It discovers the actual
   types and metadata of existing stores before mapping and follows the architecture's
   [record lifecycle](../osm-data-context/references/architecture.md#record-lifecycle).
5. **Adopt.** Record the owner's write policy once: whole-home proposed, never
   assumed. Add the thin host pointer only at the intended scope.
6. **Optional upkeep.** [Manage Data & Context](../osm-manage-data-context/SKILL.md)
   serves manual and task-time curation. A scheduled run needs an explicit
   request and exact authority; setup authority alone does not create one.
7. **First useful task.** Complete the agreed result, then check the
   [setup scenarios](references/setup-scenarios.md) that apply and report
   unavailable proof honestly. An unchanged resume needs only its task checks.

Follow [setup](references/setup.md) for the questions, readiness and acceptance
details, and [bootstrap](references/bootstrap.md) for the first-run sequence of a
new root. For personal skills during setup, call Manage Skills'
[personal skill lifecycle](../osm-manage-skills/references/owner-skills.md). When
an owner asks in ordinary language for local guardrails during autonomous use,
route that request to [Manage Skills](../osm-manage-skills/SKILL.md); normal setup does not
depend on an optional guard implementation.

## Boundaries

- Notion is the only supported context home. A legacy folder, vault or
  `AIOS_FORMAT` home is recognized read-only and left untouched; the
  [update procedure](../osm/references/update.md#legacy-file-and-vault-homes)
  gives the honest incompatibility and migration guidance. Setup offers no
  file or vault option.
- Never interrupt unrelated work, restart established setup or infer install
  authority. Do not install anything or change global settings unless the
  current task authorizes it. Preserve unrelated instructions, secrets and
  configuration keys.
- Keep the product version and the owner's stored compatibility names separate.
  Persisted names such as `AIOS:BEGIN` blocks and the panel's `aios` directory
  remain readable; they are compatibility keys, not branding.
