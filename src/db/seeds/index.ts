import { seedDemoUser } from './demo-user.seed';
import { seedMealCatalog } from './meal-catalog.seed';

/**
 * Vult de database met vaste demo-/basisgegevens. Idempotent; draait bij elke serverstart, na
 * `syncDatabase()`/`runMigrations()`. Elke seed-stap staat op zichzelf en mag de opstart nooit
 * laten crashen — een mislukte seed betekent ontbrekende demo-/naslaggegevens, geen onbruikbare
 * server.
 */
export async function runSeeds(): Promise<void> {
  try {
    await seedDemoUser();
  } catch (error) {
    console.warn('Kon de demo-gebruiker "Sam" niet seeden.', error);
  }

  try {
    await seedMealCatalog();
  } catch (error) {
    console.warn('Kon de generieke meal_catalog-producten niet seeden.', error);
  }
}
