---
name: osm-check
description: Verify OSM installation, skill discovery and context-home health without changes.
metadata:
  version: "3.1.0"
---

# OSM:check

For requested context inspection, use the resolved [provider](../osm-context/references/providers.md)
and [home contract](../osm-context/references/home-contract.md), then the selected
provider checks. Read-only Check never creates pages, templates or test records.
Missing AIOS_FORMAT/local folders are not failures for other homes. Product-only
installation checks do not require fetching owner context.

Inspect only the requested scope using the relevant section of
[checks](references/checks.md). Use [setup scenarios](references/setup-scenarios.md) for the requested installation
boundary. Artifact quality and lifecycle gates belong to
[Review](../osm-review-work/SKILL.md) and its owning phases, not this audit.
During evaluation do not edit the subject. Return PASS, FAIL or NOT VERIFIED
per claim, with actual artifact,
checkpoint, observation and next safe action. Uncertainty is never PASS.

A manifest is not proof of activation, a source link is not proof of an installed
specialist, a URL is not a backup, and a successful push is not live equality.
If repair is already authorized, apply it through the responsible route:
[maintenance](../osm-maintain-context/SKILL.md) for owner context,
[setup](../osm-setup/SKILL.md) for readiness, or shared Build with the repository contract.
Then evaluate the final bytes again. Otherwise report the proposed repair.
Preserve owner decisions, authority and existing work. Never treat inspection as permission to publish,
install, migrate or rewrite configuration.
