import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { ThemedText } from '@/components/themed-text';
import { StatusColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { HEALTH_DATA_CONSENT_COPY } from '@/services/legal-copy';

export interface HealthDataConsentScreenProps {
  onConsent: (accepted: boolean) => void;
}

export function HealthDataConsentScreen({ onConsent }: HealthDataConsentScreenProps) {
  const theme = useTheme();
  const [checked, setChecked] = useState(false);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {HEALTH_DATA_CONSENT_COPY.title}
      </ThemedText>

      <ThemedText type="default" style={styles.bodyText}>
        {HEALTH_DATA_CONSENT_COPY.bodyText}
      </ThemedText>

      <View style={styles.categoryList}>
        {HEALTH_DATA_CONSENT_COPY.dataCategories.map((category) => (
          <ThemedText key={category} type="small">
            {'• '}
            {category}
          </ThemedText>
        ))}
      </View>

      <Checkbox
        checked={checked}
        onChange={setChecked}
        label={HEALTH_DATA_CONSENT_COPY.checkboxLabel}
        accentColor={StatusColors.accent}
      />

      <ThemedText type="small" themeColor="textSecondary" style={styles.withdrawalReminder}>
        {HEALTH_DATA_CONSENT_COPY.withdrawalReminder}
      </ThemedText>

      {/*
        Anti-dark-pattern, consistent met de cookiebanner: "Niet nu" en "Ik ga akkoord" delen
        dezelfde grootte en vorm (flex: 1, zelfde Button-variant). Weigeren mag hier niet
        visueel ondergeschikt ogen aan akkoord gaan.
      */}
      <View style={styles.actionsRow}>
        <Button
          label="Niet nu"
          onPress={() => onConsent(false)}
          variant="solid"
          color={theme.border}
          textColor={theme.text}
          style={styles.actionButton}
        />
        <Button
          label="Ik ga akkoord"
          onPress={() => onConsent(true)}
          variant="solid"
          color={StatusColors.accent}
          textColor="#FFFFFF"
          disabled={!checked}
          style={styles.actionButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  bodyText: {
    lineHeight: 24,
  },
  categoryList: {
    gap: 6,
  },
  withdrawalReminder: {
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.two,
  },
  actionButton: {
    flex: 1,
  },
});
