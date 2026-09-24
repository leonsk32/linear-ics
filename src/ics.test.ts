import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toIcs } from './ics.ts';

test('toIcs', () => {
  const ics = toIcs(
    [{ id: 'abc', identifier: 'ENG-1', title: 'a, b; c'.padEnd(80, 'あ'), dueDate: '2026-12-31', url: 'https://linear.app/x' }],
    new Date('2026-09-24T01:02:03.456Z'),
  );
  assert.match(ics, /DTSTART;VALUE=DATE:20261231\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20270101\r\n/);
  assert.match(ics, /DTSTAMP:20260924T010203Z\r\n/);
  assert.match(ics, /SUMMARY:\[ENG-1\] a\\, b\\; c/);
  for (const l of ics.split('\r\n')) assert.ok(Buffer.byteLength(l) <= 75, l);
});
