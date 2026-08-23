import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { StatusColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface CalorieRingProps {
  /** Calorieën die nog over zijn (getoond in het midden van de ring). */
  caloriesRemaining: number;
  caloriesGoal: number;
  caloriesEaten: number;
  size?: number;
  strokeWidth?: number;
}

/** Circulaire voortgangsring voor de calorieteller op het Home Dashboard. */
export function CalorieRing({
  caloriesRemaining,
  caloriesGoal,
  caloriesEaten,
  size = 140,
  strokeWidth = 12,
}: CalorieRingProps) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = caloriesGoal > 0 ? Math.min(1, Math.max(0, caloriesEaten / caloriesGoal)) : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={StatusColors.accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          fill="none"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={styles.centerContent}>
        <ThemedText style={styles.value}>{Math.max(0, Math.round(caloriesRemaining))}</ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          kcal over
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
});
