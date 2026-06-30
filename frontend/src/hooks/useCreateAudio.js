import { useState } from 'react';
import Swal from 'sweetalert2';

// Helper to chunk text
function splitText(text, maxLength = 150) {
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  let chunks = [];
  let currentChunk = "";
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength && currentChunk.trim()) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks.filter(c => c.trim().length > 0);
}

export function useCreateAudio(t, handlePreviewVoice, selfHostedUrl) {
  const [text, setText] = useState("Xin chào, đây là bản đọc thử tiếng Việt cho sản phẩm TTS Studio.");
  const [voice, setVoice] = useState('female');
  const [createVoiceSeed, setCreateVoiceSeed] = useState('');
  const [speed, setSpeed] = useState(1);
  const [audioUrl, setAudioUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressState, setProgressState] = useState({ current: 0, total: 0, merging: false });

  const handleGenerate = async () => {
    if (!text.trim()) {
      Swal.fire({ icon: 'warning', title: t('create.missingText'), background: '#1e293b', color: '#fff' });
      return;
    }
    if (text.length > 2000) {
      Swal.fire({ icon: 'warning', title: "VÄƒn báº£n quÃ¡ dÃ i", text: "Vui lÃ²ng nháº­p tá»‘i Ä‘a 2000 kÃ½ tá»±.", background: '#1e293b', color: '#fff' });
      return;
    }

    setIsGenerating(true);
    setProgressState({ current: 0, total: 0, merging: false });

    try {
      if (text.length <= 150) {
        // Direct call
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
        const token = localStorage.getItem('tts_auth_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const res = await fetch(`${API_BASE_URL}/api/create-audio`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text: text,
            voice: voice,
            provider: 'self_hosted',
            output_speed: Number(speed),
            seed: createVoiceSeed,
            keep_voice: "true",
            is_sample: false
          })
        });
        
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || "Tạo audio thất bại.");
        }
        
        const blob = await res.blob();
        setAudioUrl(URL.createObjectURL(blob));
      } else {
        // Chunking
        const chunks = splitText(text, 150);
        setProgressState({ current: 0, total: chunks.length, merging: false });

        const _user = JSON.parse(localStorage.getItem('tts_current_user') || 'null');
        const _uid  = _user?.id        ?? '0';
        const _wid  = _user?.workspace_id ?? '0';
        const _ts   = Math.floor(Date.now() / 1000);
        const _rand = Math.random().toString(36).substring(2, 6);
        const sessionId = `u${_uid}_ws${_wid}_${_ts}_${_rand}`;

        for (let i = 0; i < chunks.length; i++) {
          setProgressState({ current: i + 1, total: chunks.length, merging: false });

          const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
          const token = localStorage.getItem('tts_auth_token');
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const res = await fetch(`${API_BASE_URL}/api/tts/chunk`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              text: chunks[i],
              voice,
              provider: 'self_hosted',
              output_speed: Number(speed),
              seed: createVoiceSeed,
              session_id: sessionId,
              chunk_index: i,
              keep_voice: "true"
            })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || "Chunk failed to generate.");
          }
        }

        // Merge
        setProgressState(prev => ({ ...prev, merging: true }));
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
        const token = localStorage.getItem('tts_auth_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const mergeRes = await fetch(`${API_BASE_URL}/api/tts/merge`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ session_id: sessionId })
        });

        if (!mergeRes.ok) throw new Error("Gá»™p audio tháº¥t báº¡i.");
        const blob = await mergeRes.blob();
        setAudioUrl(URL.createObjectURL(blob));
      }

      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: t('common.success'), timer: 3000, showConfirmButton: false, background: '#1e293b', color: '#fff' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('common.error'), text: err.message, background: '#1e293b', color: '#fff' });
    } finally {
      setIsGenerating(false);
      setProgressState({ current: 0, total: 0, merging: false });
    }
  };

  return {
    text, setText, voice, setVoice, createVoiceSeed, setCreateVoiceSeed,
    speed, setSpeed, audioUrl, setAudioUrl, isGenerating, handleGenerate, progressState
  };
}
