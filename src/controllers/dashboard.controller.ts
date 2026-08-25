import type { Request, Response } from 'express';

import type { User } from '../db/models';
import { ConsentRequiredError, UnauthorizedError } from '../db/errors';
import { getCurrentStreak, getTodayDashboard } from '../services/dashboard.service';
import { mapDailyTarget, mapMealLog } from './mappers';

/** Zelfde GDPR-poort als loggen/onboarding (databaseplan §7): het dashboard toont enkel gezondheidsgegevens (voeding, doelen) die pas verwerkt mogen worden ná expliciete toestemming. */
function requireConsentedUser(req: Request): User {
  const user = req.user;
  if (!user) {
    throw new UnauthorizedError('Ontbrekende gebruikerscontext.');
  }
  if (user.health_data_consent !== true) {
    throw new ConsentRequiredError(
      'health_data_consent staat niet op true. Geef eerst expliciet toestemming via POST /api/consent/health.'
    );
  }
  return user;
}

export async function getToday(req: Request, res: Response): Promise<void> {
  const user = requireConsentedUser(req);
  const { dailyTarget, totals, mealLogs } = await getTodayDashboard(user.id);

  res.status(200).json({
    dailyTarget: dailyTarget ? mapDailyTarget(dailyTarget) : null,
    totals: {
      caloriesKcal: totals.calories_kcal,
      proteinG: totals.protein_g,
      carbsG: totals.carbs_g,
      fatG: totals.fat_g,
      fiberG: totals.fiber_g,
    },
    mealLogs: mealLogs.map(({ log, items }) => mapMealLog(log, items)),
  });
}

export async function getStreak(req: Request, res: Response): Promise<void> {
  const user = requireConsentedUser(req);
  const currentLength = await getCurrentStreak(user.id);
  res.status(200).json({ currentLength });
}
