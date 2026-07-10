import { useState } from 'react'
import Swal from 'sweetalert2'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
export default function CreateAudio({ t, text, setText, voice, setVoice, createVoiceSeed, setCreateVoiceSeed, setVoiceAndSeed, speed, setSpeed, audioUrl, isGenerating, onGenerate, voices, savedVoices = [], onPreview, progressState, maxChars = 5000 }) {
  const [savedPreviewId, setSavedPreviewId] = useState(null)
  const [savedPreviewUrl, setSavedPreviewUrl] = useState(null)

  const [showVoiceDialog, setShowVoiceDialog] = useState(false)
  const [dialogPreviewId, setDialogPreviewId] = useState(null)
  const [dialogPreviewUrl, setDialogPreviewUrl] = useState(null)

  const handleSelectVoice = (voiceType, seed) => {
    if (setVoiceAndSeed) {
      setVoiceAndSeed(voiceType, seed);
    } else {
      setVoice(voiceType);
      setCreateVoiceSeed(seed || '');
    }
    setShowVoiceDialog(false);
    setDialogPreviewUrl(null);
    setDialogPreviewId(null);
  }

  return (
    <>
      <PageHeader title={t('create.title')} subtitle={t('create.subtitle')} />
      <section className="composer-grid">
        {/* Left – text editor */}
        <div className="glass-panel">
          <label>{t('create.textLabel')}</label>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t('create.textPlaceholder')} />
          <small style={{ color: text.length > maxChars ? 'var(--danger-color, #ef4444)' : 'inherit' }}>
            {t('create.characters', { count: text.length })} / {maxChars}
          </small>
        </div>

        {/* Right – voice config */}
        <div className="glass-panel side-card">
          {/* Voice selector button */}
          <button className="btn" onClick={() => { setDialogPreviewUrl(null); setDialogPreviewId(null); setShowVoiceDialog(true); }} style={{ width: "100%", marginBottom: "0.75rem" }}>
            {t("create.chooseVoice")}
          </button>

          {/* Current voice indicator */}
          <div style={{ marginBottom: "0.75rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
            <span>{(() => { const sv = savedVoices.find(s => s.voice_type === voice && (s.seed || '') === (createVoiceSeed || '')) || savedVoices.find(s => s.voice_type === voice); return <>{t("create.voice")}: <strong>{sv ? sv.name : voice}</strong>{sv && sv.seed ? <span style={{ marginLeft: "0.5rem" }}>({t("voices.seed")}: {sv.seed})</span> : null}</>; })()}</span>
          </div>
          <label>{t('create.speed')}</label>
          <input type="range" min="0.5" max="2" step="0.1" value={speed} onChange={e => setSpeed(e.target.value)} />
          <strong>{speed}x</strong>




          {savedPreviewUrl && (
            <audio controls autoPlay src={savedPreviewUrl} className="preview-audio" key={savedPreviewUrl} style={{ width: "100%", marginTop: "0.5rem" }} />
          )}
          {isGenerating && progressState && progressState.total > 0 && (
            <div style={{ marginBottom: "1rem", textAlign: "center" }}>
              <small style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)" }}>
                {progressState.merging
                  ? "Đang gộp file audio..."
                  : `Đang xử lý ${Math.round((progressState.current / progressState.total) * 100)}%...`}
              </small>
              <div style={{ width: "100%", background: "var(--bg-glass)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  background: "var(--primary-color, #22d3ee)",
                  width: `${progressState.merging ? 100 : Math.round((progressState.current / progressState.total) * 100)}%`,
                  transition: "width 0.3s ease"
                }}></div>
              </div>
            </div>
          )}
          <Button className="btn btn-giant" onClick={onGenerate} isLoading={isGenerating}>
            {isGenerating ? t('common.processing') : t('create.generate')}
          </Button>

          {audioUrl && (
            <>
              <audio controls autoPlay src={audioUrl} key={audioUrl} />
              <a className="btn success" href={audioUrl} download="tts-preview.mp3">{t('create.download')}</a>
            </>
          )}
        </div>

        {/* Voice selection dialog */}
        {showVoiceDialog && (
          <div
            className="modal-overlay"
            onClick={() => { setShowVoiceDialog(false); setDialogPreviewUrl(null); setDialogPreviewId(null); }}
            style={{ position: "fixed", inset: 0, background: "rgba(2, 6, 23, 0.78)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}
          >
            <div className="glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: "720px", width: "100%", maxHeight: "86vh", overflow: "hidden", padding: 0, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(148, 163, 184, 0.18)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <div>
                  <h3 style={{ margin: 0 }}>{t("voices.savedVoices")}</h3>
                  <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>{t("create.chooseVoice")}</p>
                </div>
                <button className="btn ghost btn-sm" onClick={() => { setShowVoiceDialog(false); setDialogPreviewUrl(null); setDialogPreviewId(null); }}>{t("common.close")}</button>
              </div>

              <div style={{ padding: "1rem 1.5rem", overflowY: "auto" }}>
                {savedVoices.length === 0 ? (
                  <section className="glass-panel empty-state">{t("voices.noSaved")}</section>
                ) : (
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    {savedVoices.map(sv => {
                      const isSelected = voice === sv.voice_type && (createVoiceSeed || '') === (sv.seed || '')
                      return (
                        <article
                          key={sv.id}
                          onClick={() => handleSelectVoice(sv.voice_type, sv.seed)}
                          style={{ cursor: "pointer", border: isSelected ? "1px solid rgba(34, 211, 238, 0.85)" : "1px solid rgba(148, 163, 184, 0.18)", background: isSelected ? "rgba(34, 211, 238, 0.12)" : "rgba(15, 23, 42, 0.55)", borderRadius: "16px", padding: "0.9rem", display: "flex", alignItems: "center", gap: "0.75rem" }}
                        >
                          <span className="voice-pick-dot" style={{ color: isSelected ? "#22d3ee" : "#94a3b8" }}>{isSelected ? "●" : "○"}</span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <strong style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sv.name}</strong>
                              {sv.tag && (
                                <span style={{ padding: "0.1rem 0.4rem", fontSize: "0.7rem", borderRadius: "4px", background: "rgba(99, 102, 241, 0.2)", color: "#818cf8", fontWeight: 600 }}>
                                  {sv.tag}
                                </span>
                              )}
                            </div>
                            <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{t("voices.seed")}: {sv.seed || "-"}</span>
                          </div>
                          <Button
                            className="btn ghost btn-sm"
                            onClick={async (e) => { e.stopPropagation(); setDialogPreviewId(sv.id); setDialogPreviewUrl(null); try { const url = await onPreview(sv.voice_type, null, Number(speed), sv.seed); setDialogPreviewUrl(url); } catch (err) { Swal.fire({ icon: "error", title: t("common.error"), text: err.message, background: "#1e293b", color: "#fff" }); } finally { setDialogPreviewId(null); } }}
                            isLoading={dialogPreviewId === sv.id}
                            title={t("voices.preview")}
                          >
                            {dialogPreviewId === sv.id ? "" : "▶"}
                          </Button>
                          <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); handleSelectVoice(sv.voice_type, sv.seed); }}>
                            {isSelected ? "✓" : t("voices.use")}
                          </button>
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>

              {dialogPreviewUrl && (
                <div style={{ padding: "0 1.5rem 1.25rem" }}>
                  <audio controls autoPlay src={dialogPreviewUrl} key={dialogPreviewUrl} style={{ width: "100%" }} />
                </div>
              )}
            </div>
          </div>
        )}

      </section>
    </>
  )
}
