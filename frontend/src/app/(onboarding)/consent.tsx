import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as apiService from '@/services/api.service';
import { setSession } from '@/services/session';
import { HealthDataConsentScreen } from '@/screens/onboarding/HealthDataConsentScreen';

/**
 * Scherm 2: GDPR Gezondheidsconsent (AVG art. 9). Verplichte juridische poort — zonder deze
 * toestemming kan de app geen voedings-/gewichtsplan opstellen, dus bij weigeren gaan we niet
 * automatisch door (in tegenstelling tot de cookiebanner, waar weigeren wél een volwaardig pad is).
 */
export default function HealthConsentScreen() {
  const theme = useTheme();
  const [declined, setDeclined] = useState(false);

  const handleConsent = async (accepted: boolean) => {
    if (!accepted) {
      setDeclined(true);
      return;
    }

    try {
      const user = await apiService.setHealthDataConsent(true);
      setSession({ user });
    } catch {
      // De backend-GDPR-gate blokkeert sowieso elke volgende stap zonder consent; we laten de
      // gebruiker hier optimistisch doorgaan en vangen een eventuele mislukking pas op bij het
      // afronden van de onboarding-slider.
    }

    router.replace('/(onboarding)/setup');
  };

  if (declined) {
    return (
      <SafeAreaView style={[styles.declinedContainer, { backgroundColor: theme.background }]}>
        <ThemedText type="subtitle" style={styles.declinedTitle}>
          Geen probleem
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.declinedBody}>
          Zonder deze toestemming kunnen we helaas geen persoonlijk voedings- en gewichtsplan voor
          je opstellen. Je kunt het opnieuw proberen zodra je zover bent.
        </ThemedText>
        <Button label="Terug naar het toestemmingsscherm" onPress={() => setDeclined(false)} />
      </SafeAreaView>
    );
  }

  return <HealthDataConsentScreen onConsent={handleConsent} />;
}

const styles = StyleSheet.create({
  declinedContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  declinedTitle: {
    fontSize: 24,
  },
  declinedBody: {
    lineHeight: 22,
  },
});
