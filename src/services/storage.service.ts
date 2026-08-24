import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import type {
  User,
  UserProfile,
  Goal,
  DailyTarget,
  WeeklyGoal,
  MealLog,
  MealItem,
  RecognitionRun,
  WeeklyReport,
  Streak,
  Badge,
  UserStatus,
  JsonValue,
} from '../types/database.types';

interface StorageSchema {
  users: User[];
  userProfiles: UserProfile[];
  goals: Goal[];
  dailyTargets: DailyTarget[];
  weeklyGoals: WeeklyGoal[];
  mealLogs: MealLog[];
  mealItems: MealItem[];
  recognitionRuns: RecognitionRun[];
  weeklyReports: WeeklyReport[];
  streaks: Streak[];
  badges: Badge[];
}

const EMPTY_STORE: StorageSchema = {
  users: [],
  userProfiles: [],
  goals: [],
  dailyTargets: [],
  weeklyGoals: [],
  mealLogs: [],
  mealItems: [],
  recognitionRuns: [],
  weeklyReports: [],
  streaks: [],
  badges: [],
};

/**
 * Standaard `/tmp/storage.json` (niet `/app/storage.json`): in de Docker-productie-image draait de
 * server als niet-root `node`-gebruiker zonder schrijfrechten op `/app`, waardoor het eerste
 * schrijven daar met een 500 crasht. `/tmp` is in vrijwel elke container-runtime altijd schrijfbaar,
 * ongeacht gebruikersrechten. `STORAGE_FILE_PATH` blijft bruikbaar om dit te overschrijven (bv. in
 * tests, die elk een eigen tijdelijke map gebruiken).
 */
function getStorageFilePath(): string {
  return process.env.STORAGE_FILE_PATH ?? path.join(os.tmpdir(), 'maaltijdtracker-storage.json');
}

export class GdprConsentError extends Error {
  constructor(userId: string) {
    super(
      `Actie geweigerd: gebruiker ${userId} heeft geen expliciete health_data_consent gegeven.`
    );
    this.name = 'GdprConsentError';
  }
}

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} met id "${id}" niet gevonden.`);
    this.name = 'NotFoundError';
  }
}

// --- Bestandstoegang ---

async function readStore(): Promise<StorageSchema> {
  try {
    const raw = await fs.readFile(getStorageFilePath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<StorageSchema>;
    return {
      users: parsed.users ?? [],
      userProfiles: parsed.userProfiles ?? [],
      goals: parsed.goals ?? [],
      dailyTargets: parsed.dailyTargets ?? [],
      weeklyGoals: parsed.weeklyGoals ?? [],
      mealLogs: parsed.mealLogs ?? [],
      mealItems: parsed.mealItems ?? [],
      recognitionRuns: parsed.recognitionRuns ?? [],
      weeklyReports: parsed.weeklyReports ?? [],
      streaks: parsed.streaks ?? [],
      badges: parsed.badges ?? [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await writeStore(EMPTY_STORE);
      return { ...EMPTY_STORE };
    }
    throw error;
  }
}

// Schrijfacties worden geketend zodat gelijktijdige aanroepen elkaars wijzigingen niet overschrijven.
let writeQueue: Promise<void> = Promise.resolve();

function writeStore(data: StorageSchema): Promise<void> {
  writeQueue = writeQueue.then(() =>
    fs.writeFile(getStorageFilePath(), JSON.stringify(data, null, 2), 'utf-8')
  );
  return writeQueue;
}

// --- GDPR-bewaking ---

function assertHealthDataConsent(user: User): void {
  if (user.health_data_consent !== true) {
    throw new GdprConsentError(user.id);
  }
}

function getUserOrThrow(store: StorageSchema, userId: string): User {
  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    throw new NotFoundError('User', userId);
  }
  return user;
}

// --- User ---

export interface CreateUserInput {
  auth_provider: string;
  auth_subject: string;
  timezone: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const store = await readStore();

  const alreadyExists = store.users.some(
    (u) => u.auth_provider === input.auth_provider && u.auth_subject === input.auth_subject
  );
  if (alreadyExists) {
    throw new Error(
      `Gebruiker met auth_provider "${input.auth_provider}" en auth_subject "${input.auth_subject}" bestaat al.`
    );
  }

  const now = new Date().toISOString();
  const user: User = {
    id: randomUUID(),
    auth_provider: input.auth_provider,
    auth_subject: input.auth_subject,
    status: 'active',
    timezone: input.timezone,
    health_data_consent: false,
    health_data_opted_in_at: null,
    consent_policy_version: null,
    is_premium: false,
    analytics_consent: false,
    personalized_ads_consent: false,
    ad_consent_opted_in_at: null,
    created_at: now,
    updated_at: now,
  };

  store.users.push(user);
  await writeStore(store);
  return user;
}

export async function getUserById(userId: string): Promise<User> {
  const store = await readStore();
  return getUserOrThrow(store, userId);
}

export async function updateUserStatus(userId: string, status: UserStatus): Promise<User> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);

  user.status = status;
  user.updated_at = new Date().toISOString();

  await writeStore(store);
  return user;
}

/**
 * Registreert de expliciete keuze van de gebruiker voor het verwerken van gezondheidsgegevens.
 * Bij intrekking (`consent = false`) wordt `health_data_opted_in_at` teruggezet naar `null`.
 */
export async function setHealthDataConsent(
  userId: string,
  consent: boolean,
  consentPolicyVersion: string
): Promise<User> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);

  const now = new Date().toISOString();
  user.health_data_consent = consent;
  user.consent_policy_version = consentPolicyVersion;
  user.health_data_opted_in_at = consent ? now : null;
  user.updated_at = now;

  await writeStore(store);
  return user;
}

/** Zet het premium-abonnementsstatus van de gebruiker (freemium: ontgrendelt o.a. de AI-functies). */
/**
 * Zet het premium-abonnementsstatus van de gebruiker. Losstaand van health_data_consent: het
 * abonnement zelf is geen gezondheidsgegeven en moet ook door niet-geconsenteerde gebruikers
 * beheerd kunnen worden (bv. om alsnog te upgraden). De GDPR-gate op de AI-functies zelf
 * (ai-recognition.service) blijft health_data_consent wél apart afdwingen.
 */
export async function setPremiumStatus(userId: string, isPremium: boolean): Promise<User> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);

  user.is_premium = isPremium;
  user.updated_at = new Date().toISOString();

  await writeStore(store);
  return user;
}

/**
 * Registreert analytics- en gepersonaliseerde-advertentietoestemming. Dit zijn per GBA-richtlijn
 * bewust APARTE toestemmingen die los van elkaar en los van health_data_consent gegeven of
 * ingetrokken moeten kunnen worden (geen bundeling van toestemmingen). Deze functie vereist dus
 * bewust GEEN health_data_consent; alleen dat de gebruiker bestaat.
 */
export async function setAdConsent(
  userId: string,
  analyticsConsent: boolean,
  personalizedAdsConsent: boolean
): Promise<User> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);

  const now = new Date().toISOString();
  user.analytics_consent = analyticsConsent;
  user.personalized_ads_consent = personalizedAdsConsent;
  user.ad_consent_opted_in_at = now;
  user.updated_at = now;

  await writeStore(store);
  return user;
}

// --- UserProfile ---
// Elke wijziging maakt een nieuwe versie aan; de actuele versie heeft valid_to === null.

export type CreateUserProfileInput = Omit<UserProfile, 'id' | 'user_id' | 'valid_from' | 'valid_to'>;

export async function upsertUserProfile(
  userId: string,
  input: CreateUserProfileInput
): Promise<UserProfile> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  const now = new Date().toISOString();

  const currentProfile = store.userProfiles.find((p) => p.user_id === userId && p.valid_to === null);
  if (currentProfile) {
    currentProfile.valid_to = now;
  }

  const newProfile: UserProfile = {
    id: randomUUID(),
    user_id: userId,
    valid_from: now,
    valid_to: null,
    ...input,
  };

  store.userProfiles.push(newProfile);
  await writeStore(store);
  return newProfile;
}

export async function getCurrentUserProfile(userId: string): Promise<UserProfile | null> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  return store.userProfiles.find((p) => p.user_id === userId && p.valid_to === null) ?? null;
}

export async function getUserProfileHistory(userId: string): Promise<UserProfile[]> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  return store.userProfiles
    .filter((p) => p.user_id === userId)
    .sort((a, b) => a.valid_from.localeCompare(b.valid_from));
}

// --- Goal ---
// Doelgegevens (gewicht, tempo, trainingsfrequentie) zijn gezondheidsgegevens en dus GDPR-gated.

export type CreateGoalInput = Omit<Goal, 'id' | 'user_id' | 'status' | 'created_at' | 'updated_at'>;

export async function createGoal(userId: string, input: CreateGoalInput): Promise<Goal> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  const now = new Date().toISOString();

  // Maximaal één actief doel per gebruiker: bestaande actieve doelen worden geannuleerd.
  for (const goal of store.goals) {
    if (goal.user_id === userId && goal.status === 'active') {
      goal.status = 'cancelled';
      goal.updated_at = now;
    }
  }

  const newGoal: Goal = {
    id: randomUUID(),
    user_id: userId,
    status: 'active',
    created_at: now,
    updated_at: now,
    ...input,
  };

  store.goals.push(newGoal);
  await writeStore(store);
  return newGoal;
}

export async function getActiveGoal(userId: string): Promise<Goal | null> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  return store.goals.find((g) => g.user_id === userId && g.status === 'active') ?? null;
}

// --- DailyTarget ---
// Berekende dagdoelen (calorieën/macro's) zijn gezondheidsgegevens en dus GDPR-gated.

export type CreateDailyTargetInput = Omit<DailyTarget, 'id' | 'user_id' | 'created_at'>;

export async function createDailyTarget(
  userId: string,
  input: CreateDailyTargetInput
): Promise<DailyTarget> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  const alreadyExists = store.dailyTargets.some(
    (t) => t.user_id === userId && t.target_date === input.target_date
  );
  if (alreadyExists) {
    throw new Error(
      `Er bestaat al een daily target voor gebruiker ${userId} op ${input.target_date}.`
    );
  }

  const dailyTarget: DailyTarget = {
    id: randomUUID(),
    user_id: userId,
    created_at: new Date().toISOString(),
    ...input,
  };

  store.dailyTargets.push(dailyTarget);
  await writeStore(store);
  return dailyTarget;
}

export async function getDailyTarget(userId: string, targetDate: string): Promise<DailyTarget | null> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  return (
    store.dailyTargets.find((t) => t.user_id === userId && t.target_date === targetDate) ?? null
  );
}

// --- WeeklyGoal ---
// Weekaggregatie van doelen; een snapshot zodat latere profielwijzigingen eerdere weekrapportages niet beïnvloeden.

export type CreateWeeklyGoalInput = Omit<WeeklyGoal, 'id' | 'user_id' | 'status' | 'created_at' | 'updated_at'>;

export async function createWeeklyGoal(userId: string, input: CreateWeeklyGoalInput): Promise<WeeklyGoal> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  const alreadyExists = store.weeklyGoals.some(
    (g) => g.user_id === userId && g.week_start === input.week_start
  );
  if (alreadyExists) {
    throw new Error(
      `Er bestaat al een weekdoel voor gebruiker ${userId} vanaf ${input.week_start}.`
    );
  }

  const now = new Date().toISOString();
  const weeklyGoal: WeeklyGoal = {
    id: randomUUID(),
    user_id: userId,
    status: 'active',
    created_at: now,
    updated_at: now,
    ...input,
  };

  store.weeklyGoals.push(weeklyGoal);
  await writeStore(store);
  return weeklyGoal;
}

export async function getWeeklyGoalForWeek(userId: string, weekStart: string): Promise<WeeklyGoal | null> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  return store.weeklyGoals.find((g) => g.user_id === userId && g.week_start === weekStart) ?? null;
}

// --- WeeklyReport ---
// Door de "AI Coach" gegenereerd rapport, gebaseerd op uitsluitend geaggregeerde loggegevens.

export type CreateWeeklyReportInput = Omit<WeeklyReport, 'id' | 'user_id' | 'created_at'>;

export async function createWeeklyReport(
  userId: string,
  input: CreateWeeklyReportInput
): Promise<WeeklyReport> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  const report: WeeklyReport = {
    id: randomUUID(),
    user_id: userId,
    created_at: new Date().toISOString(),
    ...input,
  };

  store.weeklyReports.push(report);
  await writeStore(store);
  return report;
}

export async function getWeeklyReport(userId: string, weekStart: string): Promise<WeeklyReport | null> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  return store.weeklyReports.find((r) => r.user_id === userId && r.week_start === weekStart) ?? null;
}

// --- Streak & Badge (gamification) ---

function createEmptyStreak(userId: string): Streak {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    user_id: userId,
    current_length: 0,
    longest_length: 0,
    current_fiber_streak_length: 0,
    longest_fiber_streak_length: 0,
    last_evaluated_date: null,
    updated_at: now,
  };
}

export async function getOrCreateStreak(userId: string): Promise<Streak> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  const existing = store.streaks.find((s) => s.user_id === userId);
  if (existing) {
    return existing;
  }

  const streak = createEmptyStreak(userId);
  store.streaks.push(streak);
  await writeStore(store);
  return streak;
}

export type UpdateStreakInput = Partial<
  Omit<Streak, 'id' | 'user_id' | 'updated_at'>
>;

export async function updateStreak(userId: string, updates: UpdateStreakInput): Promise<Streak> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  const streak = store.streaks.find((s) => s.user_id === userId);
  if (!streak) {
    throw new NotFoundError('Streak', userId);
  }

  Object.assign(streak, updates, { updated_at: new Date().toISOString() });

  await writeStore(store);
  return streak;
}

/** Kent een badge toe (idempotent: geeft `null` terug als de gebruiker deze badge al heeft). */
export async function awardBadge(
  userId: string,
  badgeKey: string,
  metadata: JsonValue = {}
): Promise<Badge | null> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  const alreadyEarned = store.badges.some((b) => b.user_id === userId && b.badge_key === badgeKey);
  if (alreadyEarned) {
    return null;
  }

  const badge: Badge = {
    id: randomUUID(),
    user_id: userId,
    badge_key: badgeKey,
    earned_at: new Date().toISOString(),
    metadata,
  };

  store.badges.push(badge);
  await writeStore(store);
  return badge;
}

export async function getBadgesForUser(userId: string): Promise<Badge[]> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  return store.badges.filter((b) => b.user_id === userId);
}

// --- RecognitionRun ---
// Registreert elke foto-/spraakherkenningspoging, los van of deze uiteindelijk een meal_log oplevert.

export type CreateRecognitionRunInput = Omit<
  RecognitionRun,
  'id' | 'user_id' | 'status' | 'result_json' | 'error_code' | 'started_at' | 'completed_at'
>;

export async function createRecognitionRun(
  userId: string,
  input: CreateRecognitionRunInput
): Promise<RecognitionRun> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  const run: RecognitionRun = {
    id: randomUUID(),
    user_id: userId,
    status: 'started',
    result_json: null,
    error_code: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    ...input,
  };

  store.recognitionRuns.push(run);
  await writeStore(store);
  return run;
}

export type CompleteRecognitionRunInput = Pick<RecognitionRun, 'status' | 'result_json' | 'error_code'>;

export async function completeRecognitionRun(
  userId: string,
  runId: string,
  updates: Partial<CompleteRecognitionRunInput> & Pick<CompleteRecognitionRunInput, 'status'>
): Promise<RecognitionRun> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  const run = store.recognitionRuns.find((r) => r.id === runId && r.user_id === userId);
  if (!run) {
    throw new NotFoundError('RecognitionRun', runId);
  }

  run.status = updates.status;
  run.result_json = updates.result_json ?? null;
  run.error_code = updates.error_code ?? null;
  run.completed_at = new Date().toISOString();

  await writeStore(store);
  return run;
}

// --- MealLog ---

export type CreateMealLogInput = Omit<
  MealLog,
  'id' | 'user_id' | 'status' | 'created_at' | 'updated_at' | 'deleted_at'
>;

export async function createMealLog(userId: string, input: CreateMealLogInput): Promise<MealLog> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  const now = new Date().toISOString();
  const mealLog: MealLog = {
    id: randomUUID(),
    user_id: userId,
    status: 'logged',
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...input,
  };

  store.mealLogs.push(mealLog);
  await writeStore(store);
  return mealLog;
}

// MealItem-invoer zonder afgeleide velden; wordt uitsluitend samen met een meal_log aangemaakt
// (zie integriteitsregel: meal_log + meal_items + recognition-run horen in één transactie).
export type CreateMealItemInput = Omit<MealItem, 'id' | 'meal_log_id' | 'created_at' | 'updated_at'>;

export interface CreateMealLogWithItemsInput {
  mealLog: CreateMealLogInput;
  items: CreateMealItemInput[];
}

export async function createMealLogWithItems(
  userId: string,
  input: CreateMealLogWithItemsInput
): Promise<{ mealLog: MealLog; items: MealItem[] }> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  const now = new Date().toISOString();
  const mealLog: MealLog = {
    id: randomUUID(),
    user_id: userId,
    status: 'logged',
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...input.mealLog,
  };

  const items: MealItem[] = input.items.map((item) => ({
    id: randomUUID(),
    meal_log_id: mealLog.id,
    created_at: now,
    updated_at: now,
    ...item,
  }));

  store.mealLogs.push(mealLog);
  store.mealItems.push(...items);
  await writeStore(store);

  return { mealLog, items };
}

export async function getMealItemsForMealLog(userId: string, mealLogId: string): Promise<MealItem[]> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  const mealLog = store.mealLogs.find((m) => m.id === mealLogId && m.user_id === userId);
  if (!mealLog) {
    throw new NotFoundError('MealLog', mealLogId);
  }

  return store.mealItems
    .filter((item) => item.meal_log_id === mealLogId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function getMealLogById(userId: string, mealLogId: string): Promise<MealLog> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  const mealLog = store.mealLogs.find((m) => m.id === mealLogId && m.user_id === userId);
  if (!mealLog) {
    throw new NotFoundError('MealLog', mealLogId);
  }
  return mealLog;
}

export interface GetMealLogsOptions {
  localDate?: string;
  includeDeleted?: boolean;
}

export async function getMealLogsForUser(
  userId: string,
  options: GetMealLogsOptions = {}
): Promise<MealLog[]> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  return store.mealLogs.filter((m) => {
    if (m.user_id !== userId) return false;
    if (!options.includeDeleted && m.status === 'deleted') return false;
    if (options.localDate && m.local_date !== options.localDate) return false;
    return true;
  });
}

export type UpdateMealLogInput = Partial<Omit<MealLog, 'id' | 'user_id' | 'created_at'>>;

export async function updateMealLog(
  userId: string,
  mealLogId: string,
  updates: UpdateMealLogInput
): Promise<MealLog> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  const mealLog = store.mealLogs.find((m) => m.id === mealLogId && m.user_id === userId);
  if (!mealLog) {
    throw new NotFoundError('MealLog', mealLogId);
  }

  Object.assign(mealLog, updates, {
    status: updates.status ?? (mealLog.status === 'logged' ? 'edited' : mealLog.status),
    updated_at: new Date().toISOString(),
  });

  await writeStore(store);
  return mealLog;
}

export async function deleteMealLog(userId: string, mealLogId: string): Promise<MealLog> {
  const store = await readStore();
  const user = getUserOrThrow(store, userId);
  assertHealthDataConsent(user);

  const mealLog = store.mealLogs.find((m) => m.id === mealLogId && m.user_id === userId);
  if (!mealLog) {
    throw new NotFoundError('MealLog', mealLogId);
  }

  const now = new Date().toISOString();
  mealLog.status = 'deleted';
  mealLog.deleted_at = now;
  mealLog.updated_at = now;

  await writeStore(store);
  return mealLog;
}
