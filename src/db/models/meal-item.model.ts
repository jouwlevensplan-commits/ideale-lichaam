import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';

import { sequelize } from '../client';
import type { JsonValue } from '../../types/database.types';

/**
 * Sequelize-model voor `meal_items` (databaseplan §3.7). De som van de items is de bron voor
 * maaltijd- en dagtotalen; eventuele denormaliseerde totalen op `meal_logs` zouden uitsluitend een
 * cache mogen zijn.
 */
export class MealItem extends Model<InferAttributes<MealItem>, InferCreationAttributes<MealItem>> {
  declare id: CreationOptional<string>;
  declare meal_log_id: string;
  declare name: string;
  declare amount_g: number;
  declare calories_kcal: number;
  declare protein_g: number;
  declare carbs_g: number;
  declare fat_g: number;
  declare fiber_g: number;
  declare micronutrients: CreationOptional<JsonValue>;
  declare nutrition_source: string | null;
  declare source_reference: string | null;
  declare sort_order: CreationOptional<number>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

MealItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    meal_log_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'meal_logs', key: 'id' },
    },
    name: { type: DataTypes.STRING, allowNull: false },
    amount_g: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
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
    nutrition_source: { type: DataTypes.STRING, allowNull: true },
    source_reference: { type: DataTypes.STRING, allowNull: true },
    sort_order: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'MealItem',
    tableName: 'meal_items',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['meal_log_id'] }],
  }
);
