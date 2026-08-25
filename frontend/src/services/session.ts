import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { DailyTarget, UserAccount, WeeklyGoal } from '@/types/api.types';

/**
 * Sessie-store met lokale persistentie via AsyncStorage. Bewaart de ingelogde gebruiker, het
 * caloriedoel en de GDPR-toestemmingen (health consent zit op `user.healthDataConsent`;
 * `cookieConsentGiven` registreert apart of de cookiebanner al doorlopen is, want de backend
 * kent geen "nog niet gevraagd"-status voor analytics-/ads-consent). Bij het opstarten van de
 * app moet `hydrateSession()` eenmalig worden aangeroepen (zie `app/_layout.tsx`) vóór de
 * navigatiegate (`app/index.tsx`) de opgeslagen sessie leest — anders flashen we even naar login.
 */
export interface SessionState {
  userId: string | null;
  /** JWT (`Authorization: Bearer <token>`), zie `services/api.service.ts#apiFetch`. `null` zolang er geen sessie is. */
  token: string | null;
  user: UserAccount | null;
  dailyTarget: DailyTarget | null;
  weeklyGoal: WeeklyGoal | null;
  /** Lokaal onthouden of de gebruiker de cookiebanner al heeft afgehandeld (accepteren/weigeren/opslaan). */
  cookieConsentGiven: boolean;
  /**
   * Badges behaald tijdens deze sessie (er is geen GET-endpoint dat de volledige, historische
   * badge-collectie ophaalt — enkel `POST /api/coach/streaks/update` retourneert nieuw behaalde
   * badges). We bewaren ze lokaal zodat ze ook na een herstart zichtbaar blijven.
   */
  earnedBadgeKeys: string[];
  /** True zodra de opgeslagen sessie is ingelezen vanuit AsyncStorage. Zie `hydrateSession()`. */
  hydrated: boolean;
}

const STORAGE_KEY = 'maaltijdtracker.session.v1';

const EMPTY_PERSISTED_STATE: PersistedSessionState = {
  userId: null,
  token: null,
  user: null,
  dailyTarget: null,
  weeklyGoal: null,
  cookieConsentGiven: false,
  earnedBadgeKeys: [],
};

type PersistedSessionState = Omit<SessionState, 'hydrated'>;

let state: SessionState = { ...EMPTY_PERSISTED_STATE, hydrated: false };

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function persist(): Promise<void> {
  const { hydrated: _hydrated, ...persisted } = state;
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)).catch(() => {
    // Lokale opslag mag nooit de UI blokkeren; bij een schrijffout proberen we het gewoon
    // opnieuw bij de volgende `setSession`-aanroep.
  });
}

export function getSession(): SessionState {
  return state;
}

export function setSession(patch: Partial<SessionState>): void {
  state = { ...state, ...patch };
  emit();
  persist();
}

export function clearSession(): void {
  state = { ...EMPTY_PERSISTED_STATE, hydrated: true };
  emit();
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

export function addEarnedBadges(badgeKeys: string[]): void {
  if (badgeKeys.length === 0) return;
  const merged = new Set([...state.earnedBadgeKeys, ...badgeKeys]);
  setSession({ earnedBadgeKeys: [...merged] });
}

// --- Demo-login ---
// `apiService.demoLogin()` (alleen aangeroepen vanachter de __DEV__-gate in app/(auth)/login.tsx)
// haalt een echte JWT op voor de vaste, geseede demo-gebruiker "Sam" — zie
// controllers/auth.controller.ts#demoLogin op de backend. `applyDemoDashboardFixture()` overlayt
// daarna enkel de dashboardcijfers (caloriedoel/macro's) lokaal, zodat de demo-sessie meteen een
// gevulde UI toont zonder dat "Sam" eerst de echte onboarding moet doorlopen.

// Moet exact overeenkomen met `DEMO_USER_ID` in de backend-seed (src/db/seeds/demo-user.seed.ts):
// dat is de vaste rij waarvoor `POST /api/auth/demo-login` een token uitgeeft.
const DEMO_USER_ID = '11111111-1111-4111-8111-111111111111';

/** True als `userId` de vaste, geseede demo-gebruiker "Sam" is (zie `applyDemoDashboardFixture`), niet een door een echte gebruiker geregistreerd account. */
export function isDemoUserId(userId: string | null): boolean {
  return userId === DEMO_USER_ID;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Maandag van de week waarin `date` valt (lokale tijd), zoals ook de backend voor weekly_goals hanteert. */
function mondayOf(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diffToMonday);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function buildDemoDashboardFixture(): Pick<SessionState, 'dailyTarget' | 'weeklyGoal' | 'cookieConsentGiven'> {
  const today = new Date();
  const weekStart = mondayOf(today);
  const weekEnd = addDays(weekStart, 7);

  const caloriesKcal = 2200;
  const proteinG = 150;
  const fiberG = 30;

  return {
    dailyTarget: {
      targetDate: toISODate(today),
      caloriesKcal,
      proteinG,
      carbsG: 220,
      fatG: 70,
      fiberG,
    },
    weeklyGoal: {
      weekStart: toISODate(weekStart),
      weekEnd: toISODate(weekEnd),
      caloriesKcal: caloriesKcal * 7,
      proteinG: proteinG * 7,
      fiberG: fiberG * 7,
    },
    cookieConsentGiven: true,
  };
}

/**
 * Past een net via `apiService.demoLogin()` opgehaalde echte sessie (gebruiker + JWT voor "Sam")
 * toe, overlayd met gemockte dashboardcijfers: de demo-gebruiker heeft in Postgres wel actieve
 * GDPR-toestemmingen (zie de seed) maar geen echt `daily_targets`/`weekly_goals`-record, omdat
 * "Sam" nooit echt de onboarding doorloopt. Zo blijft de demo-flow zowel visueel meteen gevuld als
 * functioneel echt: latere aanroepen (maaltijd loggen, product zoeken) gebruiken de echte JWT.
 */
export async function applyDemoDashboardFixture(auth: { userId: string; user: UserAccount; token: string }): Promise<void> {
  state = { ...state, userId: auth.userId, user: auth.user, token: auth.token, ...buildDemoDashboardFixture() };
  emit();
  await persist();
}

/**
 * Leest de opgeslagen sessie in vanuit AsyncStorage. Wordt eenmalig aangeroepen bij het opstarten
 * van de app (`app/_layout.tsx`), zodat een ingelogde gebruiker niet opnieuw hoeft in te loggen en
 * eerder afgehandelde GDPR-toestemmingen niet opnieuw worden gevraagd.
 */
export async function hydrateSession(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const persisted: PersistedSessionState = raw ? JSON.parse(raw) : EMPTY_PERSISTED_STATE;
    state = { ...persisted, hydrated: true };
  } catch {
    // Corrupte of onleesbare opslag: start met een lege sessie in plaats van te crashen.
    state = { ...EMPTY_PERSISTED_STATE, hydrated: true };
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React-hook variant van de sessie-store, herrendert bij elke `setSession`/`clearSession`. */
export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSession, getSession);
}
