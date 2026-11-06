# Independent skill versions

Every shipped `SKILL.md` carries a quoted SemVer string in `metadata.version`:

```yaml
metadata:
  version: "1.0.0"
```

The 17 skills begin independent version histories at `1.0.0` in package `0.7.0`.
Package version and owner `AIOS_FORMAT` are separate contracts. Preserve existing
frontmatter and metadata when editing; never move version to a top-level field.

Choose the bump from the change to that skill's discovery, instructions, owned
references, scripts or assets: patch for compatible corrections/clarifications,
minor for compatible new capability, major for incompatible invocation, authority,
input/output or operational requirements. Do not bump every skill to match a
package release. Changing an owned reference counts even when SKILL.md is unchanged.
A linked shared procedure is versioned by its canonical owning skill; callers
need their own bump only when their contract or owned files change. Record any
material cross-skill impact in the release notes and Review evidence.

Before delivery, run:

```sh
python3 tests/validate.py --baseline LAST_REVIEWED_COMMIT_OR_TAG
python3 tests/skill-version-rehearsal.py
```

Use an existing local Git revision; the check neither fetches nor installs. It
checks each skill's owned directory against that immutable baseline, rejects
regressions and changed payloads without an increased SemVer precedence, and
requires `1.0.0` for initial versioning. Build metadata alone is not a bump.
Unchanged skills may retain their versions. Review judges whether patch, minor
or major is appropriate; a file comparison cannot infer compatibility.

A renamed skill keeps its history. `RENAMED_SKILLS` in `tests/skill_metadata.py`
maps each current name to its previous one (OSM 0.30.0: `aios*`, `clarify`,
`human-writing` and `write-code` to `osm*`). When the current name is absent
from the baseline, the check compares the mapped previous folder and requires a
major bump, because invocation changed. An unmapped new name is a new skill.

OSM 0.31.0 renamed `osm-context` to `osm-data-context` and `osm-maintain-context` to
`osm-manage-data-context`; the map points them at their 0.30.x names. A baseline older
than 0.30.0 (for example `v0.29.0`) has neither folder, so those two names are treated as
new skills and the check stops with "initial skill version must be 1.0.0". That is the
known limit of a single-name map, not a version error. Use a reviewed baseline at or after
0.30.0 (the last reviewed commit or tag). Routine delivery and CI do not pass an older
baseline.

The dependency-free author validator supports the package's deliberately small
YAML shape: root string fields (`name`, `description`, optional `license`,
`compatibility`, `allowed-tools`) and a `metadata` mapping of quoted strings.
It rejects duplicate keys, malformed nesting, unsupported fields and unsupported
YAML constructs instead of flattening them. Extra metadata strings are retained.
If a future skill needs a richer supported schema, extend parsing and semantic
tests together. These checks prove source shape and version transitions, not
native discovery or model behavior.

The author validator uses a conservative one-line YAML string profile. Unquoted
root values begin with a letter; quote numeric or indicator-leading strings.
Metadata values are quoted strings. Unsupported YAML is rejected, and native
loader validation remains separate.
