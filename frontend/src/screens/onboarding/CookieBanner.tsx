import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/themed-text';
import { StatusColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { COOKIE_BANNER_COPY } from '@/services/legal-copy';

export interface CookiePreferences {
  analytics: boolean;
  personalizedAds: boolean;
}

export interface CookieBannerProps {
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onSavePreferences: (preferences: CookiePreferences) => void;
}

export function CookieBanner({ onAcceptAll, onRejectAll, onSavePreferences }: CookieBannerProps) {
  const theme = useTheme();
  const [analytics, setAnalytics] = useState(false);
  const [personalizedAds, setPersonalizedAds] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="subtitle" style={styles.title}>
        {COOKIE_BANNER_COPY.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {COOKIE_BANNER_COPY.introText}
      </ThemedText>

      {COOKIE_BANNER_COPY.categories.map((category) => {
        const value =
          category.key === 'necessary' ? true : category.key === 'analytics' ? analytics : personalizedAds;

        return (
          <View key={category.key} style={styles.categoryRow}>
            <View style={styles.categoryTextColumn}>
              <ThemedText type="smallBold">{category.label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {category.description}
              </ThemedText>
            </View>
            <Switch
              value={value}
              disabled={category.mandatory}
              onValueChange={(next) => {
                if (category.key === 'analytics') setAnalytics(next);
                if (category.key === 'personalized_ads') setPersonalizedAds(next);
              }}
              trackColor={{ true: StatusColors.accent }}
              accessibilityLabel={`${category.label} cookies ${value ? 'ingeschakeld' : 'uitgeschakeld'}`}
            />
          </View>
        );
      })}

      {/*
        Anti-dark-pattern (zie designGuidance in consent-templates.ts): "Weiger Alles" en
        "Accepteer Alles" delen dezelfde Button-variant, breedte (flex: 1) en typografie.
        Alleen de kleur verschilt — geen van beide knoppen is groter, feller of prominenter
        gepositioneerd dan de andere.
      */}
      <View style={styles.primaryActionsRow}>
        <Button
          label={COOKIE_BANNER_COPY.buttons.rejectAll}
          onPress={onRejectAll}
          variant="solid"
          color={theme.border}
          textColor={theme.text}
          style={styles.primaryActionButton}
        />
        <Button
          label={COOKIE_BANNER_COPY.buttons.acceptAll}
          onPress={onAcceptAll}
          variant="solid"
          color={StatusColors.accent}
          textColor="#FFFFFF"
          style={styles.primaryActionButton}
        />
      </View>

      <Button
        label={COOKIE_BANNER_COPY.buttons.savePreferences}
        onPress={() => onSavePreferences({ analytics, personalizedAds })}
        variant="outline"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryTextColumn: {
    flex: 1,
    gap: 2,
  },
  primaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryActionButton: {
    flex: 1,
  },
});
