import { Sequelize } from 'sequelize';

/**
 * PostgreSQL-verbinding via `process.env.DATABASE_URL`, zoals Northflank die automatisch meegeeft
 * zodra de database aan deze service gekoppeld is. We bouwen de `Sequelize`-instantie altijd op
 * (ook zonder `DATABASE_URL`) omdat de constructor zelf geen verbinding opent — dat gebeurt pas
 * lazy bij de eerste query of expliciet via `connectDatabase()`. Zo blijft het importeren van dit
 * bestand (en dus van de modellen/routes die het gebruiken) veilig in contexten zonder database,
 * zoals de bestaande testsuite die alleen `GET /health` bevraagt.
 */
const DATABASE_URL = process.env.DATABASE_URL;

// Northflank-managed PostgreSQL vereist doorgaans SSL, maar met een certificaat dat niet altijd
// tegen een publieke CA te verifiëren is. Standaard schakelen we SSL in zodra er een echte
// DATABASE_URL is; zet `DATABASE_SSL=disable` voor een lokale/ongesigneerde Postgres-instantie.
const sslEnabled = Boolean(DATABASE_URL) && process.env.DATABASE_SSL !== 'disable';

export const sequelize = new Sequelize(DATABASE_URL ?? 'postgres://placeholder:placeholder@localhost:5432/placeholder', {
  dialect: 'postgres',
  logging: false,
  dialectOptions: sslEnabled
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
});

/** Legt de echte verbinding met de database, met een duidelijke foutmelding als `DATABASE_URL` ontbreekt. */
export async function connectDatabase(): Promise<void> {
  if (!DATABASE_URL) {
    throw new Error(
      'DATABASE_URL ontbreekt. Northflank geeft deze automatisch mee zodra de PostgreSQL-database aan deze service gekoppeld is; lokaal kun je hem zelf zetten in je omgeving.'
    );
  }
  await sequelize.authenticate();
}
