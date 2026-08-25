import { router } from 'expo-router';
import { useState } from 'react';

import * as apiService from '@/services/api.service';
import { setSession } from '@/services/session';

/** Login/registratieformulier: roept de echte `/api/auth/{login,register}`-endpoints aan en bewaart de teruggekregen gebruiker + JWT in de sessie. */
export function useAuthNavigation(mode: 'login' | 'register') {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);

    if (!email.trim() || !password) {
      setError('Vul zowel je e-mailadres als wachtwoord in.');
      return;
    }

    setLoading(true);
    try {
      const action = mode === 'login' ? apiService.login : apiService.register;
      const { user, token } = await action({ email: email.trim(), password });
      setSession({ userId: user.id, user, token });
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return { email, setEmail, password, setPassword, error, loading, submit };
}
