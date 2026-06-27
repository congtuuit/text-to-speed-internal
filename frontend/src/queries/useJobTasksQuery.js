import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config';

export function useJobTasksQuery(authToken, jobId, hasActiveJobs) {
  return useQuery({
    queryKey: ['tasks', jobId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/tasks`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      return data.tasks || [];
    },
    enabled: !!authToken && !!jobId,
    refetchInterval: hasActiveJobs ? 3000 : false
  });
}
