import * as storageService from './storage.service';
import type {
  MealType,
  MealSource,
  MealLog,
  MealItem,
  RecognitionRun,
  RecognitionMode,
  JsonValue,
} from '../types/database.types';

export type RecognitionProviderMode = 'mock' | 'live';

export class AiRecognitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiRecognitionError';
  }
}

export class PremiumAccessError extends Error {
  constructor(userId: string) {
    super(
      `Actie geweigerd: gebruiker ${userId} heeft geen actief premium-abonnement. AI-foto- en spraakherkenning zijn premiumfuncties.`
    );
    this.name = 'PremiumAccessError';
  }
}

// Consent (wettelijke grondslag om gezondheidsgegevens te mogen verwerken) weegt zwaarder dan het
// abonnement: een niet-consenterende gebruiker krijgt altijd GdprConsentError, ook als die premium is.
async function assertAiAccessOrThrow(userId: string): Promise<void> {
  const user = await storageService.getUserById(userId);
  if (!user.health_data_consent) {
    throw new storageService.GdprConsentError(userId);
  }
  if (!user.is_premium) {
    throw new PremiumAccessError(userId);
  }
}

// --- Configuratie ---
// Standaard "mock" zodat de testsuite en lokale ontwikkeling geen externe API-sleutels nodig hebben.
// Zet AI_RECOGNITION_MODE=live (met een echte provider-integratie) voor productiegebruik.
function getRecognitionMode(): RecognitionProviderMode {
  return process.env.AI_RECOGNITION_MODE === 'live' ? 'live' : 'mock';
}

// --- Mock voedingsdatabase ---
// Waarden zijn indicatief (per 100g) en dienen uitsluitend om de mock-herkenning deterministisch te maken.

interface FoodNutritionPer100g {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

interface FoodDefinition {
  name: string;
  per100g: FoodNutritionPer100g;
  /** Typische hoeveelheid in gram voor één genoemde eenheid, gebruikt bij spraakherkenning. */
  defaultUnitGrams: number;
}

const MOCK_FOOD_DATABASE: Record<string, FoodDefinition> = {
  boterham: {
    name: 'Volkoren boterham',
    per100g: { calories_kcal: 250, protein_g: 9, carbs_g: 41, fat_g: 3.5, fiber_g: 6 },
    defaultUnitGrams: 35,
  },
  kaas: {
    name: 'Jonge kaas',
    per100g: { calories_kcal: 350, protein_g: 25, carbs_g: 0, fat_g: 27, fiber_g: 0 },
    defaultUnitGrams: 20,
  },
  kipfilet: {
    name: 'Kipfilet',
    per100g: { calories_kcal: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, fiber_g: 0 },
    defaultUnitGrams: 150,
  },
  rijst: {
    name: 'Gekookte rijst',
    per100g: { calories_kcal: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, fiber_g: 0.4 },
    defaultUnitGrams: 200,
  },
  broccoli: {
    name: 'Broccoli',
    per100g: { calories_kcal: 34, protein_g: 2.8, carbs_g: 7, fat_g: 0.4, fiber_g: 2.6 },
    defaultUnitGrams: 100,
  },
  appel: {
    name: 'Appel',
    per100g: { calories_kcal: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2, fiber_g: 2.4 },
    defaultUnitGrams: 150,
  },
};

const DUTCH_NUMBER_WORDS: Record<string, number> = {
  een: 1,
  één: 1,
  twee: 2,
  drie: 3,
  vier: 4,
  vijf: 5,
  zes: 6,
  zeven: 7,
  acht: 8,
  negen: 9,
  tien: 10,
};

interface RecognizedFoodItem {
  name: string;
  amount_g: number;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  nutrition_source: string;
  source_reference: string;
}

interface RecognitionOutcome {
  items: RecognizedFoodItem[];
  confidence: number;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function scaleFood(
  foodKey: string,
  food: FoodDefinition,
  amountGrams: number,
  nutritionSource: string
): RecognizedFoodItem {
  const factor = amountGrams / 100;
  return {
    name: food.name,
    amount_g: amountGrams,
    calories_kcal: round1(food.per100g.calories_kcal * factor),
    protein_g: round1(food.per100g.protein_g * factor),
    carbs_g: round1(food.per100g.carbs_g * factor),
    fat_g: round1(food.per100g.fat_g * factor),
    fiber_g: round1(food.per100g.fiber_g * factor),
    nutrition_source: nutritionSource,
    source_reference: `mock:${foodKey}`,
  };
}

/** Zoekt het dichtstbijzijnde getal (cijfer of Nederlands telwoord) vóór `keyword` in `text`. */
function extractQuantity(text: string, keyword: string): number {
  const index = text.indexOf(keyword);
  if (index === -1) return 0;

  const before = text.slice(Math.max(0, index - 20), index);
  const numberPattern = /\d+|een|twee|drie|vier|vijf|zes|zeven|acht|negen|tien/g;
  const matches = [...before.matchAll(numberPattern)];
  if (matches.length === 0) return 1;

  const token = matches[matches.length - 1][0];
  if (/^[0-9]+$/.test(token)) return parseInt(token, 10);
  return DUTCH_NUMBER_WORDS[token] ?? 1;
}

function recognizeSpeechMock(speechText: string): RecognitionOutcome {
  const normalized = speechText.toLowerCase();
  const items: RecognizedFoodItem[] = [];

  for (const [foodKey, food] of Object.entries(MOCK_FOOD_DATABASE)) {
    if (!normalized.includes(foodKey)) continue;
    const quantity = extractQuantity(normalized, foodKey);
    const amountGrams = quantity * food.defaultUnitGrams;
    items.push(scaleFood(foodKey, food, amountGrams, 'speech_estimate'));
  }

  if (items.length === 0) {
    return {
      confidence: 0.2,
      items: [
        {
          name: 'Onherkend voedingsmiddel',
          amount_g: 100,
          calories_kcal: 0,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
          fiber_g: 0,
          nutrition_source: 'other',
          source_reference: 'mock:unrecognized',
        },
      ],
    };
  }

  return { items, confidence: 0.9 };
}

interface MockPhotoScenarioItem {
  foodKey: keyof typeof MOCK_FOOD_DATABASE;
  amount_g: number;
}

const DEFAULT_PHOTO_SCENARIO = 'kip_met_rijst_en_broccoli';

const MOCK_PHOTO_SCENARIOS: Record<string, MockPhotoScenarioItem[]> = {
  kip_met_rijst_en_broccoli: [
    { foodKey: 'kipfilet', amount_g: 150 },
    { foodKey: 'rijst', amount_g: 200 },
    { foodKey: 'broccoli', amount_g: 100 },
  ],
  boterham_met_kaas: [
    { foodKey: 'boterham', amount_g: 35 },
    { foodKey: 'kaas', amount_g: 20 },
  ],
};

function recognizePhotoMock(imageInput: ProcessMealPhotoInput): RecognitionOutcome {
  const scenarioKey = imageInput.mockScenario ?? DEFAULT_PHOTO_SCENARIO;
  const scenario = MOCK_PHOTO_SCENARIOS[scenarioKey];

  if (!scenario) {
    throw new AiRecognitionError(`Onbekend mock-fotoscenario: "${scenarioKey}".`);
  }

  const items = scenario.map(({ foodKey, amount_g }) =>
    scaleFood(foodKey, MOCK_FOOD_DATABASE[foodKey], amount_g, 'vision_estimate')
  );

  return { items, confidence: 0.85 };
}

function recognizePhoto(imageInput: ProcessMealPhotoInput, mode: RecognitionProviderMode): RecognitionOutcome {
  if (mode === 'mock') {
    return recognizePhotoMock(imageInput);
  }
  throw new AiRecognitionError(
    'Live foto-herkenning is nog niet geïmplementeerd. Zet AI_RECOGNITION_MODE=mock voor lokale ontwikkeling en tests.'
  );
}

function recognizeSpeech(speechText: string, mode: RecognitionProviderMode): RecognitionOutcome {
  if (mode === 'mock') {
    return recognizeSpeechMock(speechText);
  }
  throw new AiRecognitionError(
    'Live spraakherkenning is nog niet geïmplementeerd. Zet AI_RECOGNITION_MODE=mock voor lokale ontwikkeling en tests.'
  );
}

// --- Publieke API ---

export interface ProcessMealPhotoInput {
  /** Base64-gecodeerde afbeeldingsdata (live-modus). */
  data: string;
  mimeType: string;
  /** Alleen relevant in mock-modus: kiest een canned herkenningsresultaat. Standaard "kip_met_rijst_en_broccoli". */
  mockScenario?: string;
  meal_type?: MealType | null;
  consumed_at?: string;
}

export interface ProcessMealResult {
  recognitionRun: RecognitionRun;
  mealLog: MealLog;
  items: MealItem[];
}

async function runRecognition(
  userId: string,
  mode: RecognitionMode,
  execute: (providerMode: RecognitionProviderMode) => RecognitionOutcome
): Promise<{ run: RecognitionRun; outcome: RecognitionOutcome }> {
  const providerMode = getRecognitionMode();
  const provider = providerMode === 'mock' ? 'mock' : 'anthropic';
  const model = providerMode === 'mock' ? 'mock-v1' : process.env.AI_RECOGNITION_MODEL ?? 'claude-sonnet';

  // Elke poging wordt eerst als run geregistreerd; storageService.createRecognitionRun bevat de
  // strikte GDPR-gate (weigert zonder expliciete health_data_consent) vóór er iets wordt verwerkt.
  const run = await storageService.createRecognitionRun(userId, {
    media_asset_id: null,
    mode,
    provider,
    model,
  });

  try {
    const outcome = execute(providerMode);
    const completedRun = await storageService.completeRecognitionRun(userId, run.id, {
      status: 'succeeded',
      result_json: { confidence: outcome.confidence, items: outcome.items } as unknown as JsonValue,
    });
    return { run: completedRun, outcome };
  } catch (error) {
    await storageService.completeRecognitionRun(userId, run.id, {
      status: 'failed',
      error_code: error instanceof Error ? error.name : 'unknown_error',
    });
    throw error;
  }
}

function deriveLocalDate(consumedAtIso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(consumedAtIso));
}

interface FinalizeOptions {
  source: MealSource;
  meal_type: MealType | null;
  consumed_at?: string;
}

async function finalizeMealLog(
  userId: string,
  run: RecognitionRun,
  outcome: RecognitionOutcome,
  options: FinalizeOptions
): Promise<ProcessMealResult> {
  const user = await storageService.getUserById(userId);
  const consumedAt = options.consumed_at ?? new Date().toISOString();
  const localDate = deriveLocalDate(consumedAt, user.timezone);

  // meal_log, alle meal_items en de koppeling naar de recognition-run worden in één keer weggeschreven.
  const { mealLog, items } = await storageService.createMealLogWithItems(userId, {
    mealLog: {
      recognition_run_id: run.id,
      media_asset_id: null,
      consumed_at: consumedAt,
      local_date: localDate,
      meal_type: options.meal_type,
      source: options.source,
      confidence: outcome.confidence,
      notes: null,
    },
    items: outcome.items.map((item, index) => ({
      name: item.name,
      amount_g: item.amount_g,
      calories_kcal: item.calories_kcal,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      fiber_g: item.fiber_g,
      micronutrients: {},
      nutrition_source: item.nutrition_source,
      source_reference: item.source_reference,
      sort_order: index,
    })),
  });

  return { recognitionRun: run, mealLog, items };
}

/** Verwerkt een maaltijdfoto (AI Maaltijdscanner): registreert een recognition_run en logt de maaltijd stilzwijgend. */
export async function processMealPhoto(
  imageInput: ProcessMealPhotoInput,
  userId: string
): Promise<ProcessMealResult> {
  await assertAiAccessOrThrow(userId);

  const { run, outcome } = await runRecognition(userId, 'vision', (providerMode) =>
    recognizePhoto(imageInput, providerMode)
  );

  return finalizeMealLog(userId, run, outcome, {
    source: 'photo',
    meal_type: imageInput.meal_type ?? null,
    consumed_at: imageInput.consumed_at,
  });
}

/** Verwerkt een reeds naar tekst omgezette spraakinvoer (AI Spraaklogger): registreert een recognition_run en logt de maaltijd automatisch. */
export async function processMealVoice(speechText: string, userId: string): Promise<ProcessMealResult> {
  await assertAiAccessOrThrow(userId);

  const { run, outcome } = await runRecognition(userId, 'speech', (providerMode) =>
    recognizeSpeech(speechText, providerMode)
  );

  return finalizeMealLog(userId, run, outcome, {
    source: 'voice',
    meal_type: null,
    consumed_at: undefined,
  });
}
