import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import * as apiService from '@/services/api.service';
import { CookieBanner, type CookiePreferences } from '@/screens/onboarding/CookieBanner';
import { useTheme } from '@/hooks/use-theme';

/**
 * Scherm 1: ePrivacy Cookiebanner Gate. Verschijnt blokkerend bij de eerste opstart (na login/
 * registratie, zodat `setAdConsent` een bestaande userId heeft — zie session.ts).
 */
export default function CookieGateScreen() {
  const theme = useTheme();
  const [saving, setSaving] = useState(false);

  const savePreferencesAndContinue = async (preferences: CookiePreferences) => {
    setSaving(true);
    try {
      await apiService.setAdConsent({
        analyticsConsent: preferences.analytics,
        personalizedAdsConsent: preferences.personalizedAds,
      });
    } catch {
      // Cookiekeuzes zijn niet blokkerend voor de rest van de onboarding: bij een tijdelijke
      // netwerkfout gaan we toch door, de gebruiker kan dit later nog aanpassen in Profiel.
    } finally {
      setSaving(false);
      router.replace('/(onboarding)/consent');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.heroSection}>
        <ThemedText style={styles.heroEmoji}>🍃</ThemedText>
        <ThemedText type="subtitle" style={styles.heroTitle}>
          Uw privacy, uw keuze
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.heroSubtitle}>
          We gebruiken enkel de cookies die u toestaat.
        </ThemedText>
      </View>

      <CookieBanner
        onAcceptAll={() => savePreferencesAndContinue({ analytics: true, personalizedAds: true })}
        onRejectAll={() => savePreferencesAndContinue({ analytics: false, personalizedAds: false })}
        onSavePreferences={savePreferencesAndContinue}
      />

      {saving ? (
        <ThemedText type="small" themeColor="textMuted" style={styles.savingHint}>
          Voorkeuren opslaan...
        </ThemedText>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  heroSection: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingBottom: Spacing.three,
  },
  heroEmoji: {
    fontSize: 40,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  heroSubtitle: {
    textAlign: 'center',
  },
  savingHint: {
    textAlign: 'center',
  },
});
