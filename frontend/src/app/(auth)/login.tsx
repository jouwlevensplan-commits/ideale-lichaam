import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthNavigation } from '@/screens/auth/useAuthNavigation';
import * as apiService from '@/services/api.service';
import { applyDemoDashboardFixture } from '@/services/session';

export default function LoginScreen() {
  const theme = useTheme();
  const { email, setEmail, password, setPassword, error, loading, submit } = useAuthNavigation('login');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const submitDemoLogin = async () => {
    setDemoLoading(true);
    setDemoError(null);
    try {
      const { user, token } = await apiService.demoLogin();
      await applyDemoDashboardFixture({ userId: user.id, user, token });
      router.replace('/');
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : 'Demo-login is mislukt. Probeer het opnieuw.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedText type="title" style={styles.title}>
        Welkom terug
      </ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        Log in om je voortgang, doelen en dagboek weer te zien.
      </ThemedText>

      <TextField
        label="E-mailadres"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="jij@voorbeeld.be"
      />
      <TextField
        label="Wachtwoord"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />

      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <Button label={loading ? 'Bezig...' : 'Inloggen'} onPress={submit} disabled={loading} />

      <ThemedText type="linkPrimary" onPress={() => router.push('/(auth)/register')} style={styles.registerLink}>
        Nog geen account? Registreer hier
      </ThemedText>

      {/*
        Alleen zichtbaar in development builds: logt in als de vaste, geseede demo-gebruiker
        "Sam" via een echte (wachtwoordloze) JWT — zie apiService.demoLogin() en
        services/session.ts#applyDemoDashboardFixture. Nooit onderdeel van een productiebuild.
      */}
      {__DEV__ ? (
        <>
          {demoError ? (
            <ThemedText type="small" style={styles.error}>
              {demoError}
            </ThemedText>
          ) : null}
          <Button
            label={demoLoading ? 'Bezig...' : 'Inloggen als Demo-gebruiker'}
            onPress={submitDemoLogin}
            disabled={demoLoading}
            variant="outline"
            style={styles.demoButton}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  error: {
    color: '#E24B4A',
  },
  registerLink: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  demoButton: {
    marginTop: Spacing.two,
  },
});
