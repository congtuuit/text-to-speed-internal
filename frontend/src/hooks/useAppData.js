import { useMemo, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import Swal from 'sweetalert2';

import { useLibraryQuery } from '../queries/useLibraryQuery';
import { useJobsQuery } from '../queries/useJobsQuery';
import { useVoicesQuery, useSavedVoicesQuery } from '../queries/useVoicesQuery';
import { useSettingsQuery } from '../queries/useSettingsQuery';
import { useQueryClient } from '@tanstack/react-query';

export function useAppData(authToken, t) {
  const queryClient = useQueryClient();
  
  const authHeaders = useMemo(() => authToken ? { Authorization: `Bearer ${authToken}` } : {}, [authToken]);
  const jsonHeaders = useMemo(() => ({ ...authHeaders, 'Content-Type': 'application/json' }), [authHeaders]);

  // Use React Query hooks
  const { data: library = [], refetch: fetchLibrary } = useLibraryQuery(authToken);
  const { data: jobs = [], refetch: fetchJobs } = useJobsQuery(authToken);
  const { data: voices = [], refetch: fetchVoices } = useVoicesQuery(authToken);
  const { data: savedVoices = [], refetch: fetchSavedVoices } = useSavedVoicesQuery(authToken);
  const { data: settings = {}, refetch: fetchAdminSettings } = useSettingsQuery(authToken);

  const selfHostedUrl = settings?.self_hosted_url || 'http://localhost:7860';

  const handlePreviewVoice = async (voiceId, previewText, previewSpeed = 1.0, seed = "", keepVoice = "true") => {
    const isSample = !previewText || previewText === t('create.sample');
    const res = await fetch(`${API_BASE_URL}/api/test-voice`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        text: previewText || t('create.sample'),
        voice: voiceId,
        provider: 'self_hosted',
        self_hosted_url: selfHostedUrl,
        output_speed: Number(previewSpeed),
        seed: seed,
        is_sample: isSample,
        keep_voice: keepVoice
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Preview failed');
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  };

  // Shared Library and Voices Handlers
  const handleCopyAudio = async (item) => {
    const link = item.audio_url?.startsWith('http') ? item.audio_url : `${API_BASE_URL}${item.audio_url}`;
    await navigator.clipboard.writeText(link);
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: t('library.copied'), timer: 1000, showConfirmButton: false, background: '#1e293b', color: '#fff' });
  };

  const handleDeleteAudio = async (item) => {
    const result = await Swal.fire({ title: t('library.deleteConfirm'), icon: 'warning', showCancelButton: true, background: '#1e293b', color: '#fff' });
    if (!result.isConfirmed) return;
    const res = await fetch(`${API_BASE_URL}/api/library/${item.id}`, { method: 'DELETE', headers: authHeaders });
    if (res.ok) {
      // Optimistically update cache
      queryClient.setQueryData(['library'], prev => prev?.filter(audio => audio.id !== item.id));
      fetchLibrary();
    }
  };

  const handleSaveSavedVoice = async (id, voiceType, name, text, keepVoice, seed, tag) => {
    const payload = { voice_type: voiceType, name, text, keep_voice: keepVoice, seed, tag };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE_URL}/api/saved-voices/${id}` : `${API_BASE_URL}/api/saved-voices`;
    const res = await fetch(url, { method, headers: jsonHeaders, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Failed to save voice');
    await fetchSavedVoices();
  };

  const handleDeleteSavedVoice = async (id) => {
    const res = await fetch(`${API_BASE_URL}/api/saved-voices/${id}`, { method: 'DELETE', headers: authHeaders });
    if (!res.ok) throw new Error('Failed to delete voice');
    await fetchSavedVoices();
  };

  return {
    library, jobs, voices, savedVoices, selfHostedUrl,
    jsonHeaders, fetchAdminSettings, fetchLibrary, fetchJobs, fetchVoices, fetchSavedVoices,
    handlePreviewVoice, handleCopyAudio, handleDeleteAudio, handleSaveSavedVoice, handleDeleteSavedVoice
  };
}
