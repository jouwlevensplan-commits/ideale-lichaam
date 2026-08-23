import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';

import { sequelize } from '../client';
import type { JsonValue } from '../../types/database.types';

/**
 * Sequelize-model voor `daily_targets` (databaseplan §3.4). Een snapshot van het dagdoel op het
 * moment van berekenen — bewust niet live herberekend uit het profiel, zodat historische
 * dashboards niet met terugwerkende kracht veranderen. Uniek per (`user_id`, `target_date`).
 */
export class DailyTarget extends Model<InferAttributes<DailyTarget>, InferCreationAttributes<DailyTarget>> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare target_date: string;
  declare goal_id: string | null;
  declare calories_kcal: number;
  declare protein_g: number;
  declare carbs_g: number;
  declare fat_g: number;
  declare fiber_g: number;
  declare micronutrients: CreationOptional<JsonValue>;
  declare calculation_version: string;
  declare readonly created_at: CreationOptional<Date>;
}

DailyTarget.init(
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
    target_date: { type: DataTypes.DATEONLY, allowNull: false },
    goal_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'goals', key: 'id' },
    },
    calories_kcal: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
    protein_g: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
    carbs_g: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
    fat_g: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
    fiber_g: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
    micronutrients: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    calculation_version: { type: DataTypes.STRING, allowNull: false },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'DailyTarget',
    tableName: 'daily_targets',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [{ unique: true, fields: ['user_id', 'target_date'] }],
  }
);
