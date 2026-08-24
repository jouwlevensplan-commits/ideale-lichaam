import { Op } from 'sequelize';

import { MealCatalogItem } from '../db/models';
import * as openFoodFacts from './open-food-facts.service';
import { GENERIC_FOODS, type GenericFood } from '../data/generic-foods';
import { stringSimilarity } from './string-similarity';

function toPlainNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

export interface ProductDto {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  is_belgian_market: boolean;
}

function toDto(row: MealCatalogItem): ProductDto {
  return {
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    calories_kcal: toPlainNumber(row.calories_kcal),
    protein_g: toPlainNumber(row.protein_g),
    carbs_g: toPlainNumber(row.carbs_g),
    fat_g: toPlainNumber(row.fat_g),
    fiber_g: toPlainNumber(row.fiber_g),
    is_belgian_market: row.is_belgian_market,
  };
}

function genericToDto(food: GenericFood): ProductDto {
  return {
    id: `generic:${food.seedKey}`,
    barcode: null,
    name: food.name,
    brand: null,
    calories_kcal: food.calories_kcal,
    protein_g: food.protein_g,
    carbs_g: food.carbs_g,
    fat_g: food.fat_g,
    fiber_g: food.fiber_g,
    is_belgian_market: true,
  };
}

const MAX_RESULTS = 10;

/**
 * Zoekt de statische, tweetalige generieke-voedingcatalogus (`data/generic-foods.ts`) volledig in
 * het geheugen — geen databasetoegang, dus geen enkele boot- of round-trip-kost. Rangschikt
 * treffers: exacte naam (NL of FR) eerst op populariteit, dan de rest op tekstgelijkenis
 * (Levenshtein-gebaseerd, zie `string-similarity.ts`), met populariteit/alfabetisch als tiebreak.
 */
export function searchGenericFoods(query: string): ProductDto[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return [];

  const matches = GENERIC_FOODS.filter(
    (food) => food.name.toLowerCase().includes(normalized) || food.nameFr.toLowerCase().includes(normalized)
  );
  if (matches.length === 0) return [];

  const ranked = matches
    .map((food) => {
      const isExactMatch = food.name.toLowerCase() === normalized || food.nameFr.toLowerCase() === normalized;
      const similarity = Math.max(stringSimilarity(normalized, food.name), stringSimilarity(normalized, food.nameFr));
      return { food, isExactMatch, similarity };
    })
    .sort((a, b) => {
      if (a.isExactMatch !== b.isExactMatch) return a.isExactMatch ? -1 : 1;
      if (a.isExactMatch) return b.food.popularity - a.food.popularity;
      if (b.similarity !== a.similarity) return b.similarity - a.similarity;
      if (b.food.popularity !== a.food.popularity) return b.food.popularity - a.food.popularity;
      return a.food.name.localeCompare(b.food.name);
    });

  return ranked.map((entry) => genericToDto(entry.food));
}

/**
 * Zoekt in de Postgres `meal_catalog`-cache (merkproducten/eerdere Open Food Facts-treffers) op
 * exacte barcode of een niet-hoofdlettergevoelige deelmatch op naam/merk. Schema en gedrag
 * ongewijzigd t.o.v. voor de tweetalige uitbreiding: dit is enkel de bestaande cache, niet de
 * generieke catalogus (die staat sinds deze uitbreiding los in `data/generic-foods.ts`).
 */
async function searchCache(query: string): Promise<ProductDto[]> {
  const rows = await MealCatalogItem.findAll({
    where: {
      [Op.or]: [{ barcode: query }, { name: { [Op.iLike]: `%${query}%` } }, { brand: { [Op.iLike]: `%${query}%` } }],
    },
    limit: MAX_RESULTS,
  });
  return rows.map(toDto);
}

/** Cachet een Open Food Facts-treffer; bij een race op eenzelfde barcode wordt de bestaande rij teruggegeven. */
async function cacheExternalProduct(product: openFoodFacts.OpenFoodFactsProduct): Promise<MealCatalogItem> {
  try {
    return await MealCatalogItem.create({
      barcode: product.barcode,
      name: product.name,
      brand: product.brand,
      calories_kcal: product.calories_kcal,
      protein_g: product.protein_g,
      carbs_g: product.carbs_g,
      fat_g: product.fat_g,
      fiber_g: product.fiber_g,
      is_belgian_market: product.is_belgian_market,
    });
  } catch (error) {
    if (product.barcode) {
      const existing = await MealCatalogItem.findOne({ where: { barcode: product.barcode } });
      if (existing) return existing;
    }
    throw error;
  }
}

/**
 * Zoekt producten op naam (Nederlands of Frans) of barcode. Combineert twee bronnen: de statische
 * generieke catalogus (in-memory, tweetalig) en de Postgres `meal_catalog`-cache (merkproducten en
 * eerdere Open Food Facts-treffers). Bij nul lokale treffers in beide volgt één Open Food
 * Facts-lookup waarvan het resultaat automatisch gecachet wordt voor volgende zoekopdrachten. Een
 * tijdelijk onbereikbare Open Food Facts wordt behandeld als "geen resultaten" in plaats van de
 * hele zoekopdracht te laten crashen.
 *
 * Handmatig zoeken is een kernfunctie van de gratis laag: bewust geen premium-abonnement of
 * GDPR-consent vereist (de catalogus bevat geen persoonsgegevens van de gebruiker).
 */
export async function searchProduct(queryOrBarcode: string): Promise<ProductDto[]> {
  const trimmed = queryOrBarcode.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const generic = searchGenericFoods(trimmed);
  const cached = await searchCache(trimmed);

  const genericNames = new Set(generic.map((item) => item.name.toLowerCase()));
  const combined = [...generic, ...cached.filter((item) => !genericNames.has(item.name.toLowerCase()))].slice(
    0,
    MAX_RESULTS
  );

  if (combined.length > 0) {
    return combined;
  }

  let external: openFoodFacts.OpenFoodFactsProduct | null;
  try {
    external = await openFoodFacts.findProduct(trimmed);
  } catch {
    // Open Food Facts is een externe, niet altijd beschikbare dienst; een storing daar mag de
    // eigen zoekfunctie niet laten crashen. De gebruiker ziet gewoon een lege resultatenlijst.
    external = null;
  }

  if (!external) {
    return [];
  }

  const cachedItem = await cacheExternalProduct(external);
  return [toDto(cachedItem)];
}
