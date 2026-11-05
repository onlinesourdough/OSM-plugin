# OSM

Revision: 2026-10-11

Build and operate the smallest independent Project that creates this outcome:

> Build a maintainable native agent skill package with focused optional helpers with portable owner context, lifecycle routing, safe onboarding and recovery, validated for independent lead Review before authorized release.

## Working method

This file is the complete repository contract. Any contributor or harness can
follow it; no plugin, skill library or orchestration tool is required to
develop this repository. Contributors may use their own harness methods. The
owner's Factory project uses Factory as one optional method; it is not
required. Using the installed OSM plugin or its skills to exercise the
product is optional product testing, never a precondition for authoring.

Read [README.md](README.md) for product context when needed, then only the
local sources relevant to the change. Keep scope proportional: for a small
mechanical edit, make the change, inspect the diff and run the affected checks.
Resolve material scope, ownership, boundaries or proof before substantive work,
asking one question only when a missing owner decision changes the outcome.
Keep one writer per overlapping change and verify the selected checkout first.

## Sources

- `skills/` holds the shipped product skills. Edit them as product code and
  maintain each skill's metadata [SemVer](docs/skill-versioning.md).
- `apps/sidebar` is the Codex sidebar source. `runtime/sidebar` is its
  reproducible build; never edit it by hand.
- Native manifests (`.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`,
  `gemini-extension.json`), `package.json` and `docs/osm.md` keep one
  consistent identity and version. See [distribution](docs/distribution.md).
- `.agents/skills/` is the [repository specialist shelf](.agents/skills/README.md).
- `tests/` and the remaining `docs/` are author material, excluded from the npm
  `files` selection and the validator-staged product payload. Repository-root
  installations (such as the Claude marketplace `./` source) may still include
  them, along with other root files like `AGENTS.md` and `SECURITY.md`.

## Checks

Sidebar, with Node.js 22 or later:

```sh
npm ci --prefix apps/sidebar --ignore-scripts
npm run build --prefix apps/sidebar
git diff --exit-code -- runtime/sidebar
npm test --prefix apps/sidebar
```

The build must leave no `runtime/sidebar` diff. Package and documentation:

```sh
python3 tests/validate.py
python3 tests/documentation-rehearsal.py
python3 tests/onboarding-rehearsal.py
python3 tests/layout-rehearsal.py
python3 tests/continuity-rehearsal.py
python3 tests/skill-version-rehearsal.py
python3 tests/context-footprint.py
python3 tests/responsibility-rehearsal.py
python3 tests/context-architecture-rehearsal.py
```

These match [Package and release CI](.github/workflows/release.yml). Run
`git diff --check` and the checks affected by the change; record actual
results in [verification](docs/verification.md) when they establish a claim.

## Review and release

Fix in-scope findings and repeat affected checks. Before any authorized
release, obtain an independent review of the exact candidate; a relevant change
invalidates that acceptance. CI runs on pull requests, `main` and tags; releases
are published only from `v*` tags on `main`, following
[distribution](docs/distribution.md). Hold external actions outside existing
authority, and carry existing scoped authorization forward.

## Ownership and recovery

Record durable responsibility in [docs/ownership.md](docs/ownership.md), keep
the relevant checks in [docs/verification.md](docs/verification.md), and maintain
the recovery path in [docs/recovery.md](docs/recovery.md). Keep personal
context, secrets and private data out of source, logs, exports and client builds.
