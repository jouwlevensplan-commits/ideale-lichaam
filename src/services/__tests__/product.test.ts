import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  createUser,
  setHealthDataConsent,
  setPremiumStatus,
  setAdConsent,
  createMealCatalogItem,
  searchMealCatalog,
  GdprConsentError,
} from '../storage.service';
import { searchProduct, ProductNotFoundError } from '../product.service';
import { processMealPhoto, processMealVoice, PremiumAccessError } from '../ai-recognition.service';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'product-test-'));
  process.env.STORAGE_FILE_PATH = path.join(tempDir, 'storage.json');
});

afterEach(() => {
  delete process.env.STORAGE_FILE_PATH;
  rmSync(tempDir, { recursive: true, force: true });
});

test('vindt een product dat al lokaal in de meal_catalog staat, zonder een nieuwe entry aan te maken', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'lokaal-product@example.com',
    timezone: 'Europe/Brussels',
  });

  const cached = await createMealCatalogItem({
    barcode: '1234567890123',
    name: 'Testproduct',
    brand: 'Testmerk',
    calories_kcal: 100,
    protein_g: 5,
    carbs_g: 10,
    fat_g: 2,
    fiber_g: 1,
    is_belgian_market: true,
  });

  const result = await searchProduct('Testproduct', user.id);
  assert.equal(result.id, cached.id);

  const matches = await searchMealCatalog('Testproduct');
  assert.equal(matches.length, 1);
});

test('valt terug op de gemockte Open Food Facts-lijst en cachet het resultaat lokaal', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'off-fallback@example.com',
    timezone: 'Europe/Brussels',
  });

  const beforeSearch = await searchMealCatalog('Colruyt');
  assert.equal(beforeSearch.length, 0);

  const result = await searchProduct('Colruyt Volkorenbrood', user.id);

  assert.equal(result.name, 'Volkorenbrood');
  assert.equal(result.brand, 'Colruyt');
  assert.equal(result.is_belgian_market, true);
  assert.ok(result.calories_kcal > 0);

  // Tweede zoekopdracht moet nu de lokale cache raken en niet nogmaals aanmaken.
  const second = await searchProduct('Colruyt Volkorenbrood', user.id);
  assert.equal(second.id, result.id);

  const cachedMatches = await searchMealCatalog('Colruyt');
  assert.equal(cachedMatches.length, 1);
});

test('vindt producten via barcode of merknaam uit de mock-lijst (LU Prince-koeken, Campina)', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'off-varianten@example.com',
    timezone: 'Europe/Brussels',
  });

  const princeKoeken = await searchProduct('5410013106017', user.id);
  assert.equal(princeKoeken.name, 'Prince-koeken Chocolade');
  assert.equal(princeKoeken.brand, 'LU');

  const campina = await searchProduct('Campina Magere Yoghurt', user.id);
  assert.equal(campina.brand, 'Campina');
  assert.equal(campina.name, 'Magere Yoghurt Natuur');
});

test('gooit ProductNotFoundError wanneer een product nergens gevonden wordt', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'niet-gevonden@example.com',
    timezone: 'Europe/Brussels',
  });

  await assert.rejects(() => searchProduct('volledig-onbestaand-product-xyz', user.id), ProductNotFoundError);
});

test('handmatig zoeken blijft altijd gratis: geen premium en geen health_data_consent vereist', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'gratis-zoeken@example.com',
    timezone: 'Europe/Brussels',
  });

  // Geen setHealthDataConsent, geen setPremiumStatus: user.is_premium en health_data_consent zijn beide false.
  const result = await searchProduct('Campina', user.id);
  assert.equal(result.brand, 'Campina');
});

test('blokkeert de AI-functies voor niet-premium gebruikers met PremiumAccessError', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'gratis-ai@example.com',
    timezone: 'Europe/Brussels',
  });
  // Wel consent, geen premium: de AI-functies moeten alsnog geweigerd worden.
  await setHealthDataConsent(user.id, true, 'privacy-v1');

  await assert.rejects(
    () => processMealPhoto({ data: 'irrelevant', mimeType: 'image/jpeg' }, user.id),
    PremiumAccessError
  );
  await assert.rejects(() => processMealVoice('een appel', user.id), PremiumAccessError);
});

test('setPremiumStatus werkt zonder health_data_consent, maar de AI-functies blijven consent vereisen', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'premium-zonder-consent@example.com',
    timezone: 'Europe/Brussels',
  });

  const premiumUser = await setPremiumStatus(user.id, true);
  assert.equal(premiumUser.is_premium, true);
  assert.equal(premiumUser.health_data_consent, false);

  // Premium alleen is niet genoeg: zonder health_data_consent blokkeert de AI-functie alsnog.
  await assert.rejects(() => processMealVoice('een appel', user.id), GdprConsentError);
});

test('staat AI-functies toe zodra de gebruiker zowel consent heeft gegeven als premium is geworden', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'premium-met-consent@example.com',
    timezone: 'Europe/Brussels',
  });
  await setHealthDataConsent(user.id, true, 'privacy-v1');
  const premiumUser = await setPremiumStatus(user.id, true);
  assert.equal(premiumUser.is_premium, true);

  const result = await processMealVoice('een appel', user.id);
  assert.equal(result.mealLog.source, 'voice');
});

test('registreert analytics- en advertentietoestemming apart, zonder health_data_consent nodig te hebben', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'ad-consent@example.com',
    timezone: 'Europe/Brussels',
  });

  const updated = await setAdConsent(user.id, true, false);
  assert.equal(updated.analytics_consent, true);
  assert.equal(updated.personalized_ads_consent, false);
  assert.equal(updated.health_data_consent, false);
  assert.notEqual(updated.ad_consent_opted_in_at, null);
  assert.equal(typeof updated.ad_consent_opted_in_at, 'string');
});
