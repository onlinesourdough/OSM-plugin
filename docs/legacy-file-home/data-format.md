# Owner format contract

OSM reads owner formats 1 and 2. The marker AIOS_FORMAT contains the integer
on one line. New homes use format 2: AIOS.md is the small context index;
MEMORY.md, CONNECTIONS.md, context/ and optional personal skills hold relevant
owner knowledge. There are no required Project or System registries.

Format 1 homes remain usable with their existing source indexes and paths.
Preserve unknown files and owner facts. An explicitly requested cleanup can
remove obsolete routing requirements and record format 2 after checking the
result and retaining the old index/marker for recovery. Do not relocate working
repositories or erase their data as part of a format change.

Check the physical home's marker before owner writes. Unsupported integers or
malformed markers remain read-only; missing means unclassified, not an inferred
version. Resolve setup or a compatible migration before changing that home.
A package version is not a data format or migration authority.

For actual imports, machine moves or older identities, use
[data migration](data.md) and [identity migration](../../skills/osm-setup/references/migration.md) as applicable.
Product rollback does not restore owner data. A format 2 home needs this release
or another compatible reader; rollback to a format-1-only reader requires the
separately preserved owner index and marker, with later owner edits reconciled.
