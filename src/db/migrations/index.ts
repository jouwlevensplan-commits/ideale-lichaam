import { sequelize } from '../models';

let trigramEnabled = false;

/** True zodra `pg_trgm` succesvol geactiveerd is; zie `runMigrations()`. */
export function isTrigramSearchEnabled(): boolean {
  return trigramEnabled;
}

/**
 * `sequelize.sync()` (db/models/index.ts) maakt bewust alleen ontbrekende tabellen aan — het
 * wijzigt nooit een tabel die al bestaat, om nooit destructief te zijn bij het opstarten. Voor
 * `meal_catalog`, dat al vóór deze uitbreiding in productie stond, moeten de nieuwe
 * `name_fr`/`popularity`-kolommen daarom hier expliciet worden toegevoegd. Alles hieronder is
 * idempotent (`IF NOT EXISTS`), dus veilig om bij elke serverstart opnieuw uit te voeren.
 *
 * Activeert daarna ook de `pg_trgm`-extensie voor tolerante ("fuzzy") tekstzoekopdrachten
 * (product.service.ts). Northflank-managed Postgres staat dit doorgaans toe, maar niet elke
 * databaseomgeving heeft daarvoor de rechten — bij een fout loggen we een waarschuwing en blijft
 * het zoeken werken met gewone `ILIKE`-matching, alleen zonder typo-tolerantie.
 */
export async function runMigrations(): Promise<void> {
  await sequelize.query('ALTER TABLE meal_catalog ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255)');
  await sequelize.query('ALTER TABLE meal_catalog ADD COLUMN IF NOT EXISTS popularity INTEGER NOT NULL DEFAULT 0');

  try {
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS meal_catalog_name_trgm_idx ON meal_catalog USING gin (name gin_trgm_ops)'
    );
    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS meal_catalog_name_fr_trgm_idx ON meal_catalog USING gin (name_fr gin_trgm_ops)'
    );
    trigramEnabled = true;
  } catch (error) {
    trigramEnabled = false;
    console.warn(
      'Kon de pg_trgm-extensie niet activeren (mogelijk ontbrekende databaserechten); productzoeken valt terug op ILIKE zonder fuzzy-matching.',
      error
    );
  }
}
