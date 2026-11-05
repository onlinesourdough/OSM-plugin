"""Behavioral portability checks; synthetic tools never contact media services."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from urllib.parse import unquote

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / 'skills/content'


def digest_tree(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob('*') if p.is_file()}


class Helpers(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='content helpers with spaces-')
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name).resolve()
        self.package = self.base / 'immutable package'
        self.skill = self.package / 'skills/content'
        shutil.copytree(CONTENT, self.skill)
        self.work = self.base / 'actual work'
        self.work.mkdir()
        self.bin = self.base / 'test tools'
        self.bin.mkdir()
        self.stub_log = self.base / 'tool-calls.jsonl'
        self.env = {**os.environ, 'PATH': str(self.bin) + os.pathsep + os.environ['PATH'],
                    'PYTHONPATH': str(self.bin), 'PYTHONDONTWRITEBYTECODE': '1',
                    'CONTENT_TEST_LOG': str(self.stub_log)}
        self.env.pop('CONTENT_WHISPER_CACHE_DIR', None)
        self.env.pop('ACS_WHISPER_CACHE_DIR', None)
        for name in ['ffmpeg', 'ffprobe', 'yt-dlp']:
            self.tool(name, '''
import json, os, pathlib, sys
args = sys.argv[1:]
with open(os.environ['CONTENT_TEST_LOG'], 'a') as log:
    log.write(json.dumps({'tool':pathlib.Path(sys.argv[0]).name,'args':args,'cwd':os.getcwd()})+'\\n')
name = pathlib.Path(sys.argv[0]).name
if name == 'ffprobe':
    print(json.dumps({'format':{'duration':'2','size':'40'},'streams':[{'codec_type':'video','width':32,'height':32}]}))
elif name == 'ffmpeg':
    target = pathlib.Path(args[-1].replace('%04d','0001'))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(b'synthetic media')
else:
    raise SystemExit('Network forbidden in tests')
''')
        (self.bin / 'whisper.py').write_text('''
from pathlib import Path
import json, os, sys
class Model:
    def transcribe(self, source, **options):
        assert Path(source).exists()
        assert options['word_timestamps'] is True
        return {'text':'Evidence matters.', 'language':'en', 'segments':[{'words':[{'word':'Evidence','start':0.1,'end':0.7},{'word':'matters.','start':0.8,'end':1.5}]}]}
def load_model(name, download_root, **kwargs):
    cache = Path(download_root)
    cache.mkdir(parents=True, exist_ok=True)
    (cache / 'synthetic-model').write_text(name)
    with open(os.environ['CONTENT_TEST_LOG'], 'a') as log:
        log.write(json.dumps({'tool':'whisper','prefix':sys.prefix,'args':[]})+'\\n')
    return Model()
''')
        self.before = digest_tree(self.package)
        for p in self.package.rglob('*'):
            p.chmod(0o555 if p.is_dir() else 0o444)
        self.package.chmod(0o555)
        self.addCleanup(self.restore_permissions)

    def restore_permissions(self):
        self.package.chmod(0o755)
        for p in self.package.rglob('*'):
            p.chmod(0o755 if p.is_dir() else 0o644)

    def tearDown(self):
        self.assertEqual(digest_tree(self.package), self.before)
        self.assertFalse(list(self.package.rglob('__pycache__')))

    def tool(self, name, source):
        p = self.bin / name
        p.write_text('#!' + sys.executable + '\n' + source)
        p.chmod(0o755)
        return p

    def call(self, script, *args, ok=True, env=None):
        result = subprocess.run([sys.executable, '-B', str(self.skill / 'scripts' / script), *map(str,args)],
                                cwd=self.package, env=env or self.env, text=True, capture_output=True)
        if ok:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        return result

    def media(self, relative='sources/clip with spaces.wav'):
        p = self.work / relative
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(b'synthetic source')
        return p

    def test_reference_check_is_read_only_without_output_root(self):
        result = self.call('analyze-reference-video.py', '--check')
        self.assertTrue(json.loads(result.stdout)['ok'])
        self.assertEqual(list(self.work.iterdir()), [])
        self.assertFalse(self.stub_log.exists())

    def test_reference_requires_explicit_external_root_and_rejects_traversal(self):
        source = self.media('clip.mp4')
        for args, reason in [([], '--out-root is required'),
                             (['--out-root', 'relative'], 'absolute external path'),
                             (['--out-root', self.skill / 'data'], 'immutable skill package'),
                             (['--out-root', self.base], 'immutable skill package'),
                             (['--out-root', self.work, '--slug', '../escape'], 'simple directory name')]:
            result = self.call('analyze-reference-video.py', source, *args, ok=False)
            self.assertIn(reason, result.stderr)
        self.assertFalse(self.stub_log.exists())

    def test_reference_uses_skill_template_and_external_outputs_then_preserves_analysis(self):
        source = self.media('clip with spaces.mp4')
        self.call('analyze-reference-video.py', source, '--out-root', self.work / 'references', '--slug', 'focused', '--start', '00:00', '--end', '00:01')
        output = self.work / 'references/focused'
        data = json.loads((output / 'source.json').read_text())
        frames = json.loads((output / 'frames_manifest.json').read_text())
        self.assertEqual(data['video_path'], str(source))
        self.assertEqual(data['transcript_source'], 'none')
        self.assertIn('No transcript available', (output / 'transcript.md').read_text())
        self.assertTrue(Path(frames[0]['path']).is_relative_to(output))
        self.assertIn('## Hook Analysis', (output / 'analysis.md').read_text())
        self.assertNotIn('workspace/', (output / 'agent-prompt.md').read_text())
        (output / 'analysis.md').write_text('reviewed analysis')
        before = digest_tree(output)
        result = self.call('analyze-reference-video.py', source, '--out-root', self.work / 'references', '--slug', 'focused', ok=False)
        self.assertIn('already exists', result.stderr)
        self.assertEqual(digest_tree(output), before)

    def test_url_reference_subprocess_uses_explicit_outputs_and_caption_provenance(self):
        self.tool('yt-dlp', r"""
import json, os, pathlib, sys
args = sys.argv[1:]
assert '--ignore-config' in args and '--no-cache-dir' in args
assert args[-2:] == ['--', 'https://example.invalid/reference']
with open(os.environ['CONTENT_TEST_LOG'], 'a') as log:
    log.write(json.dumps({'tool':'yt-dlp','args':args,'cwd':os.getcwd()})+'\n')
base = pathlib.Path(args[args.index('-o')+1]).parent
assert base == pathlib.Path.cwd()
(base/'video.mp4').write_bytes(b'fixture video')
(base/'video.info.json').write_text(json.dumps({'title':'Synthetic source','uploader':'Synthetic creator','webpage_url':args[-1]}))
(base/'video.en.vtt').write_text('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nVisible caption evidence.\n\n')
""")
        self.call('analyze-reference-video.py', 'https://example.invalid/reference', '--out-root', self.work / 'references', '--slug', 'download')
        output = self.work / 'references/download'
        metadata = json.loads((output / 'source.json').read_text())
        self.assertTrue(metadata['downloaded'])
        self.assertEqual(metadata['transcript_source'], 'captions')
        self.assertEqual(metadata['source'], 'https://example.invalid/reference')
        self.assertIn('Visible caption evidence.', (output / 'transcript.md').read_text())

    def test_reference_whisper_invokes_migrated_sibling_with_external_interpreter(self):
        source = self.media('spoken clip.mp4')
        self.call('analyze-reference-video.py', source, '--out-root', self.work / 'references', '--slug', 'speech', '--local-whisper', '--whisper-python', sys.executable)
        output = self.work / 'references/speech'
        self.assertEqual(json.loads((output / 'source.json').read_text())['transcript_source'], 'local-whisper')
        self.assertIn('Evidence matters.', (output / 'transcript.md').read_text())
        self.assertTrue((output / 'local-whisper/.cache/whisper/synthetic-model').is_file())
        self.assertTrue((output / 'local-whisper/transcripts/spoken clip.json').is_file())
        calls = [json.loads(line) for line in self.stub_log.read_text().splitlines()]
        self.assertTrue(any(c['tool']=='ffmpeg' and '-vn' in c['args'] for c in calls))
        self.assertTrue(all(not Path(c['cwd']).is_relative_to(self.package) for c in calls if 'cwd' in c))
        # Temporary extracted audio was removed.
        wav_paths = [Path(c['args'][-1]) for c in calls if c['tool']=='ffmpeg' and '-vn' in c['args']]
        self.assertTrue(all(not p.exists() for p in wav_paths))

    def test_selected_external_venv_is_preserved_through_actual_whisper_subprocess(self):
        venv = self.base / 'selected venv'
        subprocess.run([sys.executable, '-m', 'venv', '--without-pip', str(venv)], check=True)
        interpreter = venv / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
        source = self.media('venv clip.mp4')
        self.call('analyze-reference-video.py', source, '--out-root', self.work / 'references', '--slug', 'venv', '--local-whisper', '--whisper-python', interpreter)
        calls = [json.loads(line) for line in self.stub_log.read_text().splitlines()]
        prefixes = [Path(call['prefix']).resolve() for call in calls if call['tool'] == 'whisper']
        self.assertEqual(prefixes, [venv.resolve()])

    def test_transcription_requires_external_data_and_cache_paths_even_via_symlinks(self):
        source = self.media()
        alias = self.work / 'package-alias'
        alias.symlink_to(self.package, target_is_directory=True)
        for args, reason in [([], '--edit-dir'),
                             (['--edit-dir', 'relative'], 'absolute external path'),
                             (['--edit-dir', alias / 'new-output'], 'immutable skill package'),
                             (['--edit-dir', self.work / 'edit', '--model-cache-dir', self.skill / 'cache'], 'immutable skill package'),
                             (['--edit-dir', self.work / 'edit', '--pack'], 'explicit --packer')]:
            result = self.call('transcribe-local-whisper.py', source, *args, ok=False)
            self.assertIn(reason, result.stderr)
        self.assertFalse(self.stub_log.exists())

    def test_recursive_transcription_works_with_flat_directory_packer(self):
        self.media('sources/first/clip-first.wav')
        self.media('sources/second/clip-second.wav')
        self.media('sources/clip-flat.wav')
        edit = self.work / 'transcripts output'
        packer = self.tool('pack_transcripts.py', '''
import json, pathlib, sys
root = pathlib.Path(sys.argv[2]); assert root == pathlib.Path.cwd()
(root/'takes_packed.md').write_text('packed '+str(len(list((root/'transcripts').glob('*.json')))))
''')
        self.call('transcribe-local-whisper.py', self.work / 'sources', '--recursive', '--edit-dir', edit, '--pack', '--packer', packer)
        self.assertEqual((edit / 'takes_packed.md').read_text(), 'packed 3')
        for name in ['first', 'second']:
            transcript = json.loads((edit / 'transcripts' / f'clip-{name}.json').read_text())
            self.assertEqual(transcript['metadata']['source'], str(self.work / 'sources' / name / f'clip-{name}.wav'))
            self.assertEqual(transcript['words'][0]['start'], 0.1)
        before = digest_tree(edit)
        self.call('transcribe-local-whisper.py', self.work / 'sources', '--recursive', '--edit-dir', edit)
        self.assertEqual(digest_tree(edit), before)

    def test_recursive_duplicate_stem_fails_before_model_or_file_write(self):
        self.media('sources/first/clip.wav'); self.media('sources/second/clip.wav')
        result = self.call('transcribe-local-whisper.py', self.work / 'sources', '--recursive',
                           '--edit-dir', self.work / 'edit', ok=False)
        self.assertIn('filename collision', result.stderr)
        self.assertFalse(self.stub_log.exists())
        self.assertFalse((self.work / 'edit').exists())

    def test_recursive_case_only_stem_collision_is_preserved(self):
        self.media('sources/first/Clip.wav'); self.media('sources/second/clip.wav')
        result = self.call('transcribe-local-whisper.py', self.work / 'sources', '--recursive',
                           '--edit-dir', self.work / 'edit', ok=False)
        self.assertIn('filename collision', result.stderr)
        self.assertFalse(self.stub_log.exists())
        self.assertFalse((self.work / 'edit').exists())

    def test_packer_refuses_output_symlink_outside_edit_directory(self):
        media = self.media('sources/clip.wav')
        edit = self.work / 'edit'
        self.call('transcribe-local-whisper.py', media, '--edit-dir', edit)
        sentinel = self.work / 'outside.md'; sentinel.write_text('preserve')
        (edit / 'takes_packed.md').symlink_to(sentinel)
        packer = self.tool('packer.py', "raise SystemExit('packer must not run')")
        result = self.call('transcribe-local-whisper.py', media, '--edit-dir', edit,
                           '--pack', '--packer', packer, ok=False)
        self.assertNotIn('packer must not run', result.stderr)
        self.assertEqual(sentinel.read_text(), 'preserve')

    def test_same_stem_extension_collision_fails_before_transcription(self):
        self.media('sources/clip.mp4'); self.media('sources/clip.wav')
        result = self.call('transcribe-local-whisper.py', self.work / 'sources', '--edit-dir', self.work / 'edit', ok=False)
        self.assertIn('filename collision', result.stderr)
        self.assertFalse(self.stub_log.exists())
        self.assertFalse((self.work / 'edit').exists())

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'real FFmpeg unavailable')
    def test_real_ffmpeg_reference_path_from_unrelated_cwd(self):
        source = self.work / 'actual generated fixture.mp4'
        subprocess.run([shutil.which('ffmpeg'), '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i',
                        'color=c=blue:s=32x32:d=2', '-c:v', 'mpeg4', str(source)], check=True)
        real_env = {**self.env, 'PATH': os.environ['PATH']}
        self.call('analyze-reference-video.py', source, '--out-root', self.work / 'references', '--slug', 'actual', '--start', '0', '--end', '1', '--max-frames', '2', env=real_env)
        output = self.work / 'references/actual'
        frames = json.loads((output / 'frames_manifest.json').read_text())
        self.assertGreater(len(frames), 0)
        self.assertLessEqual(len(frames), 2)
        self.assertTrue(Path(frames[0]['path']).read_bytes().startswith(b'\xff\xd8'))


class RelativeLinks(unittest.TestCase):
    def test_all_migrated_markdown_links_and_format_provenance_resolve(self):
        files = [*CONTENT.rglob('*.md'), *(ROOT / 'skills/diffusion-studio').rglob('*.md')]
        doc = ROOT / 'docs/content-preservation.md'
        if doc.exists():
            files.append(doc)
        checked = 0
        for source in files:
            for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)', source.read_text()):
                target = target.strip('<>')
                if re.match(r'^[a-z]+:', target) or target.startswith('#'):
                    continue
                filepath, _, fragment = unquote(target).partition('#')
                resolved = source.parent / filepath
                self.assertTrue(resolved.exists(), f'{source}: broken link {target}')
                if fragment and resolved.suffix == '.md':
                    headings = re.findall(r'^#+\s+(.+)$', resolved.read_text(), re.M)
                    anchors = [re.sub(r'[^\w\- ]', '', h.lower()).replace(' ', '-') for h in headings]
                    self.assertIn(fragment, anchors, f'{source}: missing anchor {target}')
                checked += 1
        library = CONTENT / 'assets/formats.json'
        self.assertTrue((library.parent / json.loads(library.read_text())['research_provenance']).is_file())
        print(f'Validated {checked} relative Markdown links and format provenance')


if __name__ == '__main__':
    unittest.main(verbosity=2)
