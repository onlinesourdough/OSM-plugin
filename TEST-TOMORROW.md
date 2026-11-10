# OSM — private Home candidate, 9 November 2026

Open the [current fictional preview](http://127.0.0.1:43219/).
[Setup](http://127.0.0.1:43219/setup), [Settings](http://127.0.0.1:43219/settings)
and [scenarios](http://127.0.0.1:43219/test) use disposable sample data.
This revision supersedes the older page-first/Browse preview on port 43217;
that prior candidate and its review artifacts remain retained separately.

## Five-minute owner check

1. Home shows the selected home's title/icon and its mapped sources. Search
   **scope**, open the result, then go Back: the query and focus should return.
2. Open a page. Check its title, icon, breadcrumb, Copy link and Open in Notion.
   A refused clipboard write should offer a selected URL for manual copy.
3. Open the gear. Check the connection and chosen home, then Saved links.
   These five fallback links change navigation; they do not grant access.
   Test an edit followed by Back/Close and Keep editing or Discard.
4. In Scenarios, select H03, open Knowledge and use Load more. Try empty,
   one denied source, ended connection and denied root. A denied link must
   not reveal a page title/body or borrow another connection.
5. Repeat at 320px and in dark theme. Search **unmatched**, then paste
   https://www.notion.so/99999999999999999999999999999999.
   No-match and outside-home refusal must remain distinct.

If stopped, start a fresh fictional preview from this checkout on an unused
port (the fixture prints its URL):

    PORT=43219 OSM_PREVIEW_LIVE_NOTION=0 node apps/sidebar/fixture.mjs

## Source and evidence

Canonical guide: [design.md](design.md). Native Paper **3438e04fc0d64ffe**,
project library repo: start at **R0 · Revision 9 Nov · start here**.
Five new pages add 18 artboards; all nine earlier pages are preserved.
There are 15 pages and 68 boards in total. R5 carries Setup’s approved style
to Home and Settings. Opus 5.5 High/Fast off authored that design. Its new
post-implementation render review hit the SDK session limit and is pending.
The earlier GPT implementation checkpoint was preserved; actual Sonnet 5.5
High completed this correction. GPT-6.1 Sol Medium performs final independent review.

The latest implementation check passed 228 sidebar tests and bundled stdio
smoke. Generated runtime matched an independent rebuild. Package/documentation,
onboarding, layout, continuity, skill-version, footprint, responsibility,
context architecture and consumer-selection checks passed. Exact private
artifact hashes, screenshots and review dispositions are in the task's
outputs/revision-20261109 folder. See [verification](docs/verification.md).

## Remaining qualification

This is a browser fixture and local source candidate. Live Notion, native
Codex clipboard/visibility behavior and native Paper pixel acceptance remain
unproven. Paper's native controls/screenshots timed out; saved source was
verified. Returning from a hidden panel is tested synthetically with a
30-second throttle; Settings → Check again remains available.

OSM's own browser OAuth still needs its registered client, callback and
confidential backend. No new credential, account, grant, normal-profile
activation, Notion write, public push or release was made. The existing owner
Home projection was missing at the last authorized read; no maintenance token
was adopted. Home never falls back to the separate official Notion plugin.

#74/#82 remain open for live/native adoption; #58 manual navigation is preserved.
After the v0.31.2 tag the inactive publisher manifest binds that tag's exact commit,
so its release guard and reconcile check agree with the tags. The public
Notion guide was not read or advanced (its last verified projection is v0.30.0),
the publisher stays inactive and publication is not authorized by this candidate.
