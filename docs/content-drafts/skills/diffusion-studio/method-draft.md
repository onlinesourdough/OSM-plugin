---
name: diffusion-studio
description: Check or operate the pinned external Diffusion Studio for ordinary video edits, captions, audio, assets and supervised export. Audits stay read-only; setup and launch need action authority.
metadata:
  version: "1.0.2"
---

# Diffusion Studio

Use the reviewed external Diffusion fork for ordinary recorded long-form,
shorts, cuts/trims, audio/music, captions, overlays/assets and supervised export.
Electron and DAPI own editing, compilation, filesystem access and export.
The loopback browser companion is human-only and read-only.

Read [operation](references/operation.md) for the selected check, setup, launch
or re-pin. Commands are alternatives, not a setup sequence. Carry existing
exact action authority forward; a check, audit or instruction edit grants no
install, build, launch or production-edit authority. Missing optional Studio
readiness does not block content setup or writing.

Invoke the portable [launcher](scripts/diffusion-studio.mjs) by its resolved
path. `open` requires `--production-root /absolute/work/content/outcome` and one
project path, resolved relative to that root. Keep project data, editor checkout,
runtime state and caches outside the immutable OSM package. Never vendor the
editor, reset owner state, silently update the pin or install through auto hooks.

Only open the returned one-time URL in the available in-app browser. Require
hidden or truthfully reported minimized-fallback host, zero egress attempts,
matching compiled/applied identities, explicit companion cleanup and surviving
DAPI. The browser grants no editing, export or AI authority.

After human export inspection, return exact artifacts to
[Content](../content/SKILL.md) for provenance and each node’s own final review.
Approval never inherits; external publishing remains separately authorized.
Entire code-animated explainers and bounded specialist motion overlays follow
[the specialist route](../content/references/specialist-motion.md).
