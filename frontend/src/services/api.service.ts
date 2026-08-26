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

import { clearSession, getSession } from './session';

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
    // Tijdelijke diagnostische log voor de 401-op-/api/meals/log-bug: laat in de Metro/device-logs
    // zien of er überhaupt een token in de sessie zit vóórdat het request vertrekt, zodat "header
    // wordt niet verstuurd" en "token ontbreekt in de sessie" niet langer door elkaar lopen.
    console.log(`[apiFetch] ${method} ${path} — token ${token ? `gevonden (${token.slice(0, 12)}...)` : 'ONTBREEKT'}`);
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.log(`[apiFetch] ${method} ${path} — skipAuth: geen Authorization-header verstuurd`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    // Geen verbinding (offline, DNS, timeout, ...): de ruwe reden (`error.message`) is intern
    // nuttig maar niet iets een gebruiker moet lezen, dus enkel loggen en een vaste, vriendelijke
    // boodschap tonen.
    console.warn(`Netwerkfout bij ${method} ${path}:`, error);
    throw new ApiError('Kon geen verbinding maken met de server. Controleer je internetverbinding en probeer het opnieuw.');
  }

  if (!response.ok) {
    if (response.status === 401 && !skipAuth) {
      // De token die we meestuurden (of het ontbreken ervan) is door de backend afgewezen: een
      // eerder ingelogde sessie zonder geldig token zou anders "ingelogd" blijven lijken (zie de
      // navigatiegate in app/index.tsx, die enkel userId/consent checkt) terwijl elke
      // geauthenticeerde aanroep alsnog met een 401 faalt. Wis de sessie zodat de gebruiker bij de
      // volgende gate-check terug naar /(auth)/login gaat i.p.v. onopgemerkt met een dode sessie
      // te blijven zitten.
      console.warn(`[apiFetch] ${method} ${path} — 401 ontvangen, sessie wordt lokaal gewist.`);
      clearSession();
    }

    const bodyText = await response.text().catch(() => '');
    // De backend stuurt foutrespons als JSON ({ error, message }, zie middleware/error-handler.ts)
    // met een al-Nederlandstalige, gebruiksklare `message`; die geven we door in plaats van de
    // ruwe JSON-tekst te tonen. Alleen als het antwoord geen geldige JSON is (bv. een onverwachte
    // 502 van een proxy) valt dit terug op een generieke boodschap.
    let friendlyMessage: string | undefined;
    try {
      const parsed = JSON.parse(bodyText) as { message?: unknown };
      if (typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
        friendlyMessage = parsed.message;
      }
    } catch {
      // Geen JSON-body: negeren, val terug op de generieke boodschap hieronder.
    }

    throw new ApiError(
      friendlyMessage ?? `Er ging iets mis (foutcode ${response.status}). Probeer het later opnieuw.`,
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
