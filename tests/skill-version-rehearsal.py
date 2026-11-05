"""Exercise frontmatter and version transitions with synthetic skill payloads."""

from pathlib import Path
import subprocess
import tempfile
import unittest

from skill_metadata import (RENAMED_SKILLS, parse_frontmatter, skill_version,
                            validate_baseline, validate_change, version_key)


def skill(version='"1.0.0"', body="Do the accepted work.\n"):
    return ("---\nname: sample\ndescription: Perform a bounded task.\n"
            'metadata:\n  short-description: "Preserve me"\n'
            f"  version: {version}\n---\n\n{body}")


def files(version='"1.0.0"', body="Do the accepted work.\n", **resources):
    return {"SKILL.md": skill(version, body).encode(), **resources}


class MetadataTests(unittest.TestCase):
    def test_preserves_nested_metadata(self):
        result = parse_frontmatter(skill())
        self.assertEqual(result["metadata"], {"short-description": "Preserve me", "version": "1.0.0"})
        self.assertNotIn("version", result)
        self.assertEqual(skill_version(result), "1.0.0")

    def test_rejects_malformed_or_nonportable_metadata(self):
        examples = [
            skill().replace("metadata:\n", "metadata: []\n"),
            skill().replace('  version: "1.0.0"', 'version: "1.0.0"'),
            skill().replace('  version: "1.0.0"', '  version: "1.0.0"\n  version: "2.0.0"'),
            skill().replace('  version: "1.0.0"', '    version: "1.0.0"'),
            skill().replace("name: sample", "name: sample\nname: duplicate"),
            skill().replace('  version: "1.0.0"\n', ''),
            skill().replace("metadata:", "version:"),
            skill().replace("description: Perform a bounded task.", "description: |\n  ambiguous"),
        ]
        examples += [skill().replace("Perform a bounded task.", value)
                     for value in ("- item", "? key", ": value", "# comment", "] item", "1e3", "2026-09-12", "on", "Task:", "true ", "null ")]
        examples += [skill(value) for value in ('1.0.0', '1', 'true', '[]', 'null', '"01.0.0"',
                                               '"1.0"', '"v1.0.0"', '"1.0.0-01"', '"1.0.0+"')]
        for text in examples:
            with self.subTest(text=text), self.assertRaises(AssertionError):
                skill_version(parse_frontmatter(text))

    def test_quoted_yaml_indicators_remain_strings(self):
        for value in ("- item", "? key", ": value", "# comment", "] item", "1e3", "2026-09-12", "on", "Task:", "true ", "null "):
            source = skill().replace("Perform a bounded task.", '"' + value + '"')
            self.assertEqual(parse_frontmatter(source)["description"], value)

    def test_semver_order(self):
        ordered = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta',
                   '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1',
                   '1.0.0', '1.0.1', '1.1.0', '2.0.0']
        self.assertEqual(sorted(reversed(ordered), key=version_key), ordered)
        self.assertEqual(version_key('1.0.0+build.01'), version_key('1.0.0+other'))
        self.assertEqual(skill_version(parse_frontmatter(skill("'1.0.0'"))), '1.0.0')

    def test_initialization_and_unchanged(self):
        validate_change({}, files())
        old = {"SKILL.md": b"---\nname: sample\ndescription: A task.\n---\nOld body\n"}
        validate_change(old, files())
        validate_change(files(), files())
        with self.assertRaisesRegex(AssertionError, "initial"):
            validate_change({}, files('"0.7.0"'))

    def test_changed_body_description_or_resource_requires_bump(self):
        changes = [files(body="Changed decision.\n"),
                   files(**{"references/rule.md": b"Added resource"}),
                   {"SKILL.md": skill().replace("a bounded task", "another task").encode()}]
        for after in changes:
            with self.subTest(after=after), self.assertRaisesRegex(AssertionError, "bump"):
                validate_change(files(), after)
        with self.assertRaisesRegex(AssertionError, "bump"):
            validate_change(files(**{"old.md": b"removed"}), files())
        with self.assertRaisesRegex(AssertionError, "bump"):
            validate_change(files(**{"rule.md": b"old"}), files(**{"rule.md": b"new"}))

    def test_independent_bumps_and_regression(self):
        for version in ('"1.0.1"', '"1.1.0"', '"2.0.0"'):
            validate_change(files(), files(version, body="Changed.\n"))
        for version in ('"0.9.0"', '"1.0.0-rc.1"'):
            with self.assertRaisesRegex(AssertionError, "regressed"):
                validate_change(files(), files(version))
        with self.assertRaisesRegex(AssertionError, "bump"):
            validate_change(files(), files('"1.0.0+build"', body="Changed.\n"))

    def test_renamed_skill_keeps_lineage_with_major_bump(self):
        validate_change(files('"1.4.2"'), files('"2.0.0"'), renamed=True)
        for version in ('"1.5.0"', '"1.4.3"', '"1.4.2"'):
            with self.subTest(version=version), self.assertRaisesRegex(AssertionError, "major"):
                validate_change(files('"1.4.2"'), files(version), renamed=True)
        with self.assertRaisesRegex(AssertionError, "regressed"):
            validate_change(files('"1.4.2"'), files('"1.0.0"'), renamed=True)


class RenameBaselineTests(unittest.TestCase):
    """The baseline follows only the explicit rename map, never a name prefix."""

    def repository(self, skills):
        temporary = tempfile.TemporaryDirectory(prefix="osm-rename-baseline-")
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        def git(*args):
            subprocess.run(["git", *args], cwd=root, check=True, capture_output=True)
        git("init", "-q")
        for name, version in skills.items():
            (root / "skills" / name).mkdir(parents=True)
            (root / "skills" / name / "SKILL.md").write_bytes(files(version)["SKILL.md"])
        git("add", "-A")
        git("-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-qm", "base")
        return root

    def rename(self, root, old, new, version):
        (root / "skills" / old).rename(root / "skills" / new)
        (root / "skills" / new / "SKILL.md").write_bytes(files(version)["SKILL.md"])

    def test_mapped_rename_compares_previous_name(self):
        root = self.repository({"aios-spec-work": '"2.2.1"', "write-code": '"1.1.1"'})
        self.rename(root, "aios-spec-work", "osm-spec-work", '"3.0.0"')
        self.rename(root, "write-code", "osm-write-code", '"2.0.0"')
        validate_baseline(root, "HEAD", {"osm-spec-work", "osm-write-code"})

    def test_mapped_rename_rejects_reset_or_minor_bump(self):
        for version, message in (('"1.0.0"', "skill version regressed"),
                                 ('"2.3.0"', "renamed skill requires a major bump")):
            with self.subTest(version=version):
                root = self.repository({"aios-spec-work": '"2.2.1"'})
                self.rename(root, "aios-spec-work", "osm-spec-work", version)
                with self.assertRaisesRegex(AssertionError, "osm-spec-work: " + message):
                    validate_baseline(root, "HEAD", {"osm-spec-work"})

    def test_unmapped_name_is_a_new_skill(self):
        root = self.repository({"aios-spec-work": '"2.2.1"'})
        self.rename(root, "aios-spec-work", "osm-unmapped", '"3.0.0"')
        with self.assertRaisesRegex(AssertionError, "initial"):
            validate_baseline(root, "HEAD", {"osm-unmapped"})

    def test_current_name_in_baseline_is_not_remapped(self):
        root = self.repository({"osm-spec-work": '"3.0.0"', "aios-spec-work": '"9.0.0"'})
        validate_baseline(root, "HEAD", {"osm-spec-work"})

    def test_map_covers_renamed_package_skills_only(self):
        self.assertEqual(len(RENAMED_SKILLS), 17)
        self.assertTrue(all(name == "osm" or name.startswith("osm-") for name in RENAMED_SKILLS))
        self.assertFalse({"content", "diffusion-studio"} & set(RENAMED_SKILLS.values()))

    def test_context_skills_compare_their_osm_0_30_names(self):
        self.assertEqual(RENAMED_SKILLS["osm-data-context"], "osm-context")
        self.assertEqual(RENAMED_SKILLS["osm-manage-data-context"], "osm-maintain-context")
        root = self.repository({"osm-context": '"2.0.0"', "osm-maintain-context": '"2.0.0"'})
        self.rename(root, "osm-context", "osm-data-context", '"3.0.0"')
        self.rename(root, "osm-maintain-context", "osm-manage-data-context", '"3.0.0"')
        validate_baseline(root, "HEAD", {"osm-data-context", "osm-manage-data-context"})
        self.rename(root, "osm-data-context", "osm-data-context", '"2.1.0"')
        with self.assertRaisesRegex(AssertionError, "osm-data-context: renamed skill requires a major bump"):
            validate_baseline(root, "HEAD", {"osm-data-context"})


if __name__ == "__main__":
    unittest.main()
