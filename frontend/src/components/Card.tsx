import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { CardShadow, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  bordered?: boolean;
}

/** Witte/donkere kaart met zachte hoeken en subtiele schaduw, conform de stijlgids. */
export function Card({ children, style, bordered = true }: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: theme.backgroundElement },
        bordered && { borderWidth: 1, borderColor: theme.border },
        CardShadow,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.card,
    padding: 16,
  },
});
