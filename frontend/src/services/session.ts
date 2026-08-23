import { useSyncExternalStore } from 'react';

import type { DailyTarget, UserAccount, WeeklyGoal } from '@/types/api.types';

/**
 * Minimale, in-memory sessie-store (geen AsyncStorage/SecureStore geïnstalleerd). De sessie gaat
 * dus verloren bij het herladen/herstarten van de app. Vervang dit vóór productiegebruik door een
 * persistente store (bv. `@react-native-async-storage/async-storage` of `expo-secure-store`) plus
 * een echt token-gebaseerd authenticatiemechanisme.
 */
export interface SessionState {
  userId: string | null;
  user: UserAccount | null;
  dailyTarget: DailyTarget | null;
  weeklyGoal: WeeklyGoal | null;
  /**
   * Badges behaald tijdens deze sessie (er is geen GET-endpoint dat de volledige, historische
   * badge-collectie ophaalt — enkel `POST /api/coach/streaks/update` retourneert nieuw behaalde
   * badges). Gaat dus verloren bij herladen, net als de rest van deze sessie.
   */
  earnedBadgeKeys: string[];
}

let state: SessionState = {
  userId: null,
  user: null,
  dailyTarget: null,
  weeklyGoal: null,
  earnedBadgeKeys: [],
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function getSession(): SessionState {
  return state;
}

export function setSession(patch: Partial<SessionState>): void {
  state = { ...state, ...patch };
  emit();
}

export function clearSession(): void {
  state = { userId: null, user: null, dailyTarget: null, weeklyGoal: null, earnedBadgeKeys: [] };
  emit();
}

export function addEarnedBadges(badgeKeys: string[]): void {
  if (badgeKeys.length === 0) return;
  const merged = new Set([...state.earnedBadgeKeys, ...badgeKeys]);
  setSession({ earnedBadgeKeys: [...merged] });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React-hook variant van de sessie-store, herrendert bij elke `setSession`/`clearSession`. */
export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSession, getSession);
}
