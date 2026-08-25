import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreakFromLoggedDates } from '../dashboard.service';

test('telt 0 als er noch vandaag noch gisteren gelogd is', () => {
  const loggedDates = new Set(['2026-08-01']);
  assert.equal(computeStreakFromLoggedDates(loggedDates, '2026-08-25'), 0);
});

test('telt door zolang vandaag en de voorgaande dagen aaneensluitend gelogd zijn', () => {
  const loggedDates = new Set(['2026-08-23', '2026-08-24', '2026-08-25']);
  assert.equal(computeStreakFromLoggedDates(loggedDates, '2026-08-25'), 3);
});

test('vandaag nog niets gelogd breekt de streak nog niet: telt vanaf gisteren verder', () => {
  const loggedDates = new Set(['2026-08-23', '2026-08-24']);
  assert.equal(computeStreakFromLoggedDates(loggedDates, '2026-08-25'), 2);
});

test('een gat in het midden stopt het terugtellen', () => {
  const loggedDates = new Set(['2026-08-20', '2026-08-24', '2026-08-25']);
  assert.equal(computeStreakFromLoggedDates(loggedDates, '2026-08-25'), 2);
});

test('geeft 0 terug zonder enige gelogde dag', () => {
  assert.equal(computeStreakFromLoggedDates(new Set(), '2026-08-25'), 0);
});

test('houdt rekening met maandovergangen bij het terugtellen', () => {
  const loggedDates = new Set(['2026-07-31', '2026-08-01']);
  assert.equal(computeStreakFromLoggedDates(loggedDates, '2026-08-01'), 2);
});
