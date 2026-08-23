import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

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
  style?: StyleProp<ViewStyle>;
}

/**
 * Basisknop. Belangrijk voor GDPR/ePrivacy-schermen: twee knoppen met dezelfde `variant`
 * en zonder `style`-overrides voor grootte krijgen exact dezelfde visuele nadruk (enkel
 * `color` verschilt) — gebruik dit patroon voor "Weiger"/"Accepteer"-paren om dark patterns
 * te vermijden.
 */
export function Button({ label, onPress, variant = 'solid', color, textColor, disabled, style }: ButtonProps) {
  const accent = color ?? StatusColors.accent;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        variant === 'solid' && { backgroundColor: accent },
        variant === 'outline' && [styles.outline, { borderColor: accent }],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <ThemedText
        type="smallBold"
        style={[styles.label, { color: variant === 'solid' ? (textColor ?? '#FFFFFF') : (textColor ?? accent) }]}>
        {label}
      </ThemedText>
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
