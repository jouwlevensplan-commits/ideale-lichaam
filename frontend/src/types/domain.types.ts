export type Sex = 'male' | 'female' | 'unspecified';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extreme';
export type GoalType = 'lose_weight' | 'gain_weight' | 'build_muscle' | 'maintain' | 'healthy_living';
export type Pace = 'slow' | 'moderate' | 'ambitious';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type DietaryPattern = 'none' | 'vegetarian' | 'vegan' | 'halal_kosher' | 'low_carb_keto' | 'other';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

/** Stap 1 van de onboarding-slider: doel kiezen. */
export const GOAL_OPTIONS: SelectOption<GoalType>[] = [
  { value: 'lose_weight', label: 'Afvallen' },
  { value: 'gain_weight', label: 'Aankomen' },
  { value: 'build_muscle', label: 'Spiermassa opbouwen' },
  { value: 'maintain', label: 'Gewicht behouden' },
  { value: 'healthy_living', label: 'Gezond leven' },
];

/** Stap 2: geslacht (dataminimalisatie: "unspecified" is een volwaardige, gelijkwaardige optie). */
export const SEX_OPTIONS: SelectOption<Sex>[] = [
  { value: 'male', label: 'Man' },
  { value: 'female', label: 'Vrouw' },
  { value: 'unspecified', label: 'Unspecified' },
];

/** Stap 4: activiteitsniveau. */
export const ACTIVITY_LEVEL_OPTIONS: SelectOption<ActivityLevel>[] = [
  { value: 'sedentary', label: 'Zittend', description: 'Weinig tot geen dagelijkse beweging.' },
  { value: 'light', label: 'Licht actief', description: '1-3 keer per week lichte inspanning.' },
  { value: 'moderate', label: 'Gemiddeld actief', description: '3-5 keer per week matige inspanning.' },
  { value: 'very', label: 'Zeer actief', description: '6-7 keer per week intensieve inspanning.' },
  { value: 'extreme', label: 'Extreem actief', description: 'Dagelijks zwaar fysiek werk of training.' },
];

/** Stap 5: gewenst tempo richting het doel. */
export const PACE_OPTIONS: SelectOption<Pace>[] = [
  { value: 'slow', label: 'Rustig' },
  { value: 'moderate', label: 'Gemiddeld' },
  { value: 'ambitious', label: 'Ambitieus' },
];

export const DIETARY_PATTERN_OPTIONS: SelectOption<DietaryPattern>[] = [
  { value: 'none', label: 'Geen voorkeur' },
  { value: 'vegetarian', label: 'Vegetarisch' },
  { value: 'vegan', label: 'Veganistisch' },
  { value: 'halal_kosher', label: 'Halal / Koosjer' },
  { value: 'low_carb_keto', label: 'Low-carb / Keto' },
  { value: 'other', label: 'Anders' },
];
