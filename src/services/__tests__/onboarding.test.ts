import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createUser, getCurrentUserProfile, getActiveGoal, getDailyTarget } from '../storage.service';
import { completeOnboarding, type CompleteOnboardingInput } from '../onboarding.service';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'onboarding-test-'));
  process.env.STORAGE_FILE_PATH = path.join(tempDir, 'storage.json');
});

afterEach(() => {
  delete process.env.STORAGE_FILE_PATH;
  rmSync(tempDir, { recursive: true, force: true });
});

const REFERENCE_DATE = new Date('2026-08-22T00:00:00.000Z');

test('rondt de volledige onboardingflow af: consent eerst, dan profiel/doel/target', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'onboarding-flow@example.com',
    timezone: 'Europe/Brussels',
  });
  assert.equal(user.health_data_consent, false);

  const input: CompleteOnboardingInput = {
    userId: user.id,
    consentPolicyVersion: 'privacy-v1',
    goal: { goal_type: 'build_muscle', training_days_per_week: 4, reason: 'sportprestaties' },
    personal: { sex: 'male', birth_date: '1996-08-22', height_cm: 180, weight_kg: 80 },
    activity: { activity_level: 'moderate' },
    preferences: { dietary_pattern: 'geen_voorkeur', meals_per_day: 3, avoided_ingredients: [] },
    referenceDate: REFERENCE_DATE,
  };

  const result = await completeOnboarding(input);

  assert.equal(result.user.health_data_consent, true);
  assert.notEqual(result.user.health_data_opted_in_at, null);

  // Als consent niet als eerste was geregistreerd, had de GDPR-gate van de storage-service
  // deze writes geweigerd (GdprConsentError) en was completeOnboarding al mislukt.
  assert.equal(result.profile.user_id, user.id);
  assert.equal(result.goal.status, 'active');
  assert.equal(result.dailyTarget.goal_id, result.goal.id);

  const storedProfile = await getCurrentUserProfile(user.id);
  const storedGoal = await getActiveGoal(user.id);
  const storedTarget = await getDailyTarget(user.id, '2026-08-22');

  assert.equal(storedProfile?.id, result.profile.id);
  assert.equal(storedGoal?.id, result.goal.id);
  assert.equal(storedTarget?.id, result.dailyTarget.id);
});

test('berekent Mifflin-St Jeor caloriedoel en macro-verdeling correct voor spiermassa opbouwen (man)', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'build-muscle@example.com',
    timezone: 'Europe/Brussels',
  });

  const result = await completeOnboarding({
    userId: user.id,
    consentPolicyVersion: 'privacy-v1',
    goal: { goal_type: 'build_muscle', training_days_per_week: 4 },
    personal: { sex: 'male', birth_date: '1996-08-22', height_cm: 180, weight_kg: 80 },
    activity: { activity_level: 'moderate' },
    preferences: { meals_per_day: 3 },
    referenceDate: REFERENCE_DATE,
  });

  // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 1780
  // TDEE = 1780 * 1.55 = 2759
  // calorieën (build_muscle: +10%) = 2759 * 1.1 = 3034.9 -> 3035
  // protein = 2.0 g/kg * 80 = 160g, fat = 25% van calorieën / 9 = 84g, carbs = rest / 4 = 410g
  // vezels = 14g per 1000 kcal = 42g
  assert.deepEqual(result.calculation, {
    bmr: 1780,
    tdee: 2759,
    calories_kcal: 3035,
    protein_g: 160,
    fat_g: 84,
    carbs_g: 410,
    fiber_g: 42,
  });
});

test('berekent Mifflin-St Jeor caloriedoel en macro-verdeling correct voor afvallen (vrouw, ambitieus tempo)', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'lose-weight@example.com',
    timezone: 'Europe/Brussels',
  });

  const result = await completeOnboarding({
    userId: user.id,
    consentPolicyVersion: 'privacy-v1',
    goal: { goal_type: 'lose_weight', target_weight_kg: 60, pace: 'ambitious' },
    personal: { sex: 'female', birth_date: '2001-08-22', height_cm: 165, weight_kg: 70 },
    activity: { activity_level: 'light' },
    preferences: { meals_per_day: 4 },
    referenceDate: REFERENCE_DATE,
  });

  // BMR = 10*70 + 6.25*165 - 5*25 - 161 = 1445.25 -> 1445
  // TDEE = 1445.25 * 1.375 = 1987.21875 -> 1987
  // calorieën (lose_weight, ambitious: -25%) = 1987.21875 * 0.75 = 1490.4... -> 1490
  // protein = 1.8 g/kg * 70 = 126g, fat = 25% van calorieën / 9 = 41g, carbs = rest / 4 = 154g
  // vezels = 14g per 1000 kcal = 21g
  assert.deepEqual(result.calculation, {
    bmr: 1445,
    tdee: 1987,
    calories_kcal: 1490,
    protein_g: 126,
    fat_g: 41,
    carbs_g: 154,
    fiber_g: 21,
  });
});

test('weigert onboarding zonder target_weight_kg/pace bij lose_weight', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'validatie-1@example.com',
    timezone: 'Europe/Brussels',
  });

  await assert.rejects(
    () =>
      completeOnboarding({
        userId: user.id,
        consentPolicyVersion: 'privacy-v1',
        goal: { goal_type: 'lose_weight' },
        personal: { sex: 'female', birth_date: '2001-08-22', height_cm: 165, weight_kg: 70 },
        activity: { activity_level: 'light' },
        preferences: { meals_per_day: 3 },
        referenceDate: REFERENCE_DATE,
      }),
    /target_weight_kg is verplicht/
  );
});

test('weigert onboarding zonder training_days_per_week bij build_muscle', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'validatie-2@example.com',
    timezone: 'Europe/Brussels',
  });

  await assert.rejects(
    () =>
      completeOnboarding({
        userId: user.id,
        consentPolicyVersion: 'privacy-v1',
        goal: { goal_type: 'build_muscle' },
        personal: { sex: 'male', birth_date: '1996-08-22', height_cm: 180, weight_kg: 80 },
        activity: { activity_level: 'moderate' },
        preferences: { meals_per_day: 3 },
        referenceDate: REFERENCE_DATE,
      }),
    /training_days_per_week is verplicht/
  );
});
