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
import { loginAsDemoUser } from '@/services/session';

export default function LoginScreen() {
  const theme = useTheme();
  const { email, setEmail, password, setPassword, error, loading, submit } = useAuthNavigation('login');
  const [demoLoading, setDemoLoading] = useState(false);

  const submitDemoLogin = async () => {
    setDemoLoading(true);
    try {
      await loginAsDemoUser();
      router.replace('/');
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
        Er is nog geen live e-mailregistratie/OAuth op de backend (zie useAuthNavigation.ts).
        Deze knop logt lokaal in als gemockte demo-gebruiker zodat de app nu al visueel te testen
        is, volledig buiten de server om — zie services/session.ts#loginAsDemoUser.
      */}
      <Button
        label={demoLoading ? 'Bezig...' : 'Inloggen als Demo-gebruiker'}
        onPress={submitDemoLogin}
        disabled={demoLoading}
        variant="outline"
        style={styles.demoButton}
      />
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
