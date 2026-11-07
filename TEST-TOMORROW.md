# OSM — private test candidate

Start with the running [Home preview](http://127.0.0.1:43217/). It uses fictional
Notion content, no credential and no live Notion write. Setup is at `/setup`;
`/test` adds scenario, width and theme controls. The actual product reader uses
the selected mapped Notion page; the fixture is explicitly a stand-in.

If the preview is stopped, from this checkout run:

```sh
PORT=43217 OSM_PREVIEW_LIVE_NOTION=0 node apps/sidebar/fixture.mjs
```

## Useful five-minute check

1. Open Home. The page title, icon and body are primary; Browse starts collapsed.
2. Expand Browse, open a record, then go Back. The source list and useful focus
   return. Open Skills; built-in descriptions stay collapsed.
3. Open the gear → OSM connection and access. Check the workspace/mapped-source
   wording. Page access opens the real selected page in Notion, where the native
   Connections menu controls sharing. No OSM grant checkbox is fabricated.
4. Open Setup → Connect Notion → Check existing OSM connection → Close. In this
   credential-free preview, the route is honestly unsupported. Browser sign-in
   is explicitly unconfigured. Optional agent setup demonstrates the host-reject
   fallback without running a model or saving source data.
5. On `/test`, select different account, denied root, network error, rate limited,
   empty and partial. Use 320px and dark theme. Ready content must disappear after
   an account/access change; recovery must remain legible and explicit.

## Design

Native OpenPaperDesign, project library `repo`, Paper **3438e04fc0d64ffe**.
Read `00 Flow index`. There are 47 editable artboards on nine pages, including
three retained references. Human OAuth boards distinguish implemented guide/UI
from planned browser authorization, cancellation and recovery. `design.md` is
canonical and maps states to source/issue IDs. Selected-page/setup/access screens
were inspected in the native app; this is not a claim of live OAuth or exhaustive
pixel acceptance of every illustration. The Paper is also exported as a portable
`.paper.zip` with this candidate's review artifacts.

## Executed proof

- 190 sidebar tests and bundled stdio smoke passed.
- Package validation against the retained e1cd725 baseline; documentation,
  onboarding, layout, continuity, 14 skill-version, responsibility, context
  footprint, context architecture and consumer-selection checks passed.
- Context architecture: 89 positives, 74 variants, 456 negatives, zero failures.
- A disposable native Codex profile installed the product locally and discovered
  all 17 enabled OSM skills with zero discovery errors; all 115 installed payload files matched the final staged product byte for byte. No auth/settings/history
  were copied and no model was invoked by that installation check.
- One actual GPT-6.1 Sol Medium method rehearsal exercised five test-value
  decisions for #87; exact prompt/output are retained in the repository.
- A public 16,946-byte PNG was read through the bounded image transport. Synthetic
  tests cover private destinations, redirect refusal, MIME/size bounds and icon
  variants. No owner's Notion images or credential were read for this proof.
- Browser UI: page → Browse → list → reader → Back, gear/access, human connection
  check/cancel, rejected agent handoff, different-account clearing and explicit
  error retry; light/dark and 320px inspected. The error state measured 320px
  content width and 320px scroll width. A dark-button contrast defect was fixed
  and rechecked.

Known failing inherited checks: publisher reconciliation exits 1 because the
approved public projection remains v0.30.0 while v0.30.1 exists. Full publisher
rehearsal has 67 passing scenarios, two repository-binding failures caused by
that same hold, and 75 caught mutation controls. Publisher source/manifest and
these tests remain unchanged. This is a release/publication hold, not a green
publisher claim.

## Remaining real dependencies

Preferred Connect → browser authorization → page selection → return requires
OSM's own registered OAuth integration, an owned registered callback, confidential
secret custody and auth-service implementation/deployment. The public REST
exchange requires client authentication; hosted MCP PKCE/DCR has a different
permission model. See `docs/notion-browser-connection.md` for exact sources and
architecture. No app, backend, new account or access grant was created.

The local pilot can instead use the opt-in dedicated macOS Keychain route after
explicit selection/provisioning and Home mapping. The owner's existing context
was readable, but its installed Home projection was missing; its credential was
not silently adopted or copied. Real connection identity, grants, revocation and
native Desktop Home still need that selected pilot or the provisioned OAuth
route. External SVG icons and arbitrary Notion embeds/editing are unsupported;
readable originals remain available in Notion.

## Issues and delivery boundary

- #87: source implemented, versioned and exercised with actual model decisions;
  ready for focused review/adoption. It is not closed merely because a local
  commit exists.
- #74/#82: selected-page Home, same-connection agent reads, icon handling,
  human connection guide, access disclosure and optional agent handoff are
  implemented. Live connection/OAuth/native acceptance remains open.
- #58: existing manual navigation/save/recovery is preserved and tested.
- #83: verified skill ownership/sharing remains open; the current skill reader
  makes no ownership or enablement claim.
- #85/#88: retained accepted documentation/context work stays preserved; publisher
  activation, public propagation and consumer rollout remain held.

No merge, tag, release, public push, normal-profile activation or Notion write was
performed. The review bundle includes immutable source revision, diff manifest,
consumer payload, design source and actual evidence. Normal installed OSM and the
separate official Notion plugin remain untouched.
