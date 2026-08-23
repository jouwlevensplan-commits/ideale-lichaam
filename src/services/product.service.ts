import * as storageService from './storage.service';
import type { MealCatalogItem } from '../types/database.types';

export class ProductNotFoundError extends Error {
  constructor(query: string) {
    super(`Geen product gevonden voor "${query}", ook niet via Open Food Facts.`);
    this.name = 'ProductNotFoundError';
  }
}

interface MockOpenFoodFactsProduct {
  barcode: string;
  name: string;
  brand: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

// Mock van typische Belgische supermarktproducten. Vervangt tijdelijk een echte Open Food
// Facts-aanroep zodat lokale ontwikkeling en tests geen netwerktoegang nodig hebben.
const MOCK_OPEN_FOOD_FACTS_BE: MockOpenFoodFactsProduct[] = [
  {
    barcode: '5410013106017',
    name: 'Prince-koeken Chocolade',
    brand: 'LU',
    calories_kcal: 469,
    protein_g: 6.4,
    carbs_g: 65,
    fat_g: 20,
    fiber_g: 2.8,
  },
  {
    barcode: '5410297006002',
    name: 'Magere Yoghurt Natuur',
    brand: 'Campina',
    calories_kcal: 42,
    protein_g: 4.2,
    carbs_g: 5.5,
    fat_g: 0.2,
    fiber_g: 0,
  },
  {
    barcode: '5400141425335',
    name: 'Volkorenbrood',
    brand: 'Colruyt',
    calories_kcal: 235,
    protein_g: 9,
    carbs_g: 41,
    fat_g: 2.5,
    fiber_g: 7,
  },
  {
    barcode: '5410013121188',
    name: 'Croustillant Ham Kaas',
    brand: 'LU',
    calories_kcal: 280,
    protein_g: 10,
    carbs_g: 28,
    fat_g: 14,
    fiber_g: 2,
  },
];

function matchesQuery(query: string, candidate: { barcode: string; name: string; brand: string }): boolean {
  const trimmed = query.trim();
  const normalizedQuery = trimmed.toLowerCase();
  const normalizedName = candidate.name.toLowerCase();
  const normalizedBrand = candidate.brand.toLowerCase();
  const combined = `${normalizedBrand} ${normalizedName}`.trim();

  return (
    candidate.barcode === trimmed ||
    normalizedName.includes(normalizedQuery) ||
    normalizedBrand.includes(normalizedQuery) ||
    combined.includes(normalizedQuery)
  );
}

/** Simuleert een Open Food Facts-lookup; vervang door een echte HTTP-aanroep zodra die integratie er is. */
async function fetchFromMockOpenFoodFacts(queryOrBarcode: string): Promise<MockOpenFoodFactsProduct | null> {
  return MOCK_OPEN_FOOD_FACTS_BE.find((product) => matchesQuery(queryOrBarcode, product)) ?? null;
}

/**
 * Zoekt een product op naam of barcode. Zoekt eerst in de lokale meal_catalog-cache via de
 * StorageService; bij een cache-miss volgt een (gemockte) Open Food Facts-lookup waarvan het
 * resultaat automatisch in de cache wordt opgeslagen voor volgende zoekopdrachten.
 *
 * Handmatig zoeken is een kernfunctie van de gratis laag: er wordt bewust geen premium-abonnement
 * of GDPR-consent voor vereist (de catalogus bevat geen persoonsgegevens van de gebruiker). `userId`
 * is optioneel: alleen wanneer hij is meegegeven, valideren we dat de gebruiker bestaat (bv. voor
 * callers die dat toch als extra check willen); zonder `userId` is de catalogus ook doorzoekbaar.
 */
export async function searchProduct(queryOrBarcode: string, userId?: string): Promise<MealCatalogItem> {
  if (userId) {
    await storageService.getUserById(userId);
  }

  const localMatches = await storageService.searchMealCatalog(queryOrBarcode);
  if (localMatches.length > 0) {
    return localMatches[0];
  }

  const externalProduct = await fetchFromMockOpenFoodFacts(queryOrBarcode);
  if (!externalProduct) {
    throw new ProductNotFoundError(queryOrBarcode);
  }

  return storageService.createMealCatalogItem({
    barcode: externalProduct.barcode,
    name: externalProduct.name,
    brand: externalProduct.brand,
    calories_kcal: externalProduct.calories_kcal,
    protein_g: externalProduct.protein_g,
    carbs_g: externalProduct.carbs_g,
    fat_g: externalProduct.fat_g,
    fiber_g: externalProduct.fiber_g,
    is_belgian_market: true,
  });
}
