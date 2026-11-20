"""Guard native onboarding declarations; optionally read them through Codex.

The native check is read-only: no install, auth reset or configuration write.
It proves host recognition, not desktop rendering or a new OAuth grant.
"""

import argparse
import json
from pathlib import Path
import selectors
import shutil
import subprocess
import tempfile
import time
import unittest

from native_manifests import validate_native


ROOT = Path(__file__).resolve().parents[1]


def require(condition, message):
    if not condition:
        raise AssertionError(message)


class OnboardingTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="osm-onboarding-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name in (".codex-plugin", ".claude-plugin", ".cursor-plugin", "skills", "runtime", ".agents/plugins"):
            shutil.copytree(ROOT / name, self.root / name)
        for name in ("package.json", "gemini-extension.json"):
            shutil.copy2(ROOT / name, self.root / name)

    def edit(self, name, edit):
        path = self.root / name
        data = json.loads(path.read_text())
        edit(data)
        path.write_text(json.dumps(data))

    def test_native_contract(self):
        validate_native(self.root, require)

    def test_no_shadowing_manifest(self):
        (self.root / "plugin.json").write_text('{"name":"osm"}')
        with self.assertRaisesRegex(AssertionError, "shadows"):
            validate_native(self.root, require)

    def test_no_embedded_provider(self):
        (self.root / ".app.json").write_text('{"apps":{"notion":{}}}')
        with self.assertRaisesRegex(AssertionError, "separate plugin"):
            validate_native(self.root, require)

    def test_no_external_or_different_onboarding(self):
        self.edit(".codex-plugin/plugin.json", lambda d: d["extensions"]["com.openai"].update(
            onboardingSkill="../other/SKILL.md"))
        with self.assertRaisesRegex(AssertionError, "packaged Setup"):
            validate_native(self.root, require)

    def test_missing_onboarding_body(self):
        (self.root / "skills/osm-setup/SKILL.md").unlink()
        with self.assertRaisesRegex(AssertionError, "missing packaged Setup"):
            validate_native(self.root, require)

    def test_no_implicit_runtime(self):
        (self.root / "mcp.json").write_text('{"mcpServers":{}}')
        with self.assertRaisesRegex(AssertionError, "unexpected native runtime"):
            validate_native(self.root, require)

    def test_notion_tools_must_be_bundled_and_explicit(self):
        self.edit('.codex-plugin/mcp.json', lambda d: d['mcpServers']['osm'].update(command='npx'))
        with self.assertRaisesRegex(AssertionError, 'unexpected Notion tools'):
            validate_native(self.root, require)

    def test_no_dashboard_runtime(self):
        (self.root / "runtime/notion/index.html").write_text("<html></html>")
        with self.assertRaisesRegex(AssertionError, "extra Notion tools runtime file"):
            validate_native(self.root, require)
        (self.root / "runtime/notion/index.html").unlink()
        (self.root / "runtime/sidebar").mkdir()
        with self.assertRaisesRegex(AssertionError, "retired sidebar runtime"):
            validate_native(self.root, require)


def native_check():
    process = subprocess.Popen(
        ["codex", "app-server", "--stdio"], stdin=subprocess.PIPE,
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, bufsize=1,
    )
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)

    def request(identity, method, params):
        process.stdin.write(json.dumps({"id": identity, "method": method, "params": params}) + "\n")
        process.stdin.flush()
        deadline = time.monotonic() + 45
        while time.monotonic() < deadline:
            if not selector.select(1):
                continue
            line = process.stdout.readline()
            if not line:
                raise RuntimeError("Codex app-server exited before replying")
            response = json.loads(line)
            if response.get("id") == identity:
                if "error" in response:
                    raise RuntimeError(response["error"])
                return response["result"]
        raise TimeoutError(method)

    try:
        request(1, "initialize", {"clientInfo": {"name": "osm-onboarding-check", "version": "1.0"},
                                  "capabilities": {"experimentalApi": True}})
        process.stdin.write('{"method":"initialized","params":{}}\n')
        process.stdin.flush()
        detail = request(2, "plugin/read", {
            "marketplacePath": str(ROOT / ".agents/plugins/marketplace.json"),
            "pluginName": "osm",
        })["plugin"]
        require(not detail["apps"], "OSM must not embed Notion or another connector")
        setup = detail.get("onboardingSkill")
        require(setup and setup["enabled"] and
                Path(setup["path"]) == ROOT / "skills/osm-setup/SKILL.md",
                "Codex did not expose the selected Setup entry; check plugin enablement")
        expected_skills = len(list((ROOT / "skills").glob("*/SKILL.md")))
        require(len(detail["skills"]) == expected_skills and detail["mcpServers"] == ["osm"] and not detail["hooks"],
                "Unexpected native inventory")
        print(f"PASS: Codex recognizes separate providers, Setup, {expected_skills} skills and the declared OSM Notion tools server; no hooks")
    finally:
        selector.close()
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--native", action="store_true")
    args = parser.parse_args()
    result = unittest.TextTestRunner().run(unittest.defaultTestLoader.loadTestsFromTestCase(OnboardingTest))
    if not result.wasSuccessful():
        raise SystemExit(1)
    if args.native:
        native_check()
