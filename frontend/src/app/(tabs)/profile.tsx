import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Checkbox } from '@/components/Checkbox';
import { ThemedText } from '@/components/themed-text';
import { Spacing, StatusColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as apiService from '@/services/api.service';
import { COMPANY_LEGAL_INFO, SAAS_WITHDRAWAL_COPY } from '@/services/legal-copy';
import { clearSession, setSession, useSession } from '@/services/session';

/** Scherm 7: Profiel, SaaS-abonnement (WER-disclaimer) & instellingen. */
export default function ProfileScreen() {
  const theme = useTheme();
  const { user } = useSession();
  const [withdrawalChecked, setWithdrawalChecked] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(user?.analyticsConsent ?? false);
  const [personalizedAdsConsent, setPersonalizedAdsConsent] = useState(user?.personalizedAdsConsent ?? false);
  const [savingConsent, setSavingConsent] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const startSubscription = async () => {
    setSubscribing(true);
    try {
      // LET OP: er is nog geen `/api/subscription/start`-endpoint gedocumenteerd (§5). Dit toont
      // de vereiste WER-flow; de daadwerkelijke abonnements-/betaalintegratie volgt later.
      Alert.alert('Proefperiode gestart', 'Je 5-daagse gratis proefperiode is gestart.');
    } finally {
      setSubscribing(false);
    }
  };

  const updateAdConsent = async (next: { analyticsConsent: boolean; personalizedAdsConsent: boolean }) => {
    setSavingConsent(true);
    try {
      const updatedUser = await apiService.setAdConsent(next);
      setSession({ user: updatedUser });
    } catch (err) {
      Alert.alert('Mislukt', err instanceof Error ? err.message : 'Kon je voorkeuren niet opslaan.');
    } finally {
      setSavingConsent(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Account verwijderen',
      'Weet je zeker dat je je account en alle gezondheidsgegevens definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.',
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await apiService.deleteAccount();
              clearSession();
              router.replace('/');
            } catch (err) {
              Alert.alert('Mislukt', err instanceof Error ? err.message : 'Kon het account niet verwijderen.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Profiel
        </ThemedText>

        <Card style={styles.section}>
          <ThemedText type="smallBold">Abonnement</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Premium: AI-maaltijdscanner (Foto AI) en AI-spraaklogger (Spraak AI). €9,99 / maand na een
            proefperiode van 5 dagen.
          </ThemedText>

          {user?.isPremium ? (
            <ThemedText type="smallBold" style={{ color: StatusColors.success }}>
              Je hebt een actief Premium-abonnement.
            </ThemedText>
          ) : (
            <>
              <Checkbox
                checked={withdrawalChecked}
                onChange={setWithdrawalChecked}
                label={SAAS_WITHDRAWAL_COPY.checkboxLabel}
              />
              <Button
                label={subscribing ? 'Bezig...' : 'Start Proefperiode'}
                onPress={startSubscription}
                disabled={!withdrawalChecked || subscribing}
              />
            </>
          )}
        </Card>

        <Card style={styles.section}>
          <ThemedText type="smallBold">GDPR-privacybeheer</ThemedText>

          <View style={styles.switchRow}>
            <ThemedText type="small" style={styles.switchLabel}>
              Analytische toestemming
            </ThemedText>
            <Switch
              value={analyticsConsent}
              disabled={savingConsent}
              onValueChange={(value) => {
                setAnalyticsConsent(value);
                updateAdConsent({ analyticsConsent: value, personalizedAdsConsent });
              }}
              trackColor={{ true: StatusColors.accent }}
            />
          </View>

          <View style={styles.switchRow}>
            <ThemedText type="small" style={styles.switchLabel}>
              Gepersonaliseerde advertenties
            </ThemedText>
            <Switch
              value={personalizedAdsConsent}
              disabled={savingConsent}
              onValueChange={(value) => {
                setPersonalizedAdsConsent(value);
                updateAdConsent({ analyticsConsent, personalizedAdsConsent: value });
              }}
              trackColor={{ true: StatusColors.accent }}
            />
          </View>
        </Card>

        <Card style={styles.section}>
          <ThemedText type="smallBold">Juridische informatie</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Verplichte ondernemingsgegevens conform Boek VI van het Wetboek van Economisch Recht (WER).
          </ThemedText>

          <View style={styles.legalList}>
            <LegalInfoRow label="Maatschappelijke naam" value={COMPANY_LEGAL_INFO.companyName} />
            <LegalInfoRow label="KBO-nummer" value={COMPANY_LEGAL_INFO.kboNumber} />
            <LegalInfoRow label="Btw-nummer" value={COMPANY_LEGAL_INFO.vatNumber} />
            <LegalInfoRow label="Maatschappelijke zetel" value={COMPANY_LEGAL_INFO.registeredOffice} />
            <LegalInfoRow label="E-mailadres" value={COMPANY_LEGAL_INFO.email} />
          </View>
        </Card>

        <Button
          label={deleting ? 'Bezig...' : 'Verwijder Mijn Account & Alle Gezondheidsdata'}
          onPress={confirmDeleteAccount}
          disabled={deleting}
          color={StatusColors.error}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function LegalInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.legalRow}>
      <ThemedText type="small" themeColor="textMuted">
        {label}
      </ThemedText>
      <ThemedText type="small">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 26,
  },
  section: {
    gap: Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    flex: 1,
  },
  legalList: {
    gap: Spacing.two,
  },
  legalRow: {
    gap: 2,
  },
});
