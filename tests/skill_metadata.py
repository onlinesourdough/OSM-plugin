"""Author-only validation of the package's portable YAML subset and SemVer.

No consumer dependency. This is deliberately not a general YAML parser: root
string fields and a metadata mapping of quoted strings are the supported shape.
Unsupported YAML is rejected rather than silently flattened or misinterpreted.
"""

import json
from pathlib import Path
import re
import subprocess


FIELDS = {"name", "description", "license", "compatibility", "allowed-tools", "metadata"}
# OSM 0.30.0 renamed these skills; each keeps its version lineage under the new
# name. A name change alters invocation, so it requires a major bump. OSM 0.31.0
# renamed the two context skills again; they map to their OSM 0.30.x names (a
# baseline older than 0.30.0 does not map them).
RENAMED_SKILLS = {
    "osm": "aios",
    **{f"osm-{name}": f"aios-{name}" for name in (
        "build-work", "create-project", "interview", "manage-skills",
        "orchestrate-workers", "review-work", "risky-changes", "setup",
        "ship-work", "spec-work", "triage-improvement")},
    "osm-data-context": "osm-context",
    "osm-manage-data-context": "osm-maintain-context",
    **{f"osm-{name}": name for name in ("clarify", "human-writing", "write-code")},
}
SEMVER = re.compile(
    r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)"
    r"(?:-((?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)"
    r"(?:\.(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?"
    r"(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?"
)


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def scalar(value, quoted=False):
    value = value.strip()
    if value.startswith('"'):
        try:
            result = json.loads(value)
        except ValueError as error:
            raise AssertionError("invalid quoted string") from error
        require(isinstance(result, str), "expected string")
        return result
    if value.startswith("'"):
        require(re.fullmatch(r"'(?:[^']|'')*'", value), "invalid quoted string")
        return value[1:-1].replace("''", "'")
    require(not quoted, "metadata values must be quoted strings")
    require(value and value[0].isalpha() and value[0] not in "[{]}>,|*&!%@`#" and
            not re.match(r"[-?:](?:\s|$)", value) and
            not re.search(r":(?:\s|$)|\s#", value) and
            value.lower() not in {"null", "~", "true", "false", "yes", "no", "on", "off"} and
            not re.fullmatch(r"[-+]?\d+(?:\.\d+)?", value),
            "unsupported YAML string; quote it")
    return value


def parse_frontmatter(text):
    require(text.startswith("---\n") and "\n---\n" in text[4:], "frontmatter delimiters")
    header = text[4:].split("\n---\n", 1)[0]
    result = {}
    metadata = None
    for line in header.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        require("\t" not in line, "frontmatter tabs")
        match = re.fullmatch(r"( *)([a-zA-Z][a-zA-Z0-9_-]*):(?: (.*))?", line)
        require(match is not None, "unsupported frontmatter syntax")
        indent, key, value = match.groups()
        if not indent:
            require(key in FIELDS, f"unsupported frontmatter field: {key}")
            require(key not in result, f"duplicate frontmatter field: {key}")
            metadata = None
            if key == "metadata":
                require(value is None, "metadata must be a mapping")
                metadata = result[key] = {}
            else:
                require(value is not None, f"empty frontmatter field: {key}")
                result[key] = scalar(value)
        else:
            require(indent == "  " and metadata is not None, "invalid metadata nesting")
            require(key not in metadata, f"duplicate metadata field: {key}")
            require(value is not None, f"empty metadata field: {key}")
            metadata[key] = scalar(value, quoted=True)
    return result


def version_key(version):
    match = SEMVER.fullmatch(version) if isinstance(version, str) else None
    require(match is not None, f"invalid SemVer: {version!r}")
    major, minor, patch, pre, _build = match.groups()
    # SemVer ignores build metadata; numeric prerelease identifiers sort first.
    prerelease = tuple((0, int(part)) if part.isdigit() else (1, part)
                       for part in pre.split(".")) if pre else ()
    return (int(major), int(minor), int(patch), pre is None, prerelease)


def skill_version(fields):
    metadata = fields.get("metadata")
    require(isinstance(metadata, dict) and "version" in metadata,
            "missing metadata.version")
    version_key(metadata["version"])
    return metadata["version"]


def payload(files):
    """Version-only changes do not count as skill behavior/resource changes."""
    return {name: re.sub(rb'^  version: [^\n]*\n', b'', value, count=1,
                        flags=re.M) if name == "SKILL.md" else value
            for name, value in files.items()}


def validate_change(before, after, renamed=False):
    current = skill_version(parse_frontmatter(after["SKILL.md"].decode()))
    old_fields = parse_frontmatter(before["SKILL.md"].decode()) if before else {}
    old = old_fields.get("metadata", {}).get("version")
    if old is None:
        require(current == "1.0.0", "initial skill version must be 1.0.0")
        return
    old_key, current_key = version_key(old), version_key(current)
    require(current_key >= old_key, "skill version regressed")
    if renamed:
        require(current_key[0] > old_key[0], "renamed skill requires a major bump")
    if payload(before) != payload(after):
        require(current_key > old_key, "changed skill requires a SemVer bump")


def validate_baseline(root, ref, names, renamed=RENAMED_SKILLS):
    """Compare owned skill files with an immutable local Git baseline; no fetch.

    A current name absent from the baseline is compared with its explicitly
    mapped previous name, never by prefix guessing.
    """
    commit = subprocess.check_output(
        ["git", "rev-parse", "--verify", "--end-of-options", ref + "^{commit}"],
        cwd=root, text=True).strip()
    paths = subprocess.check_output(
        ["git", "ls-tree", "-r", "--name-only", "-z", commit, "--", "skills"],
        cwd=root).decode().split("\0")
    for name in sorted(names):
        prefix = f"skills/{name}/"
        is_renamed = name in renamed and not any(path.startswith(prefix) for path in paths)
        source = f"skills/{renamed[name]}/" if is_renamed else prefix
        before = {path[len(source):]: subprocess.check_output(
            ["git", "show", f"{commit}:{path}"], cwd=root)
            for path in paths if path.startswith(source)}
        folder = Path(root) / prefix
        after = {path.relative_to(folder).as_posix(): path.read_bytes()
                 for path in folder.rglob("*") if path.is_file()}
        try:
            validate_change(before, after, renamed=is_renamed and bool(before))
        except AssertionError as error:
            raise AssertionError(f"{name}: {error}") from error
    return commit
