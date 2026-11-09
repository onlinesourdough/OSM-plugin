import test from 'node:test';
import assert from 'node:assert/strict';
import { previewHome } from './preview-home.mjs';
import { pageIcon } from './page-icons.mjs';
const value = (name, args, scenario, key) => previewHome(name, args, scenario)._meta[`osm/${key}`];
test('fictional acceptance scenarios expose scoped results, no-match and an outside link', () => {
  const found = value('osm_home_search', { section: 'knowledge', query: 'Sample' }, 'home-q01', 'home-list');
  assert.equal(found.items.length, 5); assert.ok(found.scope);
  assert.equal(value('osm_home_search', { section: 'knowledge', query: 'unmatched' }, 'home-q02', 'home-list').state, 'empty');
  assert.equal(value('osm_home_locate', { link: 'https://www.notion.so/' + '9'.repeat(32) }, 'home-outside', 'home-location').state, 'outside');
});
test('fictional source list has a real next page and withheld note; empty and one denial remain independent', () => {
  const first = value('osm_home_list', { section: 'knowledge' }, 'home-paginated', 'home-list');
  assert.equal(first.hasMore, true); assert.equal(first.withheld, 2);
  const next = value('osm_home_list', { section: 'knowledge', cursor: first.cursor }, 'home-paginated', 'home-list');
  assert.equal(next.hasMore, false); assert.equal(next.items.length, 2);
  assert.ok(next.items.every(item => !first.items.some(old => old.id === item.id)));
  assert.equal(value('osm_home_list', { section: 'knowledge' }, 'home-empty', 'home-list').state, 'empty');
  assert.equal(value('osm_home_list', { section: 'memory' }, 'home-source-denied', 'home-list').state, 'inaccessible');
  assert.equal(value('osm_home_list', { section: 'knowledge' }, 'home-source-denied', 'home-list').state, 'listed');
});
test('fictional connection failures suppress root metadata and never serve page bodies', () => {
  for (const [scenario, state] of [['home-ended', 'not_connected'], ['home-notconnected', 'not_connected'], ['home-changed', 'account_changed'], ['home-revoked', 'root_inaccessible']]) {
    const home = value('osm_home', {}, scenario, 'home'); assert.equal(home.state, state);
    for (const key of ['root', 'sections', 'workspaceName', 'definitionRevision']) assert.equal(home[key], undefined);
    const record = value('osm_home_read', { section: 'memory', id: '1' }, scenario, 'home-record');
    assert.equal(record.state, state); assert.equal(record.record, undefined);
  }
});
test('fictional icons cover emoji, transported PNG, native URL and absent metadata in list and reader', () => {
  const rows = value('osm_home_list', { section: 'knowledge' }, 'home-ready', 'home-list').items;
  assert.equal(pageIcon(rows[0].icon), '📚'); assert.match(pageIcon(rows[1].icon), /^data:image\/png;base64,/);
  assert.equal(pageIcon(rows[2].icon), null); assert.match(pageIcon(rows[3].icon), /^https:\/\/www.notion.so\/icons\//);
  for (const row of rows) assert.equal(value('osm_home_read', { section: 'knowledge', id: row.id }, 'home-ready', 'home-record').record.icon, row.icon);
});
