import { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import Swal from 'sweetalert2';

export function useAppData(authToken, t) {
  const [library, setLibrary] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [voices, setVoices] = useState([]);
  const [savedVoices, setSavedVoices] = useState([]);
  const [selfHostedUrl, setSelfHostedUrl] = useState('http://localhost:7860');

  const authHeaders = useMemo(() => authToken ? { Authorization: `Bearer ${authToken}` } : {}, [authToken]);
  const jsonHeaders = useMemo(() => ({ ...authHeaders, 'Content-Type': 'application/json' }), [authHeaders]);

  useEffect(() => {
    if (!authToken) return;
    fetchLibrary();
    fetchJobs();
    fetchVoices();
    fetchSavedVoices();
    fetchAdminSettings();
  }, [authToken]);

  const fetchAdminSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok && data.self_hosted_url) setSelfHostedUrl(data.self_hosted_url);
    } catch (_) {}
  };

  const fetchLibrary = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/library`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) setLibrary(data.items || []);
    } catch (_) {}
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/active/progress`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) setJobs(data.jobs || []);
    } catch (_) {}
  };

  const fetchVoices = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/voices?provider=self_hosted`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) setVoices(data || []);
    } catch (_) {}
  };

  const fetchSavedVoices = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/saved-voices`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) setSavedVoices(data.saved_voices || []);
    } catch (_) {}
  };

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
    if (res.ok) setLibrary(prev => prev.filter(audio => audio.id !== item.id));
  };

  const handleSaveSavedVoice = async (voiceId, voiceName, seed = "") => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/saved-voices`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ name: voiceName, voice_type: voiceId, seed: seed })
      });
      if (!res.ok) throw new Error('Save failed');
      await fetchSavedVoices();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: t('voices.saved'), timer: 900, showConfirmButton: false, background: '#1e293b', color: '#fff' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('common.error'), text: err.message, background: '#1e293b', color: '#fff' });
    }
  };

  const handleDeleteSavedVoice = async (id) => {
    const result = await Swal.fire({ title: t('voices.deleteConfirm'), icon: 'warning', showCancelButton: true, background: '#1e293b', color: '#fff' });
    if (!result.isConfirmed) return;
    await fetch(`${API_BASE_URL}/api/saved-voices/${id}`, { method: 'DELETE', headers: authHeaders });
    await fetchSavedVoices();
  };

  return {
    library, jobs, voices, savedVoices, selfHostedUrl,
    authHeaders, jsonHeaders,
    fetchAdminSettings, fetchLibrary, fetchJobs, fetchVoices, fetchSavedVoices,
    handlePreviewVoice, handleCopyAudio, handleDeleteAudio, handleSaveSavedVoice, handleDeleteSavedVoice
  };
}
