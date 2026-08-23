import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CardShadow, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface BadgeTileProps {
  label: string;
  condition: string;
  earned: boolean;
}

/** Eén tegel in de badge-collectie: behaald = in kleur, nog te behalen = vervaagd met voorwaarde. */
export function BadgeTile({ label, condition, earned }: BadgeTileProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.tile,
        CardShadow,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        !earned && styles.locked,
      ]}>
      <ThemedText style={styles.emoji}>{earned ? '🏅' : '🔒'}</ThemedText>
      <ThemedText type="smallBold" style={styles.centerText}>
        {label}
      </ThemedText>
      <ThemedText type="small" themeColor="textMuted" style={styles.centerText}>
        {condition}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 140,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  locked: {
    opacity: 0.5,
  },
  emoji: {
    fontSize: 28,
  },
  centerText: {
    textAlign: 'center',
  },
});
