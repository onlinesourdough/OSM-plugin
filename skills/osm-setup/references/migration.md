# Adopt OSM from an existing installation

Use this only for a requested adoption, rename or migration. New clients use
[setup](setup.md) directly. Current AIOS homes resume without migration. A new
package version never moves a folder, changes a saved Project or grants access.
OSM 0.30.0 renames the package and skills only. The owner-home format (AIOS.md,
AIOS_FORMAT, ~/.AIOS), the `<!-- AIOS:BEGIN -->` bridge markers, Codex panel
links and Notion pages keep their names, so a branding update needs no owner-data
migration.
The product maintainer supplies instructions; the authorized owner-data lead
owns any physical move and native cutover.

## Establish source identity before changing anything

Inspect configured bridges and the actual source and target roots. Classify:

| Observed source | Migration meaning |
| --- | --- |
| AIOS.md and supported AIOS_FORMAT at the configured root | Current owner format; resume or an explicitly requested physical move |
| OSM.md and OSM_FORMAT from released OSM 0.1.x | Earlier package identity; preserve format-1 facts and map only proved names/paths |
| Package `osm` 0.1.x, or `osm-onboard` | Retired OSM 0.1.x; its `osm`, `osm-check` and `osm-maintain-context` share names but not bodies with 0.30.0 |
| Legacy `.aios/CONTEXT.md`, `.aios/MEMORY.md` and registries | Template-era owner layout; inspect the complete relevant map before assigning a format |
| Package `osm` 0.30.0 or later from onlinesourdough/OSM-plugin (or its earlier AIOS-plugin name) | Current package; update in place |
| Package `aios` 0.29.x or earlier from that repository | Current package under its previous identity; [switch to `osm`](#switch-from-aios-to-osm) |
| A skill named `aios`, `aios-*`, `osm` or `osm-*` without proved provenance | Unknown ownership or a custom method; preserve it and resolve collision before activation |
| Both old and new homes, markers or registrations | Compare identities and accepted evidence; do not select or overwrite by name or timestamp |

Read a marker as data. Unsupported or malformed formats stay read-only; absence
is not an empty home or format 1. A legacy repository, `AIOS_VERSION`, canonical
source, immutable revision and file hashes may together establish origin; a
prefix alone cannot. A folder merely named AIOS is not enough either. Classify
an `osm` registration by its source and version: an `osm` name on a legacy list
is never a reason to remove a current 0.30.0+ registration.

Inventory files, modes, symlinks, source hashes and relevant discovery entries
before planning writes. Include untracked/ignored work and nested repositories
without reading credential contents into evidence. Inventory nested checkout
recovery separately. Preserve the original and a protected tested backup; a Git
URL or tracked commit does not back up untracked files.

## Plan a content-preserving map

Choose the physical destination once. The new-home default is `~/.AIOS`; it
never overrides a deliberately configured existing path or authorizes a move.
A rename migration may explicitly select that destination. No worker moves its
own live checkout or parent repository; the lead coordinates those boundaries.
Use the [owner-data migration procedure](../../../docs/legacy-file-home/data.md) for all file-level conflict
and restore rules.

| Source | Accepted destination / treatment |
| --- | --- |
| OSM.md (0.1.x) | AIOS.md with only verified product-name and route substitutions |
| OSM_FORMAT equal to `1` | AIOS_FORMAT equal to `1` after mapped-content and restore proof; preserve the old marker in the original/backup |
| Legacy `.aios/CONTEXT.md` | Preserve rich content as a routed context file; make a small AIOS.md index with verified links |
| MEMORY.md and CONNECTIONS.md | Preserve facts, provenance, account boundaries, authority and unknown fields; change only proved paths if needed |
| Context, System/Project registries and assets | Preserve every field and asset; verify mapped physical paths independently of canonical URLs |
| Independent repositories | Their own move/backup/local lifecycle, never copied as owner context or silently replaced |
| Non-product skills | Keep original bytes recoverable in their owner-controlled source; only separately verified path/caller adaptations |
| `<!-- OSM:BEGIN -->` bridge | Replace only one provenance-verified old managed block with the reviewed AIOS block under setup authority |
| Legacy template/root instructions | Preserve and inspect their scope; do not delete an entire AGENTS file to remove an old route |

For each intended change record exact source, baseline destination, accepted
output hash, reason, authority and rollback preimage. Identical files stay
byte-identical. Where a path must change, list those exact spans and prove every
other byte and unknown field unchanged. Do not blanket-replace a personal name,
all `aios-*` text, history, or arbitrary Markdown. Compare facts and permissions
semantically as well as checking hashes. Do not put client content or migration
logs into the distributed package or always-read context.

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

One authorized owner-data writer compares current source and destination hashes
against the accepted map immediately before each write. An already accepted
output is a no-op. A different existing destination, unexpected symlink, changed
source or malformed/duplicate bridge block stops that write with both versions
preserved. Do not merge conflicting facts or authorization automatically.

Record completed map entries separately from core context. Resume only incomplete
entries and recheck changed evidence. An identical replay creates no files,
duplicate registrations or new authority. Set the supported AIOS_FORMAT only
after the mapped content, route integrity and restore proof pass.

Verify the thin global AIOS bridge and all bytes outside its accepted block.
Keep ancestor owner-context instructions out of nested independent repositories.
Verify relevant native saved roots, environments and actual fresh-task cwd using
[adapters](adapters.md); a physical folder move is not desktop cutover proof.
Explicit app-control denials remain hard boundaries. An unavailable supported
control leaves one guided action and pending readback, not an internal edit.

Rollback uses the protected preimages and previous native package/ref. Restore
only scoped outputs whose current hashes still equal the accepted migration
outputs. Preserve subsequent owner edits and unknown settings; stop a conflicting
restore instead of overwriting. Do not delete the original home, previous
release, history or original skill bodies. Report package delivery, owner-data
migration, native discovery and desktop/runtime acceptance independently.
