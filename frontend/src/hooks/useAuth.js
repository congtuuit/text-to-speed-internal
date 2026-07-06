import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { useAuthQuery } from '../queries/useAuthQuery';
import { useQueryClient } from '@tanstack/react-query';

export function useAuth() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('tts_auth_token') || '');
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const queryClient = useQueryClient();

  const handleLogout = useCallback(() => {
    localStorage.removeItem('tts_auth_token');
    localStorage.removeItem('tts_current_user');
    setAuthToken('');
    queryClient.setQueryData(['auth', 'me'], null);
  }, [queryClient]);

  const { data: currentUser } = useAuthQuery(authToken, setAuthToken, handleLogout);

  const handleAuthSubmit = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = authMode === 'register'
        ? { email: authEmail, password: authPassword, full_name: authName }
        : { email: authEmail, password: authPassword };
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Authentication failed');
      
      localStorage.setItem('tts_auth_token', data.token);
      localStorage.setItem('tts_current_user', JSON.stringify(data.user));
      setAuthToken(data.token);
      queryClient.setQueryData(['auth', 'me'], data.user);
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = useCallback(async (credential) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Google Login failed');
      
      localStorage.setItem('tts_auth_token', data.token);
      localStorage.setItem('tts_current_user', JSON.stringify(data.user));
      setAuthToken(data.token);
      queryClient.setQueryData(['auth', 'me'], data.user);
    } catch (err) {
      setAuthError(err.message || 'Google Login failed');
    } finally {
      setAuthLoading(false);
    }
  }, [queryClient]);

  return {
    authToken,
    currentUser,
    authMode, setAuthMode,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    authName, setAuthName,
    authError, setAuthError,
    authLoading,
    handleAuthSubmit,
    handleLogout,
    handleGoogleLogin
  };
}
