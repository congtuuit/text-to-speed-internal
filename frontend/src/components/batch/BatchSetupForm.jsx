import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../../config';

export default function BatchSetupForm({
  t,
  authToken,
  selectedFiles,
  setSelectedFiles,
  batchVoice,
  setBatchVoice,
  batchSpeed,
  setBatchSpeed,
  savedVoices,
  onPreview,
  onStart,
  autoRetry,
  setAutoRetry
}) {
  const [batchSavedPreviewId, setBatchSavedPreviewId] = useState(null);
  const [batchSavedPreviewUrl, setBatchSavedPreviewUrl] = useState(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const authHeaders = { Authorization: `Bearer ${authToken}` };
  const jsonHeaders = { ...authHeaders, 'Content-Type': 'application/json' };

  const handleToggleAutoRetry = async (e) => {
    const newVal = e.target.checked;
    setAutoRetry(newVal);
    try {
      const settingsRes = await fetch(`${API_BASE_URL}/api/settings`, { headers: authHeaders });
      if (!settingsRes.ok) throw new Error("Không thể tải cấu hình hiện tại");
      const currentSettings = await settingsRes.json();

      const updatedSettings = {
        ...currentSettings,
        auto_retry: newVal ? "true" : "false"
      };
      const saveRes = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(updatedSettings)
      });
      if (!saveRes.ok) throw new Error("Không thể lưu cấu hình");
    } catch (err) {
      console.error("Failed to toggle auto_retry", err);
      setAutoRetry(!newVal);
    }
  };

  const handleSaveAndWarmup = async (e) => {
    e.preventDefault();
    if (!batchVoice) {
      Swal.fire({
        icon: 'warning',
        title: t('common.error'),
        text: 'Vui lòng chọn giọng đọc trước khi lưu cấu hình',
        background: '#1e293b',
        color: '#fff'
      });
      return;
    }

    setIsSavingConfig(true);
    try {
      // 1. Fetch current settings
      const settingsRes = await fetch(`${API_BASE_URL}/api/settings`, { headers: authHeaders });
      if (!settingsRes.ok) throw new Error("Không thể tải cấu hình hiện tại");
      const currentSettings = await settingsRes.json();

      // Find selected voice details
      const sv = savedVoices.find(s => s.voice_type === batchVoice);
      const seed = sv ? sv.seed : "";
      const voiceText = (sv && sv.text) ? sv.text : t('create.sample');

      // 2. Update settings object
      const updatedSettings = {
        ...currentSettings,
        self_hosted_voice: batchVoice,
        self_hosted_seed: seed,
        output_speed: Number(batchSpeed),
        self_hosted_keep_voice: "true",
        auto_retry: autoRetry ? "true" : "false"
      };

      // 3. Save settings
      const saveRes = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(updatedSettings)
      });
      if (!saveRes.ok) throw new Error("Không thể lưu cấu hình");

      // 4. Trigger warmup on backend
      const selfHostedUrl = currentSettings.self_hosted_url || "http://localhost:7860";
      const warmupRes = await fetch(`${API_BASE_URL}/api/self-hosted/warmup`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          voice: batchVoice,
          seed: seed,
          self_hosted_url: selfHostedUrl,
          keep_voice: "true",
          text: voiceText
        })
      });
      if (!warmupRes.ok) throw new Error("Không thể warmup giọng đọc");

      Swal.fire({
        icon: 'success',
        title: 'Thành công',
        text: 'Đã lưu cấu hình giọng đọc!',
        background: '#1e293b',
        color: '#fff',
        timer: 2000,
        showConfirmButton: false
      });
      setHasUnsavedChanges(false);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: t('common.error'),
        text: err.message,
        background: '#1e293b',
        color: '#fff'
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const onFileDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.txt') || f.name.endsWith('.docx'));
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const onFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(f => f.name.endsWith('.txt') || f.name.endsWith('.docx'));
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
    e.target.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <section className="glass-panel form-stack">
      <h3>Cấu hình Job</h3>

      <label>Tập tin đầu vào (.txt hoặc .docx)</label>
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onFileDrop}
        style={{
          border: '2px dashed var(--border-glass)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.01)',
          transition: 'all 0.2s',
          marginBottom: '1rem'
        }}
        onClick={() => document.getElementById('file-input-batch').click()}
      >
        <input
          id="file-input-batch"
          type="file"
          multiple
          accept=".txt,.docx"
          onChange={onFileSelect}
          style={{ display: 'none' }}
        />
        <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📤</span>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>Kéo thả file vào đây</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>Hoặc click để chọn file từ máy tính</span>
      </div>

      {selectedFiles.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', marginBottom: '1rem', maxHeight: '150px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Danh sách file đã chọn ({selectedFiles.length}):</div>
          {selectedFiles.map((file, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }} title={file.name}>📄 {file.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Saved voices dropdown & preview section */}
      {(
        <div style={{
          marginTop: "0.5rem",
          marginBottom: "1rem",
          background: 'rgba(255,255,255,0.01)',
          padding: '0.75rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255,255,255,0.04)'
        }}>
          <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.4rem" }}>
            {t("batch.selectedVoice")}:
          </label>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <select
              value={batchVoice}
              onChange={async (e) => {
                const selectedVal = e.target.value;
                setBatchVoice(selectedVal);
                setHasUnsavedChanges(true);
                if (!selectedVal) {
                  setBatchSavedPreviewUrl(null);
                  return;
                }

                const sv = savedVoices.find(s => s.voice_type === selectedVal);
                if (sv) {
                  setBatchSavedPreviewId(sv.id);
                  try {
                    const url = await onPreview(sv.voice_type, null, Number(batchSpeed), sv.seed);
                    setBatchSavedPreviewUrl(url);
                  } catch (err) {
                    Swal.fire({
                      icon: "error",
                      title: t("common.error"),
                      text: err.message,
                      background: "#1e293b",
                      color: "#fff"
                    });
                  } finally {
                    setBatchSavedPreviewId(null);
                  }
                }
              }}
              style={{
                flex: 1,
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid var(--border-glass)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-main)",
                padding: "0.6rem 0.75rem",
                outline: "none",
                cursor: "pointer",
                fontSize: "0.9rem"
              }}
            >
              <option value="">-- Chọn giọng đọc --</option>
              {batchVoice && !savedVoices.some(sv => sv.voice_type === batchVoice) && (
                <option value={batchVoice}>{batchVoice} (Mặc định)</option>
              )}
              {savedVoices.map(sv => (
                <option key={sv.id} value={sv.voice_type}>
                  {sv.name} {sv.tag ? `(${sv.tag})` : ''} [{sv.seed}]
                </option>
              ))}
            </select>
            <button
              className="btn ghost"
              onClick={async (e) => {
                e.preventDefault();
                if (!batchVoice) return;
                const sv = savedVoices.find(s => s.voice_type === batchVoice);
                const seed = sv ? sv.seed : "";
                const previewId = sv ? sv.id : "current";
                setBatchSavedPreviewId(previewId);
                try {
                  const url = await onPreview(batchVoice, null, Number(batchSpeed), seed);
                  setBatchSavedPreviewUrl(url);
                } catch (err) {
                  Swal.fire({
                    icon: "error",
                    title: t("common.error"),
                    text: err.message,
                    background: "#1e293b",
                    color: "#fff"
                  });
                } finally {
                  setBatchSavedPreviewId(null);
                }
              }}
              disabled={batchSavedPreviewId !== null || !batchVoice}
              style={{
                padding: "0.55rem 0.75rem",
                minHeight: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title={t("create.preview")}
            >
              {batchSavedPreviewId !== null ? "⏳" : "▶"}
            </button>
          </div>

          {batchSavedPreviewUrl && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
              <audio controls autoPlay src={batchSavedPreviewUrl} className="preview-audio" key={batchSavedPreviewUrl} style={{ width: "100%", margin: 0 }} />
            </div>
          )}
        </div>
      )}

      {/* Speed slider */}
      <div className="speed-slider-container">
        <div className="speed-slider-header">
          <label>{t('batch.speed')}</label>
          <strong>{batchSpeed}x</strong>
        </div>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={batchSpeed}
          onChange={e => {
            setBatchSpeed(Number(e.target.value));
            setHasUnsavedChanges(true);
          }}
          style={{ width: '100%', accentColor: 'var(--primary)' }}
        />
        <div className="speed-slider-labels">
          <span>0.5x</span>
          <span>1.0x (Mặc định)</span>
          <span>1.5x</span>
          <span>2.0x</span>
        </div>
      </div>

      <div style={{
        marginTop: '1rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(255,255,255,0.01)',
        padding: '0.75rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(255,255,255,0.04)'
      }}>
        <input
          type="checkbox"
          id="auto-retry-checkbox"
          checked={autoRetry}
          onChange={handleToggleAutoRetry}
          style={{
            width: '18px',
            height: '18px',
            accentColor: 'var(--primary)',
            cursor: 'pointer'
          }}
        />
        <label
          htmlFor="auto-retry-checkbox"
          style={{
            fontSize: '0.9rem',
            color: 'var(--text-main)',
            cursor: 'pointer',
            userSelect: 'none',
            fontWeight: 500
          }}
        >
          Tự động chạy lại khi có lỗi (Auto-retry)
        </label>
      </div>

      <div className="button-row" style={{ marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button
          className="btn ghost"
          onClick={handleSaveAndWarmup}
          disabled={isSavingConfig}
          style={{ display: 'inline-flex', gap: '0.25rem' }}
          title="Lưu mặc định & Khởi tạo giọng nói trên máy chủ"
        >
          {isSavingConfig ? "⏳" : "💾 Lưu cấu hình"}
        </button>
        {selectedFiles.length > 0 && (
          <button className="btn ghost" onClick={() => { setSelectedFiles([]); }}>Xóa tất cả</button>
        )}
        <button className="btn" onClick={(e) => {
          setBatchSavedPreviewUrl(null);
          onStart(e);
        }} disabled={selectedFiles.length === 0 || hasUnsavedChanges}>{t('batch.start')}</button>
      </div>
    </section>
  );
}
