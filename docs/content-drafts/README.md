# Content drafts (historical, not shipped)

Status: preserved source for a future, tailored Content method. These files are
**not** part of the OSM plugin. They are not discoverable skills, are listed in
no manifest and are not in the package inventory. Nothing here is installed,
advertised or required by core OSM.

Why they are here: before #88, OSM shipped `content` and `diffusion-studio` as
core skills. The accepted direction is that OSM establishes and maintains the
business's Data & Context foundation in Notion, and that Content is a separate,
tailored method that works with that same foundation. The drafts keep the
useful editorial judgment, provenance and helper work until they are reconciled
to this boundary.

## Boundary

- Content has five configurable responsibility areas: setup, intake, prepare,
  produce/distribute and learn. They guide a business-specific workflow and may
  produce personal skills and separately authorized automations. They are not a
  universal pre-shipped five-skill plugin and not a required pipeline.
- Core OSM Setup never creates a Content store. A tailored Content setup may
  create or reuse one; core Data & Context management can then maintain that
  selected store like any other, without any Content module installed.
- Notion editorial work and Kit newsletter distribution are the currently
  selected tools. HyperFrames is an unqualified video candidate only, not a
  shipped or proven editor. The pinned external editor workflow in
  `skills/diffusion-studio` is a draft of an earlier choice, not a recommendation.
- Shared Content methods and templates have their own Git home,
  [OSM-content](https://github.com/onlinesourdough/OSM-content), which owns their
  future changes; these drafts are history and not that source. The archived
  Agentic-Content-System is not revived.
- Preserve analog work, human taste and entry at any stage. A short idea need
  not first become long form, and a newsletter is a channel, not a fixed length.

## Layout

The original skill folders keep their layout under `skills/` so their helpers
and tests run unchanged. Each former `SKILL.md` is renamed `method-draft.md` so
no host can discover it as a skill.

```sh
node --test docs/content-drafts/tests/*.test.mjs
python3 -B -m unittest discover -s docs/content-drafts/tests -p 'test_*.py'
```

These checks run against the drafts only. They are not part of the package
checks and prove nothing about installed behaviour. Use a scratch `TMPDIR`
outside the work tree. Two historical records describe the original
integration; only their links and test commands were corrected to the new
paths: [content preservation](../content-preservation.md) and
[integration proof](../integration-proof.md).
