import { MealCatalogItem } from '../models';

interface SeedProduct {
  /** Stabiele sleutel, opgeslagen als `barcode` zodat deze seed idempotent is (geen echte EAN-code). */
  seedKey: string;
  name: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

/**
 * Generieke Belgische/Nederlandse basisproducten (per 100g, rauw/onbereid tenzij vermeld), zodat
 * handmatig zoeken naar alledaagse voeding altijd meteen een bruikbaar resultaat geeft — ook zonder
 * barcode en zonder afhankelijk te zijn van of Open Food Facts voor deze exacte zoekterm een goede
 * (volledige) treffer heeft. Richtwaarden gebaseerd op standaard voedingswaardetabellen (NEVO/USDA).
 */
const GENERIC_PRODUCTS: SeedProduct[] = [
  { seedKey: 'bloemkool', name: 'Bloemkool', calories_kcal: 25, protein_g: 1.9, carbs_g: 5, fat_g: 0.3, fiber_g: 2 },
  { seedKey: 'broccoli', name: 'Broccoli', calories_kcal: 34, protein_g: 2.8, carbs_g: 7, fat_g: 0.4, fiber_g: 2.6 },
  { seedKey: 'witloof', name: 'Witloof', calories_kcal: 17, protein_g: 0.9, carbs_g: 3.8, fat_g: 0.1, fiber_g: 3.1 },
  {
    seedKey: 'kipfilet-rauw',
    name: 'Kipfilet rauw',
    calories_kcal: 165,
    protein_g: 31,
    carbs_g: 0,
    fat_g: 3.6,
    fiber_g: 0,
  },
  { seedKey: 'banaan', name: 'Banaan', calories_kcal: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3, fiber_g: 2.6 },
  { seedKey: 'ei', name: 'Ei', calories_kcal: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11, fiber_g: 0 },
  {
    seedKey: 'rijst-gekookt',
    name: 'Rijst (gekookt)',
    calories_kcal: 130,
    protein_g: 2.7,
    carbs_g: 28,
    fat_g: 0.3,
    fiber_g: 0.4,
  },
  {
    seedKey: 'volkorenbrood',
    name: 'Volkorenbrood',
    calories_kcal: 235,
    protein_g: 9,
    carbs_g: 41,
    fat_g: 2.5,
    fiber_g: 7,
  },
];

/**
 * Vult `meal_catalog` met de generieke producten hierboven, als ze er nog niet staan. Gebruikt
 * `findOrCreate` (niet upsert): dit zijn statische naslagwaarden, geen live gebruikersstatus zoals
 * bij de demo-gebruiker, dus een eventuele latere handmatige correctie in de database mag hier niet
 * bij elke herstart weer overschreven worden.
 */
export async function seedMealCatalog(): Promise<void> {
  for (const product of GENERIC_PRODUCTS) {
    const barcode = `seed:${product.seedKey}`;
    await MealCatalogItem.findOrCreate({
      where: { barcode },
      defaults: {
        barcode,
        name: product.name,
        brand: null,
        calories_kcal: product.calories_kcal,
        protein_g: product.protein_g,
        carbs_g: product.carbs_g,
        fat_g: product.fat_g,
        fiber_g: product.fiber_g,
        is_belgian_market: true,
      },
    });
  }
}
