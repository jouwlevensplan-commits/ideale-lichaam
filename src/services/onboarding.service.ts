import * as storageService from './storage.service';
import type { User, UserProfile, Goal, DailyTarget, GoalType } from '../types/database.types';

export type Sex = 'male' | 'female' | 'unspecified';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extreme';
export type Pace = 'slow' | 'moderate' | 'ambitious';

const CALCULATION_VERSION = 'onboarding-v1';

// Activity Factor (PAL) per activiteitsniveau uit Fase 3 van de onboarding.
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extreme: 1.9,
};

// Percentage aan- of afname op de TDEE per gekozen tempo (Fase 4).
const PACE_ADJUSTMENT: Record<Pace, number> = {
  slow: 0.1,
  moderate: 0.2,
  ambitious: 0.25,
};

// Proteïnebehoefte in g/kg lichaamsgewicht per doel; hoger bij spiermassa opbouwen.
const PROTEIN_G_PER_KG: Record<GoalType, number> = {
  lose_weight: 1.8,
  gain_weight: 1.6,
  build_muscle: 2.0,
  maintain: 1.4,
  healthy_living: 1.4,
};

// Aandeel van de calorieën uit vet per doel; de rest wordt koolhydraten.
const FAT_CALORIE_SHARE: Record<GoalType, number> = {
  lose_weight: 0.25,
  gain_weight: 0.25,
  build_muscle: 0.25,
  maintain: 0.3,
  healthy_living: 0.3,
};

export interface OnboardingGoalInput {
  goal_type: GoalType;
  reason?: string | null;
  /** Verplicht bij `lose_weight` en `gain_weight`. */
  target_weight_kg?: number | null;
  /** Verplicht bij `lose_weight` en `gain_weight`. */
  pace?: Pace | null;
  /** Verplicht bij `build_muscle`. */
  training_days_per_week?: number | null;
}

export interface OnboardingPersonalInput {
  sex: Sex;
  birth_date: string;
  height_cm: number;
  weight_kg: number;
}

export interface OnboardingActivityInput {
  activity_level: ActivityLevel;
}

export interface OnboardingPreferencesInput {
  dietary_pattern?: string | null;
  avoided_ingredients?: string[];
  meals_per_day: number;
  meal_times?: string[];
}

export interface CompleteOnboardingInput {
  userId: string;
  /** Versie van de privacyverklaring/consenttekst die aan de gebruiker is getoond. */
  consentPolicyVersion: string;
  goal: OnboardingGoalInput;
  personal: OnboardingPersonalInput;
  activity: OnboardingActivityInput;
  preferences: OnboardingPreferencesInput;
  /** Peildatum voor leeftijd en target_date; standaard "nu". Vooral bedoeld voor tests. */
  referenceDate?: Date;
}

export interface OnboardingCalculation {
  bmr: number;
  tdee: number;
  calories_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
}

export interface OnboardingResult {
  user: User;
  profile: UserProfile;
  goal: Goal;
  dailyTarget: DailyTarget;
  calculation: OnboardingCalculation;
}

function validateOnboardingInput(input: CompleteOnboardingInput): void {
  const { goal } = input;

  if (goal.goal_type === 'lose_weight' || goal.goal_type === 'gain_weight') {
    if (goal.target_weight_kg == null) {
      throw new Error(`target_weight_kg is verplicht bij goal_type "${goal.goal_type}".`);
    }
    if (!goal.pace) {
      throw new Error(`pace is verplicht bij goal_type "${goal.goal_type}".`);
    }
  }

  if (goal.goal_type === 'build_muscle' && goal.training_days_per_week == null) {
    throw new Error('training_days_per_week is verplicht bij goal_type "build_muscle".');
  }
}

export function calculateAgeInYears(birthDate: string, referenceDate: Date): number {
  const birth = new Date(birthDate);
  let age = referenceDate.getUTCFullYear() - birth.getUTCFullYear();

  const hasHadBirthdayThisYear =
    referenceDate.getUTCMonth() > birth.getUTCMonth() ||
    (referenceDate.getUTCMonth() === birth.getUTCMonth() &&
      referenceDate.getUTCDate() >= birth.getUTCDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age;
}

/** Mifflin-St Jeor basaalmetabolisme. Bij "unspecified" wordt het gemiddelde van de man/vrouw-constante gebruikt. */
export function calculateBmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === 'male') return base + 5;
  if (sex === 'female') return base - 161;
  return base + (5 + -161) / 2;
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

/** Corrigeert de TDEE voor het gekozen doel en streeftempo. */
export function calculateGoalAdjustedCalories(
  tdee: number,
  goalType: GoalType,
  pace: Pace | null
): number {
  switch (goalType) {
    case 'lose_weight':
      return Math.round(tdee * (1 - PACE_ADJUSTMENT[pace ?? 'moderate']));
    case 'gain_weight':
      return Math.round(tdee * (1 + PACE_ADJUSTMENT[pace ?? 'moderate']));
    case 'build_muscle':
      return Math.round(tdee * 1.1);
    case 'maintain':
    case 'healthy_living':
    default:
      return Math.round(tdee);
  }
}

export function calculateMacros(
  calories: number,
  weightKg: number,
  goalType: GoalType
): { protein_g: number; fat_g: number; carbs_g: number; fiber_g: number } {
  const protein_g = Math.round(PROTEIN_G_PER_KG[goalType] * weightKg);
  const fat_g = Math.round((calories * FAT_CALORIE_SHARE[goalType]) / 9);
  const carbs_g = Math.max(0, Math.round((calories - protein_g * 4 - fat_g * 9) / 4));
  const fiber_g = Math.round((calories / 1000) * 14);

  return { protein_g, fat_g, carbs_g, fiber_g };
}

function formatLocalDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Rondt de onboarding (Fase 1 t/m 5) af: berekent het gepersonaliseerde caloriedoel en de
 * macroverdeling, registreert daarna eerst de GDPR-consent en schrijft pas vervolgens het
 * profiel, het actieve doel en het daily target weg via de StorageService.
 */
export async function completeOnboarding(input: CompleteOnboardingInput): Promise<OnboardingResult> {
  validateOnboardingInput(input);

  const referenceDate = input.referenceDate ?? new Date();
  const targetDate = formatLocalDate(referenceDate);

  const age = calculateAgeInYears(input.personal.birth_date, referenceDate);
  const bmr = calculateBmr(input.personal.weight_kg, input.personal.height_cm, age, input.personal.sex);
  const tdee = calculateTdee(bmr, input.activity.activity_level);
  const calories_kcal = calculateGoalAdjustedCalories(tdee, input.goal.goal_type, input.goal.pace ?? null);
  const { protein_g, fat_g, carbs_g, fiber_g } = calculateMacros(
    calories_kcal,
    input.personal.weight_kg,
    input.goal.goal_type
  );

  // Consent moet eerst worden vastgelegd: de storage-service weigert profiel/doel/target-writes
  // anders via zijn GDPR-gate (health_data_consent moet expliciet true zijn).
  const user = await storageService.setHealthDataConsent(
    input.userId,
    true,
    input.consentPolicyVersion
  );

  const profile = await storageService.upsertUserProfile(input.userId, {
    sex: input.personal.sex,
    birth_date: input.personal.birth_date,
    height_cm: input.personal.height_cm,
    weight_kg: input.personal.weight_kg,
    activity_level: input.activity.activity_level,
    dietary_pattern: input.preferences.dietary_pattern ?? null,
    avoided_ingredients: input.preferences.avoided_ingredients ?? [],
    meals_per_day: input.preferences.meals_per_day,
    meal_times: input.preferences.meal_times ?? [],
  });

  const goal = await storageService.createGoal(input.userId, {
    goal_type: input.goal.goal_type,
    target_weight_kg: input.goal.target_weight_kg ?? null,
    training_days_per_week: input.goal.training_days_per_week ?? null,
    pace: input.goal.pace ?? null,
    reason: input.goal.reason ?? null,
    starts_on: targetDate,
    ends_on: null,
  });

  const dailyTarget = await storageService.createDailyTarget(input.userId, {
    target_date: targetDate,
    goal_id: goal.id,
    calories_kcal,
    protein_g,
    carbs_g,
    fat_g,
    fiber_g,
    micronutrients: {},
    calculation_version: CALCULATION_VERSION,
  });

  return {
    user,
    profile,
    goal,
    dailyTarget,
    calculation: {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      calories_kcal,
      protein_g,
      fat_g,
      carbs_g,
      fiber_g,
    },
  };
}
