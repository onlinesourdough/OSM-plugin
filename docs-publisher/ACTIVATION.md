# Documentation automation activation

The reconciliation, export and native skill publication code is available. Every
writer is inactive. On 2026-11-20 a dedicated public-only connection was created
and its token stored as the GitHub Actions secret. Real read-only qualification
read all eight guide originals and seven native skill pages; the private context
root returned 404. No live CI write or completed automatic publication is claimed.

## Who writes what

- **Guide originals** (class G) are Notion-authored. CI reads and compares them
  and never writes, repairs or annotates them. No sync mechanics are placed on
  the public guide.
- **Released skill pages** (class A) are the seven existing pages bound by id in
  `manifest.json`. Git owns the tagged skill packages. `native_skills.py` delivers
  each page whole through Notion's Agent Skills API. It addresses only those
  seven page ids and creates no page, database or second catalogue.
- The paragraph writer in `publisher.py` serves only the optional working
  projection. It refuses every class A page, because replacing child blocks
  would drop the page's files.

## The native skill packet

`python3 docs-publisher/native_skills.py build` builds the packets without a
credential, from the approved released commit only (the tag must resolve to it
and equal the package version). Each packet is one skill directory:

- `SKILL.md`, a reading copy whose relative links name the exact released file;
- every supporting file of the skill, and under `resources/` each resource-only
  helper folder the skill reaches through its links, whole;
- `LICENSE`, `SOURCE.json` (commit, tag, versions and a hash of every source
  file) and one stored source ZIP holding the exact Git bytes at their
  repository paths.

The build fails unless the packed archive reads back as the packet and the ZIP
equals the released bytes. Files under `history/` already on a page are carried
forward byte for byte. The previous edition's source ZIP moves to `history/`
at the next release. A different file already under that name is a conflict.

Notion rewrites `SKILL.md` when it returns a skill: block scalars in the
frontmatter, its own page id, and `<br />` for the soft line breaks of a
paragraph. The publisher therefore compares supporting files by their bytes and
`SKILL.md` by name, description, body words, heading/list structure and fenced
code (whose whitespace is retained). This rule
reproduces the seven readbacks taken from the bound pages on 2026-11-20; that is
an observation of those archives, not a qualification of this publisher.

## Required before publication

1. Provision a dedicated Notion integration and share with it only the public
   OSM guide root and skill catalogue. Do not reuse the owner's private
   maintenance credential. Reading needs the **Read content** capability; the
   import also needs **Insert content** and **Update content**. These are the
   capabilities Notion documents for these calls; grant nothing else.
2. Store the token as the GitHub Actions secret `OSM_PUBLIC_DOCS_TOKEN` and set
   the repository variable `OSM_PUBLIC_DOCS_ENABLED` to `true` only when the
   grants have been checked. Do not paste the token in a chat, issue, source
   file or workflow log.
3. Read the exact bound guide IDs through the Markdown v2 API, export their
   originals, compare definition/diagram regions and qualify the reader's body
   representation. Missing access, truncation or unsupported blocks are failures.
4. Run `python3 docs-publisher/native_skills.py preflight --checkpoint
   skill-checkpoint.json` (the workflow does this once access is configured).
   It only reads. For each page it checks the identity (the exact page, not in
   the trash, a row of the bound catalogue with one title and the properties
   Key, Version, Source revision, Package version and Status), downloads the
   skill archive and reports the page's state. Confirm on real pages that the
   catalogue is the parent recorded as `reading_export.catalogue` and that the
   five properties are text, select, status or URL properties.
5. Record the handoff. When a page is in the state the existing upkeep
   relinquishes, copy its `handoff` object from the checkpoint into that
   artifact in `manifest.json`, set `public_writer` to `ci` and
   `adoption_state` to `adopted`, in a reviewed commit. The record holds the
   files and skill digests, title, the five property values and the read time.
   The first import replaces exactly that state; a page that differs from it is
   a conflict and is kept. The recorded Status is the one CI restores.
6. Set `activation.active` in a reviewed commit, then qualify one bounded write:
   run the workflow manually on `main` with `native_write_key` set to one Key.
   It imports that page only, restores the canonical title and the five
   properties, and reads the whole page back. Verify on the real page that files
   absent from the archive were removed (the documented replace behaviour),
   that nested folders and `history/` are intact, that earlier file links still
   resolve, and that the title and properties are as recorded. With
   `public_reader` null this run ends in a visible HOLD by design.
7. Qualify the anonymous public read. The manual `reader_probe` workflow input
   launches a secret-free, isolated Chromium context and checks the existing
   public Log page's visible title and versions. After qualification,
   `preflight --browser-public-read --public-base ... --public-catalogue ...`
   reads every public page and the catalogue without a
   credential and passes only when the skill text and catalogue entry are
   actually in the answer. An answer that is only a script shell fails. Record
   `activation.public_reader` with its review only if that read is shown to
   establish the content; otherwise the reader stays null and no run completes.
8. Run the serialized workflow, verify the whole set, then verify a repeat run
   that writes nothing. Only then is automatic publication claimed.

Existing bound pages need no extra working database. Provision one only if a
separate main-working technical projection is wanted, then record its exact
identity in `bindings.working_subtree`. Publication refuses another database.

## What the checks establish

- Offline reconciliation compares Git, frozen Notion originals and declared
  exports. It cannot know whether a live original changed after its read time.
- A live snapshot reads only explicit public guide IDs. It does not follow
  private links or enumerate the owner's workspace.
- A different Markdown representation is not proof of equal full content.
  Exported YAML/Mermaid regions are compared independently; whole-body equality
  remains unsupported until the representations are qualified. A live comparison
  fails on an unqualified representation; publication cannot proceed from it.
  The real Markdown v2 reads on 2026-11-20 matched all eight complete MCP bodies
  byte for byte after replacing expiring native file URLs with their fixed
  Notion block/file/workspace identities. Each binding records that qualification
  against its exact content revision; a new original or unknown media URL fails.
- The release guard resolves the approved tag to its exact commit. Before a new
  tag, every guide original must be bound to the intended package edition.
  When live parity is enabled, wait for `osm/public-guide-parity` success on that
  exact main commit before tagging. Release publication requires that status;
  it never reads the Notion secret itself. With live parity disabled, the release
  job explicitly reports the frozen baseline's read times instead.
- Publication writes only artifacts assigned to CI. Notion-authored guide
  originals and optional Content templates are never overwritten or repaired.
- A skill page is unchanged only when its supporting bytes, the meaning of its
  `SKILL.md`, its title and its five properties all equal the released packet.
  Notion's `version_id` is used as an observation: it must not move between the
  read and the import, and it is kept in the checkpoint. It never decides a no-op.
- The workflow summary and result state that automatic publication is not
  active until the manifest records activation, every handoff and a qualified
  reader, and the run itself passed. A missing variable, secret, capability or
  page grant is named in the summary and as a workflow error.

## Retry, conflict and concurrency limits

The workflow concurrency group serializes publication; it runs only on `main`,
never for a pull request or fork, and the release workflow never receives the
secret. One writer owns each artifact.

For a skill page, `publish` writes nothing without `--write`, and refuses the
whole run when more pages need a write than `--max-writes` allows (one by
default). Before importing it re-reads the page's `version_id`. A page is
replaced only when it is the recorded handoff state or the unmodified packet this
publisher builds for the earlier release named in the page's own `SOURCE.json`.
Anything else is a conflict and is kept. A change to the packet format therefore
needs a newly recorded handoff.

- An import with no usable answer is read back before anything else. If the
  packet is on the page the run continues; if the page is unchanged the run
  stops and does not repeat the import; otherwise it stops for inspection.
- If the import landed and the title or properties were not restored, a rerun
  finds the packet on the page and restores only those, provided each property
  holds the released value, nothing, or the recorded handoff value. Any other
  value is a conflict to settle by hand.
- A truncated, oversized or unsafe archive, a redirect, a wrong page identity
  or a missing property stops that page before any write.
- The token is sent only to the API host and no redirect is followed. The
  signed archive address is fetched without the token and is never stored,
  logged or put in an error. The checkpoint holds digests and public values.

The paragraph writer's limits are unchanged: a pending marker, before/after
source and body hash identify progress, an unknown write is read before retry,
and replacing child blocks is not atomic. Do not run another writer on pages CI
owns. No row is deleted, but Notion's retention of replaced content is outside
this implementation's guarantee.

The fixtures are not live evidence. Record the actual reviewed artifact, grants,
readback, public checks and no-op rerun when these gates have been met.
