import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchGenericFoods } from '../product.service';

test('zoekt op de Nederlandse naam, case-insensitief', () => {
  const results = searchGenericFoods('broccoli');
  assert.ok(results.some((item) => item.name === 'Broccoli'));
});

test('zoekt ook op de Franse naam', () => {
  const results = searchGenericFoods('chou-fleur');
  assert.ok(results.some((item) => item.name === 'Bloemkool'));
});

test('een exacte match staat bovenaan, vóór deelmatches', () => {
  // "Ei" is een exacte match; andere generieke producten kunnen "ei" ook als deelstring bevatten.
  const results = searchGenericFoods('ei');
  assert.equal(results[0]?.name, 'Ei');
});

test('geeft een lege lijst terug zonder treffers of voor een lege zoekopdracht', () => {
  assert.deepEqual(searchGenericFoods('xyzxyz-onbestaand'), []);
  assert.deepEqual(searchGenericFoods('   '), []);
});

test('resultaten hebben geen barcode en tellen als Belgisch (statische generieke catalogus)', () => {
  const [first] = searchGenericFoods('banaan');
  assert.equal(first?.barcode, null);
  assert.equal(first?.is_belgian_market, true);
});
