import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';

import { sequelize } from '../client';
import type { UserStatus } from '../../types/database.types';

/**
 * Sequelize-model voor `users` (databaseplan §3.1). Authenticatiegegevens blijven bij de gekozen
 * identity provider; hier staat alleen de providerreferentie. `health_data_consent` is verplicht
 * vóór enige gezondheidsgegevens (profiel, doelen, maaltijdlogs) mogen worden geschreven of
 * gelezen — zie de GDPR-gate in de controllers die dit model gebruiken.
 */
export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare auth_provider: string;
  declare auth_subject: string;
  declare status: CreationOptional<UserStatus>;
  declare timezone: string;
  declare health_data_consent: CreationOptional<boolean>;
  declare health_data_opted_in_at: Date | null;
  declare consent_policy_version: string | null;
  declare is_premium: CreationOptional<boolean>;
  declare analytics_consent: CreationOptional<boolean>;
  declare personalized_ads_consent: CreationOptional<boolean>;
  declare ad_consent_opted_in_at: Date | null;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    auth_provider: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    auth_subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'pending_deletion', 'deleted'),
      allowNull: false,
      defaultValue: 'active',
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    health_data_consent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    health_data_opted_in_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    consent_policy_version: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_premium: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    analytics_consent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    personalized_ads_consent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ad_consent_opted_in_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ unique: true, fields: ['auth_provider', 'auth_subject'] }],
  }
);
