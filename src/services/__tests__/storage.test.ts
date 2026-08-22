import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { CreateMealLogInput, CreateUserProfileInput } from '../storage.service';
import {
  createUser,
  setHealthDataConsent,
  setPremiumStatus,
  setAdConsent,
  upsertUserProfile,
  getCurrentUserProfile,
  getUserProfileHistory,
  createMealLog,
  getMealLogsForUser,
  GdprConsentError,
  NotFoundError,
} from '../storage.service';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'storage-test-'));
  process.env.STORAGE_FILE_PATH = path.join(tempDir, 'storage.json');
});

afterEach(() => {
  delete process.env.STORAGE_FILE_PATH;
  rmSync(tempDir, { recursive: true, force: true });
});

const profileInput: CreateUserProfileInput = {
  sex: null,
  birth_date: null,
  height_cm: null,
  weight_kg: 70,
  activity_level: 'moderate',
  dietary_pattern: null,
  avoided_ingredients: [],
  meals_per_day: 3,
  meal_times: [],
};

const mealLogInput: CreateMealLogInput = {
  recognition_run_id: null,
  media_asset_id: null,
  consumed_at: new Date().toISOString(),
  local_date: '2026-08-22',
  meal_type: 'lunch',
  source: 'manual',
  confidence: null,
  notes: null,
};

test('weigert profiel opslaan zonder health_data_consent', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'zonder-consent@example.com',
    timezone: 'Europe/Brussels',
  });

  await assert.rejects(() => upsertUserProfile(user.id, profileInput), GdprConsentError);
});

test('weigert profiel ophalen zonder health_data_consent', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'zonder-consent-2@example.com',
    timezone: 'Europe/Brussels',
  });

  await assert.rejects(() => getCurrentUserProfile(user.id), GdprConsentError);
  await assert.rejects(() => getUserProfileHistory(user.id), GdprConsentError);
});

test('weigert maaltijdlog opslaan zonder health_data_consent', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'zonder-consent-3@example.com',
    timezone: 'Europe/Brussels',
  });

  await assert.rejects(() => createMealLog(user.id, mealLogInput), GdprConsentError);
});

test('weigert maaltijdlogs ophalen zonder health_data_consent', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'zonder-consent-4@example.com',
    timezone: 'Europe/Brussels',
  });

  await assert.rejects(() => getMealLogsForUser(user.id), GdprConsentError);
});

test('staat profiel en maaltijdlog toe zodra health_data_consent expliciet true is', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'met-consent@example.com',
    timezone: 'Europe/Brussels',
  });

  const consentingUser = await setHealthDataConsent(user.id, true, 'privacy-v1');
  assert.equal(consentingUser.health_data_consent, true);
  assert.notEqual(consentingUser.health_data_opted_in_at, null);

  const profile = await upsertUserProfile(user.id, profileInput);
  assert.equal(profile.user_id, user.id);

  const fetchedProfile = await getCurrentUserProfile(user.id);
  assert.equal(fetchedProfile?.id, profile.id);

  const mealLog = await createMealLog(user.id, mealLogInput);
  assert.equal(mealLog.user_id, user.id);

  const mealLogs = await getMealLogsForUser(user.id);
  assert.equal(mealLogs.length, 1);
});

test('weigert opnieuw zodra toestemming wordt ingetrokken', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'ingetrokken-consent@example.com',
    timezone: 'Europe/Brussels',
  });

  await setHealthDataConsent(user.id, true, 'privacy-v1');
  await upsertUserProfile(user.id, profileInput);
  await createMealLog(user.id, mealLogInput);

  const revokedUser = await setHealthDataConsent(user.id, false, 'privacy-v1');
  assert.equal(revokedUser.health_data_consent, false);
  assert.equal(revokedUser.health_data_opted_in_at, null);

  await assert.rejects(() => getCurrentUserProfile(user.id), GdprConsentError);
  await assert.rejects(() => getMealLogsForUser(user.id), GdprConsentError);
  await assert.rejects(() => upsertUserProfile(user.id, profileInput), GdprConsentError);
  await assert.rejects(() => createMealLog(user.id, mealLogInput), GdprConsentError);
});

test('staat setPremiumStatus en setAdConsent toe zonder health_data_consent (freemium en advertentietoestemming zijn losstaand)', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'freemium-zonder-consent@example.com',
    timezone: 'Europe/Brussels',
  });
  assert.equal(user.health_data_consent, false);

  const premiumUser = await setPremiumStatus(user.id, true);
  assert.equal(premiumUser.is_premium, true);
  assert.equal(premiumUser.health_data_consent, false);

  const adUser = await setAdConsent(user.id, true, true);
  assert.equal(adUser.analytics_consent, true);
  assert.equal(adUser.personalized_ads_consent, true);
  assert.notEqual(adUser.ad_consent_opted_in_at, null);
  assert.equal(adUser.health_data_consent, false);
});

test('gooit een fout wanneer setPremiumStatus of setAdConsent wordt aangeroepen voor een onbestaande gebruiker', async () => {
  await assert.rejects(() => setPremiumStatus('niet-bestaande-id', true), NotFoundError);
  await assert.rejects(() => setAdConsent('niet-bestaande-id', true, true), NotFoundError);
});
