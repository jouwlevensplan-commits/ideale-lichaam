import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { SelectableCard } from '@/components/SelectableCard';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, StatusColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ONBOARDING_STEP_COUNT, useOnboardingSetup } from '@/screens/onboarding/useOnboardingSetup';
import {
  ACTIVITY_LEVEL_OPTIONS,
  GOAL_OPTIONS,
  PACE_OPTIONS,
  SEX_OPTIONS,
} from '@/types/domain.types';

/** Scherm 3: stapsgewijze onboarding-slider (Fase 1 t/m 5 uit het projectplan). */
export default function OnboardingSetupScreen() {
  const theme = useTheme();
  const { step, answers, update, goToNextStep, goToPreviousStep, submit, submitting, error } =
    useOnboardingSetup();

  const needsTargetWeightAndPace = answers.goalType === 'lose_weight' || answers.goalType === 'gain_weight';
  const needsTrainingDays = answers.goalType === 'build_muscle';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.progressRow}>
        {Array.from({ length: ONBOARDING_STEP_COUNT }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              { backgroundColor: index <= step ? StatusColors.accent : theme.border },
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 && (
          <StepContainer title="Wat is je doel?">
            <View style={styles.cardGrid}>
              {GOAL_OPTIONS.map((option) => (
                <SelectableCard
                  key={option.value}
                  label={option.label}
                  selected={answers.goalType === option.value}
                  onPress={() => {
                    update('goalType', option.value);
                    goToNextStep();
                  }}
                />
              ))}
            </View>
          </StepContainer>
        )}

        {step === 1 && (
          <StepContainer title="Vertel ons iets over jezelf">
            <ThemedText type="smallBold">Geslacht</ThemedText>
            <View style={styles.cardGrid}>
              {SEX_OPTIONS.map((option) => (
                <SelectableCard
                  key={option.value}
                  label={option.label}
                  selected={answers.sex === option.value}
                  onPress={() => update('sex', option.value)}
                />
              ))}
            </View>
            <TextField
              label="Geboortedatum (JJJJ-MM-DD)"
              value={answers.birthDate}
              onChangeText={(value) => update('birthDate', value)}
              placeholder="1996-08-22"
              keyboardType="numbers-and-punctuation"
            />
            <Button label="Volgende" onPress={goToNextStep} disabled={!answers.sex || !answers.birthDate} />
          </StepContainer>
        )}

        {step === 2 && (
          <StepContainer title="Jouw afmetingen">
            <TextField
              label="Lengte (cm)"
              value={answers.heightCm}
              onChangeText={(value) => update('heightCm', value)}
              keyboardType="numeric"
              placeholder="180"
            />
            <TextField
              label="Gewicht (kg)"
              value={answers.weightKg}
              onChangeText={(value) => update('weightKg', value)}
              keyboardType="numeric"
              placeholder="75"
            />
            <Button label="Volgende" onPress={goToNextStep} disabled={!answers.heightCm || !answers.weightKg} />
          </StepContainer>
        )}

        {step === 3 && (
          <StepContainer title="Hoe actief ben je?">
            <View style={styles.cardColumn}>
              {ACTIVITY_LEVEL_OPTIONS.map((option) => (
                <SelectableCard
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  selected={answers.activityLevel === option.value}
                  onPress={() => {
                    update('activityLevel', option.value);
                    goToNextStep();
                  }}
                />
              ))}
            </View>
          </StepContainer>
        )}

        {step === 4 && (
          <StepContainer title="Laatste details">
            {needsTargetWeightAndPace && (
              <>
                <TextField
                  label="Streefgewicht (kg)"
                  value={answers.targetWeightKg}
                  onChangeText={(value) => update('targetWeightKg', value)}
                  keyboardType="numeric"
                  placeholder="70"
                />
                <ThemedText type="smallBold">Gewenst tempo</ThemedText>
                <View style={styles.cardGrid}>
                  {PACE_OPTIONS.map((option) => (
                    <SelectableCard
                      key={option.value}
                      label={option.label}
                      selected={answers.pace === option.value}
                      onPress={() => update('pace', option.value)}
                    />
                  ))}
                </View>
              </>
            )}

            {needsTrainingDays && (
              <TextField
                label="Trainingsdagen per week"
                value={answers.trainingDaysPerWeek}
                onChangeText={(value) => update('trainingDaysPerWeek', value)}
                keyboardType="numeric"
                placeholder="4"
              />
            )}

            {!needsTargetWeightAndPace && !needsTrainingDays && (
              <ThemedText type="default" themeColor="textSecondary">
                Geen verdere gegevens nodig — we berekenen je onderhoudscalorieën.
              </ThemedText>
            )}

            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}

            <Button
              label={submitting ? 'Bezig met berekenen...' : 'Bereken mijn plan'}
              onPress={submit}
              disabled={submitting}
            />
          </StepContainer>
        )}
      </ScrollView>

      {step > 0 && (
        <Button
          label="← Vorige stap"
          onPress={goToPreviousStep}
          variant="outline"
          style={styles.backButton}
        />
      )}
    </SafeAreaView>
  );
}

function StepContainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.step}>
      <ThemedText type="title" style={styles.stepTitle}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: Spacing.three,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  step: {
    gap: Spacing.three,
  },
  stepTitle: {
    fontSize: 26,
    lineHeight: 32,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cardColumn: {
    gap: Spacing.two,
  },
  error: {
    color: '#E24B4A',
  },
  backButton: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
});
