import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CardShadow, Radius, StatusColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ProductSearchResult } from '@/types/api.types';

export interface ProductResultCardProps {
  product: ProductSearchResult;
  onAdd: () => void;
}

/**
 * Productkaart in de barcodezoeker. Toont geen Nutri-Score: onze backend (ProductService/
 * meal_catalog) berekent of bewaart die momenteel niet, dus we tonen geen verzonnen waarde.
 */
export function ProductResultCard({ product, onAdd }: ProductResultCardProps) {
  const theme = useTheme();

  return (
    <View style={[styles.card, CardShadow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.info}>
        <ThemedText type="smallBold">{product.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {product.brand ?? 'Onbekend merk'} • {Math.round(product.caloriesKcal)} kcal / 100g
        </ThemedText>
      </View>
      <Pressable
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel={`${product.name} toevoegen`}
        style={[styles.addButton, { backgroundColor: StatusColors.accent }]}>
        <ThemedText style={styles.addButtonLabel}>+</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
});
