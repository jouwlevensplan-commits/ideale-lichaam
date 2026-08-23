import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

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

const DRAFT_STORAGE_KEY = 'maaltijdtracker.onboarding.draft.v1';

interface OnboardingDraft {
  step: number;
  answers: OnboardingAnswers;
}

export function useOnboardingSetup() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(INITIAL_ANSWERS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftLoaded = useRef(false);

  // Herstel een onvoltooide onboarding-poging na een herstart van de app, zodat de gebruiker niet
  // helemaal opnieuw hoeft te beginnen.
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const draft: OnboardingDraft = JSON.parse(raw);
          setStep(draft.step);
          setAnswers(draft.answers);
        }
      })
      .catch(() => {})
      .finally(() => {
        draftLoaded.current = true;
      });
  }, []);

  // Bewaar elke wijziging als concept, behalve de allereerste render (vóór het herstellen hierboven
  // is afgerond) om een leeg concept niet per ongeluk over een bestaand concept heen te schrijven.
  useEffect(() => {
    if (!draftLoaded.current) return;
    const draft: OnboardingDraft = { step, answers };
    AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft)).catch(() => {});
  }, [step, answers]);

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
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY).catch(() => {});
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding voltooien is mislukt. Probeer het opnieuw.');
    } finally {
      setSubmitting(false);
    }
  };

  return { step, answers, update, goToNextStep, goToPreviousStep, submit, submitting, error };
}
