"""One bounded, anonymous browser session per run; no credentials or saved profile."""
import json
import os
import re
import signal
import subprocess
from pathlib import Path
from urllib.parse import urlsplit
import publisher as pub
from native_skills import plain_lines

SAFE_REASONS = {
    'URL or markers outside the explicit public page set', 'Public page did not return HTTP 200',
    'Public page changed host or page identity', 'Public page was oversized or missing its expected content',
    'Public browser failed during launch', 'Public browser failed during navigation',
    'Public browser failed during content', 'Oversized public read request', 'Invalid public read request',
    'Public browser run reached its time limit', 'Public page was rate limited; retry later',
    'Public browser failed during shutdown', 'Public catalogue did not show every linked skill entry',
}


def run_browser(args, *, input, text, capture_output, timeout, env):
    """Own and reap the anonymous browser's process group, including timeout recovery."""
    assert text is True and capture_output is True
    process = subprocess.Popen(args, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE, text=True, env=env, start_new_session=True)
    try:
        stdout, stderr = process.communicate(input, timeout=timeout)
        return subprocess.CompletedProcess(args, process.returncode, stdout, stderr)
    finally:
        # Only the session created for this child; never a global browser kill.
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait()
        for stream in (process.stdin, process.stdout, process.stderr):
            if stream is not None:
                stream.close()


class BrowserReader(pub.PublicReader):
    def __init__(self, base, catalogue, packets, *, catalogue_id, runner=run_browser):
        super().__init__(base, catalogue)
        self.catalogue_id = str(catalogue_id).replace('-', '').lower()
        selected = re.search(r'([a-f0-9]{32})(?:/|$)', urlsplit(catalogue).path, re.I)
        if (self.base != 'https://gustavanderson.notion.site' or
                urlsplit(catalogue).scheme != 'https' or urlsplit(catalogue).netloc != 'gustavanderson.notion.site' or
                not re.fullmatch(r'[a-f0-9]{32}', self.catalogue_id) or not selected or selected[1].lower() != self.catalogue_id):
            raise pub.SetupError('the public catalogue must name the reviewed manifest catalogue')
        self.entries = [{'page':packet['page'], 'title':packet['title']} for packet in packets.values()]
        self.runner, self.cache, self.markers, self.attempted = runner, {}, {}, False
        for packet in packets.values():
            lines = plain_lines(packet['files']['SKILL.md'].decode())
            markers = [line[at:at+500] for line in lines for at in range(0, len(line), 500)]
            self.markers[f'{self.base}/{packet["page"]}'] = [packet['title'], packet['version'], packet['package'], *markers]
        self.markers[catalogue] = [packet['title'] for packet in packets.values()]
        self.failure = 'public browser did not verify the page'

    def read(self, url):
        if url not in self.markers:
            return pub.FAILED, 'outside the explicit public page set'
        if not self.attempted:
            self.attempted = True
            self._observe()
        return self.cache.get(url, (pub.FAILED, self.failure))

    def _observe(self):
        # All native writes/readbacks finish before public_state calls this reader.
        # Reuse a single fresh anonymous context only inside this run, never a stored profile.
        env = {key: value for key, value in os.environ.items() if key in
               {'PATH','HOME','TMPDIR','CI','PLAYWRIGHT_BROWSERS_PATH','XDG_CACHE_HOME'}}
        request = {'allowedUrls':list(self.markers), 'requests':[
            {'url':url, 'markers':markers, **({'entries':self.entries} if url == self.catalogue_url else {})}
            for url, markers in self.markers.items()]}
        try:
            source = json.dumps(request)
            if len(source.encode()) > 256000 or not 1 <= len(self.markers) <= 32:
                return
            result = self.runner(['node', str(Path(__file__).with_name('public-browser-read.mjs'))],
                                 input=source, text=True, capture_output=True, timeout=285, env=env)
            if len(result.stdout.encode()) > len(self.markers) * 2_010_000:
                return
            body = json.loads(result.stdout)
            if not isinstance(body, dict) or result.returncode not in (0, 1):
                return
            if 'results' not in body:
                reason = body.get('reason')
                self.failure = reason if reason in SAFE_REASONS else self.failure
                return
            rows = body['results']
            if not isinstance(rows, list) or len(rows) != len(self.markers):
                return
            seen, observations = set(), {}
            for row in rows:
                if not isinstance(row, dict) or row.get('url') not in self.markers or row['url'] in seen or type(row.get('ok')) is not bool:
                    return
                url = row['url']
                seen.add(url)
                if row['ok']:
                    text, final = row.get('text'), row.get('finalUrl')
                    if not isinstance(text, str) or len(text.encode()) > 2_000_000 or not isinstance(final, str):
                        return
                    expected, actual = urlsplit(url), urlsplit(final)
                    # Node checks the origin and exact page id. Keep that identity boundary in the parent too.
                    expected_id = re.search(r'([a-f0-9]{32})(?:/|$)', expected.path, re.I)
                    actual_id = re.search(r'([a-f0-9]{32})(?:/|$)', actual.path, re.I)
                    if (actual.scheme, actual.netloc) != (expected.scheme, expected.netloc) or not expected_id or not actual_id or expected_id[1].lower() != actual_id[1].lower():
                        return
                    shown = re.sub(r'[^\w]|_', '', text, flags=re.UNICODE).lower()
                    if not all(re.sub(r'[^\w]|_', '', marker, flags=re.UNICODE).lower() in shown for marker in self.markers[url]):
                        return
                    if url == self.catalogue_url and row.get('entries') != self.entries:
                        return
                    observations[url] = pub.VERIFIED, text
                else:
                    reason = row.get('reason')
                    if reason not in SAFE_REASONS:
                        return
                    observations[url] = pub.FAILED, reason
            complete = all(row['ok'] for row in rows)
            if body.get('ok') is not complete or (result.returncode == 0) is not complete:
                return
            self.cache = observations
        except (OSError, ValueError, subprocess.SubprocessError, TypeError):
            self.failure = 'public browser read was unavailable'
