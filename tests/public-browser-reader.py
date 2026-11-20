#!/usr/bin/env python3
"""Credential-free tests of the anonymous browser batch subprocess boundary."""
import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'docs-publisher'))
import publisher as pub
from browser_reader import BrowserReader, run_browser

BASE = 'https://gustavanderson.notion.site'
PAGE = 'a' * 32
URL = BASE + '/' + PAGE
CATALOGUE = BASE + '/' + 'b' * 32
PACKETS = {'osm-log': {'page': PAGE, 'title': 'OSM:log', 'version': '1.2.0', 'package': '0.34.2',
                       'files': {'SKILL.md': b'Released reference for this edition.\nFinish here.\n'}}}
TEXT = 'OSM:log 1.2.0 0.34.2 Released reference for this edition. Finish here.'
GOOD = {'ok':True,'results':[
    {'ok':True,'url':URL,'finalUrl':URL,'text':TEXT},
    {'ok':True,'url':CATALOGUE,'finalUrl':CATALOGUE,'text':'OSM:log','entries':[{'page':PAGE,'title':'OSM:log'}]},
]}


def response(body, code=0):
    return SimpleNamespace(returncode=code, stdout=json.dumps(body))


class BrowserBoundary(unittest.TestCase):
    def test_one_child_gets_no_credentials_and_reads_complete_selected_set_once(self):
        calls = []
        def run(args, **kw):
            calls.append(kw)
            self.assertNotIn('OSM_PUBLIC_DOCS_TOKEN', kw['env'])
            self.assertNotIn('GH_TOKEN', kw['env'])
            data = json.loads(kw['input'])
            self.assertEqual(data['allowedUrls'], [URL,CATALOGUE])
            self.assertEqual([row['url'] for row in data['requests']], [URL,CATALOGUE])
            self.assertIn('finishhere', data['requests'][0]['markers'])
            self.assertIn('releasedreferenceforthisedition', data['requests'][0]['markers'])
            self.assertEqual(kw['timeout'],285)
            return response(GOOD)
        with patch.dict(os.environ, {'OSM_PUBLIC_DOCS_TOKEN':'fixture','GH_TOKEN':'fixture'}):
            reader=BrowserReader(BASE,CATALOGUE,PACKETS,catalogue_id='b'*32,runner=run)
            self.assertEqual(reader.read(URL),(pub.VERIFIED,TEXT))
            self.assertEqual(reader.read(CATALOGUE),(pub.VERIFIED,'OSM:log'))
            self.assertEqual(reader.read(URL)[0],pub.VERIFIED)
            self.assertEqual(len(calls),1)
            self.assertEqual(reader.read('https://example.com')[0],pub.FAILED)
            self.assertEqual(len(calls),1)

    def test_malformed_missing_duplicate_foreign_oversized_and_wrong_identity_fail_closed(self):
        bad=[]
        for transform in [
            lambda b:b['results'].pop(),
            lambda b:b['results'].__setitem__(1,copy.deepcopy(b['results'][0])),
            lambda b:b['results'][0].update(url='https://example.com'),
            lambda b:b['results'][0].update(finalUrl=CATALOGUE),
            lambda b:b['results'][0].update(finalUrl='http://gustavanderson.notion.site/'+PAGE),
            lambda b:b['results'][0].pop('text'),
            lambda b:b['results'][0].update(text='x'*2_010_000),
            lambda b:b['results'][0].update(text='Only the title OSM:log'),
            lambda b:b.update(ok=False),
            lambda b:b['results'][0].update(ok=1),
            lambda b:b['results'][1].update(entries=[]),
        ]:
            body=copy.deepcopy(GOOD);transform(body);bad.append(body)
        bad += [[], {'ok':True,'results':{}}, {'ok':True,'results':[None,None]}]
        for body in bad:
            with self.subTest(size=len(str(body))):
                reader=BrowserReader(BASE,CATALOGUE,PACKETS,catalogue_id='b'*32,runner=lambda *a,**kw:response(body))
                self.assertEqual(reader.read(URL)[0],pub.FAILED)
                self.assertFalse(reader.cache)
        def timeout(*args,**kw):raise subprocess.TimeoutExpired('node',285)
        self.assertEqual(BrowserReader(BASE,CATALOGUE,PACKETS,catalogue_id='b'*32,runner=timeout).read(URL)[0],pub.FAILED)

    def test_partial_batch_keeps_only_its_successful_rows_verified_and_never_relaunches(self):
        calls=[]
        body=copy.deepcopy(GOOD)
        body.update(ok=False)
        body['results'][1]={'ok':False,'url':CATALOGUE,'reason':'Public page was rate limited; retry later'}
        def run(*a,**kw):calls.append(1);return response(body,1)
        reader=BrowserReader(BASE,CATALOGUE,PACKETS,catalogue_id='b'*32,runner=run)
        self.assertEqual(reader.read(URL)[0],pub.VERIFIED)
        self.assertEqual(reader.read(CATALOGUE),(pub.FAILED,'Public page was rate limited; retry later'))
        self.assertEqual(reader.read(CATALOGUE)[0],pub.FAILED)
        self.assertEqual(len(calls),1)

    def test_failure_reason_is_fixed_and_never_echoes_untrusted_text(self):
        for reason,expected in [('Public browser failed during launch','Public browser failed during launch'),
                                ('private fixture credential','public browser did not verify the page')]:
            reader=BrowserReader(BASE,CATALOGUE,PACKETS,catalogue_id='b'*32,runner=lambda *a,**kw:response({'ok':False,'reason':reason},1))
            self.assertEqual(reader.read(URL),(pub.FAILED,expected))
        body=copy.deepcopy(GOOD);body.update(ok=False)
        body['results'][1]={'ok':False,'url':CATALOGUE,'reason':'private fixture credential'}
        reader=BrowserReader(BASE,CATALOGUE,PACKETS,catalogue_id='b'*32,runner=lambda *a,**kw:response(body,1))
        self.assertEqual(reader.read(URL)[0],pub.FAILED)
        self.assertFalse(reader.cache)

    def test_wrong_configured_catalogue_is_refused_before_launch(self):
        for catalogue in [BASE+'/'+'c'*32,'https://example.com/'+'b'*32]:
            with self.assertRaises(pub.SetupError):
                BrowserReader(BASE,catalogue,PACKETS,catalogue_id='b'*32,runner=lambda *a,**kw:self.fail('launched'))

    def test_timeout_reaps_the_whole_owned_browser_process_group(self):
        with tempfile.TemporaryDirectory() as folder:
            pidfile=Path(folder)/'child.pid'
            code=("import subprocess,sys,time; from pathlib import Path; "
                  "child=subprocess.Popen([sys.executable,'-c','import time;time.sleep(30)']); "
                  "Path(sys.argv[1]).write_text(str(child.pid)); time.sleep(30)")
            with self.assertRaises(subprocess.TimeoutExpired):
                run_browser([sys.executable,'-c',code,str(pidfile)],input='',text=True,capture_output=True,
                            timeout=0.5,env={'PATH':os.environ['PATH']})
            self.assertTrue(pidfile.exists())
            state=subprocess.run(['ps','-o','stat=','-p',pidfile.read_text()],text=True,capture_output=True).stdout.strip()
            self.assertTrue(not state or state.startswith('Z'),f'child still running: {state}')

    def test_pinned_playwright_cleans_its_detached_launcher_on_exit_and_timeout(self):
        dependency=Path(__file__).resolve().parents[1]/'docs-publisher/node_modules/playwright/index.mjs'
        if not dependency.exists():
            self.skipTest('author-only Playwright dependency is not installed')
        for mode in ('exit','timeout'):
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as folder:
                pidfile=Path(folder)/'launcher.pid'
                fake_browser=("require('fs').writeFileSync(process.argv[1],String(process.pid));"
                              "setInterval(()=>{},1000)")
                code=(f"import {{chromium}} from {json.dumps(dependency.as_uri())};"
                      f"chromium.launch({{executablePath:process.execPath,ignoreDefaultArgs:true,args:['-e',{json.dumps(fake_browser)},{json.dumps(str(pidfile))}],timeout:30000}}).catch(()=>{{}});"
                      +("setTimeout(()=>process.exit(0),1200);" if mode=='exit' else ''))
                args=['node','--input-type=module','-e',code]
                if mode=='exit':
                    result=run_browser(args,input='',text=True,capture_output=True,timeout=5,env={'PATH':os.environ['PATH']})
                    self.assertEqual(result.returncode,0)
                else:
                    with self.assertRaises(subprocess.TimeoutExpired):
                        run_browser(args,input='',text=True,capture_output=True,timeout=4,env={'PATH':os.environ['PATH']})
                self.assertTrue(pidfile.exists(),'the actual pinned launcher must start before the qualification ends')
                state=subprocess.run(['ps','-o','stat=','-p',pidfile.read_text()],text=True,capture_output=True).stdout.strip()
                self.assertTrue(not state or state.startswith('Z'),f'detached launcher survived {mode}: {state}')


if __name__=='__main__': unittest.main()
