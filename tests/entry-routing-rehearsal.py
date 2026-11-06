#!/usr/bin/env python3
"""Prepare native-entry fixtures from the shipped Notion pointer and a fictional URL.

Preparation only: it launches no model and changes no real setup. The local owner-home
folder is a synthetic stand-in for the fictional Notion home; nothing here proves native
routing, a live Notion read or a real home."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PRODUCT_PREFIXES = ("skills/", ".codex-plugin/", "assets/")
PRODUCT_FILES = {"package.json", "LICENSE", "README.md", "docs/osm.md"}
FICTIONAL_HOME_URL = "https://notion.example/fict-data-and-context"


def write(root, relative, text):
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    return path


def owner_seed(root):
    write(root, "owner-home/AIOS_FORMAT", "1\n")
    write(root, "owner-home/AIOS.md", """# Rowan's context
Read MEMORY.md, then only the source relevant to this task.
Offers and delivery: context/offers.md. Access: CONNECTIONS.md.
This home owns routing and unique local facts; external sources own their content.
""")
    write(root, "owner-home/MEMORY.md", "# Memory\nNo corrections recorded.\n")
    write(root, "owner-home/CONNECTIONS.md", """# Source connection
Local fixture source adapter: external/ represents Rowan's personal source account.
Read only the selected resource. Context updates are authorized; source writes,
publication and cross-account access are not.
""")
    write(root, "owner-home/context/offers.md", """# Offer route
Scope: Studio North. Use when: current delivery or offer facts matter.
Source ID: offer-17; former account; external/former/offer.md.
Historical local summary: delivery window was 42 days. Not verified after the move.
""")
    write(root, "external/personal/offer.md", """# Standard offer
Account: Rowan personal
Source ID: offer-17
Owner: Studio North
Current delivery window: 17 days.
Current price: EUR 8900.
""")
    write(root, "external/personal/same-title.md", """# Standard offer
Account: Rowan personal
Source ID: unrelated-marketing-example
Owner: external example
Current delivery window: 99 days.
""")
    write(root, "external/migration.json", json.dumps({
        "confirmed_by": "Rowan",
        "from_account": "Rowan former",
        "to_account": "Rowan personal",
        "source_id": "offer-17",
        "old_path": "external/former/offer.md",
        "new_path": "external/personal/offer.md",
    }, indent=2) + "\n")


def prepare(destination, baseline):
    if destination.exists():
        raise SystemExit("Destination must not already exist; preserve prior evidence.")
    destination.mkdir(parents=True)
    if baseline:
        paths = subprocess.check_output(["git", "ls-tree", "-r", "--name-only", baseline],
                                        cwd=ROOT, text=True).splitlines()
    else:
        paths = [p.relative_to(ROOT).as_posix() for p in ROOT.rglob("*")
                 if p.is_file() and ".git" not in p.relative_to(ROOT).parts]
    paths = sorted(p for p in paths if p in PRODUCT_FILES or p.startswith(PRODUCT_PREFIXES))
    manifest = {}
    for relative in paths:
        data = subprocess.check_output(["git", "show", f"{baseline}:{relative}"], cwd=ROOT) \
            if baseline else (ROOT / relative).read_bytes()
        path = destination / "package" / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        path.chmod(0o444)
        manifest[relative] = hashlib.sha256(data).hexdigest()
    write(destination, "source-hashes.json", json.dumps(manifest, indent=2) + "\n")

    prompts = {
        "documentation": """Forklar kort, hvad OSM er, hvordan ejerkontekst adskiller sig fra
de indbyggede metoder, og hvilken OSM-version denne installation beskriver.
""",
        "onboard": """Set up a small reusable context for me in owner-home.
I am Rowan, a solo owner of Studio North. I have chosen new local onboarding;
no Git sync or real harness/account settings changes. My relevant documents are
listed in external/INDEX.md, available through the local source adapter.
One thing not written there: Tuesday afternoons are reserved for study, so avoid
booking client calls then. Preserve that for future planning.
I normally use ChatGPT for long research and want useful preparation here.
First, help me get a study of the Finnish and Estonian market ready to run there:
which market should we investigate first for our existing service? I want a
copyable research brief, needed sources and a clear next step. Do not run the
full study. Do the local setup and useful preparation now, using known answers;
report any remaining setup evidence rather than inventing it.
""",
        "migration": """I moved my documents from my former account to my personal
account. The confirmed mapping is external/migration.json. Update the affected
context reference and tell me the current delivery window for our standard offer.
You may update owner-home, but do not edit the source documents or invent broader
write permissions. Keep other owner knowledge.
""",
        "production": """Please complete this analysis here using transactions.csv:
calculate total net sales and net sales by customer segment. Use net = gross -
refund. Verify missing customer IDs and duplicate order IDs, and give me the
actual results with a short reproducible calculation in outputs/analysis.md.
""",
        "repository": """Fix total_net in app.py so refunds are subtracted.
Keep the function interface and verify the supplied cases with python3 check.py.
""",
    }
    for name, prompt in prompts.items():
        root = destination / name
        root.mkdir()
        subprocess.run(["git", "init", "-q"], cwd=root, check=True)
        write(root, "prompt.txt", prompt)
        (root / "outputs").mkdir()
        package = destination / "package"
        skill_dir = root / ".agents/skills"
        skill_dir.mkdir(parents=True)
        for folder in sorted((package / "skills").iterdir()):
            if (folder / "SKILL.md").is_file():
                (skill_dir / folder.name).symlink_to(folder, target_is_directory=True)
        bridge = (package / "skills/osm-data-context/assets/bridge.md").read_text().replace(
            "<verified-notion-root-entry-url>", FICTIONAL_HOME_URL)
        boundary = f"""This is an isolated local task. Use only files under {root}
and the read-only installed skill package at {package}. No real owner files,
other accounts, network browsing, native configuration changes, skill installs,
new goals, sidebar tasks or external writes. The external/ folder represents
the named external source account for this task and is read-only to you.
The folder owner-home stands in for the fictional Notion home at {FICTIONAL_HOME_URL}.
You may edit owner-home and outputs for owner tasks, or app.py for the repository
task. Treat this resource boundary as setup, not as the task's intended answer.
"""
        if name == "onboard":
            write(root, "external/INDEX.md", """# Rowan's sources
Account: Rowan personal. Read these source documents as needed.
business.md owns Studio North's audience/service; operations.md owns current
operational state. There is no separate documented availability or voice policy.
""")
            write(root, "external/business.md", """# Studio North business
Source ID: business-11. Account: Rowan personal.
Studio North helps small manufacturers document production handovers.
Its existing service maps the process, interviews the team and delivers one
tested handover guide. It serves companies with 10-50 employees.
Current offer price: EUR 8900. Refresh commercial values before using them.
""")
            write(root, "external/operations.md", """# Current operations
Source ID: ops-12. Account: Rowan personal.
Current board marker: OCT-BOARD-772.
Today there are three active handover jobs and two offers awaiting a response.
These values change with the source; this page is the current operational record.
""")
        else:
            owner_seed(root)
        if name == "production":
            write(root, "transactions.csv", """order_id,customer_id,segment,gross,refund
a1,c1,Studio,100,10
a2,c2,Workshop,200,40
a3,c1,Studio,50,0
""")
        if name == "repository":
            local = """# Repository contract
This is an independent repository. Work locally on app.py and check.py.
No owner context is needed. Preserve the interface; use the supplied checks.
"""
            write(root, "AGENTS.md", local)
            bridge += "\n" + local
            write(root, "app.py", "def total_net(rows):\n    return sum(row['gross'] for row in rows)\n")
            write(root, "check.py", """from app import total_net
assert total_net([]) == 0
assert total_net([{'gross': 100, 'refund': 15}, {'gross': 20, 'refund': 2}]) == 103
assert total_net([{'gross': 10, 'refund': 10}]) == 0
print('PASS')
""")
        write(root, "bridge.txt", boundary + "\n" + bridge)
        for path in (root / "external").rglob("*"):
            if path.is_file():
                path.chmod(0o444)
    print(f"Prepared {len(prompts)} ordinary-entry fixtures and {len(manifest)} package files.")
    print("Use native skill discovery, bridge.txt as the bounded native instruction layer,")
    print("and prompt.txt as user input. Never preload skill bodies or read evaluator expectations.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("destination", type=Path)
    parser.add_argument("--baseline", help="existing source Git revision")
    args = parser.parse_args()
    prepare(args.destination.resolve(), args.baseline)
