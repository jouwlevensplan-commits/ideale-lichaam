import type { Request, Response } from 'express';

import { sequelize, User, UserProfile, Goal, DailyTarget, WeeklyGoal } from '../db/models';
import { BadRequestError, ConsentRequiredError } from '../db/errors';
import {
  calculateAgeInYears,
  calculateBmr,
  calculateTdee,
  calculateGoalAdjustedCalories,
  calculateMacros,
  type ActivityLevel,
  type Pace,
  type Sex,
} from '../services/onboarding.service';
import type { GoalType } from '../types/database.types';
import { mapDailyTarget, mapUser, mapWeeklyGoal } from './mappers';

const CALCULATION_VERSION = 'onboarding-v1';
const WEEK_LENGTH_DAYS = 7;

interface CompleteOnboardingRequestBody {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  dietaryPattern?: string | null;
  goalType: GoalType;
  targetWeightKg?: number;
  pace?: Pace;
  trainingDaysPerWeek?: number;
  timezone: string;
}

const SEX_VALUES: ReadonlyArray<Sex> = ['male', 'female', 'unspecified'];
const ACTIVITY_LEVEL_VALUES: ReadonlyArray<ActivityLevel> = ['sedentary', 'light', 'moderate', 'very', 'extreme'];
const GOAL_TYPE_VALUES: ReadonlyArray<GoalType> = [
  'lose_weight',
  'gain_weight',
  'build_muscle',
  'maintain',
  'healthy_living',
];
const PACE_VALUES: ReadonlyArray<Pace> = ['slow', 'moderate', 'ambitious'];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Zelfde verplichte-veldenlogica als `onboarding.service.ts`, maar op de rauwe (camelCase) request-body. */
function validateBody(body: Partial<CompleteOnboardingRequestBody>): CompleteOnboardingRequestBody {
  if (!isNonEmptyString(body.sex) || !SEX_VALUES.includes(body.sex as Sex)) {
    throw new BadRequestError(`sex is verplicht en moet één van ${SEX_VALUES.join(', ')} zijn.`);
  }
  if (!isNonEmptyString(body.birthDate)) {
    throw new BadRequestError('birthDate is verplicht (JJJJ-MM-DD).');
  }
  if (!isFiniteNumber(body.heightCm) || body.heightCm <= 0) {
    throw new BadRequestError('heightCm is verplicht en moet een positief getal zijn.');
  }
  if (!isFiniteNumber(body.weightKg) || body.weightKg <= 0) {
    throw new BadRequestError('weightKg is verplicht en moet een positief getal zijn.');
  }
  if (!isNonEmptyString(body.activityLevel) || !ACTIVITY_LEVEL_VALUES.includes(body.activityLevel as ActivityLevel)) {
    throw new BadRequestError(`activityLevel is verplicht en moet één van ${ACTIVITY_LEVEL_VALUES.join(', ')} zijn.`);
  }
  if (!isNonEmptyString(body.goalType) || !GOAL_TYPE_VALUES.includes(body.goalType as GoalType)) {
    throw new BadRequestError(`goalType is verplicht en moet één van ${GOAL_TYPE_VALUES.join(', ')} zijn.`);
  }
  if (!isNonEmptyString(body.timezone)) {
    throw new BadRequestError('timezone is verplicht.');
  }

  if (body.goalType === 'lose_weight' || body.goalType === 'gain_weight') {
    if (!isFiniteNumber(body.targetWeightKg)) {
      throw new BadRequestError(`targetWeightKg is verplicht bij goalType "${body.goalType}".`);
    }
    if (!isNonEmptyString(body.pace) || !PACE_VALUES.includes(body.pace as Pace)) {
      throw new BadRequestError(`pace is verplicht bij goalType "${body.goalType}".`);
    }
  }

  if (body.goalType === 'build_muscle' && !isFiniteNumber(body.trainingDaysPerWeek)) {
    throw new BadRequestError('trainingDaysPerWeek is verplicht bij goalType "build_muscle".');
  }

  return body as CompleteOnboardingRequestBody;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Maandag van de week waarin `dateStr` valt (UTC), zoals database-plan.md §3.5 voorschrijft. */
function mondayOf(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diffToMonday);
  return formatDateOnly(date);
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnly(date);
}

/**
 * Rondt de onboarding af (Fase 1 t/m 6). Rekenlogica (BMR/TDEE/macro's) hergebruikt de pure
 * functies uit `onboarding.service.ts`; persistentie gebeurt hier rechtstreeks tegen de nieuwe
 * Postgres-modellen, in één transactie voor profiel, doel, daily target en weekly goal.
 *
 * Belangrijk: dit endpoint ZET `health_data_consent` niet — het CONTROLEERT enkel dat die al
 * expliciet `true` is (gezet via `POST /api/consent/health`, vóór onboarding start). Consent moet
 * aan de verwerking voorafgaan, niet er een bijwerking van zijn.
 */
export async function completeOnboarding(req: Request, res: Response): Promise<void> {
  const body = validateBody((req.body ?? {}) as Partial<CompleteOnboardingRequestBody>);

  const userId = req.userId;
  if (!userId) {
    throw new BadRequestError('Ontbrekende gebruikerscontext.');
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new BadRequestError('Onbekende gebruiker.');
  }

  if (user.health_data_consent !== true) {
    throw new ConsentRequiredError(
      'health_data_consent staat niet op true. Geef eerst expliciet toestemming via POST /api/consent/health voordat de onboarding kan worden afgerond.'
    );
  }

  const referenceDate = new Date();
  const targetDate = formatDateOnly(referenceDate);
  const weekStart = mondayOf(targetDate);
  const weekEnd = addDays(weekStart, WEEK_LENGTH_DAYS);

  const age = calculateAgeInYears(body.birthDate, referenceDate);
  const bmr = calculateBmr(body.weightKg, body.heightCm, age, body.sex);
  const tdee = calculateTdee(bmr, body.activityLevel);
  const caloriesKcal = calculateGoalAdjustedCalories(tdee, body.goalType, body.pace ?? null);
  const { protein_g, fat_g, carbs_g, fiber_g } = calculateMacros(caloriesKcal, body.weightKg, body.goalType);

  const { dailyTarget, weeklyGoal } = await sequelize.transaction(async (transaction) => {
    user.timezone = body.timezone;
    await user.save({ transaction });

    const currentProfile = await UserProfile.findOne({
      where: { user_id: userId, valid_to: null },
      transaction,
    });
    if (currentProfile) {
      currentProfile.valid_to = new Date();
      await currentProfile.save({ transaction });
    }

    await UserProfile.create(
      {
        user_id: userId,
        sex: body.sex,
        birth_date: body.birthDate,
        height_cm: body.heightCm,
        weight_kg: body.weightKg,
        activity_level: body.activityLevel,
        dietary_pattern: body.dietaryPattern ?? null,
        avoided_ingredients: [],
        meals_per_day: null,
        meal_times: [],
      },
      { transaction }
    );

    // Maximaal één actief doel per gebruiker (databaseplan §3.3): bestaande actieve doelen annuleren.
    await Goal.update({ status: 'cancelled' }, { where: { user_id: userId, status: 'active' }, transaction });

    const goal = await Goal.create(
      {
        user_id: userId,
        goal_type: body.goalType,
        target_weight_kg: body.targetWeightKg ?? null,
        training_days_per_week: body.trainingDaysPerWeek ?? null,
        pace: body.pace ?? null,
        reason: null,
        starts_on: targetDate,
        ends_on: null,
      },
      { transaction }
    );

    let dailyTarget = await DailyTarget.findOne({ where: { user_id: userId, target_date: targetDate }, transaction });
    const dailyTargetFields = {
      goal_id: goal.id,
      calories_kcal: caloriesKcal,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      calculation_version: CALCULATION_VERSION,
    };
    if (dailyTarget) {
      await dailyTarget.update(dailyTargetFields, { transaction });
    } else {
      dailyTarget = await DailyTarget.create(
        { user_id: userId, target_date: targetDate, micronutrients: {}, ...dailyTargetFields },
        { transaction }
      );
    }

    let weeklyGoal = await WeeklyGoal.findOne({ where: { user_id: userId, week_start: weekStart }, transaction });
    const weeklyGoalFields = {
      goal_id: goal.id,
      week_end: weekEnd,
      calories_kcal: caloriesKcal * WEEK_LENGTH_DAYS,
      protein_g: protein_g * WEEK_LENGTH_DAYS,
      fiber_g: fiber_g * WEEK_LENGTH_DAYS,
      calculation_version: CALCULATION_VERSION,
    };
    if (weeklyGoal) {
      await weeklyGoal.update(weeklyGoalFields, { transaction });
    } else {
      weeklyGoal = await WeeklyGoal.create(
        { user_id: userId, week_start: weekStart, vitamins: {}, status: 'active', ...weeklyGoalFields },
        { transaction }
      );
    }

    return { dailyTarget, weeklyGoal };
  });

  res.status(200).json({
    user: mapUser(user),
    dailyTarget: mapDailyTarget(dailyTarget),
    weeklyGoal: mapWeeklyGoal(weeklyGoal),
  });
}
