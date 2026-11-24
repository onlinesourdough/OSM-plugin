"""Prove the wrapper stays thin, and all eight skills have positive/negative cases."""
import argparse
import json
from pathlib import Path
import shutil
import tempfile
from unslop_contract import check

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--upstream', type=Path, help='optional fetched upstream file outside the repository')
    args = parser.parse_args()
    check(ROOT, args.upstream.read_text() if args.upstream else None)
    cases = json.loads((ROOT / 'tests/fixtures/skill-trigger-cases.json').read_text())
    assert set(cases) == {p.parent.name for p in (ROOT / 'skills').glob('*/SKILL.md')}
    for name, prompts in cases.items():
        assert len(prompts['should_trigger']) == 3 and len(prompts['should_not_trigger']) == 2, name
        assert len(set(prompts['should_trigger'] + prompts['should_not_trigger'])) == 5, name
    with tempfile.TemporaryDirectory() as tmp:
        copy = Path(tmp)
        shutil.copytree(ROOT / 'skills/unslop', copy / 'skills/unslop')
        path = copy / 'skills/unslop/SKILL.md'
        original = path.read_text()
        for addition in ('\n## Bundled editorial rules\n', '\n- bundled word list\n', '\nx' * 1600):
            path.write_text(original + addition)
            try:
                check(copy)
            except AssertionError:
                pass
            else:
                raise AssertionError('accepted bundled upstream-style rules')
        path.write_text(original + '\nThis synthetic sentence represents an upstream rule copied into the wrapper.\n')
        try:
            check(copy, 'This synthetic sentence represents an upstream rule copied into the wrapper.')
        except AssertionError as error:
            assert 'upstream text' in str(error)
        else:
            raise AssertionError('accepted copied source prose')
    print('PASS: thin unslop wrapper, copied-text rejection and 40 trigger cases across eight skills')


if __name__ == '__main__':
    main()
