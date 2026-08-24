import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';

import { sequelize } from '../client';

/**
 * Sequelize-model voor `meal_catalog`: een Postgres-cache van productopzoekingen (op naam of
 * barcode), gevuld vanuit de Open Food Facts API (zie `services/open-food-facts.service.ts` en
 * `services/product.service.ts`). Niet gebruikersgebonden en dus niet GDPR-gated — dit bevat enkel
 * publieke productinformatie, geen persoonsgegevens.
 *
 * Bewust in Postgres in plaats van het lokale `storage.json`-bestand: in de Docker-productie-image
 * draait de server als niet-root `node`-gebruiker zonder schrijfrechten op `/app`, waardoor elke
 * poging om `storage.json` aan te maken met een 500 crasht (zie de git-geschiedenis voor de fix).
 */
export class MealCatalogItem extends Model<InferAttributes<MealCatalogItem>, InferCreationAttributes<MealCatalogItem>> {
  declare id: CreationOptional<string>;
  declare barcode: string | null;
  /** Primaire (Nederlandstalige) naam. */
  declare name: string;
  /** Franstalige naam, indien bekend. Zelfde rij als `name` — één canoniek record per voedingsmiddel. */
  declare name_fr: string | null;
  declare brand: string | null;
  declare calories_kcal: number;
  declare protein_g: number;
  declare carbs_g: number;
  declare fat_g: number;
  declare fiber_g: number;
  declare is_belgian_market: CreationOptional<boolean>;
  /** Ruwe teller (mock voor nu, zie db/seeds/meal-catalog.seed.ts) gebruikt om zoekresultaten te ranken. */
  declare popularity: CreationOptional<number>;
  declare readonly created_at: CreationOptional<Date>;
}

MealCatalogItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    name_fr: { type: DataTypes.STRING, allowNull: true },
    brand: { type: DataTypes.STRING, allowNull: true },
    calories_kcal: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
    protein_g: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
    carbs_g: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
    fat_g: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
    fiber_g: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
    is_belgian_market: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    popularity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'MealCatalogItem',
    tableName: 'meal_catalog',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    // Gewone B-tree-indexen, geen extensies (zie db/migrations/index.ts): voldoende voor ILIKE op
    // een kleine/middelgrote catalogus, en vereist geen databaserechten die we niet hebben.
    indexes: [{ fields: ['name'] }, { fields: ['name_fr'] }, { fields: ['brand'] }],
  }
);
