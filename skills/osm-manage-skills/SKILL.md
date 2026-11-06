---
name: osm-manage-skills
description: Manage an authorized skill creation, edit, installation, update, removal or rollback.
metadata:
  version: "2.0.1"
---

# OSM:manage-skills

Manage a capability change deliberately. Independent projects remain operable
without OSM, a plugin, a personal skill or a central run-history store.

This OSM skill owns the reviewed lifecycle for capabilities and personal/team
skills: creation/import/edit/rename/removal decisions, canonical placement,
registration and discovery, plus adoption, update and rollback. Follow the
[owner skill lifecycle](references/owner-skills.md) for personal/team methods. The
native Skill Creator owns authoring mechanics; Maintain context owns durable
owner facts and configured Git sync. Neither takes back this lifecycle.

Use the resolved context provider for owner placement and discovery through
that lifecycle; a cloud page is not automatically a native installation. In
Notion, follow the [skill lifecycle](../osm-context/references/notion/personal-skills.md):
designation, a person's per-surface enablement in Library, discovery on the
actual connection, and relevant use are separate states, and enabling grants no
page access or authority.
Shared OSM skills remain in the plugin; project skills remain with their project.

## Distinguish audit from management

An audit detects and reports the current capability state without mutation.
Use [Check](../osm-check/SKILL.md) when the request is only to inspect or
report; no separate audit skill is required. This skill manages a proposed
change: create or reconcile a personal skill, review a capability gap, decide
whether to reuse or install, and perform an authorized install, update,
rollback, removal or overlap decision. Do not silently turn an audit into a
change.

## Confirm the gap

Identify the capability and proof the task needs. Check relevant project and
available capabilities, including ordinary reasoning, before searching. Reuse
a sufficient method and continue the owning task. Inspect personal or installed
sources only when relevant and within the caller's authority; independent
repositories keep their local lifecycle. An unclear gap warrants no search or
install. A request to edit a named skill already establishes the authoring task;
do not repeat candidate acquisition review for unchanged source and access.

When an owner asks in ordinary language for local guardrails during autonomous
use, inspect the selected harness's native permissions and supported hooks through
[protection coverage](../osm-setup/references/harness-protection.md). Assess a
concrete missing capability before acquiring a maintained implementation. The
former `setup-guardrails` source is archived, not a preferred active installation.
A guard is not an OSM prerequisite or package dependency: report source identity,
installation state, trust/configuration state, and native-active observation
separately; a catalog entry or copied prompt proves none of them.

## Discover and review candidates

Search without installing through an available authorized catalog, native
discovery surface, authoritative publisher source or owner-supplied repository.
Follow that source's current documented read-only search/listing interface; no
particular catalog, CLI or package manager is an OSM dependency. Prefer a
reviewed project or organization source, then the relevant technology owner,
then a community source.

For acquisition or a material source/access change, inspect the candidate
publisher, repository, exact revision, license, maintenance, `SKILL.md`, resources,
scripts, commands, network access, affected files/services/people, harness
compatibility, overlap, verification, update, removal and recovery paths.
Treat popularity or an audit badge as evidence to weigh, not approval.

## Get authority before changing state

Present the candidate, material access, intended scope/files, version, risks
and rollback plan. Apply existing explicit authorization when it covers the
exact candidate, revision, action, access and destination scope; do not ask
again for the same approval. Ask before mutation only for missing authority or
a material change to the approved proposal. Prefer project scope so the
change is reviewable. Never use `--all`, global scope or non-interactive
approval flags unless that exact scope was explicitly authorized.

If a harness or source lacks a supported install path, mark it unsupported or
unverified. Do not invent an adapter, claim discovery from a copied prompt or
make the project depend on a plugin at runtime.

## Install, update and rollback

Use one named skill from one canonical source. Record source revision,
release version, file hashes, destination scope and the prior version before
writing. For an update, review the upstream diff and repeat the same candidate
review; do not overwrite a local change without authorization. For rollback,
restore a recorded prior revision, verify its hashes and discovery, and report
the recovery result. A plugin may distribute a source, but it must not create a
second payload fork or own System/Project run history.

## Verify

Inspect the scoped diff and validate frontmatter, links, changed scripts and
source/version identity. For installation or discovery changes, verify native
discovery at the selected scope; for material instruction changes, exercise a
representative safe task when authorized and available. A metadata-only edit
needs schema/inventory checks, not a production rehearsal. Report actual checks,
source, version, changed scope, recovery and material limits.

Fix authorized local defects and rerun affected checks. Failed activation holds
further activation and preserves the prior version; uncertain effects require
readback before retry. Report any remaining required proof or authority gap.
Never update skills automatically.
