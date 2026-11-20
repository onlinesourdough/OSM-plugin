"""Anonymous rendered public reads. No credential or authenticated browser profile is passed."""
import json
import os
import subprocess
from pathlib import Path
import publisher as pub
from native_skills import plain_lines


class BrowserReader(pub.PublicReader):
    def __init__(self, base, catalogue, packets, runner=subprocess.run):
        super().__init__(base, catalogue)
        self.runner, self.cache, self.markers = runner, {}, {}
        for packet in packets.values():
            lines = plain_lines(packet['files']['SKILL.md'].decode())
            markers = [line[at:at+500] for line in lines for at in range(0, len(line), 500)]
            self.markers[f'{self.base}/{packet["page"]}'] = [packet['title'], packet['version'], packet['package'], *markers]
        self.markers[catalogue] = [packet['title'] for packet in packets.values()]

    def read(self, url):
        if url not in self.markers:
            return pub.FAILED, 'outside the explicit public page set'
        if url in self.cache:
            return self.cache[url]
        # The child gets only browser/runtime paths, never the Notion or GitHub token.
        env = {key: value for key, value in os.environ.items() if key in
               {'PATH','HOME','TMPDIR','CI','PLAYWRIGHT_BROWSERS_PATH','XDG_CACHE_HOME'}}
        request = {'url':url, 'allowedUrls':list(self.markers), 'markers':self.markers[url]}
        try:
            result = self.runner(['node', str(Path(__file__).with_name('public-browser-read.mjs'))],
                                 input=json.dumps(request), text=True, capture_output=True, timeout=80, env=env)
            if len(result.stdout.encode()) > 2_010_000:
                return pub.FAILED, 'public browser did not verify the page'
            body = json.loads(result.stdout)
            if result.returncode:
                reason = body.get('reason')
                safe = {'URL or markers outside the explicit public page set', 'Public page did not return HTTP 200',
                        'Public page changed host or page identity', 'Public page was oversized or missing its expected content',
                        'Public browser failed during launch', 'Public browser failed during navigation',
                        'Public browser failed during content', 'Oversized public read request', 'Invalid public read request'}
                return pub.FAILED, reason if reason in safe else 'public browser did not verify the page'
            if body.get('ok') is not True or body.get('url') != url or not isinstance(body.get('text'),str):
                return pub.FAILED, 'public browser returned no matching content observation'
            observed = pub.VERIFIED, body['text']
            self.cache[url] = observed
            return observed
        except (OSError, ValueError, subprocess.SubprocessError):
            return pub.FAILED, 'public browser read was unavailable'
