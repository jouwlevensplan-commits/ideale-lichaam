import { Op } from 'sequelize';

import { MealCatalogItem } from '../db/models';
import * as openFoodFacts from './open-food-facts.service';

export class ProductNotFoundError extends Error {
  constructor(query: string) {
    super(`Geen product gevonden voor "${query}", ook niet via Open Food Facts.`);
    this.name = 'ProductNotFoundError';
  }
}

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

/** Exacte barcode-match, of een niet-hoofdlettergevoelige deelmatch op naam/merk. */
async function findInCache(query: string): Promise<MealCatalogItem | null> {
  return MealCatalogItem.findOne({
    where: {
      [Op.or]: [{ barcode: query }, { name: { [Op.iLike]: `%${query}%` } }, { brand: { [Op.iLike]: `%${query}%` } }],
    },
  });
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
 * Zoekt een product op naam of barcode. Zoekt eerst in de Postgres `meal_catalog`-cache; bij een
 * cache-miss volgt een echte Open Food Facts-lookup (barcode-exact of vrije tekst, zie
 * `open-food-facts.service.ts`) waarvan het resultaat automatisch gecachet wordt voor volgende
 * zoekopdrachten. Een tijdelijk onbereikbare Open Food Facts-API wordt behandeld als "niet
 * gevonden" in plaats van de hele zoekopdracht te laten crashen.
 *
 * Handmatig zoeken is een kernfunctie van de gratis laag: bewust geen premium-abonnement of
 * GDPR-consent vereist (de catalogus bevat geen persoonsgegevens van de gebruiker).
 */
export async function searchProduct(queryOrBarcode: string): Promise<ProductDto> {
  const trimmed = queryOrBarcode.trim();
  if (trimmed.length === 0) {
    throw new ProductNotFoundError(queryOrBarcode);
  }

  const cached = await findInCache(trimmed);
  if (cached) {
    return toDto(cached);
  }

  let external: openFoodFacts.OpenFoodFactsProduct | null;
  try {
    external = await openFoodFacts.findProduct(trimmed);
  } catch {
    // Open Food Facts is een externe, niet altijd beschikbare dienst; een storing daar mag de
    // eigen zoekfunctie niet laten crashen. De gebruiker ziet gewoon "niet gevonden".
    external = null;
  }

  if (!external) {
    throw new ProductNotFoundError(queryOrBarcode);
  }

  const cachedItem = await cacheExternalProduct(external);
  return toDto(cachedItem);
}
