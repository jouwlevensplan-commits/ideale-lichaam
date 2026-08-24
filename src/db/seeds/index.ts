import { seedDemoUser } from './demo-user.seed';

/**
 * Vult de database met vaste demo-/basisgegevens. Idempotent; draait bij elke serverstart, na
 * `syncDatabase()`. De generieke voedingscatalogus (bloemkool, appel, kipfilet, ...) wordt sinds
 * de tweetalige (NL/FR) uitbreiding niet meer hier geseed maar staat statisch in
 * `data/generic-foods.ts` (zie product.service.ts) — geen extra databaseschrijfacties bij het
 * opstarten, na drie eerdere productie-uitvallen op de 0,1 vCPU / 256MB Northflank-container
 * (git-geschiedenis) door precies dat soort boot-time seeding.
 */
export async function runSeeds(): Promise<void> {
  await seedDemoUser();
}
