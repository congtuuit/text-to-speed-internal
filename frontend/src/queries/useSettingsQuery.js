import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config';

export function useSettingsQuery(authToken) {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      return data;
    },
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });
}
