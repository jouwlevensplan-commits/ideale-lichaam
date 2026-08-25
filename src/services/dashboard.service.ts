import { Op } from 'sequelize';

import { DailyTarget, MealItem, MealLog } from '../db/models';

function toPlainNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

/**
 * "Vandaag" = de UTC-kalenderdatum (`toISOString().slice(0, 10)`), niet een tijdzone-bewuste
 * lokale dag: de client stuurt `local_date` vandaag ook al zo mee bij het loggen (zie
 * `frontend/src/app/(tabs)/diary.tsx`), dus dit moet daarmee blijven overeenkomen. Een echte
 * tijdzone-bewuste "lokale eetdag" (databaseplan §1) zou client én server tegelijk moeten
 * aanpassen en is hier bewust buiten scope.
 */
export function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToDateOnly(dateOnly: string, days: number): string {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export interface NutritionTotals {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

const ZERO_TOTALS: NutritionTotals = { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };

function sumItems(items: MealItem[]): NutritionTotals {
  return items.reduce(
    (totals, item) => ({
      calories_kcal: totals.calories_kcal + toPlainNumber(item.calories_kcal),
      protein_g: totals.protein_g + toPlainNumber(item.protein_g),
      carbs_g: totals.carbs_g + toPlainNumber(item.carbs_g),
      fat_g: totals.fat_g + toPlainNumber(item.fat_g),
      fiber_g: totals.fiber_g + toPlainNumber(item.fiber_g),
    }),
    ZERO_TOTALS
  );
}

export interface TodayMealLog {
  log: MealLog;
  items: MealItem[];
}

export interface TodayDashboard {
  /** De meest recente `daily_targets`-rij van de gebruiker, of `null` als er nog nooit een is berekend (vóór de eerste onboarding-afronding). Er draait nog geen dagelijkse job die per kalenderdag een nieuwe rij aanmaakt — "het doel van vandaag" is dus het laatst berekende doel, niet noodzakelijk een rij met `target_date === vandaag`. */
  dailyTarget: DailyTarget | null;
  totals: NutritionTotals;
  mealLogs: TodayMealLog[];
}

/** Alles wat het Home-dashboard voor "vandaag" nodig heeft, in één functie. Sluit verwijderde (`status: 'deleted'`) logs uit — die tellen niet mee in dagtotalen (databaseplan §3.6). */
export async function getTodayDashboard(userId: string): Promise<TodayDashboard> {
  const today = todayDateOnly();

  const [dailyTarget, mealLogs] = await Promise.all([
    DailyTarget.findOne({ where: { user_id: userId }, order: [['target_date', 'DESC']] }),
    MealLog.findAll({
      where: { user_id: userId, local_date: today, status: { [Op.ne]: 'deleted' } },
      order: [['consumed_at', 'ASC']],
    }),
  ]);

  const mealLogsWithItems = await Promise.all(
    mealLogs.map(async (log): Promise<TodayMealLog> => ({
      log,
      items: await MealItem.findAll({ where: { meal_log_id: log.id }, order: [['sort_order', 'ASC']] }),
    }))
  );

  const totals = sumItems(mealLogsWithItems.flatMap((entry) => entry.items));

  return { dailyTarget, totals, mealLogs: mealLogsWithItems };
}

/**
 * Aantal opeenvolgende dagen gelogd, tellend vanaf vandaag terug (CLAUDE.md §3.C: "Streaks
 * (aantal opeenvolgende dagen gelogd)"). Als er vandaag nog niets gelogd is, telt dat nog niet als
 * een gemiste dag — pas zodra ook gisteren geen logs heeft, stopt de streak. Pure functie, apart
 * testbaar zonder database.
 */
export function computeStreakFromLoggedDates(loggedDates: ReadonlySet<string>, today: string): number {
  let cursor = loggedDates.has(today) ? today : addDaysToDateOnly(today, -1);

  let streak = 0;
  while (loggedDates.has(cursor)) {
    streak += 1;
    cursor = addDaysToDateOnly(cursor, -1);
  }
  return streak;
}

/** Haalt alle dagen op waarop de gebruiker minstens één niet-verwijderde maaltijd logde, en telt de huidige streak. */
export async function getCurrentStreak(userId: string): Promise<number> {
  const mealLogs = await MealLog.findAll({
    where: { user_id: userId, status: { [Op.ne]: 'deleted' } },
    attributes: ['local_date'],
  });

  const loggedDates = new Set(mealLogs.map((log) => log.local_date));
  return computeStreakFromLoggedDates(loggedDates, todayDateOnly());
}
