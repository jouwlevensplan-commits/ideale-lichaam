import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BadgeTile } from '@/components/BadgeTile';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as apiService from '@/services/api.service';
import { useSession } from '@/services/session';
import type { WeeklyReport } from '@/types/api.types';

/**
 * Statische badge-catalogus: er is geen GET-endpoint dat alle mogelijke badges met hun
 * voorwaarden oplevert, dus dit lijstje spiegelt de badge-sleutels uit de backend
 * (`weekly-coach.service.ts`: 'seven_day_streak', 'fiber_king_7_days').
 */
const BADGE_CATALOG: { key: string; label: string; condition: string }[] = [
  { key: 'seven_day_streak', label: '7 dagen op rij', condition: 'Log 7 dagen op rij' },
  { key: 'fiber_king_7_days', label: 'Vezel-koning', condition: 'Behaal je vezeldoel 7 dagen op rij' },
];

function getMostRecentMonday(referenceDate: Date): string {
  const date = new Date(referenceDate);
  const day = date.getDay();
  const diffToMonday = (day + 6) % 7;
  date.setDate(date.getDate() - diffToMonday);
  return date.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function ProgressScreen() {
  const theme = useTheme();
  const { earnedBadgeKeys } = useSession();
  const [weekStart, setWeekStart] = useState(() => getMostRecentMonday(new Date()));
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback((targetWeekStart: string) => {
    setLoading(true);
    setError(null);
    apiService
      .getWeeklyReport(targetWeekStart)
      .then(setReport)
      .catch((err) => {
        setReport(null);
        setError(err instanceof Error ? err.message : 'Kon het weekrapport niet ophalen.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Standaard "fetch-on-dependency-change"-patroon: loading/error synchroon resetten vóór de
    // async aanroep is hier bewust en veilig (geen oneindige lus, geen externe systeem-sync-issue).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReport(weekStart);
  }, [weekStart, loadReport]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Voortgang
        </ThemedText>

        <View>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Badges & Streaks
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeRow}>
            {BADGE_CATALOG.map((badge) => (
              <BadgeTile
                key={badge.key}
                label={badge.label}
                condition={badge.condition}
                earned={earnedBadgeKeys.includes(badge.key)}
              />
            ))}
          </ScrollView>
        </View>

        <View>
          <View style={styles.weekNavRow}>
            <Button label="← Vorige week" variant="outline" onPress={() => setWeekStart((prev) => addDays(prev, -7))} />
            <Button label="Volgende week →" variant="outline" onPress={() => setWeekStart((prev) => addDays(prev, 7))} />
          </View>

          <ThemedText type="small" themeColor="textMuted" style={styles.weekLabel}>
            Week van {weekStart}
          </ThemedText>

          <Card>
            {loading && <ThemedText type="small">Rapport laden...</ThemedText>}
            {!loading && error && (
              <ThemedText type="small" themeColor="textMuted">
                Nog geen rapport beschikbaar voor deze week.
              </ThemedText>
            )}
            {!loading && report && (
              <>
                <ThemedText type="default" style={styles.reportText}>
                  {report.reportText}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.reportMeta}>
                  {report.aggregation.daysLogged} van de 7 dagen gelogd
                </ThemedText>
              </>
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  title: {
    fontSize: 26,
  },
  sectionTitle: {
    marginBottom: Spacing.two,
  },
  badgeRow: {
    gap: Spacing.two,
  },
  weekNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  weekLabel: {
    marginTop: Spacing.one,
    marginBottom: Spacing.two,
  },
  reportText: {
    lineHeight: 22,
  },
  reportMeta: {
    marginTop: Spacing.two,
  },
});
