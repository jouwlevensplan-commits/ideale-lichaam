import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export interface MealLogRowProps {
  icon: string;
  name: string;
  subtitle: string;
  caloriesKcal: number;
}

/** Eén rij in de "Vandaag gelogd"-lijst op het Home Dashboard. */
export function MealLogRow({ icon, name, subtitle, caloriesKcal }: MealLogRowProps) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.icon}>{icon}</ThemedText>
      <View style={styles.textColumn}>
        <ThemedText type="smallBold">{name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      </View>
      <ThemedText type="smallBold">{Math.round(caloriesKcal)}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  icon: {
    fontSize: 22,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
});
