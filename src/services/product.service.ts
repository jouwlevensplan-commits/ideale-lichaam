import { QueryTypes } from 'sequelize';

import { isTrigramSearchEnabled } from '../db/migrations';
import { MealCatalogItem, sequelize } from '../db/models';
import * as openFoodFacts from './open-food-facts.service';

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

const MAX_RESULTS = 10;
const TRIGRAM_SIMILARITY_THRESHOLD = 0.25;

interface CatalogRow {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  calories_kcal: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  fiber_g: string;
  is_belgian_market: boolean;
}

/**
 * Zoekt in `meal_catalog` op zowel de Nederlandstalige (`name`) als Franstalige (`name_fr`) naam,
 * of een exacte barcode — één canoniek record per voedingsmiddel dekt dus altijd beide talen.
 * Rangschikt: exacte barcode/naam eerst, dan Belgische-marktproducten, dan (als `pg_trgm`
 * beschikbaar is, zie db/migrations/index.ts) tekstgelijkenis voor tolerante/tikfout-vergevende
 * matching, dan populariteit (databaseplan §3.6 e.v. — hier een proxy voor loggebruik), en tot
 * slot alfabetisch.
 */
async function searchCatalogRanked(query: string): Promise<ProductDto[]> {
  const likePattern = `%${query}%`;
  const replacements = { query, likePattern, threshold: TRIGRAM_SIMILARITY_THRESHOLD, limit: MAX_RESULTS };

  const sql = isTrigramSearchEnabled()
    ? `
      SELECT id, barcode, name, brand, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, is_belgian_market
      FROM meal_catalog
      WHERE barcode = :query
         OR name ILIKE :likePattern
         OR name_fr ILIKE :likePattern
         OR similarity(name, :query) > :threshold
         OR similarity(COALESCE(name_fr, ''), :query) > :threshold
      ORDER BY
        (barcode = :query) DESC,
        (LOWER(name) = LOWER(:query) OR LOWER(COALESCE(name_fr, '')) = LOWER(:query)) DESC,
        is_belgian_market DESC,
        GREATEST(similarity(name, :query), similarity(COALESCE(name_fr, ''), :query)) DESC,
        popularity DESC,
        name ASC
      LIMIT :limit
    `
    : `
      SELECT id, barcode, name, brand, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, is_belgian_market
      FROM meal_catalog
      WHERE barcode = :query OR name ILIKE :likePattern OR name_fr ILIKE :likePattern
      ORDER BY
        (barcode = :query) DESC,
        (LOWER(name) = LOWER(:query) OR LOWER(COALESCE(name_fr, '')) = LOWER(:query)) DESC,
        is_belgian_market DESC,
        popularity DESC,
        name ASC
      LIMIT :limit
    `;

  const rows = await sequelize.query<CatalogRow>(sql, { type: QueryTypes.SELECT, replacements });

  return rows.map((row) => ({
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
  }));
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
