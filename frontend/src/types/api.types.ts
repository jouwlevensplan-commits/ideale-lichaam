import type { ActivityLevel, DietaryPattern, GoalType, MealType, Pace, Sex } from '@/types/domain.types';

// --- Gebruiker & sessie -----------------------------------------------------

export interface UserAccount {
  id: string;
  isPremium: boolean;
  healthDataConsent: boolean;
  analyticsConsent: boolean;
  personalizedAdsConsent: boolean;
  timezone: string;
}

// --- 1. Onboarding voltooien: POST /api/onboarding/complete -----------------

export interface CompleteOnboardingPayload {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  dietaryPattern: DietaryPattern;
  goalType: GoalType;
  /** Verplicht bij `lose_weight`/`gain_weight`. */
  targetWeightKg?: number;
  /** Verplicht bij `lose_weight`/`gain_weight`. */
  pace?: Pace;
  /** Verplicht bij `build_muscle`. */
  trainingDaysPerWeek?: number;
  timezone: string;
}

export interface DailyTarget {
  targetDate: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export interface WeeklyGoal {
  weekStart: string;
  weekEnd: string;
  caloriesKcal: number;
  proteinG: number;
  fiberG: number;
}

export interface CompleteOnboardingResponse {
  user: UserAccount;
  dailyTarget: DailyTarget;
  weeklyGoal: WeeklyGoal;
}

// --- 2. Producten zoeken: GET /api/products/search ---------------------------

export interface ProductSearchResult {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

// --- 3. Maaltijd handmatig loggen: POST /api/meals/log ------------------------

export interface LogMealItemInput {
  name: string;
  amountG: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export interface LogMealPayload {
  localDate: string;
  mealType: MealType;
  items: LogMealItemInput[];
}

export interface MealItem extends LogMealItemInput {
  id: string;
}

export interface MealLog {
  id: string;
  localDate: string;
  mealType: MealType | null;
  source: 'photo' | 'voice' | 'manual' | 'suggestion';
  confidence: number | null;
  items: MealItem[];
}

// --- 4 & 5. AI-herkenning (Premium): POST /api/ai/recognition/photo|voice -----

export interface RecognizePhotoPayload {
  imageBase64: string;
  mimeType: string;
  mealType?: MealType;
}

export interface RecognizeVoicePayload {
  speechText: string;
}

export interface RecognitionResponse {
  mealLog: MealLog;
  items: MealItem[];
}

// --- 6. Wekelijkse coach & streaks --------------------------------------------

export interface WeeklyReportAggregation {
  daysLogged: number;
  totals: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number; fiberG: number };
  caloriesPct: number | null;
  proteinPct: number | null;
  fiberPct: number | null;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  reportText: string;
  aggregation: WeeklyReportAggregation;
}

export interface Streak {
  currentLength: number;
  longestLength: number;
  currentFiberStreakLength: number;
  longestFiberStreakLength: number;
}

export interface Badge {
  badgeKey: string;
  earnedAt: string;
}

export interface UpdateStreaksResponse {
  streak: Streak;
  badgesAwarded: Badge[];
}

// --- Consent (nog niet als apart endpoint gedocumenteerd in het API-contract) -

export interface SetAdConsentPayload {
  analyticsConsent: boolean;
  personalizedAdsConsent: boolean;
}
