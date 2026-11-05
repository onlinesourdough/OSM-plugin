# Review and release OSM

Revision: 2026-10-11

The release unit is this repository root: the native manifests, `.app.json`, `package.json`, `gemini-extension.json`, `assets/`, `LICENSE`,
`README.md`, the single `skills/` source, `runtime/sidebar` and `docs/osm.md`. The overview
is package documentation, read only when needed. Other documentation, tests and
the optional specialist shelf remain author material, not product skills.
This repository carries no local generic lifecycle skills.

## Before delivery

1. Keep identity/version equal across all native manifests and the Claude
   marketplace entry. The Codex marketplace resolves the package root and its Codex manifest.
   Run the [native packaging checks](native-installation.md) for changed adapters.
   Maintain each skill's independent [SemVer](skill-versioning.md) and compare
   against the last reviewed release/commit. Prepare [release notes](../CHANGELOG.md).
2. Run the checks in [verification](verification.md) and inspect the complete
   diff. Runtime observations stay separate from source checks.
   For the Codex sidebar, run `npm ci --prefix apps/sidebar --ignore-scripts`,
   `npm run build --prefix apps/sidebar`, `npm test --prefix apps/sidebar` and
   `git diff --exit-code -- runtime/sidebar` after committing the generated output.
   The runtime is bundled; consumers do not install these author dependencies.
3. Obtain independent Review of the exact tree to be delivered. Any relevant
   content change invalidates that acceptance.
4. Confirm the destination, action, visibility, recovery point, and authority.

## Git delivery

Use any harness method that meets this procedure. Re-attest
the physical root, branch, clean state, credential-free remote, reviewed commit,
tree, and parent. Fresh-fetch the exact target branch and stop on drift.

Push only the reviewed commit with a normal non-force push when that exact
branch action is authorized. Fetch and read the destination again; the local
and live commit IDs must match. A commit, push, tag, release, and installation
are separate actions and require their own applicable authority.

## Release and adoption

A source version on `main` is a candidate until its reviewed tag and GitHub
Release exist. Promote the exact reviewed main-branch commit after the checks
above. Bump every native package declaration together, update `docs/osm.md`,
and add the matching `## VERSION` entry in CHANGELOG. Run the release check:

```sh
python3 tests/validate.py --release-tag vVERSION --baseline PREVIOUS_REVIEWED_REF
python3 tests/documentation-rehearsal.py
```

Replace both placeholders with the actual reviewed versions. Under the accepted
release authority, create and push only that version tag:

```sh
git tag -a vVERSION REVIEWED_COMMIT -m "OSM VERSION"
git push origin refs/tags/vVERSION
```

[Package and release CI](../.github/workflows/release.yml) runs package checks
for pull requests, main updates and version tags. On a tag, it also checks that
the tag commit belongs to main, that its version matches the package and local
overview, and that its changelog entry exists. Only then does it create the
matching GitHub prerelease. The repository is public; releases retain the
pilot prerelease channel. This workflow does not promote a stable release or
change repository visibility.

Verify workflow completion and the GitHub Release's tag and resolved commit.
A failed run means release delivery is incomplete. Fix the cause and rerun;
an existing release for the validated tag is not recreated. Never move a
published tag to repair a failed version. Retain earlier immutable tags for
recovery. A package listing or source push is not release readback.

Native adoption follows the [installation guide](native-installation.md),
preserving owner data and unrelated settings. A tracking source can adopt
upstream through its app's update controls. A pinned source must select the new
reviewed tag/commit explicitly. Verify the installed source, version and actual
skill discovery in every app included in the task. An update in Codex does not
update Pi or another app, and package discovery does not prove model behavior
or replacement of instructions already read into an active conversation.

A published release makes the reviewed package available to plugin users; it
does not replace their local installations. They refresh/update through their
app, then start a fresh conversation with the installed version. A new chat
alone does not download an update. OSM provides no background updater.

Owner context lives in the owner's Notion home. Plugin releases never upload,
restore or migrate an owner's home.

## Local documentation

`docs/osm.md` is the version-matched overview included in every native package.
The OSM skill's documentation route reads only the needed overview or method
reference. Package validation checks its regular file, package inventory and
single version label; release validation also checks the tag and changelog.
Content review establishes accuracy; matching numbers alone do not prove prose.

OSM no longer exports documentation for the Resources domain. The package
contains its own references and needs no documentation server, installer hook,
custom CLI or background updater. Customer sources and owner data stay with
their existing owners. The Resources rollback is delivered through that
repository's normal review, merge and production deployment.
