import { router } from 'expo-router';
import { useState } from 'react';

import * as apiService from '@/services/api.service';
import { setSession } from '@/services/session';
import type { ActivityLevel, DietaryPattern, GoalType, Pace, Sex } from '@/types/domain.types';

export interface OnboardingAnswers {
  goalType: GoalType | null;
  sex: Sex | null;
  birthDate: string;
  heightCm: string;
  weightKg: string;
  activityLevel: ActivityLevel | null;
  pace: Pace | null;
  targetWeightKg: string;
  trainingDaysPerWeek: string;
  dietaryPattern: DietaryPattern;
}

const INITIAL_ANSWERS: OnboardingAnswers = {
  goalType: null,
  sex: null,
  birthDate: '',
  heightCm: '',
  weightKg: '',
  activityLevel: null,
  pace: null,
  targetWeightKg: '',
  trainingDaysPerWeek: '',
  dietaryPattern: 'none',
};

/** Aantal stappen in de slider (0-indexed); stap 4 toont conditionele velden op basis van het gekozen doel. */
export const ONBOARDING_STEP_COUNT = 5;

export function useOnboardingSetup() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(INITIAL_ANSWERS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const goToNextStep = () => setStep((prev) => Math.min(prev + 1, ONBOARDING_STEP_COUNT - 1));
  const goToPreviousStep = () => setStep((prev) => Math.max(prev - 1, 0));

  const submit = async () => {
    if (!answers.goalType || !answers.sex || !answers.activityLevel) {
      setError('Vul alle stappen in voor je verdergaat.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await apiService.completeOnboarding({
        sex: answers.sex,
        birthDate: answers.birthDate,
        heightCm: Number(answers.heightCm),
        weightKg: Number(answers.weightKg),
        activityLevel: answers.activityLevel,
        dietaryPattern: answers.dietaryPattern,
        goalType: answers.goalType,
        targetWeightKg: answers.targetWeightKg ? Number(answers.targetWeightKg) : undefined,
        pace: answers.pace ?? undefined,
        trainingDaysPerWeek: answers.trainingDaysPerWeek ? Number(answers.trainingDaysPerWeek) : undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      setSession({
        user: response.user,
        dailyTarget: response.dailyTarget,
        weeklyGoal: response.weeklyGoal,
      });
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding voltooien is mislukt. Probeer het opnieuw.');
    } finally {
      setSubmitting(false);
    }
  };

  return { step, answers, update, goToNextStep, goToPreviousStep, submit, submitting, error };
}
