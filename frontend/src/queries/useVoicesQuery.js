import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config';

export function useVoicesQuery(authToken) {
  return useQuery({
    queryKey: ['voices'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/voices?provider=self_hosted`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch voices');
      const data = await res.json();
      return data || [];
    },
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });
}

export function useSavedVoicesQuery(authToken) {
  return useQuery({
    queryKey: ['savedVoices'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/saved-voices`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch saved voices');
      const data = await res.json();
      return data.saved_voices || [];
    },
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });
}
