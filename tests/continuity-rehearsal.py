#!/usr/bin/env python3
"""Exercise owner-only continuity upload and restore with a local bare remote."""

import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from hashlib import sha256


ROOT = Path(__file__).resolve().parents[1]
OWNER_ASSETS = ROOT / "docs/legacy-file-home/owner"
EXACT = {
    ".gitignore", "AIOS.md", "AIOS_FORMAT", "MEMORY.md", "CONNECTIONS.md",
    "projects/README.md", "systems/README.md",
}
SECRET_MARKERS = ("token=", "password=", "private key", "sk-")
PERSONAL_SKILL_ROW = re.compile(
    r"^\|\s*`?([a-z0-9][a-z0-9-]*)`?\s*\|\s*[^|]+\|\s*[^|]+\|\s*$"
)


class SafeStop(Exception):
    pass


def git(root, *args):
    env = {key: value for key, value in os.environ.items() if not key.startswith("GIT_")}
    env.update(GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull)
    return subprocess.run(["git", "-C", str(root), *args], env=env, check=True,
                          capture_output=True, text=True).stdout.strip()


def git_result(root, *args):
    env = {key: value for key, value in os.environ.items() if not key.startswith("GIT_")}
    env.update(GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull)
    return subprocess.run(["git", "-C", str(root), *args], env=env,
                          check=False, capture_output=True, text=True)


def personal_skills(source):
    index = source / "skills/README.md"
    names = set()
    for line in index.read_text().splitlines():
        match = PERSONAL_SKILL_ROW.match(line)
        if match:
            names.add(match.group(1))
    return names


def allowed(relative, personal):
    if relative in EXACT or relative.startswith("context/") or relative == "skills/README.md":
        return True
    return any(relative.startswith(f"skills/{name}/") for name in personal)


def assert_transferable_tree(source):
    personal = personal_skills(source)
    for path in sorted((source / "context").rglob("*")):
        relative = path.relative_to(source).as_posix()
        if path.is_symlink():
            raise SafeStop(f"symlink in continuity scope: {relative}")
        if ".git" in path.relative_to(source / "context").parts:
            raise SafeStop(f"nested Git repository in continuity scope: {relative}")
    for path in sorted((source / "skills").iterdir()):
        relative = path.relative_to(source).as_posix()
        if path.name == "README.md":
            continue
        if not path.is_dir() or path.name not in personal:
            raise SafeStop(f"unrecorded personal skill or shared library: {relative}")
        for child in sorted(path.rglob("*")):
            child_relative = child.relative_to(source).as_posix()
            if child.is_symlink():
                raise SafeStop(f"symlink in continuity scope: {child_relative}")
            if ".git" in child.relative_to(path).parts:
                raise SafeStop(f"nested Git repository in continuity scope: {child_relative}")
    return personal


def selected(source):
    personal = assert_transferable_tree(source)
    for path in sorted(source.rglob("*")):
        if not path.is_file() and not path.is_symlink():
            continue
        relative = path.relative_to(source).as_posix()
        if not allowed(relative, personal):
            continue
        if path.is_symlink():
            raise SafeStop(f"symlink in continuity scope: {relative}")
        if path.suffix in {".md", ".txt", ".sh"}:
            lowered = path.read_text().lower()
            if any(marker in lowered for marker in SECRET_MARKERS):
                raise SafeStop(f"secret-like content in continuity scope: {relative}")
        yield relative


def assert_source(source):
    if (source / "AIOS_FORMAT").read_text() not in {"1\n", "2\n"}:
        raise SafeStop("unsupported source owner format")
    assert_transferable_tree(source)


def assert_history(source):
    if git_result(source, "rev-parse", "--is-inside-work-tree").returncode:
        return
    personal = personal_skills(source)
    paths = git(source, "log", "--all", "--format=", "--name-only").splitlines()
    if any(not allowed(relative, personal) for relative in paths if relative):
        raise SafeStop("history contains a path outside owner continuity scope")
    for revision in git(source, "rev-list", "--all").splitlines():
        for marker in SECRET_MARKERS:
            result = git_result(source, "grep", "-I", "-i", "-l", "-e", marker,
                                revision, "--")
            if result.returncode == 0:
                raise SafeStop("history contains secret-like content")


def assert_snapshot(snapshot):
    tracked = git(snapshot, "ls-files").splitlines()
    personal = assert_transferable_tree(snapshot)
    assert_history(snapshot)
    if not tracked or any(not allowed(relative, personal) for relative in tracked):
        raise SafeStop("remote contains a path outside owner continuity scope")
    if (snapshot / "AIOS_FORMAT").read_text() not in {"1\n", "2\n"}:
        raise SafeStop("unsupported restored owner format")
    for relative in tracked:
        path = snapshot / relative
        if path.is_symlink():
            raise SafeStop(f"restored symlink: {relative}")
        if path.suffix in {".md", ".txt", ".sh"}:
            lowered = path.read_text().lower()
            if any(marker in lowered for marker in SECRET_MARKERS):
                raise SafeStop(f"secret-like restored content: {relative}")
    return tracked


def file_hash(path):
    return sha256(path.read_bytes()).hexdigest()


def rebind_connections(source, target, source_text):
    text = source_text.replace(str(source), str(target))
    text = re.sub(r"(?mi)^(\s*git root\s*:\s*).*$", rf"\1{target}", text)
    text = re.sub(r"(?mi)^(\s*push approval\s*:\s*).*$", r"\1ask", text)
    return text


def assert_safe_target(target):
    # The caller has already resolved its trusted absolute parent. Inspect the
    # selected home and its immediate mutable parent without rejecting platform
    # compatibility links outside that owner-controlled boundary.
    for ancestor in (target, target.parent):
        if ancestor.is_symlink():
            raise SafeStop(f"symlink in restore target path: {ancestor}")


def publish(source, remote):
    assert_source(source)
    assert_history(source)
    stage = remote.with_suffix(".stage")
    stage.mkdir()
    paths = list(selected(source))
    for relative in paths:
        destination = stage / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source / relative, destination)
    git(stage, "init", "-q", "-b", "main")
    git(stage, "config", "user.email", "fixture@example.invalid")
    git(stage, "config", "user.name", "continuity fixture")
    git(stage, "add", "--", *paths)
    if git(stage, "diff", "--cached", "--name-only").splitlines() != paths:
        raise SafeStop("staged paths differ from owner continuity scope")
    git(stage, "commit", "-qm", "synthetic owner continuity")
    git(stage, "remote", "add", "origin", str(remote))
    git(stage, "push", "-q", "-u", "origin", "main")
    git(remote, "symbolic-ref", "HEAD", "refs/heads/main")


def restore(remote, target):
    assert_safe_target(target)
    if target.exists() and (target.is_symlink() or any(target.iterdir())):
        raise SafeStop("restore target is not absent or empty")
    target.parent.mkdir(parents=True, exist_ok=True)
    staging = target.parent / "restore-staging"
    git(target.parent, "clone", "-q", str(remote), str(staging))
    tracked = assert_snapshot(staging)
    source_hashes = {relative: file_hash(staging / relative) for relative in tracked}
    target.mkdir(exist_ok=True)
    for relative in tracked:
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        if relative == "CONNECTIONS.md":
            expected = rebind_connections(staging, target, (staging / relative).read_text())
            destination.write_text(expected)
            assert file_hash(destination) == sha256(expected.encode()).hexdigest()
        else:
            shutil.copy2(staging / relative, destination)
            assert file_hash(destination) == source_hashes[relative]
    return tracked


def continue_sync(target, remote):
    """Register a restored home anew, then exercise one scoped normal push."""
    assert not (target / ".git").exists(), "restore copied Git state"
    git(target, "init", "-q", "-b", "main")
    git(target, "config", "user.email", "fixture@example.invalid")
    git(target, "config", "user.name", "continuity fixture")
    git(target, "remote", "add", "origin", str(remote))
    git(target, "fetch", "-q", "origin", "main")
    git(target, "update-ref", "refs/heads/main", "refs/remotes/origin/main")
    git(target, "read-tree", "refs/remotes/origin/main")
    (target / "context/continued.md").write_text("Scoped post-restore change.\n")
    paths = ["CONNECTIONS.md", "context/continued.md"]
    git(target, "add", "--", *paths)
    if git(target, "diff", "--cached", "--name-only").splitlines() != paths:
        raise SafeStop("continued sync staged paths exceed reviewed scope")
    git(target, "commit", "-qm", "scoped post-restore continuity")
    git(target, "push", "-q", "-u", "origin", "main")
    audit = target.parent / "continued-sync-audit"
    git(target.parent, "clone", "-q", str(remote), str(audit))
    assert (audit / "context/continued.md").read_text() == "Scoped post-restore change.\n"
    assert str(target) in (audit / "CONNECTIONS.md").read_text()
    assert git(audit, "rev-parse", "HEAD") == git(target, "rev-parse", "HEAD")


def expect_stop(operation, marker):
    try:
        operation()
    except SafeStop as error:
        assert marker in str(error), error
    else:
        raise AssertionError(f"accepted unsafe continuity case: {marker}")


def main():
    with tempfile.TemporaryDirectory(prefix="osm-continuity-") as temporary:
        fixture = Path(temporary)
        source = fixture / "source/.AIOS"
        shutil.copytree(OWNER_ASSETS, source)
        (source / "context/client.md").write_text("Synthetic client context.\n")
        index = source / "skills/README.md"
        index.write_text(index.read_text() +
                         "\n| personal-report | synthetic local source | fixture client |\n")
        personal = source / "skills/personal-report"
        personal.mkdir()
        (personal / "SKILL.md").write_text("# Synthetic personal method\n")
        script = personal / "unsafe.sh"
        marker = fixture / "executed-marker"
        script.write_text(f"touch {marker}\n")
        (source / ".codex").mkdir()
        (source / ".codex/config.toml").write_text("must-not-sync\n")
        nested = source / "projects/actual-project"
        nested.mkdir(parents=True)
        (nested / "AGENTS.md").write_text("must-not-sync\n")
        connections = source / "CONNECTIONS.md"
        connections.write_text(connections.read_text() +
                               f"\nGit root: {source}\n"
                               "Remote: fixture://owner.git\n"
                               "Branch: main\n"
                               "Account: fixture-owner\n"
                               "Allowed paths: owner continuity scope\n"
                               "Push approval: standing\n")

        remote = fixture / "owner.git"
        git(fixture, "init", "--bare", "-q", str(remote))
        publish(source, remote)
        audit = fixture / "audit"
        git(fixture, "clone", "-q", str(remote), str(audit))
        tracked = assert_snapshot(audit)
        assert "context/client.md" in tracked and "skills/personal-report/unsafe.sh" in tracked
        assert ".codex/config.toml" not in tracked and "projects/actual-project/AGENTS.md" not in tracked

        absent_target = fixture / "fresh-machine/.AIOS"
        restored = restore(remote, absent_target)
        assert restored == tracked
        assert (absent_target / "context/client.md").read_text() == "Synthetic client context.\n"
        assert (absent_target / "skills/personal-report/unsafe.sh").is_file()
        restored_connections = (absent_target / "CONNECTIONS.md").read_text()
        assert str(source) not in restored_connections and str(absent_target) in restored_connections
        assert "Remote: fixture://owner.git" in restored_connections
        assert "Account: fixture-owner" in restored_connections
        assert "Push approval: ask" in restored_connections
        assert not marker.exists(), "restore executed an untrusted personal script"
        continue_sync(absent_target, remote)

        empty_target = fixture / "empty-machine/.AIOS"
        empty_target.mkdir(parents=True)
        restore(remote, empty_target)
        assert (empty_target / "AIOS.md").is_file()

        partial_target = fixture / "partial-machine/.AIOS"
        partial_target.mkdir(parents=True)
        (partial_target / "AIOS.md").write_text("owner custom content\n")
        expect_stop(lambda: restore(remote, partial_target), "not absent or empty")
        assert (partial_target / "AIOS.md").read_text() == "owner custom content\n"

        # A legacy home with optional indexes still completes the same roundtrip.
        legacy_source = fixture / "legacy-source/.AIOS"
        shutil.copytree(OWNER_ASSETS, legacy_source)
        (legacy_source / "AIOS_FORMAT").write_text("1\n")
        for family in ("projects", "systems"):
            (legacy_source / family).mkdir()
            (legacy_source / family / "README.md").write_text("Existing useful source index.\n")
        legacy_remote = fixture / "legacy.git"
        git(fixture, "init", "--bare", "-q", str(legacy_remote))
        publish(legacy_source, legacy_remote)
        legacy_target = fixture / "legacy-restored/.AIOS"
        restore(legacy_remote, legacy_target)
        assert (legacy_target / "AIOS_FORMAT").read_text() == "1\n"
        for family in ("projects", "systems"):
            assert (legacy_target / family / "README.md").read_bytes() == (legacy_source / family / "README.md").read_bytes()

        bad_format = fixture / "bad-format/.AIOS"
        shutil.copytree(source, bad_format)
        (bad_format / "AIOS_FORMAT").write_text("99\n")
        expect_stop(lambda: publish(bad_format, fixture / "bad-format.git"), "unsupported")

        secret_source = fixture / "secret-source/.AIOS"
        shutil.copytree(source, secret_source)
        (secret_source / "CONNECTIONS.md").write_text("token=synthetic\n")
        expect_stop(lambda: publish(secret_source, fixture / "secret.git"), "secret-like")

        unrecorded = fixture / "unrecorded/.AIOS"
        shutil.copytree(source, unrecorded)
        plugin = unrecorded / "skills/shared-plugin"
        plugin.mkdir()
        (plugin / "SKILL.md").write_text("# Must not become personal by path\n")
        expect_stop(lambda: publish(unrecorded, fixture / "unrecorded.git"), "unrecorded")

        symlink_source = fixture / "symlink-source/.AIOS"
        shutil.copytree(source, symlink_source)
        (symlink_source / "context/linked.md").symlink_to(source / "context/client.md")
        expect_stop(lambda: publish(symlink_source, fixture / "symlink.git"), "symlink")

        nested_context = fixture / "nested-context/.AIOS"
        shutil.copytree(source, nested_context)
        git(nested_context / "context", "init", "-q", "nested")
        expect_stop(lambda: publish(nested_context, fixture / "nested-context.git"), "nested Git")

        unsafe_parent = fixture / "unsafe-parent"
        unsafe_parent.symlink_to(fixture / "real-parent", target_is_directory=True)
        expect_stop(lambda: restore(remote, unsafe_parent / ".AIOS"), "symlink")

        history_source = fixture / "history-source/.AIOS"
        shutil.copytree(source, history_source)
        git(history_source, "init", "-q", "-b", "main")
        git(history_source, "config", "user.email", "fixture@example.invalid")
        git(history_source, "config", "user.name", "continuity fixture")
        (history_source / ".pi").mkdir()
        (history_source / ".pi/settings.json").write_text("must-not-publish\n")
        git(history_source, "add", "--", ".pi/settings.json")
        git(history_source, "commit", "-qm", "unsafe historical native config")
        shutil.rmtree(history_source / ".pi")
        git(history_source, "add", "-u", "--", ".pi/settings.json")
        git(history_source, "commit", "-qm", "clean current tree")
        expect_stop(lambda: publish(history_source, fixture / "history.git"), "history contains a path")

        secret_history = fixture / "secret-history/.AIOS"
        shutil.copytree(source, secret_history)
        git(secret_history, "init", "-q", "-b", "main")
        git(secret_history, "config", "user.email", "fixture@example.invalid")
        git(secret_history, "config", "user.name", "continuity fixture")
        original_connections = (secret_history / "CONNECTIONS.md").read_text()
        (secret_history / "CONNECTIONS.md").write_text(original_connections + "token=synthetic\n")
        git(secret_history, "add", "--", "CONNECTIONS.md")
        git(secret_history, "commit", "-qm", "unsafe historical secret")
        (secret_history / "CONNECTIONS.md").write_text(original_connections)
        git(secret_history, "add", "--", "CONNECTIONS.md")
        git(secret_history, "commit", "-qm", "clean current connections")
        expect_stop(lambda: publish(secret_history, fixture / "secret-history.git"), "history contains secret")

        attacker = fixture / "attacker"
        git(fixture, "clone", "-q", str(remote), str(attacker))
        git(attacker, "config", "user.email", "fixture@example.invalid")
        git(attacker, "config", "user.name", "continuity fixture")
        (attacker / ".pi").mkdir()
        (attacker / ".pi/settings.json").write_text("must-not-restore\n")
        git(attacker, "add", "--", ".pi/settings.json")
        git(attacker, "commit", "-qm", "hostile native config")
        git(attacker, "push", "-q")
        expect_stop(lambda: restore(remote, fixture / "hostile-machine/.AIOS"), "outside owner continuity scope")

    print("PASS: local bare-Git owner continuity roundtrip is scoped and non-executing")
    print("PASS: restore accepts only absent/empty targets and preserves partial homes")
    print("PASS: malformed, secret-like, unrecorded/shared, nested, native-config and hostile remote content stop")
    print("PASS: target rebinding, safe re-registration and stale-history checks preserve later Sync")


if __name__ == "__main__":
    main()
