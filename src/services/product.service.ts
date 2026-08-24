import { Op } from 'sequelize';

import { MealCatalogItem } from '../db/models';
import * as openFoodFacts from './open-food-facts.service';
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

const CANDIDATE_POOL_SIZE = 50;
const MAX_RESULTS = 10;

/**
 * Rangschikt kandidaten die de database al (via `ILIKE`) heeft gefilterd: exacte matches eerst
 * (onderling gesorteerd op populariteit), dan de rest gesorteerd op tekstgelijkenis
 * (Levenshtein-gebaseerd, zie string-similarity.ts) en tot slot populariteit/alfabetisch als
 * tiebreak. Volledig in de applicatielaag — geen databasefunctie of -extensie nodig.
 */
function rankCatalogItems(query: string, items: MealCatalogItem[]): MealCatalogItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  const ranked = items.map((item) => {
    const isExactMatch =
      item.name.trim().toLowerCase() === normalizedQuery ||
      item.name_fr?.trim().toLowerCase() === normalizedQuery ||
      item.barcode === query.trim();

    const similarity = Math.max(
      stringSimilarity(query, item.name),
      item.name_fr ? stringSimilarity(query, item.name_fr) : 0
    );

    return { item, isExactMatch, similarity };
  });

  ranked.sort((a, b) => {
    if (a.isExactMatch !== b.isExactMatch) {
      return a.isExactMatch ? -1 : 1;
    }
    if (a.isExactMatch) {
      return b.item.popularity - a.item.popularity;
    }
    if (b.similarity !== a.similarity) {
      return b.similarity - a.similarity;
    }
    if (b.item.popularity !== a.item.popularity) {
      return b.item.popularity - a.item.popularity;
    }
    return a.item.name.localeCompare(b.item.name);
  });

  return ranked.map((entry) => entry.item);
}

/**
 * Zoekt in `meal_catalog` op zowel de Nederlandstalige (`name`) als Franstalige (`name_fr`) naam,
 * of een exacte barcode — één canoniek record per voedingsmiddel dekt dus altijd beide talen. De
 * database doet enkel een veilige, case-insensitieve substring-match (`ILIKE`); de rangschikking
 * (exact/fuzzy/populariteit) gebeurt daarna in JavaScript, zie `rankCatalogItems`.
 */
async function searchCatalogRanked(query: string): Promise<ProductDto[]> {
  const likePattern = `%${query}%`;

  const candidates = await MealCatalogItem.findAll({
    where: {
      [Op.or]: [{ barcode: query }, { name: { [Op.iLike]: likePattern } }, { name_fr: { [Op.iLike]: likePattern } }],
    },
    limit: CANDIDATE_POOL_SIZE,
  });

  if (candidates.length === 0) {
    return [];
  }

  return rankCatalogItems(query, candidates)
    .slice(0, MAX_RESULTS)
    .map(toDto);
}

/** Cachet een Open Food Facts-treffer; bij een race op eenzelfde barcode wordt de bestaande rij teruggegeven. */
async function cacheExternalProduct(product: openFoodFacts.OpenFoodFactsProduct): Promise<MealCatalogItem> {
  try {
    return await MealCatalogItem.create({
      barcode: product.barcode,
      name: product.name,
      name_fr: product.name_fr,
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
 * Zoekt producten op naam (Nederlands of Frans) of barcode. Zoekt eerst, gerangschikt, in de
 * Postgres `meal_catalog`-cache; bij nul lokale treffers volgt één Open Food Facts-lookup
 * (barcode-exact of vrije tekst, zie `open-food-facts.service.ts`) waarvan het resultaat
 * automatisch gecachet wordt voor volgende zoekopdrachten. Een tijdelijk onbereikbare Open Food
 * Facts wordt behandeld als "geen resultaten" in plaats van de hele zoekopdracht te laten crashen.
 *
 * Handmatig zoeken is een kernfunctie van de gratis laag: bewust geen premium-abonnement of
 * GDPR-consent vereist (de catalogus bevat geen persoonsgegevens van de gebruiker).
 */
export async function searchProduct(queryOrBarcode: string): Promise<ProductDto[]> {
  const trimmed = queryOrBarcode.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const localMatches = await searchCatalogRanked(trimmed);
  if (localMatches.length > 0) {
    return localMatches;
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
