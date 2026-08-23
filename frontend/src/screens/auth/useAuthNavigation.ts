import { router } from 'expo-router';
import { useState } from 'react';

import * as apiService from '@/services/api.service';
import { setSession } from '@/services/session';

/**
 * LET OP: `/api/auth/login` en `/api/auth/register` staan niet in het gedocumenteerde
 * API-contract (`frontend-design-spec-v2.md` §5) en de backend `User`-tabel gebruikt
 * `auth_provider`/`auth_subject` (lijkt eerder op externe identity providers dan
 * e-mail+wachtwoord). Dit is dus een bewust provisorische aanname totdat het echte
 * authenticatiemechanisme vastligt — zie ook api.service.ts.
 */
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
      const { user } = await action({ email: email.trim(), password });
      setSession({ userId: user.id, user });
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return { email, setEmail, password, setPassword, error, loading, submit };
}
