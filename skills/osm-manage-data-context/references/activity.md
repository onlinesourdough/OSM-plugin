# Progress, checkpoints and repeated evidence

Use this during task-time Log or a manual or scheduled Dreaming run. The
[home architecture](../../osm-data-context/references/architecture.md) owns
destinations, access and authority. Manage Data & Context owns curation.

## Select and place

- A completed, materially changed or newly archived chat is a candidate,
  within the selected history scope and run budget. Treat archive discovery
  as its own lane if the supported provider separates it. Keep a discovery
  cursor per provider, account, scope and listing mode in the existing
  checkpoint destination. An archive listing alone supplies no evidence of
  what happened or what was saved. For Codex chats, use the selected host's
  archived-thread listing when exposed, with the same scope as ordinary chat
  history. Read the selected thread and turns before treating it as evidence.
- Unfinished work can still be useful for a status or a handoff. From a running
  session read only available, completed turns; keep the active turn pending.
  Describe the last supported progress, what is open, and the next action and
  owner when known. Use the existing project, task or native history destination
  authorized for that status. If the job cannot write there, report and link to
  the source in its current run. Keep unfinished work out of durable Memory;
  an independently confirmed lasting decision can still be curated.
- For other explicitly selected sources, read only the bounded new, changed
  or due items through the recorded reader. Check provider-supported dates,
  periods and coverage. A linked finance or content source does not select
  every account, social channel or metric. Live facts stay with their owner;
  bring a useful supported change or a coverage gap into the run's result.

## Keep progress separate from writes

Use the available stable source item identity. For history, use the same
provider, account or host scope, chat, turn and item or revision whether a
chat is active, closed, archived or restored. Archive listing state is not
part of the evidence identity. When a reliable identity is missing, keep
the item pending instead of treating it as new on each scan.

Keep discovery progress, inspected evidence and verified saved results
separate. An inspected item with no supported change can finish without a
record write. A partly read active session or an uncertain write remains
pending in the existing control or native run destination. Inspect it before
retrying. Never advance saved progress past a write that has not been read back.

Use the home and canonical record Key or verified ID for the destination.
Two turns, sources or workflows can support the same current record. Compare
its current scope, meaning and necessary provenance before updating. Saving
an already-sufficient decision or replaying unchanged evidence produces zero
context writes and no revision-date change. Report conflicts and uncertain
outcomes without blind retry. Follow the effective access and write policy for
each destination; if it is absent, keep the supported change as a proposal.

For a repair, keep the earlier source or revision reference and the new
evidence where the destination's policy permits. Verify the repaired record in
place. This gives the owner a way to inspect or reverse a mistaken repair.

## Repair in the current session

When Prime or Log discovers a verified context error, correct the route,
interpretation or result in the current session. If a stored OSM record also
needs repair, resolve the canonical record and governing write policy. Use
Manage Data & Context to patch and read back the smallest authorized change.
Reconcile any uncertain prior write before retrying. A gap in evidence, access
or writer capability limits only that repair.

Leave one short note in the current chat for Dreaming. Give the workflow,
affected record or route, exact evidence reference, change, and observed outcome.
Keep private content at its source. A compact JSON line is sufficient:

```json
{"osm_repair":"prime","target":"record or route ID","evidence":"source or turn reference","change":"selected the correct source","result":"corrected-in-session"}
```

Use `prime` or `log` as the workflow and one observed result:
`corrected-in-session`, `stored-verified`, `stored-uncertain`,
`not-authorized` or `writer-refused`. If a patch partly succeeds and a field's
state remains uncertain, use `stored-uncertain` and name that field in `change`.
Read back the record and keep the verified part. Use the
existing chat and turn identity. Dreaming checks the cited evidence and
current record before acting. The note is a search hint and creates no
Memory record.
