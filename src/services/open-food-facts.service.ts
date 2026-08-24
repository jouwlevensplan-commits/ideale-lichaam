/**
 * Dunne client voor de publieke Open Food Facts API (https://world.openfoodfacts.org). Gebruikt
 * Node's ingebouwde `fetch` (Node 24, zie Dockerfile) — geen extra HTTP-dependency nodig.
 *
 * Open Food Facts vraagt uitdrukkelijk om een herkenbare `User-Agent` per aanroepende app
 * (https://openfoodfacts.github.io/openfoodfacts-server/api/#requests), vandaar de vaste header.
 */

export class OpenFoodFactsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenFoodFactsError';
  }
}

export interface OpenFoodFactsProduct {
  barcode: string | null;
  name: string;
  /** Franstalige naam, indien Open Food Facts die meegeeft (voor een tweetalige `meal_catalog`-cache). */
  name_fr: string | null;
  brand: string | null;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  is_belgian_market: boolean;
}

const USER_AGENT = 'MaaltijdTracker-Backend/1.0 (+https://p01--ideale-lichaam--kbd9hgdzc7ny.code.run)';
const REQUEST_TIMEOUT_MS = 8000;
/** EAN-8/UPC-A/EAN-13/GTIN-14: alleen cijfers, 8 tot 14 tekens. */
const BARCODE_PATTERN = /^\d{8,14}$/;

export function isBarcode(query: string): boolean {
  return BARCODE_PATTERN.test(query.trim());
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new OpenFoodFactsError(`Kon Open Food Facts niet bereiken: ${reason}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new OpenFoodFactsError(`Open Food Facts-aanroep mislukt (status ${response.status}).`);
  }

  return response.json();
}

function firstFiniteNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

/**
 * Zet een ruw Open Food Facts `product`-object om naar ons eigen model. Geeft `null` terug bij
 * onbruikbare entries (geen naam, of geen calorieën per 100g) zodat de aanroeper die overslaat in
 * plaats van halve/lege producten te cachen.
 */
export function mapOpenFoodFactsProduct(raw: unknown): OpenFoodFactsProduct | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const product = raw as Record<string, unknown>;

  // Nederlandstalige naam eerst (relevant voor onze Belgische markt), dan de gelokaliseerde naam
  // die `lc=nl` al meegaf in `product_name`, dan Engels/generiek als laatste terugvaloptie.
  const name =
    (typeof product.product_name_nl === 'string' && product.product_name_nl.trim()) ||
    (typeof product.product_name === 'string' && product.product_name.trim()) ||
    (typeof product.product_name_en === 'string' && product.product_name_en.trim()) ||
    (typeof product.generic_name === 'string' && product.generic_name.trim()) ||
    null;
  if (!name) return null;

  const nutriments =
    typeof product.nutriments === 'object' && product.nutriments !== null
      ? (product.nutriments as Record<string, unknown>)
      : {};

  const caloriesKcal = firstFiniteNumber(nutriments['energy-kcal_100g'], nutriments['energy-kcal']);
  if (caloriesKcal === null) return null;

  const countriesTags = Array.isArray(product.countries_tags)
    ? (product.countries_tags as unknown[]).filter((tag): tag is string => typeof tag === 'string')
    : [];

  const brandsRaw = typeof product.brands === 'string' ? product.brands.trim() : '';
  const barcodeRaw = typeof product.code === 'string' ? product.code.trim() : '';
  const nameFr = typeof product.product_name_fr === 'string' ? product.product_name_fr.trim() : '';

  return {
    barcode: barcodeRaw.length > 0 ? barcodeRaw : null,
    name,
    name_fr: nameFr.length > 0 ? nameFr : null,
    brand: brandsRaw.length > 0 ? (brandsRaw.split(',')[0]?.trim() ?? null) : null,
    calories_kcal: caloriesKcal,
    protein_g: firstFiniteNumber(nutriments['proteins_100g']) ?? 0,
    carbs_g: firstFiniteNumber(nutriments['carbohydrates_100g']) ?? 0,
    fat_g: firstFiniteNumber(nutriments['fat_100g']) ?? 0,
    fiber_g: firstFiniteNumber(nutriments['fiber_100g']) ?? 0,
    is_belgian_market: countriesTags.some((tag) => tag === 'en:belgium' || tag.endsWith(':belgium')),
  };
}

// `lc=nl` vraagt Nederlandstalige productvelden op (relevant voor namen/taxonomie), `cc=be` stelt
// Open Food Facts' landcontext in op België, wat de Belgische markt prioriteert in de resultaten
// zonder niet-Belgische producten volledig uit te sluiten.
const LOCALIZATION_PARAMS = { lc: 'nl', cc: 'be' } as const;

/** Exacte barcode-opzoeking via de Open Food Facts v2 product-API. */
export async function lookupByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const params = new URLSearchParams(LOCALIZATION_PARAMS);
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?${params.toString()}`;
  const data = (await fetchJson(url)) as { status?: number; product?: unknown };

  if (data.status !== 1 || !data.product) {
    return null;
  }
  return mapOpenFoodFactsProduct(data.product);
}

/**
 * Vrije-tekstzoekopdracht. Geeft, onder de bruikbare (naam + calorieën) treffers, de eerste
 * Belgische markt-match terug; valt terug op de eerste bruikbare treffer in het algemeen als er
 * geen Belgische tussen zit. `null` als er helemaal niets bruikbaars terugkomt.
 */
export async function searchByText(query: string): Promise<OpenFoodFactsProduct | null> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '10',
    ...LOCALIZATION_PARAMS,
  });
  const url = `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`;
  const data = (await fetchJson(url)) as { products?: unknown[] };

  const candidates = Array.isArray(data.products) ? data.products : [];
  const usable = candidates
    .map(mapOpenFoodFactsProduct)
    .filter((product): product is OpenFoodFactsProduct => product !== null);

  return usable.find((product) => product.is_belgian_market) ?? usable[0] ?? null;
}

/** Zoekt op barcode of vrije tekst, afhankelijk van het opgegeven patroon van `queryOrBarcode`. */
export async function findProduct(queryOrBarcode: string): Promise<OpenFoodFactsProduct | null> {
  const trimmed = queryOrBarcode.trim();
  if (trimmed.length === 0) return null;

  return isBarcode(trimmed) ? lookupByBarcode(trimmed) : searchByText(trimmed);
}
