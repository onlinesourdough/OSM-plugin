# Documentation

The Onlinesourdough Method (OSM) is maintained in this repository. The plugin
distributes the method as skills and supporting tools. Resources presents
selected documentation for people; it is a reader of this source.

## Choose a starting point

| Question | Read |
| --- | --- |
| What is OSM, and how do I start? | [Repository introduction](../README.md) |
| How do I take a first task from setup to a fresh chat? | [Notion starter](starter.md) |
| What does my installed version provide? | [Versioned OSM overview](osm.md), shipped with the plugin |
| How do the parts and their responsibilities fit together? | [Architecture](architecture.md) |
| Which method should I use? | [Skill index](skills.md), then the relevant skill |
| How do I install, update, switch or recover an app registration? | [Native installation](native-installation.md) |
| How do I set up a clean workspace with the right tools and approvals? | [Agent workspace guide](native-installation.md#start-with-a-clean-agent-workspace) |
| How is my context home organised, what may agents write there, and how are records kept current? | [Context Architecture](../skills/osm-data-context/references/architecture.md): its [home write policy](../skills/osm-data-context/references/architecture.md#home-write-policy) and [record lifecycle](../skills/osm-data-context/references/architecture.md#record-lifecycle) |
| What does the Codex entry show? | [Codex integration](sidebar.md) |
| How is the public Notion guide kept aligned, and who writes what? | [Publication](publication.md) |
| How do I contribute? | [Repository contract](../AGENTS.md) |

An agent can use the installed [documentation route](../skills/osm/references/documentation.md)
to select one relevant source. Reading this whole library is unnecessary.

## Source and documentation

The [public Notion method guide](https://gustavanderson.notion.site/40d6d2e17f568124af82ceb93dabf77a)
is the human-readable guide to OSM. It contains the method, definition template,
setup cases and architecture. Git versions the installable plugin, executable
skill instructions and technical implementation. The publisher binds the exact
Notion originals and declared exports; it never overwrites a guide original from
Git. See [publication](publication.md) for the technical procedure.

A company uses its own private Data & Context home. That definition directs agents
to relevant Knowledge, Memory, Skills and original systems. Operational data need
not be copied into Notion. Access, permitted processing and retention are separate
choices.

OSM Content and Agentic System are separate methods with their own repositories.
They are not installed by OSM. Resources selects stated source revisions for its
own lessons and presentation.

### What a statement can mean

Documentation here separates four states, and no text should blur them:

| State | Meaning | Where to look |
| --- | --- | --- |
| Declared | Stated in a manifest, skill or document | The file itself |
| Fixture-tested | A repository check or fixture passes at a recorded commit | [Verification](verification.md); fixture proof is not native or live proof |
| Native-tested | Observed in an installed app | Only what [verification](verification.md) records for that release |
| Released | Published as a GitHub Release | [GitHub Releases](https://github.com/onlinesourdough/OSM-plugin/releases); v0.35.1 is the latest stable release. The retained v0.34.0 source tag did not publish a GitHub Release. |

v0.35.2 is the latest reviewed source tag, at `41b210e22a58569d20cdaa09b247c1c61421ad0b`. Its release check stopped before publication because the matching changelog entry was absent; no 0.35.2 GitHub Release was created. The manifest binds that immutable source and seven skill rows; 0.35.1 remains the latest published stable release. Native adoption, Notion source-packet delivery and public readback are
recorded separately in [verification](verification.md).

### Documentation consumers

Keep the existing entrypoints stable when editing the README:

- Resources selects the introduction and the `Install in your app`,
  `Your context home` and `Start with a real task` sections. Its manifest chooses
  the documents and sections; its lock records the exact source commit and hash.
- The public profile generator reads `Why I built this`. Keep that heading and
  edit its source here when the story changes, rather than patching generated copies.
- An installed agent reads its packaged methods and versioned overview. It does
  not fetch instructions from Resources to perform a task.

The README introduces the shared skill source. The starter names the release its
walkthrough requires. Consumers pin a tagged release
or label their working revision.

`tests/consumer-selection-rehearsal.py` rehearses both selections locally against this
repository (headings present once and non-empty, links resolvable, no private data); it
deploys nothing and does not run the consumers.

A new guide or renamed heading needs an explicit consumer update. Resources
refreshes and reviews its pinned content through its own workflow; a repo edit
alone does not update the website. Preserve attribution, source links and the
distinction between a released version, `main`, and a preview. An unavailable
refresh must not silently replace the last verified copy or imply it is current.

## Contributing and operating

Use [AGENTS.md](../AGENTS.md) for the working contract and affected checks.
[Ownership](ownership.md), [distribution](distribution.md),
[skill versioning](skill-versioning.md), [verification](verification.md),
[recovery](recovery.md) and [security](../SECURITY.md) serve maintainers.
Open issues and pull requests own unfinished work. The
[changelog](../CHANGELOG.md) records change history, including source candidates;
[GitHub Releases](https://github.com/onlinesourdough/OSM-plugin/releases) own
published versions. Neither an issue, a changelog entry nor a passing fixture
establishes native behavior or installation.

## Earlier names and dated evidence

Use [Earlier names](osm.md#earlier-names) and the
[migration procedure](../skills/osm-setup/references/migration.md) only when
upgrading or recovering an existing installation. AIOS filenames, format
markers, stored keys and managed instruction blocks can be compatibility
contracts. Classify them before changing them; a branding cleanup is not a
user-data migration.

The [archive](archive/README.md) holds dated lifecycle and candidate records;
preservation maps, [verification](verification.md) and `evidence/` retain dated
decisions and implementation proof. Use them to answer
a historical or verification question, then check current skills and source.
They are not an additional onboarding path or an instruction to restore retired
features. `todo.md` explicitly records a retired tracking fallback, not a live
backlog.

Consolidating records keeps needed provenance and recovery proof, accounts for
inbound links and test references, and coordinates with the implementation writer
before files move. Git history preserves the earlier paths; active compatibility and
accepted evidence need a deliberate owner. Nothing was deleted: the twelve archived
records moved unchanged, and the remaining dated documents (preservation maps,
integration proof, home connection and the retired-skill notes) stay because live
documents or skills still link them.
