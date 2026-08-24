import { DataTypes } from 'sequelize';

import { sequelize } from '../models';

/**
 * `sequelize.sync()` (db/models/index.ts) maakt bewust alleen ontbrekende tabellen aan — het
 * wijzigt nooit een tabel die al bestaat, om nooit destructief te zijn bij het opstarten. Voor
 * `meal_catalog`, dat al vóór deze uitbreiding in productie stond, moeten de nieuwe
 * `name_fr`/`popularity`-kolommen daarom hier expliciet worden toegevoegd.
 *
 * `describeTable` controleert eerst welke kolommen er al staan; `addColumn` draait alleen voor wat
 * echt ontbreekt. Dat maakt dit zowel idempotent als lichtgewicht: op een al-gemigreerde database
 * (inclusief een verse installatie, waar `sync()` de kolommen al meteen aanmaakte) doet deze functie
 * helemaal niets, in plaats van bij elke opstart opnieuw twee `ALTER TABLE`-commando's te proberen.
 *
 * BEWUST GEEN databaseextensies (zoals `pg_trgm`): op managed Postgres (bv. Northflank) heeft de
 * applicatiegebruiker geen SUPERUSER-rechten. Fuzzy matching gebeurt daarom volledig in de
 * applicatielaag — zie `services/product.service.ts` en `services/string-similarity.ts`.
 */
export async function runMigrations(): Promise<void> {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const columns = await queryInterface.describeTable('meal_catalog');

    if (!columns.name_fr) {
      await queryInterface.addColumn('meal_catalog', 'name_fr', { type: DataTypes.STRING, allowNull: true });
    }
    if (!columns.popularity) {
      await queryInterface.addColumn('meal_catalog', 'popularity', {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }
  } catch (error) {
    // Nooit de opstart blokkeren op een schemawijziging die niet essentieel is om te kunnen
    // draaien: zonder deze kolommen werkt de rest van de server nog steeds, alleen de
    // tweetalige/populariteitsfuncties in de zoekopdracht niet.
    console.warn('Kon meal_catalog niet uitbreiden met name_fr/popularity.', error);
  }
}
