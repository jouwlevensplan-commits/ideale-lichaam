import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ProductResultCard } from '@/components/ProductResultCard';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Spacing, StatusColors } from '@/constants/theme';
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

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Compacte "kcal • eiwit • koolh. • vet"-samenvatting, gebruikt voor zowel het per-100g-label als de live-preview. */
function macroSummary(caloriesKcal: number, proteinG: number, carbsG: number, fatG: number): string {
  return `${Math.round(caloriesKcal)} kcal • ${round1(proteinG)}g eiwit • ${round1(carbsG)}g koolh. • ${round1(fatG)}g vet`;
}

function friendlyErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function DiaryScreen() {
  const theme = useTheme();
  const { user } = useSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [amountG, setAmountG] = useState('100');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [logging, setLogging] = useState(false);

  const runSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const products = await apiService.searchProducts(text.trim());
      setResults(products);
    } catch (err) {
      setResults([]);
      setSearchError(friendlyErrorMessage(err, 'Zoeken is mislukt. Probeer het opnieuw.'));
    } finally {
      setSearching(false);
    }
  };

  const closeQuantitySheet = () => {
    setSelectedProduct(null);
    setAmountG('100');
    setMealType('breakfast');
  };

  const parsedAmount = Number(amountG);
  const isAmountValid = amountG.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const factor = isAmountValid ? parsedAmount / 100 : 0;
  const previewCaloriesKcal = (selectedProduct?.caloriesKcal ?? 0) * factor;
  const previewProteinG = (selectedProduct?.proteinG ?? 0) * factor;
  const previewCarbsG = (selectedProduct?.carbsG ?? 0) * factor;
  const previewFatG = (selectedProduct?.fatG ?? 0) * factor;
  const previewFiberG = (selectedProduct?.fiberG ?? 0) * factor;

  const confirmLogMeal = async () => {
    if (!selectedProduct || !isAmountValid) return;

    setLogging(true);
    try {
      await apiService.logMeal({
        localDate: new Date().toISOString().slice(0, 10),
        mealType,
        items: [
          {
            name: selectedProduct.name,
            amountG: parsedAmount,
            caloriesKcal: previewCaloriesKcal,
            proteinG: previewProteinG,
            carbsG: previewCarbsG,
            fatG: previewFatG,
            fiberG: previewFiberG,
          },
        ],
      });
      closeQuantitySheet();
      // Terug naar Home: het dashboard daar haalt bij elke focus opnieuw GET /api/dashboard/today
      // op (zie app/(tabs)/index.tsx), dus de calorieënring/macrobalken en "Vandaag gelogd" tonen
      // deze nieuwe log meteen, zonder extra bevestigingsstap die de gebruiker zou moeten wegtikken.
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Mislukt', friendlyErrorMessage(err, 'Kon de maaltijd niet loggen. Probeer het opnieuw.'));
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
          autoCapitalize="none"
          placeholder="Zoek een product of barcode..."
        />

        {searching && (
          <View style={styles.searchStatusRow}>
            <ActivityIndicator size="small" color={StatusColors.accent} />
            <ThemedText type="small" themeColor="textMuted">
              Zoeken...
            </ThemedText>
          </View>
        )}

        {searchError && !searching ? (
          <ThemedText type="small" style={styles.error}>
            {searchError}
          </ThemedText>
        ) : null}

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          renderItem={({ item }) => <ProductResultCard product={item} onAdd={() => setSelectedProduct(item)} />}
          ListEmptyComponent={
            query.trim().length >= 2 && !searching && !searchError ? (
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

      <BottomSheet visible={selectedProduct !== null} onClose={closeQuantitySheet}>
        {selectedProduct ? (
          <>
            <ThemedText type="smallBold">{selectedProduct.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Per 100g:{' '}
              {macroSummary(
                selectedProduct.caloriesKcal,
                selectedProduct.proteinG,
                selectedProduct.carbsG,
                selectedProduct.fatG
              )}
            </ThemedText>

            <TextField
              label="Hoeveelheid (g)"
              value={amountG}
              onChangeText={setAmountG}
              keyboardType="numeric"
              errorText={!isAmountValid && amountG.trim().length > 0 ? 'Vul een geldige hoeveelheid in (groter dan 0).' : undefined}
            />

            <View style={[styles.previewCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {isAmountValid
                  ? `Voor ${amountG}g: ${macroSummary(previewCaloriesKcal, previewProteinG, previewCarbsG, previewFatG)}`
                  : 'Vul een hoeveelheid in om de berekende macro’s te zien.'}
              </ThemedText>
            </View>

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
            <Button label="Loggen" onPress={confirmLogMeal} loading={logging} disabled={!isAmountValid} />
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
  searchStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  error: {
    color: StatusColors.error,
  },
  resultsList: {
    gap: Spacing.two,
  },
  premiumSection: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
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
