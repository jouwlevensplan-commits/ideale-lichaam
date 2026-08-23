import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { StatusColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  accentColor?: string;
}

/** Nooit vooraf aangevinkt renderen voor toestemmingsschermen — de aanroepende component bepaalt de initiële state. */
export function Checkbox({ checked, onChange, label, accentColor = StatusColors.accent }: CheckboxProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => onChange(!checked)}
      style={styles.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}>
      <View
        style={[
          styles.box,
          { borderColor: checked ? accentColor : theme.textSecondary },
          checked && { backgroundColor: accentColor },
        ]}>
        {checked && <ThemedText style={styles.checkmark}>{'✓'}</ThemedText>}
      </View>
      <ThemedText type="small" style={styles.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 16,
  },
  label: {
    flex: 1,
  },
});
