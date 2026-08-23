import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';

import { sequelize } from '../client';
import type { GoalStatus, GoalType } from '../../types/database.types';

/** Sequelize-model voor `goals` (databaseplan §3.3). Maximaal één `active` doel per gebruiker. */
export class Goal extends Model<InferAttributes<Goal>, InferCreationAttributes<Goal>> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare goal_type: GoalType;
  declare target_weight_kg: number | null;
  declare training_days_per_week: number | null;
  declare pace: string | null;
  declare reason: string | null;
  declare starts_on: string | null;
  declare ends_on: string | null;
  declare status: CreationOptional<GoalStatus>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

Goal.init(
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
    goal_type: {
      type: DataTypes.ENUM('lose_weight', 'gain_weight', 'build_muscle', 'maintain', 'healthy_living'),
      allowNull: false,
    },
    target_weight_kg: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    training_days_per_week: { type: DataTypes.SMALLINT, allowNull: true },
    pace: { type: DataTypes.STRING, allowNull: true },
    reason: { type: DataTypes.TEXT, allowNull: true },
    starts_on: { type: DataTypes.DATEONLY, allowNull: true },
    ends_on: { type: DataTypes.DATEONLY, allowNull: true },
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
    modelName: 'Goal',
    tableName: 'goals',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['user_id', 'status'] }],
  }
);
