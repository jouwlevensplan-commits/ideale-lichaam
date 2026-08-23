import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MacroColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface MacroProgressBarProps {
  label: string;
  macro: keyof typeof MacroColors;
  current: number;
  target: number;
  /** Eenheid achter de cijfers, standaard "g". */
  unit?: string;
}

/** Dunne, gekleurde voortgangsbalk per macronutriënt (eiwit/koolhydraten/vet). */
export function MacroProgressBar({ label, macro, current, target, unit = 'g' }: MacroProgressBarProps) {
  const theme = useTheme();
  const colors = MacroColors[macro];
  const progress = target > 0 ? Math.min(1, Math.max(0, current / target)) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <ThemedText type="small">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {Math.round(current)} / {Math.round(target)}
          {unit}
        </ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
