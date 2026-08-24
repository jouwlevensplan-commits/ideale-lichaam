import { seedDemoUser } from './demo-user.seed';
import { seedMealCatalog } from './meal-catalog.seed';

/** Vult de database met vaste demo-/basisgegevens. Idempotent; draait bij elke serverstart, na `syncDatabase()`. */
export async function runSeeds(): Promise<void> {
  await seedDemoUser();
  await seedMealCatalog();
}
