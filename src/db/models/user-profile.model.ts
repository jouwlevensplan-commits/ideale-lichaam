import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';

import { sequelize } from '../client';
import type { JsonValue } from '../../types/database.types';

/**
 * Sequelize-model voor `user_profiles` (databaseplan §3.2). Versieerbaar: elke wijziging maakt een
 * nieuwe rij aan (`valid_from`/`valid_to`) zodat historische berekeningen niet stilzwijgend
 * veranderen. Er is bewust geen `created_at`/`updated_at` — `valid_from`/`valid_to` vervullen die rol.
 */
export class UserProfile extends Model<InferAttributes<UserProfile>, InferCreationAttributes<UserProfile>> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare valid_from: CreationOptional<Date>;
  declare valid_to: Date | null;
  declare sex: string | null;
  declare birth_date: string | null;
  declare height_cm: number | null;
  declare weight_kg: number | null;
  declare activity_level: string | null;
  declare dietary_pattern: string | null;
  declare avoided_ingredients: CreationOptional<JsonValue>;
  declare meals_per_day: number | null;
  declare meal_times: CreationOptional<JsonValue>;
}

UserProfile.init(
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
    valid_from: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    valid_to: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    sex: { type: DataTypes.STRING, allowNull: true },
    birth_date: { type: DataTypes.DATEONLY, allowNull: true },
    height_cm: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    weight_kg: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    activity_level: { type: DataTypes.STRING, allowNull: true },
    dietary_pattern: { type: DataTypes.STRING, allowNull: true },
    avoided_ingredients: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    meals_per_day: { type: DataTypes.SMALLINT, allowNull: true },
    meal_times: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    sequelize,
    modelName: 'UserProfile',
    tableName: 'user_profiles',
    underscored: true,
    timestamps: false,
    indexes: [{ fields: ['user_id'] }],
  }
);
