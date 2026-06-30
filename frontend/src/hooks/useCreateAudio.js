import { useState } from 'react';
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../config';

import { useBilling } from './useBilling';

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
  const token = localStorage.getItem('tts_auth_token');
  const { billing } = useBilling(token);

  const [text, setText] = useState("Xin chào, đây là bản đọc thử tiếng Việt cho sản phẩm TTS Studio.");
  const [voice, setVoice] = useState('female');
  const [createVoiceSeed, setCreateVoiceSeed] = useState('');
  const [speed, setSpeed] = useState(1);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressState, setProgressState] = useState({ current: 0, total: 0, merging: false });

  const handleGenerate = async () => {
    if (!text.trim()) {
      Swal.fire({ icon: 'warning', title: t('create.missingText'), background: '#1e293b', color: '#fff' });
      return;
    }
    
    let maxChars = 5000;
    if (billing && billing.subscription) {
      if (billing.subscription.plan_id === 'free') {
        maxChars = 5000;
      } else {
        if (billing.subscription.chars_limit === -1) {
          maxChars = 10000;
        } else {
          const remaining = billing.usage?.chars_remaining ?? 10000;
          maxChars = Math.min(Math.max(remaining, 0), 10000);
        }
      }
    }

    if (text.length > maxChars) {
      Swal.fire({ icon: 'warning', title: "Văn bản quá dài", text: `Gói của bạn hiện tại cho phép tối đa ${maxChars} ký tự. Vui lòng dùng tính năng Batch (Tạo hàng loạt) cho văn bản dài hơn.`, background: '#1e293b', color: '#fff' });
      return;
    }

    setIsGenerating(true);
    setProgressState({ current: 0, total: 0, merging: false });

    try {
      if (text.length <= 150) {
        // Direct call
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
