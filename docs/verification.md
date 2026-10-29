# Verification

On 2026-10-29 the package was prepared as OSM 0.31.0 on
`feat/osm-home-internal-notion-74-82`, on top of `e353588`. Only the version
changed.

**What changed.**

- The version is 0.31.0 in the eight package and manifest declarations and in
  the local overview (`docs/osm.md`), and the changelog entry is dated.
- The rebuilt `runtime/sidebar/index.html` and `runtime/sidebar/server.cjs`
  differ from `e353588` only in their four version strings.

**Checks.**

- A second build reproduced both runtime files and the notices byte for byte,
  and the stdio smoke passed.
- Validation (`--baseline 314dcf1` and `--release-tag v0.31.0`), the
  onboarding check and `git diff --check` passed on a clean clone of
  `e353588` carrying exactly these changes.
- The sidebar unit tests and the documentation, layout, continuity,
  skill-version and context-footprint checks read none of the changed files
  and were not rerun; their earlier results stand.

**Not done.** No 0.31.0 tag or release exists yet. Home's internal connection
still reports `unsupported_host` in this build, so internal-mode Home cannot
connect on any host; Home's other behaviour is proven at fixture level only.

**Native proof.** None.

On 2026-10-29 the Sol r9 corrections and the L-2 context binding (`c43c5c8` on
`feat/osm-home-internal-notion-74-82`, on top of `f776dfb`) addressed R9-1 to
R9-3 and L-2 at fixture level.

**What changed.**

- R9-1: an observed account change now holds until Home observes `ready` with
  `mapping: saved`. No other status lifts it: not an official-mode projection
  (which makes no connection check), a missing projection or connection, a
  failed, pending, mapping-less, `unavailable` or `rate_limited` check, or a
  list or read that reports `account_changed`. While it holds, Home shows the
  account-change gate, or for a failed or transient check its own gate with
  Try again, and reads no page icons. A context change ends it for the new
  context.
- R9-2: while it holds, the setup and Settings context pickers leave the
  context page and the saved source pages out of their live results, also
  results already listed or searched, without closing an open list or
  clearing its search. A context switch confirmation that names a saved page
  keeps the choice but hides its question.
- R9-3: choosing the 'Selected page' entry of a pending setup selection keeps
  that selection and its title.
- L-2: when the context route is configured, every `osm_home` status path
  names that context, taken from the same context-route read as its
  projection. Home does not apply a status that names another context: it
  counts as a failed check, which cannot end a held account change, and
  Refresh reads the current context. A status without a context field is
  applied as before. In the product that is the server's error fallback and
  a status read without a configured context route; neither can end a held
  change, which needs `ready` with `mapping: saved`. The synthetic test
  fixtures written before L-2 also carry no context field and stand for the
  panel's own context. Lists and reads were already bound to their context by
  their scope.

**Fixture results.**

- **Fail-first:** the seven R9 tests failed their assertions on an inert copy
  of `f776dfb`. That log's own first-failure check failed (it stopped before
  Node 26's failing-tests recap) and is kept as failed; the raw output was
  checked separately. The three L-2 tests then failed their assertions on an
  inert copy of `f776dfb` with the R9 corrections. No timeouts or runner
  errors.
- **Checks:** 182/182 sidebar unit tests passed on the final sources. The
  build regenerated only `runtime/sidebar/index.html` and
  `runtime/sidebar/server.cjs`, a second build reproduced both byte for
  byte, and the stdio smoke passed, including its new check that the bundled
  server's status names its configured context. Validation
  (`--baseline 314dcf1`), the onboarding check and `git diff --check` passed
  on a clean clone of `c43c5c8`. The documentation, layout, continuity,
  skill-version and context-footprint checks read none of the changed files
  and were not rerun.
- **Limits:** as recorded for `efd43df`. Home in official mode makes no
  connection check, so a newly opened panel does not observe the change. A
  panel notices a context change made elsewhere only on Refresh; until then
  it shows its own saved links as before. A status without a context field is
  not bound. The two residuals disclosed for `efd43df` are corrected.

**Native proof.** None.

On 2026-10-29 the Sol r8 corrections (`efd43df` on
`feat/osm-home-internal-notion-74-82`, on top of `00a9c61`) addressed R8-1 to
R8-4 at fixture level.

**What changed.**

- R8-1: after an observed `account_changed`, Home offers no saved-links path
  and opens no saved target. Settings and setup hide their five saved-source
  fields and show the context without its saved name; both keep the draft and
  an unfinished link and refuse to save source links until Home is ready again
  with a mapping for the current connection. The saved bytes don't change.
- R8-2: the reader shows only the answer to its own request and section;
  invalidation and settlement still run first.
- R8-3: a block text cut at 20,000 characters or 200 rich-text items marks the
  article truncated, so its notice shows. F5 is unchanged.
- R8-4: the Context projection procedure states this phase's verification
  limit instead of citing `osm_home`.

**Changed test expectations.** Two `account_changed` expectations that
described the old behaviour were removed, and each is replaced by a stronger
test: the tuple in the gates test (gate action to saved links) and the state in
the R4-2 test (links view kept after Refresh). The R4-2 removal followed a
stop: the first full run after the fix failed only that iteration (166/167).
No other assertion changed; the 41 base test bodies and the F1 icon control are
byte-identical.

**Fixture results.**

- **Fail-first:** the four R8 tests failed their assertions on the `00a9c61`
  sources; the links-chosen account-change test failed on an isolated
  `00a9c61` export; the three Settings and setup tests failed on an inert copy
  of the uncommitted R8 fix without them; and the setup context picker test
  failed on an inert copy of the uncommitted fix without its one-expression
  change. No timeouts or runner errors.
- **Checks:** 172/172 sidebar unit tests passed on the final sources. The
  build regenerated only `runtime/sidebar/index.html` and `server.cjs`, a
  second build reproduced them byte for byte, and the stdio smoke passed.
  Validation (`--baseline 314dcf1`), footprint, documentation, onboarding,
  layout, continuity and skill-version checks passed on a clean clone of
  `efd43df`, and `git diff --check` passed.
- **Limits:** an open list of saved choices closes as on every Refresh and a
  typed page search is cleared on its next open; hidden fields and the hidden
  links view keep their content in the page; the suppression starts only once
  Home has observed the change.
- **Disclosed for review:** the context pickers keep listing live pages from
  the official connection, which can show the context page under its current
  title; and choosing setup's 'Selected page' entry while suppressed brings
  the saved name back only at the next status refill. No saved byte changes in
  either case.

**Native proof.** None.

On 2026-10-27 the Sol r6 correction (`df5ee99` on
`feat/osm-home-internal-notion-74-82`, on top of `74908c6`) brought reads into
Home's recovery settlement.

**The three request paths.** `osm_home` (`load()`), `osm_home_list` (`list()`,
including Load more), and `osm_home_read` (`read()`). Each now takes part in
settlement:

- A current-generation read that is pending, or that failed (`unavailable` or
  `rate_limited`), keeps the recovery unsettled. This holds even after Back or
  another selection.
- `rearm()` runs again after a read answers validly.

No request, timer, store or transport was added.

**Fixture results.**

- **Checks:** the build passed with no `runtime/sidebar` diff, 163/163 sidebar
  unit tests passed, and the stdio smoke passed. Validation
  (`--baseline 314dcf1`), footprint, documentation, onboarding, layout,
  continuity and skill-version checks all passed on a clean clone of `df5ee99`,
  and `git diff --check` passed.
- **Fail-first on the `74908c6` sources:** each new test was run alone and
  matched exactly one test. The pending-read tests (with and without Back) and
  the failed-read tests (`unavailable`, `rate_limited`) failed their assertions.
  Three tests passed there as coverage only:
  - the successful-last-read test;
  - the old-generation answers test;
  - the section Try again test.
- **Targeted variants on copies:** each coverage-only test failed its assertion
  under the variant it targets:
  - no re-check after a read;
  - no generation check;
  - a section Try again without a reset.
- **No timeouts or runner errors** occurred in this run.

**Native proof.** None.

On 2026-10-27 the Sol r5 correction (`4289942` on
`feat/osm-home-internal-notion-74-82`, on top of `7ff9e18`) re-armed Home's
automatic recovery.

**Cause.** The run 72 brief said the budget "resets only on an explicit refresh,
Try again/retry, or a context change". That wording did not restate the
positive rule, and `7ff9e18` followed it. After one automatic recovery, every
later independent invalidation therefore cleared Home and showed the gate with
no automatic reload.

**Now (R5-1, I2):** one automatic status reload per independent invalidation
episode. `revoke()` spends the budget and marks a recovery active. The budget is
re-armed only when that recovery has settled successfully:

- its status loaded as ready;
- every section it requested answered for the current generation with current
  valid data;
- none of those sections is still pending, failed or invalid.

A ready status alone, or one healthy sibling, is not enough. Refresh, Try again
(the gate's or a section's) and a context change re-arm explicitly. No timer,
store or transport was added.

**Fixture results.**

- **Checks:** the build passed with no `runtime/sidebar` diff, 156/156 sidebar
  unit tests passed, and the stdio smoke passed. Validation
  (`--baseline 314dcf1`), footprint, documentation, onboarding, layout,
  continuity and skill-version checks all passed on a clean clone of `4289942`,
  and `git diff --check` passed.
- **Fail-first on the `7ff9e18` sources:** the two "distinct invalidation
  reloads once more" tests and the section Try again test failed their
  assertions. Four negative controls passed there, because the old code never
  re-arms:
  - ready status alone;
  - one healthy sibling;
  - the FIRST version of the alternating-answers test (corrected in run 74: the
    final, strengthened version was not rerun on `7ff9e18`; only the naive
    variants below exercise it);
  - context change.
- **The negative controls still discriminate.** On temporary copies with naive
  variants, each control failed or timed out by looping:
  - re-arming on any accepted list result;
  - re-arming on a ready status;
  - not resetting on a context change.

**Native proof.** None.

On 2026-10-27 the Sol r4 core corrections (`841e86e` on
`feat/osm-home-internal-notion-74-82`, on top of `fba8dcb`) fixed four cases:

- **R4-1, I1.** A data source whose schema parent is another data source is
  support when either parent ID is support, otherwise unresolved. There is no
  traversal into that source.
- **R4-2, I3.** Links the user chose allow icon reads only on a resolved ready
  status.
- **R4-3, I2.** Accepted results no longer reset the automatic recovery budget;
  only Refresh, Try again or a context change does. That was too narrow:
  recovery was never re-armed. Corrected in run 73; see the entry above.
- **R4-4, I1.** The ancestry bound counts every hop per item, cached or not.

No read was added. (a) and (d) remain unresolved, pending an owner decision.

**Fixture results.**

- **Checks:** the build passed with no `runtime/sidebar` diff, 149/149 sidebar
  unit tests passed, and the stdio smoke passed. Validation
  (`--baseline 314dcf1`), footprint, documentation, onboarding, layout,
  continuity and skill-version checks all passed on a clean clone of `841e86e`,
  and `git diff --check` passed.
- **Read table:** the published read-table cases keep their exact counts.
  Corrected in run 73: counting a hop before the cache lookup can make a deeper
  chain stop earlier with fewer reads. For one such chain, Sol r5 traced 7 page
  reads at `fba8dcb` and 6 at head. That figure is from Sol's source trace and
  its own receipt for the earlier count, not a result of these checks; Sol's
  receipt for the head count was lost to a read-only filesystem.

Fail-first on the `fba8dcb` sources:

- **R4-1 and R4-4:** failed.
- **R4-2:** failed.
- **R4-3, both scope variants:** never terminated, which is the unbounded
  recovery loop itself. Each was killed by its timeout.
- **F1 positive control:** passed.
- **Missing scope-less list case:** already handled at `fba8dcb`, so it passed
  there.

**Native proof.** None.

On 2026-10-27 the Sol r3 repairs (`bf083bc` on
`feat/osm-home-internal-notion-74-82`, on top of the reviewed `65c816d`) enforced
four rules, one shared place each.

- **I1, support containment:** one predicate for every list and read path.
- **I2, invalidation:** `current()` classifies every service state.
- **I3, automatic official reads:** these need positive resolved evidence.
- **I4, persistence:** the reader's UTF-8 byte bound applies before any
  replacement.

**Fixture results.**

- **Checks:** the build passed with no `runtime/sidebar` diff, 143/143 sidebar
  unit tests passed, and the stdio smoke passed. Validation
  (`--baseline 314dcf1`), footprint, documentation, onboarding, layout,
  continuity and skill-version checks all passed on a clean clone of `bf083bc`,
  and `git diff --check` passed.
- **Discrimination:** the new and updated tests run against the `65c816d` sources
  failed exactly the I1 to I4 tests and the read table. The 89 tests that already
  existed, including the F1 positive control, passed there.

The fixture changed in two places to match the service and API contracts:

- **Scripted results carry scope.** Scripted list and read results now carry the
  scope they were read under, as the service's ready results do.
- **Data sources carry `database_parent`.** Fictional data sources now include
  this documented required field.

**Read counts.** A data-source record read now also reads its source's schema:
`read property-only memory` goes from schema 0 to 1. This is the bounded I1
check, which uses the data source's `database_parent`, not a database read. New
rows:

| Case | Reads |
| --- | --- |
| List with support ancestry (5 mapped pages) | 10 page reads, 1 returned |
| Read a page under a support row | 2 page reads |
| Read a page three levels below the root | 4 page reads and 1 body |
| List a data source in a support database | 1 schema read and no query |

**Consequence of refusing unresolved containment** (as corrected in run 72):

- **(a), pending an owner decision.** An external database is not listed until
  its whole ancestry can be read within three ancestor-page steps. Sharing its
  immediate parent alone may not be enough.
- **(d), pending an owner decision.** A page-list row of a data source is
  refused, even when that data source is mapped elsewhere.
- **Withheld as unresolved.** Pages under block parents, and chains needing more
  than three ancestor-page steps.

**Native proof.** None.

On 2026-10-27 the Sol r2 repairs (`121d626`, on top of `80b220d`) addressed the
variants Sol r2 named. Sol r3 found F1 and F2 still incomplete; see the entry
above. F4 and F5 were resolved in r1.

**Fixture results.**

- **Checks:** the build passed with no `runtime/sidebar` diff, 134/134 sidebar
  unit tests passed, and the stdio smoke passed. Validation
  (`--baseline 314dcf1`), footprint, documentation, onboarding, layout,
  continuity and skill-version checks all passed on a clean clone of `121d626`,
  and `git diff --check` passed.
- **Discrimination:** the new tests run against the `80b220d` sources failed
  exactly R2-1, R2-2 (official to internal), R2-3 and the updated read table. The
  internal-to-official refresh test pins unchanged behaviour and passed there.

The variants and their tests:

- **R2-1:** a row of a support data source mapped individually in a context page
  list is not listed (counted, not named) and is refused on read with no block
  request.
- **R2-2:** a refresh from official to internal makes no icon read while the new
  status is pending or after it resolves. A refresh from internal to official
  reads icons only after official resolves.
- **R2-3:** a denial arriving after Back clears the title with one status
  recheck and no loop.

The read table adds the page-list cases: listing one with a support row reads 3
pages and returns 2; reading that row reads only its page.

**What is enforced for support material.**

- A projection that maps a support source or page as context is refused.
- Support pages are left out of context database lists and refused before any
  request.
- Pages whose parent is a support data source are refused at read time, before
  their title, fields or blocks are used.

**Native proof.** None.

On 2026-10-27 the Sol r1 repairs (`3ca28a6`, on top of the reviewed `d7ba06f`)
addressed five findings. Sol r2 later found F1–F3 only partly resolved; see the
entry above.

**Fixture results.**

- **Checks:** the build passed with no `runtime/sidebar` diff, 130/130 sidebar
  unit tests passed, and the stdio smoke passed. Validation
  (`--baseline 314dcf1`), footprint, documentation, onboarding, layout,
  continuity and skill-version checks all passed on a clean clone of `3ca28a6`,
  and `git diff --check` passed.
- **Discrimination:** the new tests run against the reviewed `d7ba06f` sources
  in a temporary export failed exactly the tests for F1 (internal Home), F2,
  F3, F4, F5 and the updated read-count table. The tests that pin unchanged
  icon behaviour for an official-mode projection and without a projection
  passed there too.

The findings and their tests:

- **F1:** internal Home makes no `osm_notion_icons` call, including before
  `osm_home` resolves. Official mode, no projection, and links the user chooses
  keep their icons.
- **F2:** a support row inside a Memory data source isn't listed, and a read is
  refused with only the identity request.
- **F3:** a listed record that becomes inaccessible clears its titles with one
  status recheck and no loop. An initially inaccessible source makes no extra
  call.
- **F4:** a trashed root is `root_inaccessible`.
- **F5:** a property over 4,000 characters marks the article as partial.

The per-case read table gains "Read support row inside Memory": identity 1, all
others 0.

**Native proof.** None, as before. Official-route icon behaviour in a real
Codex panel and real Notion trash and access changes remain unverified.

On 2026-10-26, contract delta 1 (`5559d7f` on
`feat/osm-home-internal-notion-74-82`) made Home a generated projection of one
AI Operating Model definition revision, with an explicit connection mode and
support material excluded. Saved-text sizes, fixture results and native proof
are recorded separately below and support different claims.

**Saved-text size.** The fictional fixture projection (`osm-home-projection/1`,
five context sections) saves as 4,198 bytes against a 32,768-byte limit. This is
a size observation only. The owner's 53.6% entry and 50.0% source-index
reductions are recorded in #69; this repository did not measure them.

**Fixture results.** The build passed with no `runtime/sidebar` diff, 123/123
sidebar unit tests passed, and the stdio smoke passed, including a saved
official-mode projection reporting `official_mode`. Validation
(`--baseline 314dcf1`), footprint, documentation, onboarding, layout,
continuity and skill-version checks all passed on a clean clone of `5559d7f`, and
`git diff --check` passed. New tests cover:

- the projection being replaced only by a new revision and refused without one;
- official mode making no request;
- support material never shown as context;
- synthetic fixture IDs;
- generated links' revision and the partial-view label.

Reads per case against the fictional workspace (fake transport, internal mode):

| Case | Needed sources | Identity | Page | Schema | Query | Body |
| --- | --- | --- | --- | --- | --- | --- |
| Status (identity and mapped root) | 1 | 1 | 1 | 0 | 0 | 0 |
| List profile pages | 2 | 1 | 2 | 0 | 0 | 0 |
| List memory titles | 1 | 1 | 0 | 1 | 1 | 0 |
| Read property-only memory | 1 | 1 | 1 | 0 | 0 | 1 |
| Read About with nested blocks | 1 | 1 | 1 | 0 | 0 | 3 |
| Outside page via page list | 0 | 1 | 0 | 0 | 0 | 0 |
| Outside page via data source | 0 | 1 | 1 | 0 | 0 | 0 |
| Support material | 0 | 1 | 0 | 0 | 0 | 0 |

The same cases in official mode make no request.

**Native proof.** None. This proves no native Codex or Claude behaviour, native
YAML support, internal-connection boundary in a real workspace, official-route
reading or daily run. Those remain open under #61, #69 and #82.

On 2026-10-26 the Home reader and internal Notion connection candidate
(`bbedf80` on `feat/osm-home-internal-notion-74-82`, from `main` `314dcf1`) was
checked with Node 26.12.0 and Python 3. npm was not installed, so the existing
dependencies were used with `node build.mjs`, `node --test *.test.mjs` and
`node smoke.mjs`.

Results:

- **Build:** passed, and the committed `runtime/sidebar` has no diff.
- **Sidebar unit tests:** 115/115 passed, 18 of them in `home.test.mjs` and 12
  new Home DOM tests.
- **Bundled stdio smoke:** passed, including the new tools, `unsupported_host`
  and a mapping save and readback.
- **Rehearsals:** the footprint, documentation, onboarding, layout, continuity
  and skill-version rehearsals passed.
- **`git diff --check 314dcf1 HEAD`:** passed.
- **`validate.py --baseline 314dcf1`:** passed on a clean clone of `bbedf80`. In
  the writer worktree it fails on a sandbox device file at `.mcp.json`, which is
  not part of the repository.
- **Discrimination check:** removing the data-source parent fence from a temp
  copy failed exactly the outside-page test.

The fixtures cover:

- allowed root, child and database reads;
- an outside page denied for fetch, query and linked source, without leaking;
- a linked external database denied until it is granted;
- revocation, account change and scope change clearing everything;
- property-only memory and a second model's names;
- paging and block bounds, and unsupported blocks;
- hostile text;
- the absence of the token from every result;
- old saved links loading unchanged;
- tab keys, Back focus, More, the gates, and the 500/320 px styles.

No live Notion request, token, grant or native Codex or Claude run was made.
Those remain with the approved native holders.

After lead Review on 2026-10-23, the candidate renames the new-customer Notion
template to `notion-osm.md` (page **OSM**, no operating-system framing) and
makes the `aios` → `osm` switch disable `aios` before fresh-session acceptance,
with rollback by disabling `osm` and re-enabling `aios`. `validate.py --baseline
b3bb4d4 --release-tag v0.30.0` passed with new template and switch-procedure
guards and three negative controls, as did the documentation, onboarding,
skill-version, footprint, layout and continuity rehearsals and entry-routing
fixture preparation. Runtime bytes did not change, so the sidebar build and unit
tests were not rerun. Native disable/enable and fresh-session acceptance remain
the lead's native checks.

On 2026-10-23 the OSM 0.30.0 identity candidate (`0a04d0b` on
`feat/osm-identity-62`, from `main` `b3bb4d4`) passed with Node 22.22.3 and
Python 3.14.5: `npm ci --ignore-scripts`, build, 85 sidebar unit tests and the
bundled stdio smoke; `validate.py --baseline b3bb4d4 --release-tag v0.30.0`,
including rename lineage and the new compatibility negative controls; the
documentation, onboarding, layout, continuity, skill-version and footprint
rehearsals; model-selection, intent-trial and entry-routing fixture preparation;
and Claude CLI inline discovery in a temporary config. A second build after
commit left no `runtime/sidebar` diff. New unit tests read a 0.29.0
`AIOS:BEGIN` block and `CODEX_HOME/aios/panel` links without migration. Codex
`plugin/read` in an empty temporary `CODEX_HOME` returned no enabled Setup entry,
because nothing was installed there. Native install, upgrade from `aios`, Codex
UI, fresh-session model behavior and owner adoption are not verified by these
source checks.

On 2026-10-17 the owner checked `1d719a2` in the installed Codex sidebar: the centred
geometry is accepted, but its own greys looked lighter than the neighbouring icons in the
light theme and too dark in the dark theme. The next candidate keeps the geometry, packaged
PNG and tool and server icon delivery, and removes the SVG's own colours so it paints only
with `currentColor`. With Node 26.8.1 and the copied locked dependencies, the updated smoke
failed on the `1d719a2` bundle (its `<style>`) and passed on the candidate. A stdio
comparison found every `tools/list` field, server identity and capability unchanged apart
from the icon bytes, still shared by `aios_open` and the server. Two builds were
byte-identical. The [browser comparison](evidence/icon-56/README.md) is a proxy. Whether
Codex colours the icon like its neighbours has not been observed.

Later on 2026-10-16, with `687f99a` installed and all its bytes verified, the owner's
restarted Codex still showed the AIOS sidebar icon far darker than its neighbours: a second
native failure. `1d719a2` centres the mark and sends one theme-less SVG as both the
`aios_open` tool icon and the server icon, through an owned `tools/list` handler on the SDK's
public low-level server. With Node 26.8.1 and the copied locked dependencies, the bundled
smoke failed on the `687f99a` bundle (no tool icon) and passed on `1d719a2`, including a
rejected invalid argument, Settings, status and saves. A stdio comparison found every
`tools/list` field, server identity and capability unchanged apart from the new
`aios_open.icons` and the changed server icon, which now match. Two
builds were byte-identical. The 83 unit tests were not rerun: none imports the server. The
[browser comparison](evidence/icon-56/README.md) is a proxy. The owner's 2026-10-17 check
above accepted its geometry and failed its colour.

Earlier on 2026-10-16, the owner restarted Codex with #56 candidate `6d3e040` installed. The AIOS
panel looked fine, but the global sidebar icon was almost black on the dark sidebar: a
native contrast failure. Which icon metadata Codex selected is not known. The repair sends
one theme-less adaptive SVG server icon with a neutral fallback colour and keeps the
packaged PNG. The new bundled smoke failed on the `6d3e040` bundle (two icons) and on a
`#8a8a8a` fallback draft (under 3:1 on a light selected background), then passed on the
repair with Node 26.8.1. The rebuild was byte-identical and changed only the icon
expression. The [browser comparison](evidence/icon-56/README.md) is a proxy, not a native
capture. Whether the installed Codex sidebar shows the repaired mark, readable in light
and dark themes, selected and unselected, has not been observed.

On 2026-10-13, the issue #56 icon candidate (still 0.29.0) replaced the plugin icon and
the sidebar server icon with one context-hub mark. The locked sidebar build changed only
the icon expression in `runtime/sidebar/server.cjs`, and a rebuild was byte-identical. Node
26.8.1 ran the 83 sidebar tests and the bundled smoke, which decodes both themed
`serverInfo` icons and still opens the tool and resource. Dependencies were a hash-verified
copy of the main checkout's locked install, not a fresh `npm ci`. The
[browser comparison](evidence/icon-56/README.md) uses the actual emitted payloads and PNGs
and is not a native Codex capture. An installed, reloaded Codex showing the new icon and
still opening AIOS remains unverified.

For the AIOS 0.29.0 design-skill retirement, `validate.py --baseline a14f285` (22 versioned
skills), the seven release Python checks, `skill-version-rehearsal` and the content graph tests
pass. Entry-routing, intent-trial and model-selection runs only prepared fixtures, not native-behavior
proof. Native Claude, Pi and Gemini rehearsals were unavailable to the implementation worker; the
operator separately ran `tests/native-claude-rehearsal.py` on an exact candidate archive in an isolated
Claude config (no model/auth call, no marketplace install), which passed: plugin and marketplace
manifests accepted, a malformed skills type rejected, and inline discovery of aios 0.29.0 with 22
skills and no agents, hooks or MCP servers. Pi, Gemini, the Claude marketplace install lifecycle and
model behavior remain unproven. The locked sidebar
rebuild, `npm test` and installed discovery are verified separately in the release readback.

For the AIOS 0.28.1 design-method candidate, the [synthetic polish rehearsal](evidence/design-polish/README.md)
retains comparable full-scroll service-page views at 1120px/320px in light/dark,
disclosure and form-error states, a dense counterexample, and actual editable
HTML save/reopen, intervening-change preservation and export/reopen observations.
Its check record separates source validation, the unchanged design helper suite
and locked Node 22 sidebar verification from rendered proof. This is writer
evidence, not independent acceptance, model activation, external-editor
compatibility, customer conversion or installed 0.28.1 qualification.

For AIOS 0.28.0, the [Foundation migration](project-foundation.md) retires one
entrypoint and reconciles the current documentation, routing and native package
metadata. The candidate passes the seven maintained Python checks, locked Node 22
build, 83 sidebar tests and bundled smoke. Native installed discovery is a
separate adoption check; an uninstalled package has no enabled Setup entry.
Two fresh T3/Claude 2.1.295 probes did not observe automatic project instructions,
with or without a one-line `CLAUDE.md` import. That pointer was not shipped as a
fix. The pilot explicitly reads canonical `AGENTS.md`; automatic loading on that
invocation remains unqualified. Current Claude documentation supports direct
AGENTS loading and imports, so this is not a claim about every Claude client.
Independent review and the delivered revision belong to the release PR.

On 2026-10-10, the coordinator reported a separate Claude Code 2.1.295 isolated
native lifecycle trial using released public-source snapshots and a fresh private
configuration directory: install 0.27.0, refresh/update to 0.28.0, read native
details, uninstall and remove the marketplace all exited 0. Native list/cache
inventory changed from 26 to 25 skills with Foundation absent; final plugin list
was empty and the shared settings hash was unchanged. No authentication was
copied and no model call or purchase was made. This coordinator-observed result
qualifies that isolated lifecycle through 0.28.0 only, not 0.28.1, model activation,
AGENTS autoload or account-global adoption; it does not replace the earlier
instruction-loading observations above.

The human-review handoff candidate (2026-10-08) links Build, Review and Ship to
one proportional presentation guide and reuses Design's existing visual comparison
method. Source checks cover links, skill versions, layout and context footprint;
the latter reports the conditional guide cost separately from worker launch.
Fresh tool-free Opus 5.5 medium exercises covered a small CLI change with delegated
delivery and a published handoff with inaccessible/mislabelled media and stale
checks. After a brevity refinement, the CLI response used two short paragraphs;
the publication response proposed an in-place repair but still repeated details.
Both publication responses also labelled the removed excerpt “Before (d7)” even
though d7 identified only the old test revision. Independent review caught this
unsupported baseline; use “removed text from the d9 diff” unless its revision is
verified. This is a residual failure, not an all-pass result.
The PR retains actual inputs, outputs, hashes and review. These exercises used
supplied observations; they did not execute repairs, inspect media, establish
native discovery or prove a general improvement over the previous method.
Release and installed behavior remain separate from this source candidate.

A subsequent visual-relevance revision conditionally reuses Clarify and asks
Review to flag visuals that add no understanding. A fresh tool-free Opus context
chose an action/result explanation, a README excerpt and a credential-boundary
diagram for different supplied tasks, and omitted an unchanged phase chart.
This verifies bounded format choices, not real screenshots, interactions or
security behavior. Its recorded input precedes the final wording that Review
flags concerns rather than editing the subject; source review covers that wording.

For AIOS 0.26.0, see [Codex sidebar verification](sidebar.md#verification-and-recovery).
Build and test the pinned author dependencies, check generated runtime equality,
then run the existing source and native onboarding checks. A protocol fixture
does not establish rendered sidebar placement or a new-account OAuth grant.

For AIOS 0.20.0, see [native onboarding](issue-38-onboarding.md) for the
optional Notion connection, native Setup entry, six synthetic decision cases,
Codex parser and Claude lifecycle observations. Run
`python3 tests/onboarding-rehearsal.py`; add `--native` for the separate
read-only Codex check. Desktop rendering and new-account OAuth remain unverified.
Release, installed bytes and live customer access require their own readback.

For AIOS 0.18.0 and write-code 1.1.0, see
[engineering criteria and matched trials](write-code.md#engineering-criteria-revision-110).
The 1.0.2 baseline was tested before editing; identical native tasks and 20
independent checks per revision cover proportional implementation and read-only
review. Source checks and installation/release state remain separate.

For AIOS 0.17.0, see [project creation](project-creation.md) for general workspace
setup, conditional repository seeds, the distinct software-foundation result
and retirement of Create System. The release PR retains source checks,
bounded native observations and independent review; installation/discovery and
release readback remain separate evidence. No hook or Factory qualification is
claimed by this package change.

For AIOS 0.16.0, see [Clarify and retired shelves](clarify.md) for the adopted
explanation purpose, source provenance, two native candidate decision probes
and retirement/recovery boundary. Native package adoption and public archive
state are read back separately after release.

For the 0.15.0 Interview/local-trial change, see
[intent and local trials](intent-and-trials.md) for the accepted boundaries,
baseline/candidate decision probes, ordinary native observations and limitations.
These cover overactivation and selected source reads; the behavioral probes
do not establish installation or a rendered UI comparison. Release and native
adoption are verified separately against the delivered version.

For 0.14.1, [Project Foundation](project-foundation.md) records the independent
project boundary and maintained code/design contracts. Source validation against
0.14.0, documentation, layout, continuity, skill-version and context-footprint
checks pass. These checks verify package routes and contracts, not model behavior
or a live application deployment. Independent review and delivery evidence belong
to the release PR.

For 0.14.0, see [Project Foundation](project-foundation.md) for shared template
content, selected application obligations, CI cadence, runtime boundaries and
the required distinction between source checks and behavioral evidence.

For 0.13.0, see [productivity skill refinements](productivity-refinements.md)
for the accepted five-skill scope, factory boundary and bounded verification.

For the 0.12.0 source candidate, see [Interview and Setup](interview-setup.md)
for the accepted invocation boundaries, rename, README workflow coverage and
bounded proof. The existing source checks now cover 24 canonical skills.
The matched new-home footprint routes have an accepted focus and include the
shared question procedure. An owner interview is conditional; the benchmark
also reports its additional reads and the full setup total with that interview.
It does not treat the broader new conversation capability as a free read.

For 0.11.0, see [design upstream verification](design-upstream.md) for the
optional source contract, inspected revisions, six bounded decision probes and
the separation between source, model-routing and rendered design evidence.

For 0.10.0, see [write-code verification](write-code.md) for the broad code trigger,
shared Build/Review criteria, selected-read impact and native observations.

For 0.9.0, see [integration proof](integration-proof.md) for the preserved domain
methods, project/template changes, actual checks and native evidence limits.

For 0.8.0, see [native installation](native-installation.md) for packaging,
isolated lifecycle commands, actual observations and per-client limits.


For 0.7.0, see [Astra alignment](astra-alignment.md) for the final 17-skill
inventory, individual version checks and bounded native Build/writing probes.
Run `python3 tests/skill-version-rehearsal.py` for the additional metadata and
version-transition tests, and `python3 tests/validate.py --baseline <commit>`
when validating skill version progression. Existing source checks below remain.

For adaptive onboarding 0.6.1, all maintained source checks and unchanged footprint
ceilings pass. Bounded French cold-start baseline/candidate and Danish resumed
conversation probes verify optional source invitations and a sourced concrete
follow-up. They are read-only next-response observations, not complete setup or
live connection/authentication proof. Pi model behavior remains unverified after
the earlier authentication failure. See the [contract and observations](lifecycle-onboarding-foundation.md).

Run the maintained source checks from the repository root:

```sh
python3 tests/validate.py
python3 tests/layout-rehearsal.py
python3 tests/context-footprint.py
python3 tests/continuity-rehearsal.py
```

For model-selection changes, prepare synthetic decision probes with
`python3 tests/model-selection-rehearsal.py prepare /absolute/scratch/path`.
Run the generated prompt and schema through an authorized native evaluator in
an isolated read-only session, then use
`python3 tests/model-selection-rehearsal.py score /absolute/scratch/path/result.json`.
`prepare --baseline REF` supplies the same cases against an existing source
revision. The helper never launches a model or spends account resources itself.
Expected decisions are withheld from the evaluator; inspect explanations as
well as scored fields. Portable-brief cases return actual prompts for inspection
of accepted facts, attachments, judgment and proof without doing the production.
Cases distinguish retained orchestration, whole-task transfer, user-owned
continuation, explicit production here and judgment still required after Spec/Review.
Fixtures supply runtime evidence, so this measures
instruction decisions, not live discovery, switching, installs or task savings.
See the [model-selection record](lifecycle-model-selection.md) for actual results.
Performance claims and authorized comparisons also select the skill's measurement
reference. `context-footprint.py` reports that conditional extra read separately;
the older legacy journeys have no matched measurement route. Portable/whole-task
transfer similarly adds the conditional continuation reference and excludes worker
orchestration when the caller retains no role. Count selected references when making
a claim about that route, rather than treating the default path as its full cost.

`validate.py` checks native declarations, package inventory, skill frontmatter,
relative links, one shared Codex/Pi skill source, the complete legacy-route map,
discovery contracts, owner-template isolation, external-owner coupling,
conditional Risky Changes ownership/routing, optional Guardrails capability
routing without a package dependency or installed claim, and selected security
regressions. It also builds an isolated package copy so author-only files
cannot satisfy product links.

`context-footprint.py` compares representative selected-read paths with accepted
legacy commit `ca1ba807716d1a992889f02d41cddf94fdee9f32`. The checked-in
manifest records every old path, byte count and source hash used by each stage;
pass `--legacy-root /path/to/pinned/checkout` to verify it again. The benchmark
separates the observed bridge plus all skill name/description metadata from
task-selected skill bodies and complete references. New-home stages also count
the format contract, bridge asset and every neutral owner asset; verification
adds both the common acceptance boundary and setup-specific scenarios. Their
legacy stages count the complete shipped `.aios` scaffold. Other matching stages
cover local-first negative preload, owner routing, Spec readiness, worker Build
and basic Check. Every current selected path must be no larger than its legacy
package-owned comparison, and each skill body must stay at or below 8 KiB.

For 0.4.0, rerun the command for exact current counts; current source checks
retain the bounded descriptions and 8 KiB skill-body ceiling. The legacy
comparison remains useful for its stated routes. This change also removes
43 generic local skill bodies and their supporting payloads across the selected
repositories and seeds (62 tracked files, 329,683 bytes before replacement
routing). Those aggregate source bytes are not a per-task context or token
measurement: metadata is discovered first and bodies load conditionally.

These are UTF-8 byte counts and explicit bytes/4 token estimates, not native
runtime token telemetry. Populated owner context is excluded: the accepted
snapshot has only template placeholders, not a populated historical owner
state, and task context varies by outcome. Target-repository AGENTS instructions
are also excluded from both sides. Read the command's current neutral AIOS.md plus
MEMORY.md byte count; it is not a populated owner's context-saving measurement.
Behavior remains separately checked by route/link assertions, positive and
negative scenarios, and current source validation; fewer skills alone is not a
performance result.

For a changed context boundary, native evidence must use a compact matched
baseline/candidate task within each harness, record selected reads and emitted
usage when the harness provides it, and state unavailable token fields plainly.
Use synthetic owner and external-canonical sources: an AIOS docs-only question
must not preload owner context. If the canonical product repository is private,
the native smoke may use only its already-authorized normal read path; absent
access is an explicit gap, never a reason to retrieve credentials or change
visibility. External customer content stays at its source; source changes are
re-read; and read-only memory access stays separate from an explicitly
authorized synthetic correction. These are bounded smoke observations, not a
cross-harness performance guarantee.

`layout-rehearsal.py` uses temporary Git repositories to verify independent
Project/System roots, parent exclusions, and rejection of tracked nested work.

`continuity-rehearsal.py` uses a temporary local bare Git remote and synthetic
owner data to verify the explicit Sync allowlist, absent/empty restore, partial
home refusal, hostile remote content, secret-like content and non-execution of
restored personal files. It also checks personal-skill provenance, nested Git
and symlink stops, target-root rebinding and a stale-history stop. It does not
contact a real remote or owner home, and is not native-agent behavioral proof.
Before calling continuity behavior accepted, run the selected synthetic case in
the target native harness and retain its actual selected reads, staged paths,
target mutations and source/target hashes.

Before a real owner-data migration, record and inspect the actual backup restore,
source and destination hashes and modes, changed-source and changed-destination
cases, symlinks, unknown identities, idempotent replay, and preservation of later
owner edits. This is an operator checklist; this repository does not claim those
observations from an invented migration helper or a current native run.

The automated checks are source and Git-filesystem checks. They do not simulate
a model, mutate a real owner home, install AIOS, change native settings, launch
a worker, or prove desktop behavior. Native acceptance must use the target
harness and report its own exact version, source, and limitations. Historical
acceptance observations remain in Git history and GitHub Releases rather than
being presented as a current automated PASS.

For the routing/System-maintenance change, the accepted contract excludes
behavioral evals, replay and model comparisons. Only `validate.py`,
`context-footprint.py`, whitespace and scoped source consistency review were
run; layout/continuity rehearsals and native execution were not run. Required
routing reads are included in the affected footprint paths. Package/link
validation permits the accepted ADS route label while continuing to exclude
specialist tools/formats and bundled ownership. See the
[lifecycle record](lifecycle-routing-system-maintenance.md) for scope and pending
independent lead acceptance. Daily-use feedback belongs to the user; these
checks do not prove workflow selection, sidebar behavior or live System updates.

For `tracking-sop-2026-09-09`, source/package/link and context-footprint checks
plus static Review are the accepted proof; behavioral model replay/eval and
broad suites are excluded. The initial unavailable-tool fallback [todo.md](todo.md)
is now retired: this resumed worker exposes `update_plan` and its call succeeded
with an empty response. This proves call execution, not independent stored-state
readback or observed UI.
The [lifecycle checkpoint](lifecycle-agents-adoption.md#tracking-sop-revision--2026-09-09)
records incident/source evidence, scope, local 0.3.5 snapshot authority and lead
adoption responsibility. Reduced instruction bytes do not prove better behavior.

## Shared lifecycle (0.4.0)

The [accepted contract](lifecycle-shared-method.md) changes shared execution and
repository ownership. `validate.py` additionally rejects both a copied local
phase and a thin local wrapper in the product repository. Project Template's
creation fixtures verify zero generated generic skills, four native shared
routes, a payload whitelist, existing/dirty-destination rejection and atomic
restore/retained-state behavior. The generated Project has fresh Git history
and no remote; the test does not require plugin discovery to prove that shape.

Domain review and audit methods remain local. Selected System entrypoint checks,
changed-link inspection and the Bachelor specialist-route validator cover the
local contracts. Independent source Review caught and corrected direct-task
recovery's stale lead requirement and stale Bachelor README routes. Runtime
discovery and native package adoption are measured separately after release.

The source baseline demonstrates the duplicate methods and mandatory worker
rules; it is not a matched native performance experiment. Reduced copying and
selective delegation remove those instruction causes. Actual token savings,
long-session quality and behavior across future tasks remain workload-dependent.


## Context and task-result routing (0.6.0)

Prepare ordinary-entry fixtures with
`python3 tests/entry-routing-rehearsal.py /absolute/scratch/path` or add
`--baseline REF` for a matched existing revision. This author-only helper creates
synthetic owner/source/repository files and a read-only package snapshot. It
never starts a model, alters a real setup or preloads skill bodies. Run ordinary
`prompt.txt` input with native skill discovery and the thin `bridge.txt` boundary;
isolate ambient global context and skill registrations per invocation. Record
native selected reads, artifact mutations, source hashes, final answers, usage
receipts, timeouts and provider errors. Tool catalogs alone prove no behavior.

The 2026-09-10 bounded Codex runs exercised cold local onboarding plus a portable
research brief, migrated source identity with a same-title decoy, changed-source
freshness, explicit analysis completion and independent repository isolation.
Onboarding exceeded the operator's 240-second bound on both the 0.5.0 baseline
and 0.6.0 candidates. Local artifacts were produced; matching fresh-session
continuations verified them and completed preparation. This is interrupted and
resumed execution, not an uninterrupted onboarding PASS or speed comparison.
The final context keeps source routes and the unique study-time preference;
current source-owned operational values remain external. The actual portable
prompt preserves service, audience, sources, caveats and the receiving next step
without performing the market study.

An initial migration probe retained a superseded operational copy as historical.
The curation contract was tightened and the final-source rerun removed it,
kept unique knowledge/authority and used the verified migration mapping. A later
fresh run returned the operator-updated source value without changing files.
The analysis returned total net 300 (Studio 140; Workshop 160), no missing
customer IDs or duplicate order IDs. The repository run changed only app.py,
passed the supplied checks and read no owner context. Those last two runs used
an earlier candidate; neither selected the two later changed references
(curation and Spec readiness), so their exercised paths are unchanged.

Native discovery exposed 16 unique AIOS skills in Codex and Pi. Pi's baseline
model request failed with an expired authentication token, both offline and on
a supported normal-start retry. No behavioral Pi comparison is claimed; its
zero-valued error usage is unknown, not zero cost. Native auth readiness alone
was insufficient. No auth store was read/copied or login reset attempted.

The four maintained source checks and affected skill validators pass. Existing
selected-read ceilings are unchanged and now include mandatory context curation
for new-home routes; conditional continuation remains separately counted.
The old 24-case preloaded decision batch was not rerun for this revision and
cannot substitute for these ordinary-entry observations. Exact source identity,
independent Review and native adoption are recorded separately. See the
[lifecycle record](lifecycle-context-routing.md). Synthetic adapter access does
not prove live Notion, provider authentication, desktop cutover or future savings.

## 0.7.0 source candidate

For the accepted instruction cleanup and issue #8, also run
`python3 tests/skill-version-rehearsal.py` and
`python3 tests/validate.py --baseline LAST_REVIEWED_COMMIT_OR_TAG`.
See [version maintenance](skill-versioning.md) for schema scope, compatibility
judgment and Git comparison semantics, and [the scoped evidence](astra-alignment.md)
for actual results and limits. The package remains dependency-free; the new
parser and transition tests are author tooling only.

The Spec description no longer advertises persistent-goal creation as its job.
The former phrase assertion is replaced by resolved links to the single tracking
owner, readiness and Build. Existing goal-activation and recovery checks remain.
Independent behavioral Review must verify that accepted work proceeds without a
new goal request, carried goal requests retain their native rules, empty plan
responses do not imply UI state or stop work, and a real blocker holds only its
dependent action. Static link coverage does not prove these model decisions.

## Versioned local documentation and releases

The package validator checks that `docs/aios.md` is explicitly shipped, has one
version label matching the package, and resolves from the installed documentation
route in an isolated minimal package. Run:

```sh
python3 tests/validate.py --release-tag v0.10.1 --baseline eca5ca6
python3 tests/documentation-rehearsal.py
```

The documentation rehearsal rejects version drift, a missing package entry,
missing or repeated version labels, symlinks, a mismatched release tag and a
missing changelog entry. Native Claude and Gemini fixtures check installed
overview bytes across synthetic updates; Pi checks its registered local source.
These checks make no model-behavior claim. The ordinary-entry fixture retains
the documentation question for selected reads, owner isolation and reported
installed version; retain actual traces separately from static footprint counts.

Tag-triggered CI must complete and the GitHub Release's resolved tag must match
the accepted commit. Native installed version and discovery are separate readback
steps. The Resources deployment separately verifies that retired AIOS URLs no
longer serve the overview or metadata and that the remaining site still works.

## Context homes — 0.19.0

[Notion acceptance](../skills/osm-context/references/notion/acceptance.md)
separates package checks, native activation, live retrieval, first-task behavior
and recovery. Setup is the single onboarding entry; Context owns the provider
route. The package now exposes 26 shared skills, including Context 1.2.0 and
Setup 1.3.0. Existing managed-file homes retain their supported procedure.

The October 5, 2026 candidate checks passed package/per-skill validation,
documentation, layout, continuity, skill-version and unchanged footprint limits.
Independent review corrected client setup touching global personal instructions;
the corrected shared and Codex/Claude/Pi scope routes passed review.

Bounded Notion observations cover existing full-page databases, native templates,
personal skills, scoped retrieval and exact page readback. A matched synthetic
Codex onboarding trial covered conflicting offer prices, an archive decoy,
parent/child Spaces, irrelevant missing access and empty Memory. It used local
fixtures and no provider calls, so it does not prove unattended end-to-end
customer provisioning. The final candidate maps Offers/Demand/Operations to
existing knowledge, asks about material gaps and leaves Memory empty.

Historical preview evidence remains in Git history and private recovery;
account-specific IDs and traces stay outside this public repository. Release CI,
installed package identity, fresh-session discovery and live production delivery
are verified separately for the final release. No cross-harness behavior, future
scheduled run or general token/latency saving is inferred from these checks.
