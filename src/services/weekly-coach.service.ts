import * as storageService from './storage.service';
import type { WeeklyGoal, WeeklyReport, Streak, Badge, DailyTarget } from '../types/database.types';

export type WeeklyCoachMode = 'mock' | 'live';

export class WeeklyCoachError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WeeklyCoachError';
  }
}

// --- Configuratie ---
// Standaard "mock" zodat de testsuite en lokale ontwikkeling geen externe API-sleutels nodig hebben.
function getCoachMode(): WeeklyCoachMode {
  return process.env.WEEKLY_COACH_MODE === 'live' ? 'live' : 'mock';
}

const WEEK_LENGTH_DAYS = 7;
const CALORIE_TOLERANCE = 0.1;
const STREAK_BADGE_LENGTH = 7;
const FIBER_STREAK_BADGE_LENGTH = 7;
const MODEL_VERSION_MOCK = 'weekly-coach-mock-v1';
const CALCULATION_VERSION = 'weekly-coach-v1';

async function assertConsentOrThrow(userId: string): Promise<void> {
  const user = await storageService.getUserById(userId);
  if (!user.health_data_consent) {
    throw new storageService.GdprConsentError(userId);
  }
}

// --- Datumhulpfuncties ---
// week_end ligt per het databaseplan zeven dagen na week_start; de week omvat de dagen
// [week_start .. week_start+6], met week_end als exclusieve grens (start van de volgende week).

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDatesInWeek(weekStart: string): string[] {
  return Array.from({ length: WEEK_LENGTH_DAYS }, (_, i) => addDays(weekStart, i));
}

function defaultEvaluationDate(): string {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().slice(0, 10);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

// --- Aggregatie van maaltijdlogs ---

interface NutritionTotals {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

const ZERO_TOTALS: NutritionTotals = {
  calories_kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
};

function addTotals(a: NutritionTotals, b: NutritionTotals): NutritionTotals {
  return {
    calories_kcal: a.calories_kcal + b.calories_kcal,
    protein_g: a.protein_g + b.protein_g,
    carbs_g: a.carbs_g + b.carbs_g,
    fat_g: a.fat_g + b.fat_g,
    fiber_g: a.fiber_g + b.fiber_g,
  };
}

/** Som van alle meal_items van de niet-verwijderde meal_logs op een lokale datum. */
async function getTotalsForDate(
  userId: string,
  localDate: string
): Promise<{ totals: NutritionTotals; hasLogs: boolean }> {
  const mealLogs = await storageService.getMealLogsForUser(userId, { localDate });
  let totals = ZERO_TOTALS;

  for (const mealLog of mealLogs) {
    const items = await storageService.getMealItemsForMealLog(userId, mealLog.id);
    for (const item of items) {
      totals = addTotals(totals, {
        calories_kcal: item.calories_kcal,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        fiber_g: item.fiber_g,
      });
    }
  }

  return { totals, hasLogs: mealLogs.length > 0 };
}

function percentageOf(actual: number, target: number): number | null {
  if (target <= 0) return null;
  return actual / target;
}

/** Haalt het weekdoel op, of leidt het af als som van de dagelijkse targets in de week wanneer het nog niet bestaat. */
async function ensureWeeklyGoal(userId: string, weekStart: string, weekEnd: string): Promise<WeeklyGoal> {
  const existing = await storageService.getWeeklyGoalForWeek(userId, weekStart);
  if (existing) {
    return existing;
  }

  const dates = getDatesInWeek(weekStart);
  const dailyTargets = await Promise.all(dates.map((date) => storageService.getDailyTarget(userId, date)));
  const validTargets = dailyTargets.filter((target): target is DailyTarget => target !== null);

  return storageService.createWeeklyGoal(userId, {
    goal_id: validTargets[0]?.goal_id ?? null,
    week_start: weekStart,
    week_end: weekEnd,
    calories_kcal: sum(validTargets.map((t) => t.calories_kcal)),
    protein_g: sum(validTargets.map((t) => t.protein_g)),
    fiber_g: sum(validTargets.map((t) => t.fiber_g)),
    vitamins: {},
    calculation_version: CALCULATION_VERSION,
  });
}

// --- Coachtekst ---

interface CoachTextInput {
  daysLogged: number;
  caloriesPct: number | null;
  proteinPct: number | null;
  fiberPct: number | null;
}

function generateMockCoachText(input: CoachTextInput): string {
  const allMetrics: Array<{ label: string; pct: number | null }> = [
    { label: 'vezels', pct: input.fiberPct },
    { label: 'proteïnen', pct: input.proteinPct },
    { label: 'calorieën', pct: input.caloriesPct },
  ];
  const metrics = allMetrics.filter(
    (metric): metric is { label: string; pct: number } => metric.pct !== null
  );

  if (metrics.length === 0) {
    return `Je hebt deze week ${input.daysLogged} van de 7 dagen gelogd. Stel een doel in zodat we je vooruitgang kunnen meten.`;
  }

  const best = metrics.reduce((a, b) => (b.pct > a.pct ? b : a));
  const worst = metrics.reduce((a, b) => (b.pct < a.pct ? b : a));

  const praise = `Je hebt deze week je ${best.label}doel ${
    best.pct >= 1 ? 'uitstekend behaald' : 'goed benaderd'
  } (${Math.round(best.pct * 100)}%).`;

  const tip =
    worst.label !== best.label
      ? ` Probeer komende week wat extra aandacht te geven aan je ${worst.label} om dichter bij je doel te komen.`
      : '';

  const loggingNote = ` Je hebt ${input.daysLogged} van de 7 dagen gelogd, knap gedaan!`;

  return `${praise}${tip}${loggingNote}`;
}

function generateCoachText(mode: WeeklyCoachMode, input: CoachTextInput): string {
  if (mode === 'mock') {
    return generateMockCoachText(input);
  }
  throw new WeeklyCoachError(
    'Live coachtekst-generatie is nog niet geïmplementeerd. Zet WEEKLY_COACH_MODE=mock voor lokale ontwikkeling en tests.'
  );
}

// --- Publieke API ---

export interface WeeklyAggregation {
  weekStart: string;
  weekEnd: string;
  daysLogged: number;
  totals: NutritionTotals;
  weeklyGoal: WeeklyGoal;
  caloriesPct: number | null;
  proteinPct: number | null;
  fiberPct: number | null;
}

export interface GenerateWeeklyReportResult {
  report: WeeklyReport;
  aggregation: WeeklyAggregation;
}

/**
 * Aggregeert de maaltijdlogs van de 7 dagen vanaf `weekStartDate`, vergelijkt dit met het
 * weekdoel (bestaand of afgeleid uit de dagelijkse targets) en genereert een gepersonaliseerd
 * coachrapport.
 */
export async function generateWeeklyReport(
  userId: string,
  weekStartDate: string
): Promise<GenerateWeeklyReportResult> {
  await assertConsentOrThrow(userId);

  const weekStart = weekStartDate;
  const weekEnd = addDays(weekStart, WEEK_LENGTH_DAYS);
  const dates = getDatesInWeek(weekStart);

  let totals = ZERO_TOTALS;
  let daysLogged = 0;

  for (const date of dates) {
    const { totals: dayTotals, hasLogs } = await getTotalsForDate(userId, date);
    totals = addTotals(totals, dayTotals);
    if (hasLogs) {
      daysLogged += 1;
    }
  }

  const weeklyGoal = await ensureWeeklyGoal(userId, weekStart, weekEnd);

  const caloriesPct = percentageOf(totals.calories_kcal, weeklyGoal.calories_kcal);
  const proteinPct = percentageOf(totals.protein_g, weeklyGoal.protein_g);
  const fiberPct = percentageOf(totals.fiber_g, weeklyGoal.fiber_g);

  const coachMode = getCoachMode();
  const reportText = generateCoachText(coachMode, { daysLogged, caloriesPct, proteinPct, fiberPct });

  const report = await storageService.createWeeklyReport(userId, {
    week_start: weekStart,
    week_end: weekEnd,
    report_text: reportText,
    model_version: coachMode === 'mock' ? MODEL_VERSION_MOCK : process.env.WEEKLY_COACH_MODEL ?? 'claude-sonnet',
    status: 'generated',
  });

  return {
    report,
    aggregation: { weekStart, weekEnd, daysLogged, totals, weeklyGoal, caloriesPct, proteinPct, fiberPct },
  };
}

function isWithinTolerance(actual: number, target: number, tolerance = CALORIE_TOLERANCE): boolean {
  if (target <= 0) return false;
  return actual >= target * (1 - tolerance) && actual <= target * (1 + tolerance);
}

export interface UpdateStreaksResult {
  streak: Streak;
  newlyEarnedBadges: Badge[];
}

/**
 * Controleert of de gebruiker op `evaluationDate` (standaard: gisteren) zijn dagelijkse targets
 * heeft gehaald en werkt op basis daarvan de streak en eventuele badges bij. Idempotent: een
 * datum die al geëvalueerd is, wordt niet opnieuw meegeteld.
 */
export async function updateUserStreaks(
  userId: string,
  evaluationDate: string = defaultEvaluationDate()
): Promise<UpdateStreaksResult> {
  await assertConsentOrThrow(userId);

  const streak = await storageService.getOrCreateStreak(userId);
  if (streak.last_evaluated_date === evaluationDate) {
    return { streak, newlyEarnedBadges: [] };
  }

  const { totals } = await getTotalsForDate(userId, evaluationDate);
  const dailyTarget = await storageService.getDailyTarget(userId, evaluationDate);

  const caloriesMet =
    dailyTarget !== null && isWithinTolerance(totals.calories_kcal, dailyTarget.calories_kcal);
  const fiberMet = dailyTarget !== null && dailyTarget.fiber_g > 0 && totals.fiber_g >= dailyTarget.fiber_g;

  const nextCurrentLength = caloriesMet ? streak.current_length + 1 : 0;
  const nextFiberLength = fiberMet ? streak.current_fiber_streak_length + 1 : 0;

  const updatedStreak = await storageService.updateStreak(userId, {
    current_length: nextCurrentLength,
    longest_length: Math.max(streak.longest_length, nextCurrentLength),
    current_fiber_streak_length: nextFiberLength,
    longest_fiber_streak_length: Math.max(streak.longest_fiber_streak_length, nextFiberLength),
    last_evaluated_date: evaluationDate,
  });

  const newlyEarnedBadges: Badge[] = [];

  if (updatedStreak.current_length >= STREAK_BADGE_LENGTH) {
    const badge = await storageService.awardBadge(userId, 'seven_day_streak', {
      streak_length: updatedStreak.current_length,
    });
    if (badge) newlyEarnedBadges.push(badge);
  }

  if (updatedStreak.current_fiber_streak_length >= FIBER_STREAK_BADGE_LENGTH) {
    const badge = await storageService.awardBadge(userId, 'fiber_king_7_days', {
      streak_length: updatedStreak.current_fiber_streak_length,
    });
    if (badge) newlyEarnedBadges.push(badge);
  }

  return { streak: updatedStreak, newlyEarnedBadges };
}
