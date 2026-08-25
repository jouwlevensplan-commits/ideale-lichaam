import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CalorieRing } from '@/components/CalorieRing';
import { Card } from '@/components/Card';
import { MacroProgressBar } from '@/components/MacroProgressBar';
import { MealLogRow } from '@/components/MealLogRow';
import { StreakBadge } from '@/components/StreakBadge';
import { SuggestionCard } from '@/components/SuggestionCard';
import { BottomSheet } from '@/components/BottomSheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as apiService from '@/services/api.service';
import { useSession } from '@/services/session';
import type { DailyTarget, DashboardTotals, MealLog } from '@/types/api.types';

const TODAY_FORMATTER = new Intl.DateTimeFormat('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });

const MEAL_TYPE_ICON: Record<string, string> = {
  breakfast: '🥣',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎',
};
const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: 'Ontbijt',
  lunch: 'Lunch',
  dinner: 'Diner',
  snack: 'Snack',
};
const ZERO_TOTALS: DashboardTotals = { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 };

/** Vertaalt één `meal_log` (met items) naar wat `MealLogRow` nodig heeft voor de "Vandaag gelogd"-lijst. */
function summarizeMealLog(log: MealLog): { icon: string; name: string; subtitle: string; caloriesKcal: number } {
  return {
    icon: (log.mealType && MEAL_TYPE_ICON[log.mealType]) || '🍴',
    name: log.items.map((item) => item.name).join(', ') || 'Maaltijd',
    subtitle: (log.mealType && MEAL_TYPE_LABEL[log.mealType]) || 'Maaltijd',
    caloriesKcal: log.items.reduce((total, item) => total + item.caloriesKcal, 0),
  };
}

export default function HomeDashboardScreen() {
  const theme = useTheme();
  const { user, dailyTarget: sessionDailyTarget } = useSession();
  const [addMealSheetVisible, setAddMealSheetVisible] = useState(false);
  const [streakLength, setStreakLength] = useState(0);
  const [reportCardVisible, setReportCardVisible] = useState(true);

  // Geïnitialiseerd met het caloriedoel uit de sessie (gezet net na onboarding/inloggen) zodat er
  // geen zichtbare terugval naar de placeholder-standaardwaarden is terwijl GET /api/dashboard/today
  // nog onderweg is; wordt hieronder overschreven zodra het echte antwoord binnenkomt.
  const [dailyTarget, setDailyTarget] = useState<DailyTarget | null>(sessionDailyTarget);
  const [totals, setTotals] = useState<DashboardTotals>(ZERO_TOTALS);
  const [todaysMeals, setTodaysMeals] = useState<MealLog[]>([]);

  useEffect(() => {
    apiService
      .getTodayDashboard()
      .then((response) => {
        // Geen daily_target in Postgres (bv. de demo-gebruiker, die de echte onboarding nooit
        // doorloopt): val terug op de sessie-waarde in plaats van de kaart leeg te tonen.
        setDailyTarget(response.dailyTarget ?? sessionDailyTarget);
        setTotals(response.totals);
        setTodaysMeals(response.mealLogs);
      })
      .catch(() => {
        // Stil falen: de kaart blijft de sessie-waarden tonen die al beschikbaar waren.
      });

    apiService
      .getDashboardStreak()
      .then(({ currentLength }) => setStreakLength(currentLength))
      .catch(() => {
        // Stil falen: de streak-indicator is decoratief, geen kritiek pad.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const caloriesGoal = dailyTarget?.caloriesKcal ?? 2000;
  const proteinGoal = dailyTarget?.proteinG ?? 130;
  const carbsGoal = dailyTarget?.carbsG ?? 200;
  const fatGoal = dailyTarget?.fatG ?? 65;

  const caloriesEaten = totals.caloriesKcal;
  const proteinEaten = totals.proteinG;
  const carbsEaten = totals.carbsG;
  const fatEaten = totals.fatG;

  const proteinRemainingG = Math.max(0, proteinGoal - proteinEaten);
  const carbsRemainingG = Math.max(0, carbsGoal - carbsEaten);

  const firstName = user?.id ? 'Sam' : 'daar';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <ThemedText type="small" themeColor="textMuted">
            {capitalize(TODAY_FORMATTER.format(new Date()))}
          </ThemedText>
          <View style={styles.avatarCircle}>
            <ThemedText type="smallBold" style={styles.avatarInitial}>
              {firstName.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        </View>

        <View style={styles.greetingRow}>
          <ThemedText type="title" style={styles.greeting}>
            Goedemorgen, {firstName}
          </ThemedText>
          <StreakBadge streakLength={streakLength} />
        </View>

        <Card>
          <View style={styles.calorieCardRow}>
            <CalorieRing
              caloriesRemaining={caloriesGoal - caloriesEaten}
              caloriesGoal={caloriesGoal}
              caloriesEaten={caloriesEaten}
            />
            <View style={styles.macroColumn}>
              <ThemedText type="small" themeColor="textSecondary">
                Doel {Math.round(caloriesGoal)} | {Math.round(caloriesEaten)} gegeten
              </ThemedText>
              <MacroProgressBar label="Eiwit" macro="protein" current={proteinEaten} target={proteinGoal} />
              <MacroProgressBar label="Koolh." macro="carbs" current={carbsEaten} target={carbsGoal} />
              <MacroProgressBar label="Vet" macro="fat" current={fatEaten} target={fatGoal} />
            </View>
          </View>
        </Card>

        {reportCardVisible && (
          <Card>
            <View style={styles.reportRow}>
              <ThemedText
                type="smallBold"
                onPress={() => {
                  setReportCardVisible(false);
                  router.push('/(tabs)/progress');
                }}>
                Je weekrapport is klaar →
              </ThemedText>
            </View>
          </Card>
        )}

        <Button
          label="📷  Fotografeer je maaltijd"
          onPress={() => setAddMealSheetVisible(true)}
        />

        <Card>
          <ThemedText type="smallBold" style={styles.suggestionTitle}>
            💡 Je hebt vanavond nog {Math.round(proteinRemainingG)}g eiwit en {Math.round(carbsRemainingG)}g
            koolhydraten nodig. Probeer:
          </ThemedText>
          <View style={styles.suggestionRow}>
            <SuggestionCard
              title="Kip (150g) + rijst (100g)"
              proteinG={35}
              carbsG={46}
              fatG={5}
              onPress={() => router.push('/(tabs)/diary')}
            />
            <SuggestionCard
              title="Griekse yoghurt + granola"
              proteinG={18}
              carbsG={20}
              fatG={3}
              onPress={() => router.push('/(tabs)/diary')}
            />
          </View>
        </Card>

        <View style={styles.loggedHeaderRow}>
          <ThemedText type="smallBold">Vandaag gelogd</ThemedText>
          <ThemedText type="linkPrimary" onPress={() => router.push('/(tabs)/diary')}>
            Alles zien
          </ThemedText>
        </View>

        {todaysMeals.length === 0 ? (
          <ThemedText type="small" themeColor="textMuted">
            Nog niets gelogd vandaag.
          </ThemedText>
        ) : (
          todaysMeals.map((log) => {
            const summary = summarizeMealLog(log);
            return (
              <MealLogRow
                key={log.id}
                icon={summary.icon}
                name={summary.name}
                subtitle={summary.subtitle}
                caloriesKcal={summary.caloriesKcal}
              />
            );
          })
        )}
      </ScrollView>

      <BottomSheet visible={addMealSheetVisible} onClose={() => setAddMealSheetVisible(false)}>
        <ThemedText type="smallBold">Maaltijd toevoegen</ThemedText>
        <Button
          label="📷  Foto (Premium AI-scanner)"
          onPress={() => {
            setAddMealSheetVisible(false);
            if (!user?.isPremium) {
              Alert.alert('Premium-functie', 'De AI-foto-scanner is beschikbaar met een Premium-abonnement.');
              return;
            }
            // TODO: integreer expo-camera + apiService.recognizeMealPhoto zodra camera-permissies zijn opgezet.
            Alert.alert('Binnenkort beschikbaar', 'De camera-integratie volgt in een volgende iteratie.');
          }}
        />
        <Button
          label="🎙️  Inspreken (Premium Spraak-logger)"
          variant="outline"
          onPress={() => {
            setAddMealSheetVisible(false);
            if (!user?.isPremium) {
              Alert.alert('Premium-functie', 'De AI-spraaklogger is beschikbaar met een Premium-abonnement.');
              return;
            }
            // TODO: integreer expo-av/speech-to-text + apiService.recognizeMealVoice.
            Alert.alert('Binnenkort beschikbaar', 'De spraakintegratie volgt in een volgende iteratie.');
          }}
        />
        <Button
          label="✍️  Handmatige invoer (Gratis)"
          variant="outline"
          onPress={() => {
            setAddMealSheetVisible(false);
            router.push('/(tabs)/diary');
          }}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E1F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#1D9E75',
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 26,
    lineHeight: 32,
  },
  calorieCardRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  macroColumn: {
    flex: 1,
    gap: Spacing.two,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  suggestionTitle: {
    marginBottom: Spacing.two,
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  loggedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
});
