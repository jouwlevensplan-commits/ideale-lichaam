import { ActivityIndicator, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, StatusColors } from '@/constants/theme';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  /** 'solid' = gevulde knop, 'outline' = rand-only knop (lagere nadruk). */
  variant?: 'solid' | 'outline';
  /** Achtergrondkleur (solid) of randkleur (outline). Standaard het accent (kobaltblauw). */
  color?: string;
  /** Tekstkleur; standaard afgeleid van de variant. */
  textColor?: string;
  disabled?: boolean;
  /** Toont een spinner in plaats van `label` en gedraagt zich als `disabled` (voorkomt dubbele indrukken tijdens een lopende API-aanroep). */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Basisknop. Belangrijk voor GDPR/ePrivacy-schermen: twee knoppen met dezelfde `variant`
 * en zonder `style`-overrides voor grootte krijgen exact dezelfde visuele nadruk (enkel
 * `color` verschilt) — gebruik dit patroon voor "Weiger"/"Accepteer"-paren om dark patterns
 * te vermijden.
 */
export function Button({ label, onPress, variant = 'solid', color, textColor, disabled, loading, style }: ButtonProps) {
  const accent = color ?? StatusColors.accent;
  const isDisabled = disabled || loading;
  const labelColor = variant === 'solid' ? (textColor ?? '#FFFFFF') : (textColor ?? accent);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        variant === 'solid' && { backgroundColor: accent },
        variant === 'outline' && [styles.outline, { borderColor: accent }],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={labelColor} size="small" />
      ) : (
        <ThemedText type="smallBold" style={[styles.label, { color: labelColor }]}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: Radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    textAlign: 'center',
  },
});
