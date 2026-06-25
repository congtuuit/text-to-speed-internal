import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export function useAuth() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('tts_auth_token') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tts_current_user') || 'null') } catch { return null }
  });
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (!authToken) return;
    fetch(`${API_BASE_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.user) setCurrentUser(data.user) })
      .catch(() => {});
  }, [authToken]);

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
      setCurrentUser(data.user);
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tts_auth_token');
    localStorage.removeItem('tts_current_user');
    setAuthToken('');
    setCurrentUser(null);
  };

  return {
    authToken, currentUser, authMode, setAuthMode, authEmail, setAuthEmail,
    authPassword, setAuthPassword, authName, setAuthName, authError, authLoading,
    handleAuthSubmit, handleLogout
  };
}
