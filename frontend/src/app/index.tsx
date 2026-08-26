import { Redirect } from 'expo-router';

import { useSession } from '@/services/session';

/**
 * Navigatiegate: leidt door naar de juiste flow op basis van de lokaal opgeslagen sessie (zie
 * `services/session.ts`). Toont niets zolang `hydrated` nog false is — anders zouden we bij elke
 * herstart eerst een fractie van een seconde naar login/onboarding redirecten voordat de
 * opgeslagen sessie is ingelezen. Geen userId of geen token → (auth). Wel ingelogd maar nog geen
 * gezondheidsconsent → (onboarding). Consent gegeven → (tabs).
 *
 * De `token`-check is bewust apart van de `userId`-check: vóór de JWT-authenticatie bestond
 * `SessionState` niet met een `token`-veld, dus een sessie die al op een toestel stond ván vóór
 * die uitbreiding herstelt via `hydrateSession()` met `userId`/`user` wel gezet maar `token`
 * ontbrekend. Zonder deze check zou zo'n sessie hier onopgemerkt als "ingelogd" doorgaan naar
 * (tabs), terwijl `apiFetch` (services/api.service.ts) vervolgens geen Authorization-header kan
 * meesturen — precies de 401-op-POST-/api/meals/log-bug die dit bestand nu voorkomt.
 */
export default function IndexGate() {
  const { hydrated, userId, token, user } = useSession();

  if (!hydrated) {
    return null;
  }

  if (!userId || !token) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!user?.healthDataConsent) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)" />;
}
