import type { Request, Response } from 'express';

import * as productService from '../services/product.service';
import { BadRequestError } from '../db/errors';
import type { ProductDto } from '../services/product.service';

function mapProduct(product: ProductDto) {
  return {
    id: product.id,
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    caloriesKcal: product.calories_kcal,
    proteinG: product.protein_g,
    carbsG: product.carbs_g,
    fatG: product.fat_g,
    fiberG: product.fiber_g,
  };
}

/**
 * Zoekt een product op naam of barcode via de gedeelde `meal_catalog`-cache (product.service.ts):
 * eerst lokaal, anders een Open Food Facts-lookup die het resultaat cachet. Altijd gratis en
 * consent-vrij (databaseplan §3 — geen persoonsgegevens), dus geen `withUser`-poort hier. Geeft
 * een lege lijst terug (HTTP 200) in plaats van een 404 wanneer niets gevonden wordt: dat is voor
 * een zoekresultaat het normale, niet-foutieve pad.
 */
export async function searchProducts(req: Request, res: Response): Promise<void> {
  const query = req.query.queryOrBarcode;
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new BadRequestError('Query-parameter "queryOrBarcode" is verplicht.');
  }

  try {
    const product = await productService.searchProduct(query);
    res.status(200).json([mapProduct(product)]);
  } catch (error) {
    if (error instanceof productService.ProductNotFoundError) {
      res.status(200).json([]);
      return;
    }
    throw error;
  }
}
