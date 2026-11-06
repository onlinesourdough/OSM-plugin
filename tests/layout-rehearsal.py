"""Exercise independent nested Git roots and owner-repository exclusions in the legacy file-home record (non-shipped, read-only guidance)."""

from pathlib import Path
import os
import shutil
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
OWNER_ASSETS = ROOT / "docs/legacy-file-home/owner"


def git(root, *args):
    env = {key: value for key, value in os.environ.items() if not key.startswith("GIT_")}
    env.update(GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull)
    return subprocess.run(["git", "-C", str(root), *args], env=env, check=True,
                          capture_output=True, text=True).stdout.strip()


def ignored(root, path):
    result = subprocess.run(
        ["git", "-C", str(root), "check-ignore", "--no-index", "--", path],
        capture_output=True, text=True,
    )
    assert result.returncode in {0, 1}
    return result.returncode == 0


def assert_layout(owner):
    assert Path(git(owner, "rev-parse", "--show-toplevel")) == owner.resolve()
    assert not (owner / "AGENTS.md").exists()
    assert not (owner / "AGENTS.override.md").exists()
    tracked = set(git(owner, "ls-files").splitlines())

    for family, slug in (("projects", "catalog"), ("systems", "reporting")):
        checkout = owner / family / slug
        assert Path(git(checkout, "rev-parse", "--show-toplevel")) == checkout.resolve()
        assert (checkout / ".git").is_dir() and (checkout / "AGENTS.md").is_file()
        assert ignored(owner, f"{family}/{slug}/draft.txt"), "checkout exclusion missing"
        assert not ignored(owner, f"{family}/README.md"), "existing source index excluded"
        assert not any(path == f"{family}/{slug}" or path.startswith(f"{family}/{slug}/")
                       for path in tracked), "checkout already tracked"


def main():
    with tempfile.TemporaryDirectory(prefix="osm-layout-") as temporary:
        fixture = Path(temporary)
        owner = fixture / "account/.AIOS"
        shutil.copytree(OWNER_ASSETS, owner)
        git(owner, "init", "-q", "-b", "main")

        for family, slug in (("projects", "catalog"), ("systems", "reporting")):
            checkout = owner / family / slug
            checkout.mkdir(parents=True)
            (owner / family / "README.md").write_text("Optional existing source index.\n")
            git(checkout, "init", "-q", "-b", "main")
            (checkout / "AGENTS.md").write_text("Use this repository's local lifecycle.\n")
            (checkout / ".gitignore").write_text("private-fixture.txt\n")
            (checkout / "draft.txt").write_text("Untracked local work.\n")
            (checkout / "private-fixture.txt").write_text("Synthetic ignored data.\n")
            git(checkout, "add", "--", "AGENTS.md", ".gitignore")
            assert "draft.txt" not in git(checkout, "ls-files").splitlines()
            assert ignored(checkout, "private-fixture.txt")

        git(owner, "add", "--", ".gitignore", "AIOS.md", "AIOS_FORMAT", "MEMORY.md",
            "CONNECTIONS.md", "projects/README.md", "systems/README.md")
        assert_layout(owner)

        tracked_copy = fixture / "tracked-copy"
        shutil.copytree(owner, tracked_copy)
        blob = git(tracked_copy, "hash-object", "-w", "--", "projects/catalog/draft.txt")
        git(tracked_copy, "update-index", "--add", "--cacheinfo",
            f"100644,{blob},projects/catalog/draft.txt")
        try:
            assert_layout(tracked_copy)
        except AssertionError as error:
            assert str(error) == "checkout already tracked"
        else:
            raise AssertionError("accepted tracked nested work")

        unguarded_copy = fixture / "unguarded-copy"
        shutil.copytree(owner, unguarded_copy)
        (unguarded_copy / ".gitignore").write_text(".env\n")
        try:
            assert_layout(unguarded_copy)
        except AssertionError as error:
            assert str(error) == "checkout exclusion missing"
        else:
            raise AssertionError("accepted missing checkout exclusion")

    print("PASS: existing nested Git roots and optional source indexes remain separate")
    print("PASS: rejects missing parent exclusions and tracked nested work")


if __name__ == "__main__":
    main()
