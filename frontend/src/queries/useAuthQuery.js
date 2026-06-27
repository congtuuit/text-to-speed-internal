import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config';

export function useAuthQuery(authToken) {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch user');
      const data = await res.json();
      return data.user;
    },
    enabled: !!authToken, // Only run if authToken exists
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    initialData: () => {
      try {
        const stored = localStorage.getItem('tts_current_user');
        return stored ? JSON.parse(stored) : undefined;
      } catch {
        return undefined;
      }
    }
  });
}
