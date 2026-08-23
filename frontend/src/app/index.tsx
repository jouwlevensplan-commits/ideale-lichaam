import { Redirect } from 'expo-router';

import { useSession } from '@/services/session';

/**
 * Navigatiegate: leidt door naar de juiste flow op basis van de (in-memory) sessie.
 * Geen userId → (auth). Wel userId maar nog geen gezondheidsconsent → (onboarding).
 * Consent gegeven → (tabs). Zie session.ts voor de kanttekening over persistentie.
 */
export default function IndexGate() {
  const { userId, user } = useSession();

  if (!userId) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!user?.healthDataConsent) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)" />;
}
