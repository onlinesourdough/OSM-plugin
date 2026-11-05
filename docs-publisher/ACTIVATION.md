# Activation notes for the documentation publisher

Status: source and fixtures only. Nothing here is active. No workflow is enabled, no secret
exists, no Notion write has happened and no live proof has run. A merge does not activate it.

## What exists

- `manifest.json`: per-artifact source and ownership, with each artifact's current public writer.
- `publisher.py`: the impact diff, the reconciliation result, the serialized idempotent publishing
  stage and an unexercised Notion transport. Standard library only; no poller, timer or new dependency.
- `fixture_transport.py` and `tests/publisher-rehearsal.py`: the fixture proof. It is not a live publication.
- `workflow.template.yml`: an inactive template with one trigger (push to `main`) and no schedule. It is
  outside `.github/workflows` on purpose.
- A credential-free check, `python3 docs-publisher/publisher.py reconcile --check`, which the repository
  checks already run. It writes nothing and needs no secret.

## Ownership per artifact

| Class | What | Public writer | The publisher |
| --- | --- | --- | --- |
| A | The 22 released instruction and reference packets at v0.30.0 | existing upkeep until handoff, then CI | Pending handoff: no write. After handoff it changes only at a new tagged, approved commit |
| B | Content templates and their setup, configuration and diagram explanations (Draft edition 2026-11-05.1) | Notion-authored | Never writes, derives or repairs. A ZIP hash mismatch is reported |
| G | Public guide pages (edition 2026-11-05.2, the before-source) | Notion-authored | Never overwrites. A newer original is a conflict |
| W | Main-working documentation projection, labelled unreleased | CI | Writes once active |
| C | The owner's private documentation control and daily state | not a CI source | Absent from the manifest and from CI inputs |

A CI-owned row changed by anyone else is drift: it is reported as a conflict and not overwritten.
Each artifact has one public writer, one trigger and one receipt. Separate local locks are not enough.

## Preconditions before anyone turns it on

1. **Relinquishment (the source-chat owner, outside this repository).** The existing daily
   private-maintenance route stops writing the exact rows being handed to CI and keeps private upkeep,
   drift detection and explicit handoff only. It is required for every class A row moved to CI and not
   for a new working row. Each handed-over row is then changed in the manifest in a reviewed commit
   (`public_writer: ci`, `adoption_state: adopted`). No private job id, path or schedule enters this repository.
2. **A dedicated connection** limited to the public subtree: a Notion internal integration with no other grants.
   Not a personal connector and not an owner-wide key.
3. **The subtree and its database.** The owner provisions a labelled public main-working subtree and a
   database in it with rich-text properties `Key`, `Writer`, `Status`, `ReceiptAfter`, `ReceiptBefore`,
   `BodyHash`, `SourceCommit` and `Commit`, plus the title. `bindings.working_subtree` stays null in the manifest
   until then, and the target ids belong in configuration, not in method text.
4. **The secret location.** A repository secret `OSM_PUBLIC_DOCS_TOKEN`, a repository variable
   `OSM_PUBLIC_DOCS_DATABASE` and a repository variable `OSM_PUBLIC_DOCS_BASE` (the public site URL). No token
   appears in source, packets, artifacts or logs. Without the secret the publisher fails closed.
5. **Workflow activation.** Copy `workflow.template.yml` to `.github/workflows/` and set
   `activation.active` to true in one reviewed commit. Merge and activation are separate decisions.

## Missing from the source, to be closed before calling it operational

- The Notion transport has never run. Its call shapes are reviewed against the fixture only.
- `download_hash` (hashing the live frozen export) is fixture-only; the live check for a class B ZIP
  mismatch needs the first live proof.
- The coherent read-back in a live run needs the public site base and an unauthenticated request; both
  are in the source but unexercised.

## The bounded live proof (not started)

One authorized documentation change to a working row, then a read-only rerun that makes no write, then
anonymous access to the changed page and its catalogue entry. Until that passes and is reviewed, nothing may
describe the publisher as operational.
