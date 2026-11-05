# Adopt OSM from an existing installation

Use this only for a requested adoption, rename or migration of the package. New
clients use [setup](setup.md) directly. A new package version never moves a
folder, changes a saved Project or grants access. OSM 0.30.0 renamed the package
and skills only; OSM 0.31.0 makes Notion the only supported context home. The
`<!-- AIOS:BEGIN -->` bridge markers, Codex panel links and Notion pages keep
their stored names, so neither update needs a Notion migration.

This reference decides package and skill identity. It never rewrites owner data.
A legacy folder, vault or `AIOS_FORMAT` home is recognized read-only; the
[legacy-home guidance](../../osm/references/update.md#legacy-file-and-vault-homes)
explains the incompatibility and the owner-led migration choice, with originals
and recovery preserved and no silent conversion, cleanup, fallback or mirror.

## Establish source identity before changing anything

Inspect configured bridges and the actual installation. Classify:

| Observed source | Meaning |
| --- | --- |
| Package `osm` 0.31.0 or later from onlinesourdough/OSM-plugin (or its earlier AIOS-plugin name) | Current package; update in place |
| Package `osm` 0.30.x | Previous package; update in place. Its `osm-context`, `osm-maintain-context`, `osm-check`, `osm-update`, `osm-select-model`, `content` and `diffusion-studio` skills are renamed or retired: see the [retired names](../../osm/references/update.md#retired-names-and-the-scheduled-caller) |
| Package `osm` 0.1.x, or `osm-onboard` | Retired OSM 0.1.x; its `osm`, `osm-check` and `osm-maintain-context` share names but not bodies with later releases |
| Package `aios` 0.29.x or earlier from that repository | Current package under its previous identity; [switch to `osm`](#switch-from-aios-to-osm) |
| A skill named `aios`, `aios-*`, `osm` or `osm-*` without proved provenance | Unknown ownership or a custom method; preserve it and resolve collision before activation |
| Both old and new registrations | Compare identities and accepted evidence; do not select or overwrite by name or timestamp |
| `AIOS.md` with `AIOS_FORMAT`, `OSM.md` with `OSM_FORMAT` or a legacy `.aios` layout | A legacy file home: read-only data, never a migration target here |

Read a marker as data. Absence is not an empty home or format 1. A legacy
repository, `AIOS_VERSION`, canonical source, immutable revision and file hashes
may together establish origin; a prefix alone cannot. A folder merely named AIOS
is not enough either. Classify an `osm` registration by its source and version:
an `osm` name on a legacy list
is never a reason to remove a current 0.30.0+ registration.

Inventory relevant discovery entries before planning writes, without reading
credential contents into evidence. Preserve the original and a protected tested
backup of anything about to change.

## Resolve package and skill collisions

Inventory active native packages, global skill directories or links, explicit
path registrations and relevant repository-local skills. Record source identity,
canonical body and actual discovery location for each overlapping name. Compare
old OSM 0.1.x roles, `aios` names and current `osm` names; two differently named
packages can still provide conflicting owner routes, and same-named skills from
different releases are different sources.

A verified old Method package may be disabled/removed through its supported
native registration control under adoption authority. `aios@online-sourdough`
and `osm@online-sourdough` are different selectors: updating `aios` never
installs `osm`. Retain the prior release/ref as recovery. Never delete a package
cache or owner folder manually to force a native uninstall.

### Switch from aios to osm

Work at an idle boundary for the affected app, with no task relying on the old
methods. Owner data, bridges and saved panel links need no change.

1. Record the current `aios` registration: source, version, scope and the
   reviewed ref you would restore. Keep that source available as rollback.
2. Stage or install `osm@online-sourdough` from the reviewed immutable source.
   Read back its source and version (0.30.0 or later) before acceptance.
3. Disable `aios` through the app's supported control before acceptance, so
   one source remains effective for each declared name:
   - Claude Code: `claude plugin disable aios@online-sourdough --scope user`
     (use the original scope).
   - Codex: set only `plugins."aios@online-sourdough".enabled` to `false`
     through Codex's version-checked native configuration API
     (`config/value/write`). Do not edit `config.toml`, caches or the
     configuration database wholesale.
   - Without a supported disable control, remove `aios` with its scoped native
     removal at this idle boundary, keeping the tested rollback source.
4. In a fresh session, verify each declared `osm` skill and the single OSM
   sidebar server are discovered once, unrelated skills are unchanged, and an
   ordinary owner request uses the intended route.
5. After acceptance, retire the disabled `aios` registration with its native
   removal only when no other active session, workspace or profile still
   depends on it. Keep the previous release/ref recoverable.

If acceptance fails, disable `osm` the same way, re-enable `aios` (or reinstall
it from the retained source), and read back version and discovery in a fresh
session. A staged installation alongside an enabled `aios` is not acceptance.

For legacy global `aios` or `osm` skills, prove the owning source before changing a
registration. Remove or repoint only the specifically authorized redundant
link/registration after comparison; retain its canonical body and recovery
information. An unknown, customized or conflicting skill is preserved and
activation waits for that collision's decision. Never overwrite a global body,
uninstall another owner's plugin, or assume the entire `aios-*` namespace is
owned by Method; the same applies to `osm-*`. Optional external Global Skills remain independently managed.

Use a supported native sequence that leaves one effective source for each of
the declared names. A temporary staged installation is not acceptance while duplicate
sources remain active. Read back actual discovery in a fresh session; a clean
filesystem list alone does not prove the harness loaded the intended source.

## Apply, resume and recover

A package change is a native install, disable or removal in the selected app; one
authorized lead performs it and compares the current registration immediately
before each step. An already accepted state is a no-op. An unexpected symlink, a
changed source or a malformed or duplicate bridge block stops that step with both
versions preserved. Do not merge conflicting authorization automatically.

Verify the thin global bridge and all bytes outside its accepted block. Keep
ancestor owner-context instructions out of nested independent repositories.
Verify relevant native saved roots, environments and actual fresh-task cwd using
[adapters](adapters.md). Explicit app-control denials remain hard boundaries. An
unavailable supported control leaves one guided action and pending readback, not
an internal edit.

Rollback uses the previous native package/ref. Preserve subsequent owner edits
and unknown settings; stop a conflicting restore instead of overwriting. Do not
delete the previous release, history or original skill bodies. Report package
delivery, native discovery and desktop/runtime acceptance independently.
