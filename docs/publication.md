# Publication of the public documentation

The public Notion guide, [The Onlinesourdough Method](https://gustavanderson.notion.site/The-Onlinesourdough-Method-40d6d2e17f568124af82ceb93dabf77a),
is a versioned explanatory and reference projection. It is never the installed method.
Git owns the executable method instructions: the skills and their references. Keeping the
projection aligned is the job of a publisher whose source lives in this repository. **The
publisher is source and fixtures only: it is not active, has not written to Notion, and has
no live proof.**

## Ownership per artifact

| Class | Artifacts | Public writer |
| --- | --- | --- |
| A | The 22 released packets, frozen at v0.30.0 (`314dcf1`) | The existing upkeep route until a recorded handoff, then CI |
| B | The five Content templates and their setup, configuration and diagram explanations: a separate Notion-authored Draft edition 2026-11-05.1 | Notion-authored; the publisher never writes, derives or repairs them |
| G | The public guide pages, edition 2026-11-05.2 (the before-source) | Notion-authored; a newer original is a conflict, not an overwrite |
| W | The main-working documentation projection, labelled unreleased | CI, once activated |
| C | The owner's private documentation control and daily state | Not a CI source or credential scope |

An unreleased commit is never published as released or installed. A released edition resolves
to its exact approved commit and changes only at a new tagged, approved commit.

## What the publisher does

On a main merge it builds an impact diff from a frozen source commit and always returns a visible
reconciliation result; no impact is a valid result. A single serialized stage then writes only the
rows CI owns, by stable Key: it marks a row pending with its before and after source, upserts, and
calls the row complete only after the affected set (page, catalogue entry and anonymous access) reads
back. An unknown write is read back before any retry, a partial update resumes on the same Key, and
nothing deletes history or replaces the site. Anything not owned by CI gets a visible refusal and no
write. A missing credential makes it fail closed.

## Where things are

- [`docs-publisher/manifest.json`](../docs-publisher/manifest.json): the per-artifact manifest.
- [`docs-publisher/ACTIVATION.md`](../docs-publisher/ACTIVATION.md): preconditions and what is still missing.
- `tests/publisher-rehearsal.py`: the fixture rehearsal. It uses an in-memory transport and is never live proof.

None of this ships in the plugin package.
