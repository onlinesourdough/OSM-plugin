# Moving an existing layout into a root

Use for an explicit, owner-requested move into the
[Context Architecture](architecture.md). This is documentation only: it
authorizes no move. Each step runs under the task's actual authority and the
access rules of the selected connection. Nothing is adopted automatically.

## From a separate-entry layout

An existing layout with a separate entry (for example an AI Operating Model page
or an OSM page) keeps working until the owner chooses to migrate.

1. **Inventory.** Record the old entry's exact ID, its definition (if any), its
   procedure children and the links that point to it. Verify a recoverable
   backup of the affected pages.
2. **Root.** Use the owner's selected root. Move the definition into the root by
   adapting it: keep compatible field names and extensions, and never regenerate
   owner choices from the template.
3. **Old entry.** The old entry ID becomes a maintenance/recovery container with
   a short notice pointing to the current root. Its procedure children stay where
   they are, and old links keep resolving to it.
4. **One active definition.** After readback of the root's definition, the old
   copy is marked inactive in place, so no competing active YAML remains. Keep no
   empty compatibility scaffolding without a real continuity need.
5. **Readback.** Read back the root, the definition, the notice and every
   recorded old link before calling the migration complete.

## Relocating plugin-created records

On the owner's explicit, scoped choice, records that the plugin or an agent
recently created in a human library can move to the root's own stores. Do not
solve this by leaving them in the human library and creating duplicate
projections. Never move an unrelated human record because its title resembles a
plugin-created one.

1. **Identify** each candidate by exact ID and evidence that the plugin or agent
   created it.
2. **Preserve** exact IDs, content, creation values (including system creation
   metadata, also when the destination exposes it as native metadata rather than
   a property), meaningful properties, evidence, dates, relations and child
   identities.
3. **Target schema.** Establish a compatible target schema first.
4. **Stage one record.** Move one record and read it back completely.
5. **Read back every affected record**, including related and child records.
6. **On any mismatch, stop** and reconcile before moving anything else.

No throwaway test writes outside the approved root.

## Legacy Type and Category

When the knowledge store adopts the logical metadata, map Kind and temporal
scope onto compatible fields. Keep legacy Type/Category values and hide obsolete
dimensions rather than deleting values. Leave an existing Status=Current
untouched; never derive Kind from source type. An actual schema migration needs
its own owner authority.

## Root change and host pointers

When the agent entry moves to a new root, reconcile every selected host pointer
in the same authorised change: each points at the new root, holds no company
data and is re-verified with loading evidence (see
[host bridge](architecture.md#host-bridge-map-connector-and-trigger)). A stale
pointer is an unfinished migration, not a fallback route.
