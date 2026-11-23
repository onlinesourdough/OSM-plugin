---
name: osm-setup
description: Set up or resume OSM's Notion Data & Context foundation, from installation and access to a useful first task. Check setup, migrate earlier routes or recover an installation.
metadata:
  version: "3.3.2"
---

# OSM:setup

Conduct onboarding from a connected Notion workspace to a verified home and a
useful first task. Reuse answers; resume at the next gap. Explain the useful
result before unfamiliar questions; use [Setup](references/setup.md) for the welcome. Use the conversation's
language; on a neutral resume, use its recorded preference or working content,
not the fixed English title, to choose the language.

Codex **Set up**, the **OSM:setup** skill picker entry, or a request naming OSM
starts this skill. Bare `/setup` can select another plugin; do not claim that
generic command is OSM's entry or that ordinary Notion setup needs an API key.
Resume accepted setup
and connections. Verify access; a badge or saved link is not readiness. For
package installation or a requested bridge-only change, use the
[adapter route](references/adapters.md). Installation alone creates no home and
needs no global instruction edit. Use the [Notion access](references/panel.md) procedure for Codex connection checks.
Use the [procedure index](../osm/index.md) for earlier names and package recovery.

## One path

Setup is the single conductor. Each step has one owner. In the chain of Setup,
Data & Context, Manage Data & Context and Manage Skills nothing calls back into
Setup (Interview links Setup only for a new connection, which is conditional and
outside that chain):

1. **Connection and access.** Inspect exposed connections first and reuse a
   working connection or recorded choice. For new ordinary user setup, check
   whether the official Notion plugin is installed and connected. When its
   installation is authorized, install it through the supported host route,
   guide account connection and verify the intended workspace with a scoped
   safe read. Use a
   dedicated connection when the selected team, worker or unattended workflow
   needs its own identity or access scope. Preserve an existing recorded choice.
   Unavailable or declined access stays an explicit gap while other work
   continues. If the selected route requires a credential or rotation, use
   [credential setup and verification](references/credentials.md).
   No secrets in chat or context.
2. **Understand the business.** Use the [business coverage check](references/business-context.md)
   for goals, offers, customers, positioning and systems, reusing what the
   workspace already shows. [Interview](../osm-interview/SKILL.md) only where
   material context is missing, with its
   [owner-context guide](../osm-interview/references/owner-context.md); never a
   fixed questionnaire.
3. **Map selected sources and authority.** Record which systems are sources,
   which are working artifacts and who has authority. External systems, local
   files and repositories remain sources or artifacts, never an alternate home.
   The definition is the business's gateway: record when to use each source,
   its real access route, permitted actions and processing environment, and
   what may be retained where. Keep operational originals in their system.
   An AI-native source normally needs direct lookup, not a Notion importer.
   Reuse its existing connection and configure the template to the business.
   Locate a named task-relevant source before substituting a generic result;
   [setup](references/setup.md) owns the minimal follow-up and source agreement.
4. **Reuse or create.** [Data & Context](../osm-data-context/index.md) engineers
   the home, its definition and the core Knowledge, Memory and Skills roles:
   existing stores are reused by actual ID, only missing ones are created, and
   replay creates no duplicate. For a new home, include the
   [Content foundation](../osm-data-context/references/notion/content-foundation.md)
   in the short plan: reuse an existing Notion or authoritative external route,
   record a deferral, or propose one empty store. Personal Content methods stay
   optional. Never retrofit an established home on normal resume. It discovers the actual
   types and metadata of existing stores before mapping and follows the architecture's
   [record lifecycle](../osm-data-context/references/architecture.md#record-lifecycle).
   Give a short concrete plan after resolving the relevant business/source
   questions, before building. Name a new root **AI operating model** without
   translating that default; use the public guide's existing icons as described
   by the [root template](../osm-data-context/assets/data-and-context-root.md).
   A newly generated root body starts with the definition, followed by its
   databases. Changes to an existing root follow the owner's request and write
   policy. Explain onboarding in the conversation, using the public guide's
   durable description when useful.
5. **Adopt.** Record the owner's write policy once: whole-home proposed, never
   assumed. Save the thin host pointer in the host's persistent instruction
   file or, if the host has none, in its built-in persistent memory or standing
   instructions. Add it only at the intended scope.
6. **Optional upkeep.** [Manage Data & Context](../osm-manage-data-context/index.md)
   serves manual and task-time curation, and [Dreaming](../osm-dreaming/SKILL.md)
   is the entry for reflection across recent work and scheduled upkeep. Setting
   up a schedule on the host's scheduler or routines, if available, needs an
   explicit request and exact authority. Record only
   history and source routes that are actually readable;
   an unavailable or unqualified route stays an explicit gap.
7. **First useful task.** Complete the agreed result, then check the
   [setup scenarios](references/setup-scenarios.md) that apply and report
   unavailable proof honestly. An unchanged resume needs only its task checks.

Follow [setup](references/setup.md) for the questions, readiness and acceptance
details, and [bootstrap](references/bootstrap.md) for the first-run sequence of a
new root. For personal skills during setup, call Manage Skills'
[personal skill lifecycle](../osm-manage-skills/references/owner-skills.md). When
an owner asks in ordinary language for local guardrails during autonomous use,
route that request to [Manage Skills](../osm-manage-skills/index.md); normal setup does not
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
