#!/usr/bin/env python3
"""Source parity and bounded Markdown-reader checks. Fixtures only; no credentials."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'docs-publisher'))
import publisher as pub

PAGE = 'a' * 32
KEY = 'notion.guide.test'
PATH = 'skills/example/assets/definition.md'
BODY = '# Definition\n\n```yaml\nsource: direct\nretention: source-only\n```\n'

class Parity(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.path = self.root / PATH
        self.path.parent.mkdir(parents=True)
        self.path.write_text('# Installed asset\n\n```yaml\nold: value\n```\n\nKept prose.\n')
        self.manifest = copy.deepcopy(pub.load_manifest())
        self.guide = {'key': KEY, 'class': 'G', 'edition': 'guide', 'owner': 'notion',
            'source_paths': [], 'public_writer': 'notion-authored', 'notion': PAGE,
            'original': None, 'exports': [{'path': PATH, 'notion': {'fence': 'yaml'}, 'git': {'fence': 'yaml'}}]}
        self.manifest['artifacts'] = [self.guide]
        self.snapshot = pub.read_snapshot({'format': 1, 'reader': 'fixture',
            'read_at': '2026-11-19T20:00:00Z', 'pages': {PAGE: {'notion': PAGE, 'body': BODY}}}, self.manifest)

    def export(self, **kw):
        return pub.export_originals(self.root, self.manifest, self.snapshot, '0.34.0', **kw)

    def state(self, read=None):
        return pub.original_state(self.guide, pub.DirSource(self.root), read)

    def read(self, body=BODY, reader='fixture'):
        return {'body': body, 'revision': pub.revision(body), 'reader': reader}

    def test_export_preserves_other_regions_and_repeats_without_file_changes(self):
        _, changed = self.export()
        self.assertEqual(set(changed), {PATH, pub.frozen_path(KEY)})
        self.assertIn('Kept prose.', self.path.read_text())
        self.assertIn('retention: source-only', self.path.read_text())
        before = self.path.stat().st_mtime_ns
        self.assertEqual(self.export()[1], [])
        self.assertEqual(before, self.path.stat().st_mtime_ns)
        self.assertIn('read and unchanged', self.state(self.read())[1])

    def test_whole_file_export_can_create_its_declared_new_asset(self):
        self.path.unlink()
        self.guide['exports'][0]['git'] = None
        self.export(dry_run=True)
        self.assertFalse(self.path.exists())
        self.export()
        self.assertEqual(self.path.read_text(), 'source: direct\nretention: source-only\n')
        self.assertEqual(self.state(self.read())[0], pub.REFUSED_NOTION)

    def test_newer_original_conflicts_without_repairing_either_side(self):
        self.export()
        before = self.path.read_bytes()
        self.assertEqual(self.state(self.read(BODY.replace('source-only', 'changed')))[0], pub.CONFLICT)
        self.assertEqual(self.path.read_bytes(), before)
        self.assertEqual((self.root / pub.frozen_path(KEY)).read_text(), BODY)

    def test_hand_edited_export_and_frozen_original_are_detected(self):
        self.export()
        self.path.write_text(self.path.read_text().replace('source-only', 'wrong'))
        self.assertEqual(self.state()[0], pub.CONFLICT)
        self.export()
        (self.root / pub.frozen_path(KEY)).write_text('unrelated edit')
        self.assertEqual(self.state()[0], pub.CONFLICT)

    def test_missing_source_and_unqualified_representation_never_claim_unchanged(self):
        self.export()
        outcome, detail = self.state({'error': 'not granted'})
        self.assertEqual(outcome, pub.UNREADABLE)
        outcome, detail = self.state(self.read(reader='another-representation'))
        self.assertEqual(outcome, pub.UNVERIFIED_ORIGINAL)
        self.assertIn('not comparable', detail)
        self.assertNotIn('read and unchanged', detail)

    def test_dry_run_and_selection_refusal_write_nothing(self):
        before = self.path.read_bytes()
        self.export(dry_run=True)
        self.assertIsNone(self.guide['original'])
        self.assertEqual(self.path.read_bytes(), before)
        self.guide['exports'].append({'path': PATH, 'notion': {'fence': 'missing'}, 'git': None})
        with self.assertRaises(pub.PublisherError): self.export()
        self.assertEqual(self.path.read_bytes(), before)
        self.assertFalse((self.root / pub.frozen_path(KEY)).exists())

    def test_original_conflict_stops_publication_before_any_write(self):
        from fixture_transport import FixtureTransport
        self.export()
        self.manifest['artifacts'].append({'key': 'test.working', 'class': 'W',
            'edition': 'main-working', 'owner': 'git', 'source_paths': ['README.md'],
            'public_writer': 'ci', 'adoption_state': 'adopted'})
        (self.root / 'README.md').write_text('Changed public page')
        remote = copy.deepcopy(self.snapshot)
        remote['pages'][KEY] = self.read(BODY.replace('source-only', 'changed'))
        transport = FixtureTransport()
        approved = self.manifest['editions']['released']['commit']
        with self.assertRaisesRegex(pub.PublisherError, 'guide original parity failed'):
            pub.publish(self.manifest, pub.DirSource(self.root), transport, 'test',
                        lambda tag: approved, allow_fixture=True, originals=remote)
        self.assertEqual(transport.rows, {})
        self.assertFalse(any(event[0] in ('upsert', 'status') for event in transport.log))

    def test_snapshot_identity_truncation_and_revision_are_checked(self):
        for patch in ({'notion': 'b' * 32}, {'truncated': True}, {'unknown_block_ids': ['block']},
                      {'revision': '0' * 64}, {'body': ''}):
            data = {'format': 1, 'reader': 'fixture', 'pages': {KEY: {'notion': PAGE, 'body': BODY, **patch}}}
            with self.subTest(patch=patch), self.assertRaises(pub.SetupError):
                pub.read_snapshot(data, self.manifest)

    def test_unread_or_differently_represented_original_blocks_publication_before_writes(self):
        from fixture_transport import FixtureTransport
        self.export()
        approved = self.manifest['editions']['released']['commit']
        foreign = copy.deepcopy(self.snapshot)
        foreign['reader'] = 'unqualified-api-format'
        for snapshot in (None, foreign):
            transport = FixtureTransport()
            with self.subTest(snapshot=bool(snapshot)), self.assertRaises(pub.PublisherError):
                pub.publish(self.manifest, pub.DirSource(self.root), transport, 'test',
                            lambda tag: approved, allow_fixture=True, originals=snapshot)
            self.assertEqual(transport.rows, {})
            self.assertFalse(any(event[0] in ('upsert', 'status') for event in transport.log))

    def test_release_binding_and_new_method_folder_require_an_explicit_mapping(self):
        self.assertTrue(pub.binding_problems(self.manifest, 'v0.34.0'))
        self.export()
        self.assertFalse(pub.binding_problems(self.manifest, 'v0.34.0'))
        self.assertTrue(pub.binding_problems(self.manifest, 'v0.35.0'))
        self.manifest['folders'] = {'skills/example/': {'page': KEY}}
        self.assertFalse(pub.folder_problems(self.manifest, [PATH]))
        self.assertTrue(pub.folder_problems(self.manifest, [PATH, 'skills/new/SKILL.md']))

class FolderPages(unittest.TestCase):
    def test_reader_source_cannot_lag_instructions_or_shared_resources(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location('guide_builder', ROOT / 'docs-publisher/build-guide.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        files = {'skills/example/SKILL.md': 'accepted instruction',
                 'skills/helper/index.md': 'accepted reference'}
        source = pub.DictSource(files)
        self.assertEqual(module.skill_source_drift(source, pub.DictSource(dict(files))), [])
        for path in files:
            changed = {**files, path: 'changed source'}
            self.assertEqual(module.skill_source_drift(pub.DictSource(changed), source), [path])
        added = 'skills/new/SKILL.md'
        self.assertEqual(module.skill_source_drift(pub.DictSource({**files, added: 'new'}), source), [added])

    def test_method_folders_point_to_their_public_skill_pages(self):
        manifest = pub.load_manifest()
        for artifact in manifest['artifacts']:
            if artifact['class'] == 'A' and artifact.get('notion'):
                folder = artifact['source_paths'][0]
                self.assertEqual(manifest['folders'][folder]['page'], artifact['key'])
        self.assertFalse(pub.folder_problems(manifest, pub.DirSource(ROOT).paths()))
        bad = copy.deepcopy(manifest)
        bad['folders']['skills/osm-prime/']['page'] = 'unbound-private-page'
        self.assertTrue(pub.folder_problems(bad, pub.DirSource(ROOT).paths()))

class MarkdownReader(unittest.TestCase):
    def read(self, **response):
        self.requests = []
        class Response:
            def __init__(self, value): self.value = value
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self): return json.dumps(self.value).encode()
        def opener(req, timeout=None):
            self.requests.append(req)
            if '/markdown?' in req.full_url:
                return Response({'object': 'page_markdown', 'markdown': BODY, 'truncated': False,
                                 'unknown_block_ids': [], **response})
            return Response({'properties': {'Name': {'type': 'title', 'title': [{'plain_text': 'Test'}]}}})
        transport = pub.NotionTransport(None, bound={}, env={pub.TOKEN_ENV: 'fixture-only'}, opener=opener)
        return transport.read_original(PAGE)

    def test_api_reader_uses_explicit_v2_and_reads_no_descendants(self):
        self.assertEqual(self.read()['body'], BODY)
        self.assertEqual(len(self.requests), 2)
        self.assertTrue(all(req.method == 'GET' for req in self.requests))
        self.assertTrue(self.requests[-1].full_url.endswith('/markdown?markdown_version=v2'))
        self.assertEqual(self.requests[-1].get_header('Notion-version'), '2026-03-11')

    def test_incomplete_api_content_is_refused(self):
        for fields in ({'truncated': True}, {'unknown_block_ids': ['unsupported']},
                       {'warnings': [{'code': 'unsupported'}]}, {'object': 'other'}):
            with self.subTest(fields=fields), self.assertRaises(pub.NotApplied): self.read(**fields)

if __name__ == '__main__':
    unittest.main()
