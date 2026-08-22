export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type UserStatus = 'active' | 'pending_deletion' | 'deleted';
export type GoalType =
  | 'lose_weight'
  | 'gain_weight'
  | 'build_muscle'
  | 'maintain'
  | 'healthy_living';
export type GoalStatus = 'active' | 'completed' | 'cancelled';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealSource = 'photo' | 'voice' | 'manual' | 'suggestion';
export type MealLogStatus = 'logged' | 'edited' | 'deleted';
export type WeeklyGoalStatus = 'active' | 'completed' | 'cancelled';
export type RecognitionMode = 'vision' | 'speech';
export type RecognitionRunStatus = 'started' | 'succeeded' | 'failed' | 'needs_review';
export type WeeklyReportStatus = 'generated' | 'failed';

export interface User {
  id: string;
  auth_provider: string;
  auth_subject: string;
  status: UserStatus;
  timezone: string;
  health_data_consent: boolean;
  health_data_opted_in_at: string | null;
  consent_policy_version: string | null;
  /** Freemium: geeft aan of de gebruiker een actief betaald abonnement heeft. */
  is_premium: boolean;
  /** Aparte, niet-verplichte toestemming voor gebruiksanalyse (los van health_data_consent). */
  analytics_consent: boolean;
  /** Aparte, niet-verplichte toestemming voor gepersonaliseerde advertenties (GBA-conform: geen bundeling met andere toestemmingen). */
  personalized_ads_consent: boolean;
  ad_consent_opted_in_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  valid_from: string;
  valid_to: string | null;
  sex: string | null;
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: string | null;
  dietary_pattern: string | null;
  avoided_ingredients: JsonValue;
  meals_per_day: number | null;
  meal_times: JsonValue;
}

export interface Goal {
  id: string;
  user_id: string;
  goal_type: GoalType;
  target_weight_kg: number | null;
  training_days_per_week: number | null;
  pace: string | null;
  reason: string | null;
  starts_on: string | null;
  ends_on: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export interface DailyTarget {
  id: string;
  user_id: string;
  target_date: string;
  goal_id: string | null;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  micronutrients: JsonValue;
  calculation_version: string;
  created_at: string;
}

export interface WeeklyGoal {
  id: string;
  user_id: string;
  goal_id: string | null;
  week_start: string;
  week_end: string;
  calories_kcal: number;
  protein_g: number;
  fiber_g: number;
  vitamins: JsonValue;
  calculation_version: string;
  status: WeeklyGoalStatus;
  created_at: string;
  updated_at: string;
}

export interface MealLog {
  id: string;
  user_id: string;
  recognition_run_id: string | null;
  media_asset_id: string | null;
  consumed_at: string;
  local_date: string;
  meal_type: MealType | null;
  source: MealSource;
  status: MealLogStatus;
  confidence: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RecognitionRun {
  id: string;
  user_id: string;
  media_asset_id: string | null;
  mode: RecognitionMode;
  provider: string;
  model: string;
  status: RecognitionRunStatus;
  result_json: JsonValue | null;
  error_code: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  report_text: string;
  model_version: string;
  status: WeeklyReportStatus;
  created_at: string;
}

export interface Streak {
  id: string;
  user_id: string;
  current_length: number;
  longest_length: number;
  current_fiber_streak_length: number;
  longest_fiber_streak_length: number;
  last_evaluated_date: string | null;
  updated_at: string;
}

export interface Badge {
  id: string;
  user_id: string;
  badge_key: string;
  earned_at: string;
  metadata: JsonValue;
}

export interface MealCatalogItem {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  is_belgian_market: boolean;
  created_at: string;
}

export interface MealItem {
  id: string;
  meal_log_id: string;
  name: string;
  amount_g: number;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  micronutrients: JsonValue;
  nutrition_source: string | null;
  source_reference: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
