# External Studio operation

The preserved reviewed application is the [thin fork](https://github.com/onlinesourdough/editor)
on branch `codex/diffusion-upstream-browser-companion-r6`, commit
`71a306fb33d06f969114a47e9eba85aa47cef395`, version `0.204.1`, companion protocol 4.
Official `origin` is `https://github.com/diffusionstudio/editor.git`; `fork` is
`https://github.com/onlinesourdough/editor.git`. Reviewed upstream base is
`635a2907d9dd717879d6f7bdf9a78ee42910415c`; historical upstream contribution is
[PR 54](https://github.com/diffusionstudio/editor/pull/54). These are preserved
source identities, not claims of the latest release. See [launcher provenance](provenance.md).

Set `DIFFUSION_SKILL` to the resolved installed skill directory. Choose the
requested operation:

```sh
node "$DIFFUSION_SKILL/scripts/diffusion-studio.mjs" check
node "$DIFFUSION_SKILL/scripts/diffusion-studio.mjs" setup
node "$DIFFUSION_SKILL/scripts/diffusion-studio.mjs" open --production-root /absolute/work/content/outcome diffusion-project
node "$DIFFUSION_SKILL/scripts/diffusion-studio.mjs" status
node "$DIFFUSION_SKILL/scripts/diffusion-studio.mjs" logs
node "$DIFFUSION_SKILL/scripts/diffusion-studio.mjs" stop
```

The canonical existing application locations remain stable: macOS user
`Library/Application Support/Agentic Content System/diffusion-studio/editor`,
Linux user `.local/share/agentic-content-system/diffusion-studio/editor`, and
Windows `%LOCALAPPDATA%\Agentic Content System\diffusion-studio\editor`.
The launcher derives the user directory; it contains no personal path.
Arbitrary checkout overrides are rejected. A production root must be an
absolute external existing directory separate from the editor and package;
project operands resolve against it regardless of shell cwd. Canonical path
checks reject traversal and project/package.json symlink escapes.

`check` is read-only. It checks pin, branch/detached state, remotes, upstream
base, cleanliness, version, lockfile, dependencies and packaged host/DAPI. Live
heads are read via `git ls-remote`; unavailable heads are unknown, not a clean
bill of health. A mismatch stops operations; do not fix drift by resetting
owner changes. `status` reads companion state and authoritative DAPI context;
`logs` reads editor/companion logs. Neither starts a host.

Explicit `setup` clones official upstream, adds/fetches the fork and detaches
at the exact pin. It refuses a mismatched existing checkout, then uses `npm ci`
and the pinned desktop workspace’s declared `package` command. Public build
values come from `apps/web/.env.example` into that process; no credential or
`.env` copy enters OSM. This is a manual action, never an installation hook.
All installs, builds and generated state stay with the external application.

`open` checks the boundary, starts the packaged hidden Electron host only when
DAPI is unavailable, and invokes the built external DAPI CLI with an absolute
project path and the external checkout as subprocess cwd. Inspect returned
JSON before opening its one-time capability URL in the in-app browser; never
launch an OS browser. Do not persist the capability URL in a report or graph.
The launcher checks the exact pinned Phase-A capability set, version, protocol,
project/build identity, loopback URL, local-only host, hidden or truthful
`minimized-fallback` mode and `egressAttempts: 0`. Inspect matching compiled/
applied identities in actual runtime proof as well.

The companion permits preview, play/pause, scrub and human inspection. It has
no browser DAPI, persistent edits, export, cloud AI, checkout/authentication,
arbitrary filesystem access or widened main-process wire. Media is unsupported
in this companion phase; WebGPU/fonts are browser-dependent. DAPI/Electron
remain the authority even when preview is limited. Use trusted project code.
If start/proof fails, inspect status and perform scoped companion cleanup under
the existing launch authority; do not silently switch editors. `stop` releases
companion resources and calls `dapi context` to verify the host survives.

Inspect cross-platform construction with `describe --platform darwin|linux|win32`
(and optional `--arch`). Run each platform separately. Historical ACS acceptance
covered macOS; migration tests prove paths/contracts and synthetic subprocess
execution only. No new physical Electron or Linux/Windows parity is claimed.

A re-pin is a bounded upstream/fork review followed by updated constants and
checkout/build/DAPI/export/browser denial/cleanup proof, including platform
construction. Roll back the authorized pin change and restore the previously
reviewed external application while preserving owner projects and edits.
Use [real-video acceptance](real-video-acceptance.md) when the task requires
owner usability proof; no synthetic fixture substitutes for it.
