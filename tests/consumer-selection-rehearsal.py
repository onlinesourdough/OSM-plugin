#!/usr/bin/env python3
"""Local rehearsal of the two documentation consumers' selections (#85).

Resources selects the README introduction and three sections; the public profile generator reads
`Why I built this`. This rehearsal parses this repository the way a selector would and checks that
every selected heading exists once, is not empty, keeps resolvable links and carries no private
data. It runs neither consumer and deploys nothing; a pass is not a site update.
"""

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SELECTED = ("Install in your app", "Your context home", "Start with a real task")
PROFILE = "Why I built this"
SECRET = re.compile(r"AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9_-]{20,}|ntn_[A-Za-z0-9]{20,}")


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def sections(text):
    """Map of H2 heading to body, plus the introduction before the first H2."""
    parts = re.split(r"^## (.+)$", text, flags=re.M)
    intro = parts[0]
    found = {}
    for heading, body in zip(parts[1::2], parts[2::2]):
        require(heading not in found, f"duplicate heading: {heading}")
        found[heading.strip()] = body
    return intro, found


def links(body):
    return [t for t in re.findall(r"\]\(([^)\s]+)\)", body) if not re.match(r"[a-z]+:", t) and not t.startswith("#")]


def check(root=ROOT):
    readme = (root / "README.md").read_text()
    intro, found = sections(readme)
    selected = {"introduction": intro.split("\n", 1)[1] if intro.startswith("# ") else intro}
    for heading in SELECTED + (PROFILE,):
        require(heading in found, f"selected heading missing or renamed: {heading}")
        selected[heading] = found[heading]
    for name, body in selected.items():
        require(len(body.strip()) > 80, f"selected section is empty or too short: {name}")
        require(not SECRET.search(body), f"secret-like text in {name}")
        require(not re.search(r"/(?:Users|home)/[\w.-]+/", body), f"personal path in {name}")
        for target in links(body):
            require((root / target.split("#", 1)[0]).exists(), f"{name}: link does not resolve: {target}")
    require(len(re.findall(r"[.!?](?:\s|$)", found[PROFILE])) >= 2, "the profile story is more than a line")
    manifest = json.loads((root / "docs-publisher/manifest.json").read_text())
    for key, value in manifest["bindings"].items():
        if key in ("public_entry", "releases", "working_subtree", "working_subtree_note") or not isinstance(value, str):
            continue
        require(all(value not in body for body in selected.values()), f"a target id leaked into a selected section: {key}")
    # The consumer contract in docs/README must name exactly the headings the README keeps.
    contract = (root / "docs/README.md").read_text()
    for heading in SELECTED + (PROFILE,):
        require(f"`{heading}`" in contract, f"docs/README does not document the selection of: {heading}")
    return {name: hashlib.sha256(body.encode()).hexdigest()[:16] for name, body in selected.items()}


def main():
    hashes = check()
    for name, digest in hashes.items():
        print(f"selected {name!r}: sha256 {digest}")
    print("PASS: both consumer selections hold locally (rehearsal only; no consumer ran and nothing was deployed)")


if __name__ == "__main__":
    sys.exit(main())
