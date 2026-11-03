import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sortCommunities } from '../src/commute-sort.js';

test('both directions keep missing, unrecommended and invalid durations last, with stable ties', () => {
  const names = ['missing', 'slow', 'fast', 'tie', 'unrecommended', 'invalid', 'zero'];
  const routes = [
    ['slow', 90], ['fast', 30], ['tie', 30], ['unrecommended', null], ['invalid', -1], ['zero', 0],
  ].map(([name, seconds]) => ({ 小区名称: name, 目的地: 'office', 方式: { 地铁: { 时间秒: seconds } } }));
  assert.deepEqual(sortCommunities(names, routes, { destination: 'office', mode: '地铁' }), ['zero', 'fast', 'tie', 'slow', 'missing', 'unrecommended', 'invalid']);
  assert.deepEqual(sortCommunities(names, routes, { destination: 'office', mode: '地铁', direction: 'desc' }), ['slow', 'fast', 'tie', 'zero', 'missing', 'unrecommended', 'invalid']);
  assert.deepEqual(sortCommunities(names, routes, { destination: '' }), names);
});

test('all four modes sort correctly for each office, without changing source data', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data/listings.json', import.meta.url), 'utf8'));
  const names = [...new Set(data.房源.map(h => h.小区名称))];
  const before = JSON.stringify(data);
  for (const destination of ['爱力中心', '阿里巴巴西溪A区3号门']) {
    for (const mode of ['打车', '地铁', '自行车', '步行']) {
      for (const direction of ['asc', 'desc']) {
        const sorted = sortCommunities(names, data.通勤, { destination, mode, direction });
        assert.equal(sorted.length, 20);
        assert.equal(new Set(sorted).size, 20);
        const seconds = sorted.map(name => data.通勤.find(r => r.小区名称 === name && r.目的地 === destination)?.方式?.[mode]?.时间秒);
        let missing = false;
        let last;
        for (const value of seconds) {
          if (value == null) { missing = true; continue; }
          assert.equal(missing, false);
          if (last !== undefined) assert.ok(direction === 'asc' ? value >= last : value <= last);
          last = value;
        }
      }
    }
  }
  assert.equal(JSON.stringify(data), before);
});
