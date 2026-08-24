import { sequelize } from '../models';

/**
 * `sequelize.sync()` (db/models/index.ts) maakt bewust alleen ontbrekende tabellen aan — het
 * wijzigt nooit een tabel die al bestaat, om nooit destructief te zijn bij het opstarten. Voor
 * `meal_catalog`, dat al vóór deze uitbreiding in productie stond, moeten de nieuwe
 * `name_fr`/`popularity`-kolommen daarom hier expliciet worden toegevoegd. Idempotent
 * (`IF NOT EXISTS`), dus veilig om bij elke serverstart opnieuw uit te voeren.
 *
 * BEWUST GEEN databaseextensies (zoals `pg_trgm`): op managed Postgres (bv. Northflank) heeft de
 * applicatiegebruiker geen SUPERUSER-rechten, dus `CREATE EXTENSION` faalt daar altijd. Een eerdere
 * poging daartoe veroorzaakte een crashende opstart en productie-uitval (zie git-geschiedenis).
 * Fuzzy matching gebeurt daarom volledig in de applicatielaag, niet in de database — zie
 * `services/product.service.ts` en `services/string-similarity.ts`.
 */
export async function runMigrations(): Promise<void> {
  try {
    await sequelize.query('ALTER TABLE meal_catalog ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255)');
    await sequelize.query('ALTER TABLE meal_catalog ADD COLUMN IF NOT EXISTS popularity INTEGER NOT NULL DEFAULT 0');
  } catch (error) {
    // Nooit de opstart blokkeren op een schemawijziging die niet essentieel is om te kunnen
    // draaien: zonder deze kolommen werkt de rest van de server nog steeds, alleen de
    // tweetalige/populariteitsfuncties in de zoekopdracht niet.
    console.warn('Kon meal_catalog niet uitbreiden met name_fr/popularity.', error);
  }
}
