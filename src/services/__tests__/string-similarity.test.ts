import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levenshteinDistance, stringSimilarity } from '../string-similarity';

test('levenshteinDistance geeft 0 voor identieke strings', () => {
  assert.equal(levenshteinDistance('broccoli', 'broccoli'), 0);
});

test('levenshteinDistance telt invoegingen/verwijderingen/vervangingen correct', () => {
  assert.equal(levenshteinDistance('kitten', 'sitting'), 3);
  // "olli" -> "coli": twee substituties (o->c, l->o), dus afstand 2, niet 1.
  assert.equal(levenshteinDistance('brocolli', 'broccoli'), 2);
});

test('levenshteinDistance handelt lege strings correct af', () => {
  assert.equal(levenshteinDistance('', ''), 0);
  assert.equal(levenshteinDistance('appel', ''), 5);
  assert.equal(levenshteinDistance('', 'appel'), 5);
});

test('stringSimilarity geeft 1 voor identieke strings, case-insensitief', () => {
  assert.equal(stringSimilarity('Bloemkool', 'bloemkool'), 1);
});

test('stringSimilarity geeft 1 voor twee lege strings en geen NaN/deling door nul', () => {
  assert.equal(stringSimilarity('', ''), 1);
  assert.equal(stringSimilarity('  ', ''), 1);
});

test('stringSimilarity geeft een hoge score voor een kleine tikfout', () => {
  // Afstand 2 op 8 tekens => 1 - 2/8 = 0.75.
  const similarity = stringSimilarity('brocolli', 'broccoli');
  assert.ok(similarity >= 0.7, `verwachtte >= 0.7, kreeg ${similarity}`);
});

test('stringSimilarity geeft een lage score voor volledig verschillende woorden', () => {
  const similarity = stringSimilarity('bloemkool', 'kipfilet');
  assert.ok(similarity < 0.3, `verwachtte < 0.3, kreeg ${similarity}`);
});
