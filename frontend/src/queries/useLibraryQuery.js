import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config';

export function useLibraryQuery(authToken) {
  return useQuery({
    queryKey: ['library'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/library`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch library');
      const data = await res.json();
      return data.items || [];
    },
    enabled: !!authToken,
    staleTime: 60 * 1000 // Cache for 1 minute
  });
}
