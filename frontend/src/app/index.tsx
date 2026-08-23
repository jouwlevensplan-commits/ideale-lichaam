import { Redirect } from 'expo-router';

import { useSession } from '@/services/session';

/**
 * Navigatiegate: leidt door naar de juiste flow op basis van de lokaal opgeslagen sessie (zie
 * `services/session.ts`). Toont niets zolang `hydrated` nog false is — anders zouden we bij elke
 * herstart eerst een fractie van een seconde naar login/onboarding redirecten voordat de
 * opgeslagen sessie is ingelezen. Geen userId → (auth). Wel userId maar nog geen
 * gezondheidsconsent → (onboarding). Consent gegeven → (tabs).
 */
export default function IndexGate() {
  const { hydrated, userId, user } = useSession();

  if (!hydrated) {
    return null;
  }

  if (!userId) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!user?.healthDataConsent) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)" />;
}
