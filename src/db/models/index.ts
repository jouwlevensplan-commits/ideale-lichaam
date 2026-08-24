import { sequelize } from '../client';
import { User } from './user.model';
import { UserProfile } from './user-profile.model';
import { Goal } from './goal.model';
import { DailyTarget } from './daily-target.model';
import { WeeklyGoal } from './weekly-goal.model';
import { MealLog } from './meal-log.model';
import { MealItem } from './meal-item.model';
import { MealCatalogItem } from './meal-catalog-item.model';

// --- Associaties (databaseplan §5) ---

User.hasMany(UserProfile, { foreignKey: 'user_id' });
UserProfile.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Goal, { foreignKey: 'user_id' });
Goal.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(DailyTarget, { foreignKey: 'user_id' });
DailyTarget.belongsTo(User, { foreignKey: 'user_id' });
Goal.hasMany(DailyTarget, { foreignKey: 'goal_id' });
DailyTarget.belongsTo(Goal, { foreignKey: 'goal_id' });

User.hasMany(WeeklyGoal, { foreignKey: 'user_id' });
WeeklyGoal.belongsTo(User, { foreignKey: 'user_id' });
Goal.hasMany(WeeklyGoal, { foreignKey: 'goal_id' });
WeeklyGoal.belongsTo(Goal, { foreignKey: 'goal_id' });

User.hasMany(MealLog, { foreignKey: 'user_id' });
MealLog.belongsTo(User, { foreignKey: 'user_id' });

MealLog.hasMany(MealItem, { foreignKey: 'meal_log_id', onDelete: 'CASCADE' });
MealItem.belongsTo(MealLog, { foreignKey: 'meal_log_id' });

// MealCatalogItem heeft bewust geen associaties: het is geen gebruikersgebonden entiteit (zie het
// model zelf voor de toelichting waarom dit in Postgres staat i.p.v. het lokale storage.json).

export { sequelize, User, UserProfile, Goal, DailyTarget, WeeklyGoal, MealLog, MealItem, MealCatalogItem };

/**
 * Maakt de MVP-kerntabellen aan als ze nog niet bestaan (of past ontbrekende kolommen/indexen toe).
 * `alter: false` (impliciet) zodat dit nooit destructief is bij het opstarten van de server —
 * echte schemawijzigingen horen in een aparte migratie, niet in een automatische sync.
 */
export async function syncDatabase(): Promise<void> {
  await sequelize.sync();
}
