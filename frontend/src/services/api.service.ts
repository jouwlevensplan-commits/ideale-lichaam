import type {
  CompleteOnboardingPayload,
  CompleteOnboardingResponse,
  LogMealPayload,
  MealLog,
  ProductSearchResult,
  RecognitionResponse,
  RecognizePhotoPayload,
  RecognizeVoicePayload,
  SetAdConsentPayload,
  StreakResponse,
  TodayDashboardResponse,
  UpdateStreaksResponse,
  UserAccount,
  WeeklyReport,
} from '@/types/api.types';

import { getSession } from './session';

const API_BASE_URL = 'https://p01--ideale-lichaam--kbd9hgdzc7ny.code.run';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Stuurt expliciet géén Authorization-header mee (login/register/demo-login, vóór er een sessie is; en de publieke productzoekfunctie). */
  skipAuth?: boolean;
}

/**
 * Gedeelde fetch-wrapper. Stuurt de ingelogde gebruiker als `Authorization: Bearer <token>`
 * (`skipAuth: true` slaat dit over) — de JWT komt uit `services/auth.controller.ts` op de backend
 * via `POST /api/auth/{register,login,demo-login}` en wordt lokaal bewaard in `session.ts`.
 */
async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuth = false } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (!skipAuth) {
    const { token } = getSession();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ApiError(`Kon geen verbinding maken met de server (${path}): ${reason}`);
  }

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new ApiError(
      `API-aanroep ${method} ${path} mislukt (status ${response.status}). ${message}`.trim(),
      response.status
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

// --- Health check -------------------------------------------------------------

export interface HealthStatusResponse {
  status: string;
}

/** Vraagt de /health-status van de backend op. */
export async function fetchHealthStatus(): Promise<HealthStatusResponse> {
  return apiFetch<HealthStatusResponse>('/health', { skipAuth: true });
}

// --- 1. Onboarding voltooien ---------------------------------------------------

export async function completeOnboarding(
  payload: CompleteOnboardingPayload
): Promise<CompleteOnboardingResponse> {
  return apiFetch<CompleteOnboardingResponse>('/api/onboarding/complete', { method: 'POST', body: payload });
}

// --- 2. Producten zoeken (altijd gratis, geen premium/consent vereist) ---------

export async function searchProducts(queryOrBarcode: string): Promise<ProductSearchResult[]> {
  const params = new URLSearchParams({ queryOrBarcode });
  return apiFetch<ProductSearchResult[]>(`/api/products/search?${params.toString()}`);
}

// --- 3. Maaltijd handmatig loggen (altijd gratis) ------------------------------

export async function logMeal(payload: LogMealPayload): Promise<MealLog> {
  return apiFetch<MealLog>('/api/meals/log', { method: 'POST', body: payload });
}

// --- 4 & 5. AI-herkenning (Premium; backend controleert is_premium + consent) --

export async function recognizeMealPhoto(payload: RecognizePhotoPayload): Promise<RecognitionResponse> {
  return apiFetch<RecognitionResponse>('/api/ai/recognition/photo', { method: 'POST', body: payload });
}

export async function recognizeMealVoice(payload: RecognizeVoicePayload): Promise<RecognitionResponse> {
  return apiFetch<RecognitionResponse>('/api/ai/recognition/voice', { method: 'POST', body: payload });
}

// --- 6. Wekelijkse coach & streaks ----------------------------------------------

export async function getWeeklyReport(weekStartDate: string): Promise<WeeklyReport> {
  const params = new URLSearchParams({ weekStartDate });
  return apiFetch<WeeklyReport>(`/api/coach/weekly-report?${params.toString()}`);
}

export async function updateStreaks(): Promise<UpdateStreaksResponse> {
  return apiFetch<UpdateStreaksResponse>('/api/coach/streaks/update', { method: 'POST' });
}

// --- 7. Dashboard: vandaag & streak ---------------------------------------------

/** Doel, dagtotalen (som van vandaag gelogde meal_items) en de lijst van vandaag gelogde maaltijden (met items). */
export async function getTodayDashboard(): Promise<TodayDashboardResponse> {
  return apiFetch<TodayDashboardResponse>('/api/dashboard/today');
}

export async function getDashboardStreak(): Promise<StreakResponse> {
  return apiFetch<StreakResponse>('/api/dashboard/streak');
}

// --- Consent-beheer -------------------------------------------------------------
// LET OP: deze twee endpoint-paden staan niet in het gedocumenteerde API-contract (§5) — de spec
// noemt enkel de onderliggende backend-servicefuncties (`setAdConsent`, `setHealthDataConsent`).
// Onderstaande paden zijn een redelijke, expliciet gemarkeerde aanname; stem af met de backend
// zodra die endpoints er zijn.

export async function setHealthDataConsent(accepted: boolean): Promise<UserAccount> {
  return apiFetch<UserAccount>('/api/consent/health', { method: 'POST', body: { accepted } });
}

export async function setAdConsent(payload: SetAdConsentPayload): Promise<UserAccount> {
  return apiFetch<UserAccount>('/api/consent/ads', { method: 'POST', body: payload });
}

// --- Authenticatie ---------------------------------------------------------------

export interface AuthPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserAccount;
  /** JWT; bewaar in `session.ts` en stuur nadien mee als `Authorization: Bearer <token>`. */
  token: string;
}

export async function login(payload: AuthPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', { method: 'POST', body: payload, skipAuth: true });
}

export async function register(payload: AuthPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', { method: 'POST', body: payload, skipAuth: true });
}

/**
 * Dev-only: haalt een echte JWT op voor de vaste, geseede demo-gebruiker "Sam", zonder wachtwoord
 * (backend: `controllers/auth.controller.ts#demoLogin`). Enkel aangeroepen vanachter de
 * `__DEV__`-gate op het loginscherm — zie `app/(auth)/login.tsx`.
 */
export async function demoLogin(): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/demo-login', { method: 'POST', skipAuth: true });
}

export async function deleteAccount(): Promise<void> {
  return apiFetch<void>('/api/account', { method: 'DELETE' });
}
