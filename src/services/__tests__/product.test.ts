import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createUser, setHealthDataConsent, setPremiumStatus, setAdConsent, GdprConsentError } from '../storage.service';
import { processMealPhoto, processMealVoice, PremiumAccessError } from '../ai-recognition.service';

// Product-zoektests (cache-hit/-miss, Open Food Facts-fallback, ProductNotFoundError) verhuisden
// naar `open-food-facts.test.ts` voor het deel dat zonder netwerk/database te testen is
// (responsmapping). `product.service.ts` zoekt sinds de Postgres-migratie in de `meal_catalog`-
// tabel i.p.v. het lokale storage.json-bestand, dus die orkestratie vereist nu een echte database-
// en netwerkverbinding om te testen — buiten bereik van deze offline testsuite.

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'product-test-'));
  process.env.STORAGE_FILE_PATH = path.join(tempDir, 'storage.json');
});

afterEach(() => {
  delete process.env.STORAGE_FILE_PATH;
  rmSync(tempDir, { recursive: true, force: true });
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
