import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';

import { sequelize } from '../client';
import type { JsonValue, WeeklyGoalStatus } from '../../types/database.types';

/**
 * Sequelize-model voor `weekly_goals` (databaseplan §3.5). Snapshot van de weekdoelen, zodat een
 * latere profielwijziging eerdere weekrapportages niet beïnvloedt. Uniek per (`user_id`, `week_start`).
 */
export class WeeklyGoal extends Model<InferAttributes<WeeklyGoal>, InferCreationAttributes<WeeklyGoal>> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare goal_id: string | null;
  declare week_start: string;
  declare week_end: string;
  declare calories_kcal: number;
  declare protein_g: number;
  declare fiber_g: number;
  declare vitamins: CreationOptional<JsonValue>;
  declare calculation_version: string;
  declare status: CreationOptional<WeeklyGoalStatus>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

WeeklyGoal.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    goal_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'goals', key: 'id' },
    },
    week_start: { type: DataTypes.DATEONLY, allowNull: false },
    week_end: { type: DataTypes.DATEONLY, allowNull: false },
    calories_kcal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    protein_g: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    fiber_g: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    vitamins: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    calculation_version: { type: DataTypes.STRING, allowNull: false },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'active',
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'WeeklyGoal',
    tableName: 'weekly_goals',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ unique: true, fields: ['user_id', 'week_start'] }],
  }
);
