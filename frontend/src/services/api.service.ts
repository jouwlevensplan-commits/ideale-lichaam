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
  /** Stuurt expliciet géén X-User-Id-header mee (bv. voor login/register, vóór er een sessie is). */
  skipAuth?: boolean;
}

/**
 * Gedeelde fetch-wrapper. Verstuurt de ingelogde gebruiker vooralsnog via een `X-User-Id`-header
 * (`skipAuth: true` slaat dit over). Dit is een BEWUST PROVISORISCH authenticatieschema: het
 * API-contract in `frontend-design-spec-v2.md` §5 documenteert nog geen tokenmechanisme (JWT/sessie
 * cookie) of `/api/auth/*`-endpoints. Vervang dit zodra de backend een echte auth-flow aanbiedt.
 */
async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuth = false } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (!skipAuth) {
    const { userId } = getSession();
    if (userId) headers['X-User-Id'] = userId;
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
// LET OP: ook dit contract is niet gedocumenteerd in §5. De backend User-tabel gebruikt
// `auth_provider`/`auth_subject` (bv. voor OAuth-achtige providers), niet per se e-mail/wachtwoord.
// Dit is een provisorische, e-mail-gebaseerde aanname totdat het echte auth-mechanisme vastligt.

export interface AuthPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserAccount;
}

export async function login(payload: AuthPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', { method: 'POST', body: payload, skipAuth: true });
}

export async function register(payload: AuthPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', { method: 'POST', body: payload, skipAuth: true });
}

export async function deleteAccount(): Promise<void> {
  return apiFetch<void>('/api/account', { method: 'DELETE' });
}
