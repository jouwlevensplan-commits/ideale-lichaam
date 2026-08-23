import type { DailyTarget, MealItem, MealLog, User, WeeklyGoal } from '../db/models';

/**
 * Mappers van Sequelize-modellen (snake_case, zoals database-plan.md) naar de camelCase-vormen
 * die de React Native frontend verwacht (zie `frontend/src/types/api.types.ts`). Postgres
 * `NUMERIC`/`DECIMAL`-kolommen komen via `pg` als string binnen om precisieverlies te voorkomen;
 * `Number(...)` zet ze hier expliciet om naar de JSON-getallen die de frontend typeert.
 */

export function mapUser(user: User) {
  return {
    id: user.id,
    isPremium: user.is_premium,
    healthDataConsent: user.health_data_consent,
    analyticsConsent: user.analytics_consent,
    personalizedAdsConsent: user.personalized_ads_consent,
    timezone: user.timezone,
  };
}

export function mapDailyTarget(target: DailyTarget) {
  return {
    targetDate: target.target_date,
    caloriesKcal: Number(target.calories_kcal),
    proteinG: Number(target.protein_g),
    carbsG: Number(target.carbs_g),
    fatG: Number(target.fat_g),
    fiberG: Number(target.fiber_g),
  };
}

export function mapWeeklyGoal(goal: WeeklyGoal) {
  return {
    weekStart: goal.week_start,
    weekEnd: goal.week_end,
    caloriesKcal: Number(goal.calories_kcal),
    proteinG: Number(goal.protein_g),
    fiberG: Number(goal.fiber_g),
  };
}

export function mapMealItem(item: MealItem) {
  return {
    id: item.id,
    name: item.name,
    amountG: Number(item.amount_g),
    caloriesKcal: Number(item.calories_kcal),
    proteinG: Number(item.protein_g),
    carbsG: Number(item.carbs_g),
    fatG: Number(item.fat_g),
    fiberG: Number(item.fiber_g),
  };
}

export function mapMealLog(log: MealLog, items: MealItem[]) {
  return {
    id: log.id,
    localDate: log.local_date,
    mealType: log.meal_type,
    source: log.source,
    confidence: log.confidence === null ? null : Number(log.confidence),
    items: items.map(mapMealItem),
  };
}
