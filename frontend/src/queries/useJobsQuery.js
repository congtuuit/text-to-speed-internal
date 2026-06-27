import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config';

export function useJobsQuery(authToken) {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/jobs/active/progress`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      return data.jobs || [];
    },
    enabled: !!authToken,
    refetchInterval: (query) => {
      // Poll every 3 seconds if there are active jobs
      const jobs = query.state.data;
      const hasActiveJobs = jobs?.some(j => j.status === 'Processing' || j.status === 'Pending');
      return hasActiveJobs ? 3000 : false;
    }
  });
}
