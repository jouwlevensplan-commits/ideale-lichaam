import type { Request, Response } from 'express';

import { sequelize, DailyTarget, Goal, MealLog, User, UserProfile, WeeklyGoal } from '../db/models';
import { BadRequestError } from '../db/errors';

/**
 * Verwijdert een gebruiker en al diens gezondheidsgegevens definitief uit PostgreSQL ("recht om
 * vergeten te worden", databaseplan §7 / belgische-database-strategie.md §4). Eén transactie zodat
 * dit nooit een gedeeltelijke verwijdering achterlaat. Verwijdert eerst de rijen die naar `users`
 * of `goals` verwijzen, dan pas de gebruiker zelf, ongeacht of de foreign keys zelf al een
 * ON DELETE CASCADE hebben — `meal_items` wordt wel via de bestaande CASCADE op `meal_log_id`
 * meegenomen zodra de bijbehorende `meal_logs`-rij verdwijnt.
 */
export async function deleteAccount(req: Request, res: Response): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    throw new BadRequestError('Ontbrekende gebruikerscontext.');
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new BadRequestError('Onbekende gebruiker.');
  }

  await sequelize.transaction(async (transaction) => {
    await MealLog.destroy({ where: { user_id: userId }, transaction });
    await DailyTarget.destroy({ where: { user_id: userId }, transaction });
    await WeeklyGoal.destroy({ where: { user_id: userId }, transaction });
    await Goal.destroy({ where: { user_id: userId }, transaction });
    await UserProfile.destroy({ where: { user_id: userId }, transaction });
    await User.destroy({ where: { id: userId }, transaction });
  });

  res.status(200).json({ deleted: true });
}
