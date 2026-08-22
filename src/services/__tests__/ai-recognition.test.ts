import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createUser, setHealthDataConsent, setPremiumStatus, getMealItemsForMealLog } from '../storage.service';
import { processMealPhoto, processMealVoice, AiRecognitionError } from '../ai-recognition.service';
import { GdprConsentError } from '../storage.service';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'ai-recognition-test-'));
  process.env.STORAGE_FILE_PATH = path.join(tempDir, 'storage.json');
  delete process.env.AI_RECOGNITION_MODE;
});

afterEach(() => {
  delete process.env.STORAGE_FILE_PATH;
  delete process.env.AI_RECOGNITION_MODE;
  rmSync(tempDir, { recursive: true, force: true });
});

test('weigert foto- en spraakverwerking zonder health_data_consent', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'geen-consent@example.com',
    timezone: 'Europe/Brussels',
  });

  await assert.rejects(
    () => processMealPhoto({ data: 'fake-image', mimeType: 'image/jpeg' }, user.id),
    GdprConsentError
  );

  await assert.rejects(
    () => processMealVoice('een appel', user.id),
    GdprConsentError
  );
});

test('verwerkt een maaltijdfoto (mock) tot een gestructureerd meal_log met juiste calorieën en macro’s', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'foto-scan@example.com',
    timezone: 'Europe/Brussels',
  });
  await setHealthDataConsent(user.id, true, 'privacy-v1');
  await setPremiumStatus(user.id, true);

  const result = await processMealPhoto(
    { data: 'irrelevant-in-mock-mode', mimeType: 'image/jpeg', mockScenario: 'kip_met_rijst_en_broccoli' },
    user.id
  );

  assert.equal(result.recognitionRun.mode, 'vision');
  assert.equal(result.recognitionRun.status, 'succeeded');
  assert.equal(result.recognitionRun.provider, 'mock');
  assert.notEqual(result.recognitionRun.completed_at, null);

  assert.equal(result.mealLog.user_id, user.id);
  assert.equal(result.mealLog.source, 'photo');
  assert.equal(result.mealLog.status, 'logged');
  assert.equal(result.mealLog.recognition_run_id, result.recognitionRun.id);
  assert.equal(result.mealLog.confidence, 0.85);

  assert.equal(result.items.length, 3);

  const kipfilet = result.items.find((item) => item.name === 'Kipfilet');
  const rijst = result.items.find((item) => item.name === 'Gekookte rijst');
  const broccoli = result.items.find((item) => item.name === 'Broccoli');

  assert.deepEqual(
    { amount_g: kipfilet?.amount_g, calories_kcal: kipfilet?.calories_kcal, protein_g: kipfilet?.protein_g, carbs_g: kipfilet?.carbs_g, fat_g: kipfilet?.fat_g, fiber_g: kipfilet?.fiber_g },
    { amount_g: 150, calories_kcal: 247.5, protein_g: 46.5, carbs_g: 0, fat_g: 5.4, fiber_g: 0 }
  );
  assert.deepEqual(
    { amount_g: rijst?.amount_g, calories_kcal: rijst?.calories_kcal, protein_g: rijst?.protein_g, carbs_g: rijst?.carbs_g, fat_g: rijst?.fat_g, fiber_g: rijst?.fiber_g },
    { amount_g: 200, calories_kcal: 260, protein_g: 5.4, carbs_g: 56, fat_g: 0.6, fiber_g: 0.8 }
  );
  assert.deepEqual(
    { amount_g: broccoli?.amount_g, calories_kcal: broccoli?.calories_kcal, protein_g: broccoli?.protein_g, carbs_g: broccoli?.carbs_g, fat_g: broccoli?.fat_g, fiber_g: broccoli?.fiber_g },
    { amount_g: 100, calories_kcal: 34, protein_g: 2.8, carbs_g: 7, fat_g: 0.4, fiber_g: 2.6 }
  );

  // De items moeten daadwerkelijk via de storage-service opgehaald kunnen worden.
  const storedItems = await getMealItemsForMealLog(user.id, result.mealLog.id);
  assert.equal(storedItems.length, 3);
});

test('verwerkt een spraakinvoer (mock) tot een gestructureerd meal_log met juiste calorieën en macro’s', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'spraak-log@example.com',
    timezone: 'Europe/Brussels',
  });
  await setHealthDataConsent(user.id, true, 'privacy-v1');
  await setPremiumStatus(user.id, true);

  const result = await processMealVoice(
    'Ik heb net twee volkoren boterhammen met jonge kaas gegeten',
    user.id
  );

  assert.equal(result.recognitionRun.mode, 'speech');
  assert.equal(result.recognitionRun.status, 'succeeded');
  assert.equal(result.mealLog.source, 'voice');
  assert.equal(result.mealLog.confidence, 0.9);
  assert.equal(result.items.length, 2);

  const boterham = result.items.find((item) => item.name === 'Volkoren boterham');
  const kaas = result.items.find((item) => item.name === 'Jonge kaas');

  // twee boterhammen (2 x 35g) en één portie kaas (1 x 20g), afgeleid uit de tekst.
  assert.deepEqual(
    { amount_g: boterham?.amount_g, calories_kcal: boterham?.calories_kcal, protein_g: boterham?.protein_g, carbs_g: boterham?.carbs_g, fat_g: boterham?.fat_g, fiber_g: boterham?.fiber_g },
    { amount_g: 70, calories_kcal: 175, protein_g: 6.3, carbs_g: 28.7, fat_g: 2.4, fiber_g: 4.2 }
  );
  assert.deepEqual(
    { amount_g: kaas?.amount_g, calories_kcal: kaas?.calories_kcal, protein_g: kaas?.protein_g, carbs_g: kaas?.carbs_g, fat_g: kaas?.fat_g, fiber_g: kaas?.fiber_g },
    { amount_g: 20, calories_kcal: 70, protein_g: 5, carbs_g: 0, fat_g: 5.4, fiber_g: 0 }
  );
});

test('valt terug op een onherkend item wanneer geen bekend voedingsmiddel wordt herkend in spraak', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'onherkend@example.com',
    timezone: 'Europe/Brussels',
  });
  await setHealthDataConsent(user.id, true, 'privacy-v1');
  await setPremiumStatus(user.id, true);

  const result = await processMealVoice('een portie ravioli met saus', user.id);

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].name, 'Onherkend voedingsmiddel');
  assert.equal(result.mealLog.confidence, 0.2);
});

test('markeert de recognition_run als failed en gooit door bij een onbekend mock-fotoscenario', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'foutscenario@example.com',
    timezone: 'Europe/Brussels',
  });
  await setHealthDataConsent(user.id, true, 'privacy-v1');
  await setPremiumStatus(user.id, true);

  await assert.rejects(
    () =>
      processMealPhoto(
        { data: 'irrelevant', mimeType: 'image/jpeg', mockScenario: 'niet-bestaand-scenario' },
        user.id
      ),
    AiRecognitionError
  );
});

test('weigert live-modus zolang er geen echte provider is geconfigureerd', async () => {
  const user = await createUser({
    auth_provider: 'email',
    auth_subject: 'live-mode@example.com',
    timezone: 'Europe/Brussels',
  });
  await setHealthDataConsent(user.id, true, 'privacy-v1');
  await setPremiumStatus(user.id, true);

  process.env.AI_RECOGNITION_MODE = 'live';

  await assert.rejects(
    () => processMealVoice('een appel', user.id),
    AiRecognitionError
  );
});
