import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';

import { sequelize } from '../client';
import type { MealLogStatus, MealSource, MealType } from '../../types/database.types';

/**
 * Sequelize-model voor `meal_logs` (databaseplan §3.6). `recognition_run_id` en `media_asset_id`
 * zijn bewust losse UUID-kolommen zonder foreign-key-associatie: `recognition_runs` en
 * `media_assets` maken (nog) geen deel uit van deze Postgres-migratie (zie database-plan.md §4) en
 * blijven voorlopig op de bestaande JSON-storage draaien.
 */
export class MealLog extends Model<InferAttributes<MealLog>, InferCreationAttributes<MealLog>> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare recognition_run_id: string | null;
  declare media_asset_id: string | null;
  declare consumed_at: Date;
  declare local_date: string;
  declare meal_type: MealType | null;
  declare source: MealSource;
  declare status: CreationOptional<MealLogStatus>;
  declare confidence: number | null;
  declare notes: string | null;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
  declare deleted_at: Date | null;
}

MealLog.init(
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
    recognition_run_id: { type: DataTypes.UUID, allowNull: true },
    media_asset_id: { type: DataTypes.UUID, allowNull: true },
    consumed_at: { type: DataTypes.DATE, allowNull: false },
    local_date: { type: DataTypes.DATEONLY, allowNull: false },
    meal_type: {
      type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snack'),
      allowNull: true,
    },
    source: {
      type: DataTypes.ENUM('photo', 'voice', 'manual', 'suggestion'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('logged', 'edited', 'deleted'),
      allowNull: false,
      defaultValue: 'logged',
    },
    confidence: { type: DataTypes.DECIMAL(4, 3), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'MealLog',
    tableName: 'meal_logs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['user_id', 'local_date', 'status'] }],
  }
);
