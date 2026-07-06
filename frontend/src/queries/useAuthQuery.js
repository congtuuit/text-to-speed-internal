import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config';

export function useAuthQuery(authToken, setAuthToken, handleLogout) {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.status === 401) {
        if (handleLogout) handleLogout();
        throw new Error('Session expired');
      }
      if (!res.ok) throw new Error('Failed to fetch user');
      
      const data = await res.json();
      
      // Auto-renew token if a new one is provided by backend
      if (data.token && data.token !== authToken) {
        localStorage.setItem('tts_auth_token', data.token);
        if (setAuthToken) setAuthToken(data.token);
      }
      
      return data.user;
    },
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    initialData: () => {
      try {
        const stored = localStorage.getItem('tts_current_user');
        return stored ? JSON.parse(stored) : undefined;
      } catch {
        return undefined;
      }
    },
    // Đánh dấu initialData từ localStorage là stale ngay lập tức
    // để queryFn luôn chạy khi mount → đảm bảo token được gia hạn
    initialDataUpdatedAt: 0,
  });
}
