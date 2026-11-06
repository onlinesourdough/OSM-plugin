# Verification

On 2026-10-23 the lead installed `0.30.1-setup-preview.2` (`791f033`, tag
`osm-setup-preview-0.30.1-2`, CI run 39987263047) through Codex's native plugin
manager and refreshed the overview from the current model through the official
Notion fetch. It returned `ready` with 10 of the 11 earlier links, including the
OSM root label; six protected instruction and shortcut files were unchanged.
The eleventh source is a standalone child page that the fetch writes on three
lines (`<page url="…">`, its title, `</page>`), which the line reader counted as
left out, dropping its group. A sanitized fixture of that shape, with invented
identities, reproduced it before the fix: `ready`, five links, one skipped,
partial, no Recovery group. `0.30.1-setup-preview.3` accepts only that exact
three-line shape at one tab depth. New tests cover it with tabs and entities,
and as negatives: blank lines, no title, markup in the title, a nested body
(not read), a close at another depth, an extra attribute, no URL, a database
tag, a list bullet, an unclosed tag (later section kept), an unsafe URL, a code
fence, a quotation and prose. With Node 22.22.3 and Python 3.14.5, 160 sidebar
unit tests and the smoke passed; the rebuilt bundled server returned `ready`
with six links for the fixture; `validate.py` passed with `--baseline`
`791f033`, `c6432c5` and `169b129`, as did the maintained rehearsals and
fixture preparation. The owner's native refresh and readback of all 11 links
remain the lead's checks. Independent review also found that an unclosed page
could expose a nested Markdown link as navigation. A failing regression now
covers recovery at a later heading and at end of content. The reader skips that
malformed body to the boundary, counting it once, without rescanning its lines.
Independent Opus review found a fenced-example regression in that recovery:
the scan could mistake an example heading for the boundary. A failing test
reproduced it; the scan now shares the main reader's fence predicates and ignores
example headings and close tags. All 161 corrected sidebar tests and the stdio
smoke passed, alongside package validation and the six maintained rehearsals.

On 2026-10-23 an end-to-end naming check on the owner's Codex, which runs
`0.30.1-setup-preview.1` (`2d34543`), found the cached overview still naming the
old AIOS root. A native refresh from the current model, through the official
Notion fetch and `osm_save_model_overview`, returned `unsupported` and replaced
the earlier overview's 11 links. The model, Notion, the pointer and saved
shortcuts were unchanged. The lead reported the cause: the current fetch writes
labelled rows as `<b>Role:</b> <mention url="…">Name</mention>` or with a
self-closed `<mention url="…" />`, and the reader, unchanged from `c6432c5`,
knew only Markdown bold labels and typed mentions. A sanitized fixture of that
shape, with invented page identities, failed before the fix: an all-native Home
gave `unsupported`, and with one Markdown row beside it the native rows were
silently dropped from a `ready`, complete overview. `0.30.1-setup-preview.2`
extends the existing grammar to `<b>` labels and generic mentions. New tests
cover the native Home, colon and leading-reference negatives, user and unknown
mention tags, another HTML wrapper, a mention without a link and an unsafe link.
With Node 22.22.3 and Python 3.14.5, the fixture shows the five Home links
after the fix, and the rebuilt bundled server returned `ready` with those five
links for it over stdio. 157 sidebar unit tests and the smoke passed, as did
`validate.py` with `--baseline` `2d34543`, `169b129` and `c6432c5`, the
maintained rehearsals and fixture preparation. Restoring the owner's overview
through a native refresh, the same 11 targets with OSM labels, and the Codex UI
remain the lead's native checks.

On 2026-10-23, `feat/osm-setup-preview-58` merged the PR #64 Setup preview
(`c6432c5`, base `e9f4d2d`) into OSM production candidate `169b129`, as version
`0.30.1-setup-preview.1`. This is naming-only adoption of an unreleased #58
preview, not a release or repair; #58 and #60 holds remain. With Node 22.22.3
and Python 3.14.5 it passed: locked `npm ci --ignore-scripts`, build, 154 sidebar
unit tests and the stdio smoke including the overview snapshot; `validate.py`
with `--baseline` `169b129`, `b3bb4d4` and `c6432c5` (no skill version
regresses for an owner on the preview); and the documentation, onboarding,
layout, continuity, skill-version and footprint rehearsals with entry-routing,
model-selection and intent-trial fixture preparation. Normalizing `c6432c5`'s
sidebar sources with the OSM naming map leaves only renamed tool prefixes, the
"managed context block" wording, the package name/version and PR80's added
compatibility tests; the model-overview modules are byte-identical. Normalized
skills differ only by PR80 naming, switch and compatibility text. Stored state
keeps `CODEX_HOME/aios/overview/model.json`, `aios/panel`, the `AIOS:BEGIN`
block and its backups. Native installation, owner upgrade from the installed
preview and Codex UI are not verified here.

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
On 2026-10-19 an unreleased source candidate for the #58 model overview (coordinated
with #62) added a sidebar overview of the selected AI Operating Model. It is derived
from an explicit, revision-labelled snapshot that Setup saves from the model's headings
and source lists. The panel shows connection, model read and pointer saved as separate
facts, and does not claim to update live. Only an explicit Save pointer writes the
pointer. The final sidebar UI suite passed 48 of 48. Its new stale-connection test failed
on the previous candidate at the first check that links stay hidden after a failed
refresh, so later checks did not run there. The 57 other sidebar unit tests were not
rerun for the final candidate because their files had not changed. Of those, 37 passed in
the first run. The other 20 storage tests first failed with disk-quota error -122 in
`/tmp`, then passed with task-local scratch space; the first run's 98-test failure is
kept on record. The package,
documentation, onboarding, layout, continuity, skill-version and context-footprint checks
passed. The first continuity run was in the wrong location, and a disposable non-Git
fixture then passed. The native onboarding option was not run. The rebuilt runtime's
server bundle is byte-identical to the one that passed the stdio check, which ran without
the Codex executable on the PATH and did not access Notion. In a browser with the
synthetic localhost fixture, the built sidebar showed the preview before saving, saved
once on request and listed 2 groups with 7 model-derived links. A click emitted the
expected synthetic link without navigating. The light theme at full width and the dark
theme at 320px had no horizontal overflow. Pressing Tab moved focus to a source link,
which then matched `:focus-visible`; the drawn focus style was not measured. Reopening kept
the pointer and overview without a new save. Ambiguous and no-access snapshots showed no
links and saved nothing. The fixture rejected the `localhost` origin and worked at its
documented `127.0.0.1` address, and one timed-out click was not counted. This is
synthetic rendering, not native Codex or Notion acceptance. Native Memory, Skills and
provenance, a real model's structure and connector access, fresh-session agent loading,
independent review, release and adoption remain open. #58 is not complete. Review then
found that a fenced code example could become navigation and that an over-bound stored
snapshot was trimmed rather than refused; the fix for both was made after the checks above.
After the fix, the 66 affected tests passed: 48 UI, 10 parser and 8 storage tests. The
42 other tests were not rerun because their files had not changed. With only the new tests
added to the previous candidate, its three new cases failed at their first intended checks:
a link inside a four-backtick example, the total link limit, and an over-bound stored
snapshot. The built stdio check passed again without the Codex executable on the PATH and
without any account or model call. Two locked builds produced identical runtime files, and
the documentation and whitespace checks passed. The browser check above was not repeated
on the fixed candidate, and no real model or account was used. A second review then
found that an indented fence line inside a code block could still close it, and that a
stored link target wrapped in an array was accepted as a link. After those fixes, the 69
affected tests passed: 48 UI, 12 parser and 9 storage tests. The 42 other tests were
again not rerun because their files had not changed. With only the new tests added to the
previous candidate, its three new cases failed at their first checks: the indented
example link, an array link target in the parser and the same target in storage. The
built stdio check passed again without the Codex executable on the PATH, with a private
synthetic store and no account or model call. A separate locked build reproduced the
runtime files, and the documentation and whitespace checks passed. The parser treats
leading tabs as Notion's nesting of child blocks; this is an assumption tested only with
synthetic input, not checked against Notion's actual fetch format. The browser check was
not repeated on the current runtime.

The real-format check then failed. The owner's coordinator read one selected model once
through Notion and ran the published parser on its exact text. The overview came back
ready and complete, with one link from an incidental child page. None of the model's ten
role-labelled source rows, spread over two sections, was recognized. Whether that read was
complete was not exposed. No link was invented. The repair recognizes a bold role label
followed directly by a reference, keeps related mentions in the rest of the row out, and
counts source-like rows it cannot use, marking the overview partial instead of complete.
With only the new parser tests added to the previous published candidate, its 4 new cases
failed at their first checks: the supplied shape's groups, the ten-role shape's groups,
the partial flag for unusable source rows and the mixed-section ambiguity. Review then
found that a role label with a second colon could become a route, or be dropped without
being reported. With only the parser tests for that fix added to the version before it,
its 2 new cases failed at their first checks: an extra colon inside the bold was accepted
as a route, and an extra colon after it left a lone child section looking complete. A
later check found that a role label over 100 characters was silently lost. After that
fix, with Node 22.23.3, the 77 affected tests passed: 48 UI, 20 parser and 9 storage
tests. The 42 other tests were not rerun because their files had not changed. With only
the final parser tests added to the version before this fix, its 2 new cases failed at
their first checks: a 101-character label lost its route, and a 101-character malformed
label left a lone child section looking complete. In each before-check, later checks in a
failing case did not run. The locked build, the bundled stdio check without the optional
Codex CLI, and the package and whitespace checks passed, and a separate rebuild matched
all three runtime files; only the server bundle changed. That version was then published
as `61f5cc0`, where a fresh independent source review accepted it and CI passed. These
tests use synthetic shapes only. No native app, account or model was used,
and no complete read of the model is claimed. The draft pull request is not installed
anywhere.

The owner's coordinator then ran the `61f5cc0` parser once on the same retained model
text, with no new Notion read and no section choice. All ten role-labelled source rows
were now recognized, six in one section and four in another, but that second section was
reported as mixed because it also held other list items. The result was ambiguous, so the
overview showed no links at all; it was partial, with two unusable rows counted as left
out. No related or prose link was emitted. Whether the read was complete is still
unknown. The next change treats other items beside references that all carry a role
label as needing no section choice, while an unlabelled reference among other items or a
repeated heading still does. With Node 22.23.3, the 79 affected tests passed: 48 UI, 22
parser and 9 storage tests. The 42 other tests were not rerun because their files had not
changed. With only the final parser tests added to `61f5cc0`, one case failed at its
first check: a synthetic model with six and four labelled sources beside notes came back
ambiguous with no groups. The new guard for genuine ambiguity, repeated headings and a
chosen section passes on both versions. The locked build, the bundled stdio check without
the optional Codex CLI, and the package, documentation and whitespace checks passed, and a
separate rebuild matched all three runtime files; only the server bundle changed. That
version was published as `3c3bfa8` on the draft pull request, where a fresh independent
source review accepted it and [CI](https://github.com/onlinesourdough/AIOS-plugin/actions/runs/39301119400)
passed 121 tests with the release job skipped. It is not installed anywhere.

On 2026-10-19 at 18:28:54Z the same coordinator ran the `3c3bfa8` parser once on the same
retained model text, unchanged at 14,649 bytes, with no section choice, no normalization and
no new Notion read or model call. The result was ready and partial, with 3 rows left out
and 11 links in 3 groups. All ten role-labelled sources matched their roles, targets and
original two sections, and the eleventh link is a valid standalone child page. No related,
incidental or prose link appeared. A first comparison that expected role-only names was
corrected by checking the same stored output against the documented role plus visible
name; the parser was not run again. The public source files and the coordinator's input
and configuration were unchanged before and after. This passes correspondence with this
one retained revision, with limits: whether the original read was complete is unknown, the
output bounds were observed but not exercised, and real fences and tabs were not tested.
The earlier child-only and empty ambiguous results above remain the before-evidence. This
is not live freshness, native app behavior or acceptance of all of #58.

A later, uncommitted candidate then changed 18 method and documentation files for the
rest of #58: the AI Operating Model under a private AIOS parent, optional Soul and About,
one canonical Memory resolved by identity with native creator and editor fields, native
Skills reported separately from the exact-page fallback, a thin portable host pointer,
Check and Update descriptions and a shorter README. Locally, the package validator against
`3c3bfa8`, the documentation, onboarding, layout, skill-version, continuity and
context-footprint checks, the whitespace check, all 121 sidebar tests and the bundled
synthetic stdio check passed; no native Codex CLI or provider login was available. The first
continuity run stopped at its own guard because its synthetic source sat inside an unrelated
Git checkout; the same unchanged test passed with its fixtures outside any Git repository.
Runtime and parser code are unchanged, so no new build was needed. The CI result above
covers `3c3bfa8`, not this candidate. A fresh model given eight withheld-answer setup and
maintenance cases chose acceptable decisions in all eight, including keeping a custom
Memory beside an empty native alias, reporting the exact-page skill fallback as a fallback,
reading back each schema step and leaving independent repositories without personal
context. No tools ran in those cases and the previous instructions were not compared, so
this shows instruction decisions only, not real Memory saves, skill activation, recall or a
second agent. During that source qualification the `notion://docs/memory` and
`notion://docs/skills` resources and the active tool catalog were not read, and the public
Notion setup guide was not accessible; the public Notion Skills help was read.

Later on 2026-10-19, around 21:00 CEST, the owner's coordinator read both resources once
and inspected the 40-tool catalog of their Notion connection. Neither resource gave a
version, date or connector revision, and the installed plugin's version is not evidence
of the backend. Nothing else was fetched or changed: no model, Memory entry, alias or skill
body, and no write, enablement, account or lifecycle action. The memory guidance confirms
the Type values, Source as the creating client kept on edits and Last updated by as the
editing client. It describes the `memory` alias resolving the native Memories database and
About page, created on the first save, with later operations using the returned identities;
no alias fetch was made, so this is documented behavior only. It also says About links its
supporting memories and a specific or newer memory overrides the summary, that search can
lag behind a save, and that fetch results report truncation and unknown blocks. The guidance
still describes creating a memory with a text `memory` parent, but that catalog's page
creation tool takes a parent object with a page, database or data source ID. This mismatch
is unresolved; no native save, update or alternative shape was tried, and the method now
holds that mismatched native create and reports it. The catalog included fetch, search, data-source queries, page
creation and update, with a skill-designation flag on creation and update. It had no
enabled-skills, skill-enablement, memory-search or skill-download tool, so in that
connection ordinary search and page fetches are only an explicit-destination fallback. The
skills guidance separates per-user enablement from designation, describes enabled surfaces
only through the enablement tool, and says automatic use loads skills by relevance while
existing sessions keep their registry. This is documentation and catalog evidence for one
connection at one time, not proof that any operation succeeds. Native save compatibility,
account changes and revocation, freshness, save provenance, rendered Setup and overview,
Memory, Skills and recovery, a useful task, fresh-session and second-agent use, independent
review of this candidate, CI, merge, installation and release all remain open. Whether the
retained model read was complete is still unknown. #58 is not complete.

A later independent review of this candidate returned REVISE on two instructions that had
not changed. The overview refresh told Setup to mark a read incomplete only when it was
truncated, so a read with unknown blocks or without completeness signals could be saved as
complete. The shortcut procedure still sent fresh onboarding through fixed Docs, Skills and
Memory links, adding a second role map beside the model. Both instructions were corrected
in source: Setup now marks a refresh complete only when the fetch reports nothing missing,
and shortcut steps apply only to existing or explicitly requested shortcuts. No native
operation, rerun on the retained text or CI followed this correction.

That corrected version, published as `75aebda` on the draft pull request, was then
accepted by a further independent source review with its native gates still open, and CI
passed 121 of 121. The owner's coordinator installed it once in Codex; every source file
matched, and the earlier install and unrelated configuration were kept. After an ordinary
Codex restart, the AIOS panel ran the installed server, and Setup saved one overview from
the same retained export, marked not complete, with no section choice and no new Notion
read. The app showed 3 groups, 11 links, 3 rows left out, the partial warning and the
original source revision, matching the export; the pointer and saved shortcuts were
unchanged. Whether an overview existed before that save was not inventoried. This
qualifies that Setup and overview path only, not methods, Memory, Skills, account changes,
recall, a second agent or release. The owner found it hard to use: one long list, the
model's title shown twice, and a role and page with the same name, such as AIOS, shown
twice. A following source candidate shows the model's title once, its sections as cards,
the source revision apart from the snapshot's save time, and keeps saved shortcuts
collapsed. Its affected tests, build, package and stdio checks and a synthetic browser
fixture at wide and narrow widths, with clicks, keyboard focus and states, passed. Two
independent findings then showed its rule for showing a role and page name once was too
broad: it treated "C++" and "C#", "x²" and "x2", and "ACME®" and "ACME" as the same name,
and shortened a page whose own title happened to contain a middle dot. The repair records a
short label only where Setup parses a role-labelled row whose page has the same name, and
otherwise shows titles exactly as stored, so snapshots saved earlier keep their names until
Setup saves the overview again. Results for the current source are in its CI run and the
lead's check record, not here. The synthetic browser fixture is not native proof, and this
layout has not been installed or checked in the app.

That repaired version, `b47dbcf`, was accepted by independent review and passed CI, but
was not installed. On 2026-10-20 the owner reviewed its browser renders: the cards were
useful, but connection, pointer, revision, save time, coverage and the shortcut
disclosure crowded the navigation. A following source candidate leads with the cards,
keeps only actionable problems and one "Some links may be missing" notice in the main
view, moves the routine facts into one closed Model details disclosure, and turns
populated shortcuts into a compact row that does not repeat a model link to the same
page. The label rule above is unchanged. This candidate's checks, renders and review are
recorded with its CI run and the lead's check record; it has not been installed.

An independent review of that candidate returned REVISE: its rule for a repeated
shortcut compared only Notion page identity, so a saved link to a block or a different
database view on a page shown in the cards was hidden. The repair treats links as the
same destination only when they are identical apart from Notion's copied-link marker,
and adds a regression for each reviewer witness. The owner also renamed the two labels:
the shortcut row is now More links and the closed disclosure is About this overview.
This repair's checks and review are recorded with its CI run and the lead's check record;
it has not been installed.

The dashboard at `2488495` was later installed on the owner's Mac. From one save of the
same retained export, with no new Notion read, its native panel showed the model's three
groups and eleven links, the partial notice and About this overview; More links was
correctly absent because every saved link was already in the model's cards. That was one
dark native panel at 1200 by 1221 pixels with a synthetic pointer; other native widths,
trusted keyboard and assistive-technology use, a full useful task and release were not
checked. On 2026-10-20 the owner's official Codex Notion
connection read pages but did not offer the enabled-skills tools in that chat, although
its app metadata listed them; a separately signed-in direct connection to Notion's hosted
MCP offered them and returned the selected MCP skills, and the owner's direct connection
on another host later completed skill discovery too. The cause is not known, so this is
evidence about particular connections, not a rule about the plugin. A following source
change brings Setup, Context, Manage Skills and Update guidance in line with the accepted
#58 architecture and #65 native-database requirements: the AIOS home as navigation, the
model's placement and setup-guide version, optional Soul and Spaces, native database types
and My Tasks, Meetings and plan limits, Library and skill enablement, and the connection
check on the execution host. Its qualification is tracked in #58 and the draft pull
request; no check result for it is recorded here. These are method sources; no Notion
database, Library setting, sign-in, Memory save, meeting setting or fresh-session use has
been exercised for them.

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
