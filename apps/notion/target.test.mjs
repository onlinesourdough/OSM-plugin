import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTarget } from './target.mjs';

test('links reject credentials, unsafe schemes, control characters and lookalike Notion hosts', () => {
  for (const input of ['javascript:alert(1)', 'http://example.com', 'https://user:secret@example.com', '/tmp/a\nb', 'x'.repeat(2049)]) assert.equal(classifyTarget(input), null);
  assert.equal(classifyTarget('https://notion.so.attacker.test').kind, 'url');
});
