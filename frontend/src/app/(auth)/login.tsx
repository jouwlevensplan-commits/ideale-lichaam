import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthNavigation } from '@/screens/auth/useAuthNavigation';

export default function LoginScreen() {
  const theme = useTheme();
  const { email, setEmail, password, setPassword, error, loading, submit } = useAuthNavigation('login');

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
});
