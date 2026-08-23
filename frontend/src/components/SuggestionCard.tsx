import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CardShadow, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SuggestionCardProps {
  title: string;
  proteinG: number;
  carbsG: number;
  fatG: number;
  onPress: () => void;
}

/** Klikbare kaart met een maaltijdsuggestie en de bijhorende macro's, in het "Volgende maaltijd"-blok. */
export function SuggestionCard({ title, proteinG, carbsG, fatG, onPress }: SuggestionCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, CardShadow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {Math.round(proteinG)}p • {Math.round(carbsG)}k • {Math.round(fatG)}v
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: 12,
    gap: 4,
    flex: 1,
  },
});
