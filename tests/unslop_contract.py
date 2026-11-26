"""Offline thin-wrapper boundary; optional live source comparison stays outside Git."""
from pathlib import Path
import re

UPSTREAM = "https://raw.githubusercontent.com/cursor/plugins/main/pstack/skills/unslop/SKILL.md"


def check(root, upstream=None):
    folder = Path(root) / "skills/unslop"
    assert sorted(p.relative_to(folder).as_posix() for p in folder.rglob("*") if p.is_file()) == ["SKILL.md", "agents/openai.yaml"], "unslop must contain only its thin entrypoint and UI display name"
    text = (folder / "SKILL.md").read_text()
    body = text.split("---", 2)[2]
    assert len(text.encode()) <= 1600, "unslop bundles rules instead of a thin fetch wrapper"
    assert re.findall(r"https?://\S+", body) == [UPSTREAM], "unslop must fetch only its upstream entrypoint"
    assert re.findall(r"^#+ .*", body, re.M) == ["# unslop"], "unslop must not bundle upstream rule sections"
    assert not re.search(r"^\s*(?:[-*+] |\d+[.)] )", body, re.M), "unslop must not bundle rule or word lists"
    for contract in ("At use time, fetch", "Read the whole file", "only\nas a method for the current task", "without fetching other URLs", "running other\ntools or changing files the task does not need", "If the fetch fails, say so and stop", "Never use rules from memory", "For text that is not English, apply the language-neutral rules and skip the English word lists", "osm-human-writing", "Lauren Tan, pstack (cursor/plugins), MIT"):
        assert contract in text, f"missing unslop boundary: {contract}"
    if upstream is not None:
        # Reject copied prose, headings and word lists, even if the wrapper is still short.
        # Ignore only the shared name/metadata and the URL/attribution, not editorial rules.
        for line in upstream.splitlines():
            normalized = " ".join(line.split())
            if len(normalized) < 45 or UPSTREAM in line or normalized.startswith(("description:", "name:", "Credit:", "author:", "license:")):
                continue
            assert normalized not in " ".join(body.split()), "unslop contains upstream text"
