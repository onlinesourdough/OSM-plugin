#!/usr/bin/env python3
"""Anonymous browser subprocess boundary; no browser or credentials needed."""
import json
import os
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'docs-publisher'))
import publisher as pub
from browser_reader import BrowserReader

BASE = 'https://gustavanderson.notion.site'
PAGE = 'a' * 32
URL = BASE + '/' + PAGE
CATALOGUE = BASE + '/' + 'b' * 32
PACKETS = {'osm-log': {'page': PAGE, 'title': 'OSM:log', 'version': '1.2.0', 'package': '0.34.2',
                       'files': {'SKILL.md': b'Released reference for this edition.\nFinish here.\n'}}}


class BrowserBoundary(unittest.TestCase):
    def test_subprocess_gets_no_credentials_and_only_verified_reads_are_cached(self):
        calls = []
        def run(args, **kw):
            calls.append(kw)
            self.assertNotIn('OSM_PUBLIC_DOCS_TOKEN', kw['env'])
            self.assertNotIn('GH_TOKEN', kw['env'])
            self.assertEqual(json.loads(kw['input'])['url'], URL)
            self.assertIn('finishhere', json.loads(kw['input'])['markers'])
            self.assertIn('releasedreferenceforthisedition', json.loads(kw['input'])['markers'])
            return SimpleNamespace(returncode=0, stdout=json.dumps({'ok': True, 'url': URL, 'text': 'visible content'}))
        with patch.dict(os.environ, {'OSM_PUBLIC_DOCS_TOKEN': 'fixture', 'GH_TOKEN': 'fixture'}):
            reader = BrowserReader(BASE, CATALOGUE, PACKETS, runner=run)
            self.assertEqual(reader.read(URL), (pub.VERIFIED, 'visible content'))
            self.assertEqual(reader.read(URL)[0], pub.VERIFIED)
            self.assertEqual(len(calls), 1)
            self.assertEqual(reader.read('https://example.com')[0], pub.FAILED)
            self.assertEqual(len(calls), 1)

    def test_missing_mismatched_oversized_and_failed_observations_never_verify(self):
        for response in [dict(ok=False, url=URL, text='x'), dict(ok=True, url=CATALOGUE, text='x'),
                         dict(ok=True, url=URL), dict(ok=True, url=URL, text='x' * 2_010_000)]:
            with self.subTest(response_size=len(str(response))):
                reader = BrowserReader(BASE, CATALOGUE, PACKETS, runner=lambda *a, **k:
                    SimpleNamespace(returncode=0, stdout=json.dumps(response)))
                self.assertEqual(reader.read(URL)[0], pub.FAILED)
                self.assertFalse(reader.cache)
        def timeout(*a, **kw):
            raise subprocess.TimeoutExpired('node', 80)
        self.assertEqual(BrowserReader(BASE, CATALOGUE, PACKETS, runner=timeout).read(URL)[0], pub.FAILED)


if __name__ == '__main__':
    unittest.main()
