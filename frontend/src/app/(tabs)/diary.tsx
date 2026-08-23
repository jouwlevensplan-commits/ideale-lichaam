import { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ProductResultCard } from '@/components/ProductResultCard';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as apiService from '@/services/api.service';
import { useSession } from '@/services/session';
import type { MealType } from '@/types/domain.types';
import type { ProductSearchResult } from '@/types/api.types';

const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Ontbijt' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Diner' },
  { value: 'snack', label: 'Snack' },
];

export default function DiaryScreen() {
  const theme = useTheme();
  const { user } = useSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [amountG, setAmountG] = useState('100');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [logging, setLogging] = useState(false);

  const runSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const products = await apiService.searchProducts(text.trim());
      setResults(products);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const confirmLogMeal = async () => {
    if (!selectedProduct) return;
    const factor = (Number(amountG) || 0) / 100;

    setLogging(true);
    try {
      await apiService.logMeal({
        localDate: new Date().toISOString().slice(0, 10),
        mealType,
        items: [
          {
            name: selectedProduct.name,
            amountG: Number(amountG) || 0,
            caloriesKcal: selectedProduct.caloriesKcal * factor,
            proteinG: selectedProduct.proteinG * factor,
            carbsG: selectedProduct.carbsG * factor,
            fatG: selectedProduct.fatG * factor,
            fiberG: selectedProduct.fiberG * factor,
          },
        ],
      });
      setSelectedProduct(null);
      Alert.alert('Gelogd!', `${selectedProduct.name} is toegevoegd aan je dagboek.`);
    } catch (err) {
      Alert.alert('Mislukt', err instanceof Error ? err.message : 'Kon de maaltijd niet loggen.');
    } finally {
      setLogging(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Eetdagboek
        </ThemedText>

        <TextField
          label="Handmatig zoeken (gratis)"
          value={query}
          onChangeText={runSearch}
          placeholder="Zoek een product of barcode..."
        />

        {searching && (
          <ThemedText type="small" themeColor="textMuted">
            Zoeken...
          </ThemedText>
        )}

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          renderItem={({ item }) => <ProductResultCard product={item} onAdd={() => setSelectedProduct(item)} />}
          ListEmptyComponent={
            query.trim().length >= 2 && !searching ? (
              <ThemedText type="small" themeColor="textMuted">
                Geen producten gevonden voor &quot;{query}&quot;.
              </ThemedText>
            ) : null
          }
        />

        <View style={styles.premiumSection}>
          <ThemedText type="smallBold">AI-scanners (Premium)</ThemedText>
          <Button
            label="📷  Foto-scan"
            variant="outline"
            onPress={() => {
              if (!user?.isPremium) {
                Alert.alert('Premium-functie', 'De AI-foto-scanner is beschikbaar met een Premium-abonnement.');
                return;
              }
              // TODO: integreer expo-camera + apiService.recognizeMealPhoto.
              Alert.alert('Binnenkort beschikbaar', 'De camera-integratie volgt in een volgende iteratie.');
            }}
          />
          <Button
            label="🎙️  Spraak-logger"
            variant="outline"
            onPress={() => {
              if (!user?.isPremium) {
                Alert.alert('Premium-functie', 'De AI-spraaklogger is beschikbaar met een Premium-abonnement.');
                return;
              }
              // TODO: integreer spraak-naar-tekst + apiService.recognizeMealVoice.
              Alert.alert('Binnenkort beschikbaar', 'De spraakintegratie volgt in een volgende iteratie.');
            }}
          />
        </View>
      </View>

      <BottomSheet visible={selectedProduct !== null} onClose={() => setSelectedProduct(null)}>
        {selectedProduct ? (
          <>
            <ThemedText type="smallBold">{selectedProduct.name}</ThemedText>
            <TextField label="Hoeveelheid (g)" value={amountG} onChangeText={setAmountG} keyboardType="numeric" />
            <ThemedText type="small">Maaltijd</ThemedText>
            <View style={styles.mealTypeRow}>
              {MEAL_TYPE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  label={option.label}
                  variant={mealType === option.value ? 'solid' : 'outline'}
                  onPress={() => setMealType(option.value)}
                  style={styles.mealTypeButton}
                />
              ))}
            </View>
            <Button label={logging ? 'Loggen...' : 'Loggen'} onPress={confirmLogMeal} disabled={logging} />
          </>
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 26,
  },
  resultsList: {
    gap: Spacing.two,
  },
  premiumSection: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  mealTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  mealTypeButton: {
    flexGrow: 1,
  },
});
