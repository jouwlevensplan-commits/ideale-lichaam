import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CardShadow, Radius, StatusColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SelectableCardProps {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}

/** Grote, aanklikbare keuzekaart — gebruikt in de onboarding-slider (doel, activiteitsniveau, tempo). */
export function SelectableCard({ label, description, selected, onPress }: SelectableCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.card,
        CardShadow,
        {
          backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: selected ? StatusColors.accent : theme.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {description ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
          {description}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    padding: 16,
    gap: 4,
  },
  description: {
    lineHeight: 18,
  },
});
