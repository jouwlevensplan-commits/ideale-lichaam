import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { hydrateSession } from '@/services/session';

SplashScreen.preventAutoHideAsync();

/**
 * Root layout: enkel Provider/globale opzet, plus het (eenmalig) inlezen van de lokaal opgeslagen
 * sessie vanuit AsyncStorage (ingelogde gebruiker, onboarding-doel, GDPR-toestemmingen). De
 * navigatiegate in `index.tsx` wacht zelf op `hydrated` voordat ze een redirect kiest, zodat we
 * nooit even naar het loginscherm "flashen" terwijl de opslag nog wordt gelezen.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    hydrateSession();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
