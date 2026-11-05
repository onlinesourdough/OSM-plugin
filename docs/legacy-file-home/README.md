# Legacy file home (not part of the package)

Until OSM 0.30.x a context home could be a managed folder, an Obsidian-style
vault or another document store, with `AIOS.md`, `AIOS_FORMAT`, a file bridge
and Git-based continuity Sync. OSM 0.31.0 makes Notion the only supported home.
This directory keeps the retired records so that existing owners can still
understand what they have. It is not shipped in the plugin and no skill loads
it.

What happens to an existing file or vault home:

- It is recognized read-only (for example by `AIOS_FORMAT`) and never edited,
  converted, mirrored or cleaned up by OSM.
- Originals and recovery paths stay exactly as they are.
- The [update reference](../../skills/osm/references/update.md#legacy-file-and-vault-homes)
  explains the incompatibility and the owner-led choices.

| Record | What it was |
| --- | --- |
| [bridge](bridge.md) | The thin pointer that named a file home |
| [data-format](data-format.md) | `AIOS_FORMAT` 1 and 2 |
| [data](data.md) | Owner-data migration and restore rules |
| [sync](sync.md) | Git-based continuity Sync |
| [owner](owner/AIOS.md) | The neutral owner scaffold |

`tests/layout-rehearsal.py` and `tests/continuity-rehearsal.py` still exercise
this record so its safety rules do not rot. They prove the retired files, not a
supported flow.
