import type { Request, Response } from 'express';

import { sequelize, MealItem, MealLog } from '../db/models';
import { BadRequestError, ConsentRequiredError, UnauthorizedError } from '../db/errors';
import type { MealType } from '../types/database.types';
import { mapMealLog } from './mappers';

interface LogMealItemBody {
  name: string;
  amountG: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

interface LogMealRequestBody {
  localDate: string;
  mealType: MealType | null;
  items: LogMealItemBody[];
}

const VALID_MEAL_TYPES: ReadonlyArray<MealType> = ['breakfast', 'lunch', 'dinner', 'snack'];
const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ITEM_NUMBER_FIELDS = ['amountG', 'caloriesKcal', 'proteinG', 'carbsG', 'fatG', 'fiberG'] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateItem(item: unknown, index: number): LogMealItemBody {
  if (typeof item !== 'object' || item === null) {
    throw new BadRequestError(`items[${index}] ontbreekt of is ongeldig.`);
  }
  const candidate = item as Partial<Record<keyof LogMealItemBody, unknown>>;

  if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) {
    throw new BadRequestError(`items[${index}].name is verplicht.`);
  }
  for (const field of ITEM_NUMBER_FIELDS) {
    if (!isFiniteNumber(candidate[field])) {
      throw new BadRequestError(`items[${index}].${field} moet een getal zijn.`);
    }
  }

  return candidate as unknown as LogMealItemBody;
}

function validateBody(body: Partial<LogMealRequestBody>): LogMealRequestBody {
  if (typeof body.localDate !== 'string' || !LOCAL_DATE_PATTERN.test(body.localDate)) {
    throw new BadRequestError('localDate is verplicht in het formaat JJJJ-MM-DD.');
  }
  if (body.mealType !== null && body.mealType !== undefined && !VALID_MEAL_TYPES.includes(body.mealType)) {
    throw new BadRequestError(`mealType moet één van ${VALID_MEAL_TYPES.join(', ')} zijn, of leeg.`);
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new BadRequestError('items moet minstens één maaltijditem bevatten.');
  }

  return {
    localDate: body.localDate,
    mealType: body.mealType ?? null,
    items: body.items.map(validateItem),
  };
}

/**
 * Slaat een handmatig gelogde maaltijd (met losse items) op in `meal_logs`/`meal_items`
 * (databaseplan §3.6-3.7), in één transactie. Voedingsinvoer is een gezondheidsgegeven
 * (databaseplan.md §7), dus dezelfde strikte `health_data_consent`-poort als bij onboarding geldt
 * hier ook.
 */
export async function logMeal(req: Request, res: Response): Promise<void> {
  const body = validateBody((req.body ?? {}) as Partial<LogMealRequestBody>);

  const user = req.user;
  if (!user) {
    throw new UnauthorizedError('Ontbrekende gebruikerscontext.');
  }

  if (user.health_data_consent !== true) {
    throw new ConsentRequiredError('health_data_consent staat niet op true. Maaltijden loggen is pas mogelijk na expliciete toestemming.');
  }

  const { mealLog, items } = await sequelize.transaction(async (transaction) => {
    const mealLog = await MealLog.create(
      {
        user_id: user.id,
        recognition_run_id: null,
        media_asset_id: null,
        consumed_at: new Date(),
        local_date: body.localDate,
        meal_type: body.mealType,
        source: 'manual',
        confidence: null,
        notes: null,
      },
      { transaction }
    );

    const items = await MealItem.bulkCreate(
      body.items.map((item, index) => ({
        meal_log_id: mealLog.id,
        name: item.name,
        amount_g: item.amountG,
        calories_kcal: item.caloriesKcal,
        protein_g: item.proteinG,
        carbs_g: item.carbsG,
        fat_g: item.fatG,
        fiber_g: item.fiberG,
        micronutrients: {},
        nutrition_source: 'manual',
        source_reference: null,
        sort_order: index,
      })),
      { transaction }
    );

    return { mealLog, items };
  });

  res.status(201).json(mapMealLog(mealLog, items));
}
