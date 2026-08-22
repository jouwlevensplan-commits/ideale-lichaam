import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  createUser,
  setHealthDataConsent,
  createDailyTarget,
  createMealLogWithItems,
  GdprConsentError,
} from '../storage.service';
import { generateWeeklyReport, updateUserStreaks } from '../weekly-coach.service';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'weekly-coach-test-'));
  process.env.STORAGE_FILE_PATH = path.join(tempDir, 'storage.json');
  delete process.env.WEEKLY_COACH_MODE;
});

afterEach(() => {
  delete process.env.STORAGE_FILE_PATH;
  delete process.env.WEEKLY_COACH_MODE;
  rmSync(tempDir, { recursive: true, force: true });
});

async function logMeal(
  userId: string,
  localDate: string,
  totals: { calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number }
) {
  await createMealLogWithItems(userId, {
    mealLog: {
      recognition_run_id: null,
      media_asset_id: null,
      consumed_at: `${localDate}T12:00:00.000Z`,
      local_date: localDate,
      meal_type: 'lunch',
      source: 'manual',
      confidence: null,
      notes: null,
    },
    items: [
      {
        name: 'Testmaaltijd',
        amount_g: 300,
        calories_kcal: totals.calories_kcal,
        protein_g: totals.protein_g,
        carbs_g: totals.carbs_g,
        fat_g: totals.fat_g,
        fiber_g: totals.fiber_g,
        micronutrients: {},
        nutrition_source: 'manual',
        source_reference: null,
        sort_order: 0,
      },
    ],
  });
}

test('weigert generateWeeklyReport en updateUserStreaks zonder health_data_consent', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'geen-consent@example.com',
    timezone: 'Europe/Brussels',
  });

  await assert.rejects(() => generateWeeklyReport(user.id, '2026-08-17'), GdprConsentError);
  await assert.rejects(() => updateUserStreaks(user.id, '2026-08-17'), GdprConsentError);
});

test('aggregeert maaltijdlogs over de week, vergelijkt met het weekdoel en genereert de coachtekst', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'weekrapport@example.com',
    timezone: 'Europe/Brussels',
  });
  await setHealthDataConsent(user.id, true, 'privacy-v1');

  const weekStart = '2026-08-17'; // maandag
  const daysInWeek = [
    '2026-08-17',
    '2026-08-18',
    '2026-08-19',
    '2026-08-20',
    '2026-08-21',
    '2026-08-22',
    '2026-08-23',
  ];

  // Elke dag van de week krijgt hetzelfde daily target; het weekdoel wordt hieruit afgeleid.
  for (const date of daysInWeek) {
    await createDailyTarget(user.id, {
      target_date: date,
      goal_id: null,
      calories_kcal: 2000,
      protein_g: 120,
      carbs_g: 250,
      fat_g: 60,
      fiber_g: 30,
      micronutrients: {},
      calculation_version: 'test-v1',
    });
  }

  // Slechts 5 van de 7 dagen daadwerkelijk gelogd.
  const loggedDays = daysInWeek.slice(0, 5);
  for (const date of loggedDays) {
    await logMeal(user.id, date, {
      calories_kcal: 1800,
      protein_g: 110,
      carbs_g: 200,
      fat_g: 55,
      fiber_g: 25,
    });
  }

  const result = await generateWeeklyReport(user.id, weekStart);

  assert.equal(result.aggregation.weekStart, '2026-08-17');
  assert.equal(result.aggregation.weekEnd, '2026-08-24');
  assert.equal(result.aggregation.daysLogged, 5);
  assert.deepEqual(result.aggregation.totals, {
    calories_kcal: 9000,
    protein_g: 550,
    carbs_g: 1000,
    fat_g: 275,
    fiber_g: 125,
  });

  assert.equal(result.aggregation.weeklyGoal.calories_kcal, 14000);
  assert.equal(result.aggregation.weeklyGoal.protein_g, 840);
  assert.equal(result.aggregation.weeklyGoal.fiber_g, 210);

  assert.ok(Math.abs(result.aggregation.caloriesPct! - 9000 / 14000) < 1e-9);
  assert.ok(Math.abs(result.aggregation.proteinPct! - 550 / 840) < 1e-9);
  assert.ok(Math.abs(result.aggregation.fiberPct! - 125 / 210) < 1e-9);

  // proteïnen scoort het hoogst (~65%), vezels het laagst (~60%) -> vezels is het verbeterpunt.
  assert.equal(
    result.report.report_text,
    'Je hebt deze week je proteïnendoel goed benaderd (65%). Probeer komende week wat extra aandacht te geven aan je vezels om dichter bij je doel te komen. Je hebt 5 van de 7 dagen gelogd, knap gedaan!'
  );
  assert.equal(result.report.status, 'generated');
  assert.equal(result.report.model_version, 'weekly-coach-mock-v1');
});

test('bouwt de streak op bij 7 opeenvolgende gehaalde dagen en kent de badges toe', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'streaks@example.com',
    timezone: 'Europe/Brussels',
  });
  await setHealthDataConsent(user.id, true, 'privacy-v1');

  const sevenDays = [
    '2026-08-01',
    '2026-08-02',
    '2026-08-03',
    '2026-08-04',
    '2026-08-05',
    '2026-08-06',
    '2026-08-07',
  ];

  for (const [index, date] of sevenDays.entries()) {
    await createDailyTarget(user.id, {
      target_date: date,
      goal_id: null,
      calories_kcal: 2000,
      protein_g: 100,
      carbs_g: 200,
      fat_g: 60,
      fiber_g: 25,
      micronutrients: {},
      calculation_version: 'test-v1',
    });
    // Binnen de tolerantie van het caloriedoel en ruim boven het vezeldoel.
    await logMeal(user.id, date, { calories_kcal: 2000, protein_g: 100, carbs_g: 200, fat_g: 60, fiber_g: 30 });

    const result = await updateUserStreaks(user.id, date);
    const expectedLength = index + 1;

    assert.equal(result.streak.current_length, expectedLength);
    assert.equal(result.streak.current_fiber_streak_length, expectedLength);
    assert.equal(result.streak.longest_length, expectedLength);
    assert.equal(result.streak.longest_fiber_streak_length, expectedLength);

    if (expectedLength === 7) {
      const badgeKeys = result.newlyEarnedBadges.map((b) => b.badge_key).sort();
      assert.deepEqual(badgeKeys, ['fiber_king_7_days', 'seven_day_streak']);
    } else {
      assert.equal(result.newlyEarnedBadges.length, 0);
    }
  }

  // Opnieuw dezelfde datum evalueren mag niet dubbel tellen of de badge opnieuw uitreiken.
  const repeated = await updateUserStreaks(user.id, '2026-08-07');
  assert.equal(repeated.streak.current_length, 7);
  assert.equal(repeated.newlyEarnedBadges.length, 0);

  // Een gemiste dag breekt beide streaks.
  const missedDate = '2026-08-08';
  await createDailyTarget(user.id, {
    target_date: missedDate,
    goal_id: null,
    calories_kcal: 2000,
    protein_g: 100,
    carbs_g: 200,
    fat_g: 60,
    fiber_g: 25,
    micronutrients: {},
    calculation_version: 'test-v1',
  });
  await logMeal(user.id, missedDate, { calories_kcal: 500, protein_g: 30, carbs_g: 50, fat_g: 10, fiber_g: 5 });

  const afterMiss = await updateUserStreaks(user.id, missedDate);
  assert.equal(afterMiss.streak.current_length, 0);
  assert.equal(afterMiss.streak.current_fiber_streak_length, 0);
  assert.equal(afterMiss.streak.longest_length, 7);
  assert.equal(afterMiss.streak.longest_fiber_streak_length, 7);
  assert.equal(afterMiss.newlyEarnedBadges.length, 0);
});
