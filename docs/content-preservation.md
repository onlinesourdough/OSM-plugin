# Content integration preservation

> Historical record. Since #88, Content and Diffusion Studio are no longer
> shipped skills: their sources are kept as non-discoverable drafts under
> [content-drafts](content-drafts/README.md). The links below were corrected to
> the new paths only; the record itself is unchanged.

Accepted source: Agentic Content System commit
`efeccee065a0444eb701a42398f8ada52bf52450`. The integration keeps content judgment
and focused helpers in native skills, with all actual work data at its owner.
Both new skills start at metadata version `1.0.0`. Existing graph/handoff
contract IDs, family/node identities and reviewed artifacts remain compatible;
no source workspace, owner home or production is migrated automatically.

## Responsibilities

| ACS responsibility/source | New home or retained owner |
| --- | --- |
| `agentic-content-system` primary skill: creation/revision, selective inputs, editorial judgment, reuse, completion | [Content](content-drafts/skills/content/method-draft.md), [editorial judgment](content-drafts/skills/content/references/editorial.md), shared AIOS lifecycle and human-writing |
| `setup-content-system`: business/audience/promise, voice, cadence, delivery policy and optional brand/design | [Setup and learning](content-drafts/skills/content/references/setup-learning.md); facts persist at actual work owner; no test production/editor requirement |
| `audit-content-system`: bounded repository or named-production audit, no mutation, evidence gaps, conditional Studio readiness | [Read-only audit](content-drafts/skills/content/references/audit.md), shared Review for generic repository health |
| `diffusion-studio`: pinned external application, action-specific authority, DAPI/companion, cleanup | [Diffusion Studio](content-drafts/skills/diffusion-studio/method-draft.md) and [operation](content-drafts/skills/diffusion-studio/references/operation.md) |
| Source/transcript/thesis/master/derivative family, stable IDs, versions, hashes, provenance, explicit relationships, arbitrary optional targets | [Graph](content-drafts/skills/content/references/graph.md) and unchanged [validator](content-drafts/skills/content/scripts/check-content-graph.mjs); used only when lineage/review/handoff needs it |
| Exact per-node approval, no family/master/sibling inheritance, changed-byte invalidation, designated human decision | [Final review](content-drafts/skills/content/references/final-review.md); validation remains structural, actual reviewer evidence is inspected |
| Hook, pacing, clarity, visuals, audio/captions, packaging, truthfulness, timestamped fixes and cross-format coherence | [Final review](content-drafts/skills/content/references/final-review.md), [final-review template](content-drafts/skills/content/assets/templates/final-review.md), [packaging template](content-drafts/skills/content/assets/templates/packaging-review.md) |
| Packaging and supervised publisher selection, graph/node hash binding, no posting | [Graph and handoff](content-drafts/skills/content/references/graph.md); separately authorized publishing/sending/scheduling stays with caller’s delivery workflow |
| Accepted optional design direction, immutable `DESIGN.md`/selected assets/revision/hashes/provenance/review | [Editorial input boundary](content-drafts/skills/content/references/editorial.md) and optional graph field; editable visual sources stay at actual design owner |
| Reference analysis, bounded frames/captions, observation versus interpretation, reusable patterns | [Reference analysis](content-drafts/skills/content/references/reference-analysis.md), skill-local helper/template |
| Local Whisper, open word-timestamp JSON, optional external packer, cloud opt-in, no credentials in package | [Local transcription](content-drafts/skills/content/references/local-transcription.md), skill-local helper/requirements; external venv/cache/output |
| Full code-animated explainers or bounded motion overlays; scene intent, readable strongest frames, export inspection | [Specialist motion](content-drafts/skills/content/references/specialist-motion.md); upstream HyperFrames method and external project remain authoritative |
| Real owner-video acceptance with truthful usability friction and feature trace | [Real-video acceptance](content-drafts/skills/diffusion-studio/references/real-video-acceptance.md); retained protocol, no new live acceptance claimed |
| Channel profile/style, reference index, project/motion learning, publication history | [Setup and learning](content-drafts/skills/content/references/setup-learning.md); neutral profile/style templates available, records stay at actual work owner |
| Nine capture forms, four practical groups, promise/proof/plan, source questions, channel-native reuse | [Format library](content-drafts/skills/content/assets/formats.json), [editorial planning](content-drafts/skills/content/references/editorial.md), [research provenance](content-drafts/skills/content/references/research-provenance.md); historical cadence examples are optional |
| Generic Spec/Build/Review/Ship, model/work judgment, domain proof and maintenance discipline | Shared AIOS lifecycle; specialist criteria remain in Content, without copied phase skills or a recovery ledger |

## Resource disposition

All paths below refer to the pinned ACS source. Direct migrations preserve the
source role while rebinding local resource paths. The worker handoff includes
an exhaustive per-file source inventory and destination/disposition map.

| Resource | Disposition |
| --- | --- |
| `.agents/skills/{agentic-content-system,setup-content-system,audit-content-system}/**` | One short Content entrypoint, conditional references, new native UI metadata |
| `.agents/skills/diffusion-studio/**` | Separate short Diffusion skill with conditional operation reference and native UI metadata |
| `.agents/skills/README.md`, `AGENTS.md`, `README.md`, `docs/{ARCHITECTURE,INPUT_OWNERSHIP,WORKFLOW,WORKING_DISCIPLINE,QUICKSTART,PROMPTS}.md` | Domain content redistributed into the two skill entrypoints/references; generic lifecycle and root integration remain lead-owned |
| `docs/{CONTENT_GRAPH,PACKAGING,FINAL_REVIEW}.md` | Graph/handoff and final-review references |
| `docs/{REFERENCE_ANALYSIS,LOCAL_TRANSCRIPTION,CLOUD_TRANSCRIPTION}.md` | Conditional reference/transcription guidance, explicit external storage and native setup |
| `docs/{DIFFUSION_STUDIO,REAL_VIDEO_ACCEPTANCE}.md` | Diffusion operation and real-video references; pin and authority retained |
| `docs/SPECIALIST_MOTION.md`, `workspace/learning/MOTION_PHILOSOPHY.md` | Specialist-motion reference; no upstream renderer/project copied |
| `docs/{CONTENT_FORMATS,RESEARCH_PROVENANCE}.md`, `workspace/content-formats/formats.json` | Editorial reference, historical research register and optional format asset; provenance link is asset-relative |
| `docs/LEARNING.md`, `workspace/learning/PROJECT_MEMORY.md`, `workspace/references/REFERENCES.md` | Setup/learning and reference method; actual records belong to work owner, no bundled memory/index data |
| `workspace/channel/{PROFILE,STYLE_GUIDE}.md` | Neutral optional `assets/templates/profile.md` and `style-guide.md` |
| `workspace/channel/DESIGN.md`, `workspace/channel/assets/**`, `workspace/channel/brand.json`, `workspace/channel/published-videos.csv`, `workspace/content-pipeline/**` | Retain owner defaults, accepted design, ideas and publication history at actual work owner; no global defaults or mandatory pipeline structure bundled |
| `workspace/engine/scripts/check-content-graph.mjs` | Byte-identical `skills/content/scripts/check-content-graph.mjs`; no second schema or dependency |
| `workspace/engine/scripts/{analyze-reference-video,transcribe-local-whisper}.py` | Portable skill-local scripts plus small `work_paths.py` boundary helper |
| `workspace/engine/scripts/setup-local-transcription.sh` | Replaced by explicit native venv/pip instructions; no installation wrapper or auto hook |
| `workspace/engine/requirements/local-transcription.txt` | Skill-local optional requirements asset; no bundled Python runtime/dependencies/models |
| `workspace/engine/scripts/diffusion-studio.mjs` | Portable Diffusion skill script, explicit production root, preserved external checkout identity |
| `workspace/engine/templates/*` (eight templates) | Content assets: graph, handoff, brief, cut plan, final review, packaging review, reference analysis and production notes |
| `workspace/engine/tests/{content-graph,diffusion-studio}.test.mjs` | All 19 tests retained under `tests/content`, adapted for explicit external paths and cleanup |
| `workspace/engine/tests/fixtures/content-graph/**` (seven files) | Byte-identical neutral fixtures under `tests/content/fixtures/content-graph`; no media/customer files |
| `workspace/engine/{README.md,contracts/README.md,transcription/README.md}`, `workspace/README.md` | Domain boundary and usage now in conditional references; no engine directory/runtime remains |
| `workspace/engine/scripts/{check-repository,skill-metadata}.mjs`, `workspace/engine/tests/skills.test.mjs`, `package.json`, `.github/workflows/ci.yml`, `.gitignore`, `.gitattributes`, `docs/{CI,CODEX_PLUGIN_SETUP}.md` | ACS packaging/layout checks stay with ACS; AIOS core manifests/validators/native installers are lead-owned; content tests cover domain behavior |
| `workspace/engine/scripts/clean-local-artifacts.sh` | Not migrated: repository-wide cleanup authority is incompatible with a portable immutable skill; scoped external work cleanup stays with its owner/native tooling |
| `docs/{BRANDING,GITHUB_DESCRIPTION,REPOSITORY_IDENTITY,astra-alignment}.md`, `assets/branding/**`, `examples/README.md` | ACS identity/history retained at source, excluded from AIOS content payload |
| `workspace/productions/**`, remaining `.gitkeep` scaffold markers | All source productions, their media/design assets/reviews/proof and empty workspace scaffolding remain at source; never bundled or moved |

No tracked ACS LICENSE or NOTICE was present at the source commit; no upstream
license grant is invented. Original source, reference-pipeline inspiration,
creator-source IDs and external tool ownership are retained in
[content provenance](content-drafts/skills/content/references/provenance.md) and
[launcher provenance](content-drafts/skills/diffusion-studio/references/provenance.md).
No editor, rendering engine, publisher bot, media pipeline, recovery ledger,
customer asset or account fact is bundled.

## Compatibility changes and evidence

The new portable launcher requires `open --production-root /absolute/work/root
<project>`. Relative projects bind to that explicit root, not shell cwd. Existing
external application locations and exact fork/upstream pins remain unchanged.
Package-overlapping data roots and symlink escapes are refused; actual DAPI
subprocesses use the external checkout as cwd. Platform construction is tested
for macOS/Linux/Windows, while physical Electron parity is not newly claimed.

Reference preparation requires `--out-root`, refuses existing analysis leaves
and traversal, and uses its skill-local template/sibling transcriber. Local
transcription requires `--edit-dir`, uses external cache/temp paths, keeps
flat transcript filenames compatible with the existing editor packer and rejects
duplicate stems across directories or extensions before writing.
The optional packer takes an explicit external path. A real external virtualenv
test verifies that interpreter symlinks preserve the selected environment.
No imports generate package-local bytecode.

Run from the repository root:

```sh
node --test docs/content-drafts/tests/*.test.mjs
python3 -B -m unittest discover -s docs/content-drafts/tests -p 'test_*.py' -v
node docs/content-drafts/skills/content/scripts/check-content-graph.mjs docs/content-drafts/tests/fixtures/content-graph/content-graph.json docs/content-drafts/tests/fixtures/content-graph/publisher-handoff.json
```

These were the commands when Content shipped. Since #88 the sources and tests
sit under `docs/content-drafts`, so the commands above use the new paths.

The Node suite passes 27 tests: all 19 migrated tests plus external-root/CLI
denials, package-overlap/symlink checks, real child-process cwd/argument behavior,
relocated read-only package execution, read-only Git mismatch inspection,
changed bytes/stale handoffs, graph path containment and incomplete templates.
The Python suite passes 14 tests, including actual FFmpeg frame extraction, synthetic ASR/media/URL-caption
subprocesses, preserved external venv identity, explicit packer execution,
read-only checks, overwrite/collision denials and all migrated relative links.
Each relocated package is compared byte-for-byte before/after execution.

The skill-creator `quick_validate.py` invocation failed because this environment
lacks PyYAML. The repository’s dependency-free `skill_metadata` parser instead
passes both frontmatters, initial `1.0.0` versions and owned-payload transitions.
No dependency was installed to run metadata checks.

These checks do not claim live Whisper recognition/model download, remote
reference download, Diffusion install/build/launch/export/browser acceptance,
new Linux/Windows physical parity, native skill-discovery behavior or publishing.
See [integration proof](integration-proof.md) for the combined package, native
checks and remaining evidence limits.
