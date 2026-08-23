import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface StreakBadgeProps {
  streakLength: number;
}

/** Discreet streak-symbooltje (vlammetje + aantal dagen), bedoeld om top-of-mind te blijven zonder het scherm vol te bouwen. */
export function StreakBadge({ streakLength }: StreakBadgeProps) {
  const theme = useTheme();

  if (streakLength <= 0) return null;

  return (
    <View style={[styles.pill, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText style={styles.emoji}>🔥</ThemedText>
      <ThemedText type="smallBold">{streakLength}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  emoji: {
    fontSize: 14,
  },
});
