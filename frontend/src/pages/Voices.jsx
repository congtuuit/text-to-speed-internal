import { useState } from 'react'
import Swal from 'sweetalert2'
import PageHeader from '../components/PageHeader'

export default function Voices({ t, voice, setVoice, voices, savedVoices, onPreview, onSave, onDelete }) {
  const [cardPreviewingId, setCardPreviewingId] = useState(null)
  const [voiceSeed, setVoiceSeed] = useState("")
  const [cardPreviewUrl, setCardPreviewUrl] = useState(null)

  const handleCardPreview = async (voiceId, previewSeed) => {
    setCardPreviewingId(voiceId)
    setCardPreviewUrl(null)
    try {
      const url = await onPreview(voiceId, null, 1.0, previewSeed || voiceSeed)
      setCardPreviewUrl(url)
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('common.error'), text: err.message, background: '#1e293b', color: '#fff' })
    } finally {
      setCardPreviewingId(null)
    }
  }

  return (
    <>
      <PageHeader title={t('voices.title')} subtitle={t('voices.subtitle')} />

      {/* Seed control */}
      <div className="seed-control" style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <label style={{ whiteSpace: "nowrap" }}>{t("voices.seed")}:</label>
        <input type="text" value={voiceSeed} onChange={e => setVoiceSeed(e.target.value)} placeholder={t("voices.seedPlaceholder")} style={{ maxWidth: "200px" }} />
      </div>


      {/* Voice gallery */}
      <div className="voice-grid">
        {voices.map(item => (
          <article key={item.id} className={`voice-card ${voice === item.id ? 'selected' : ''}`}>
            <div className="voice-avatar">{item.name[0]}</div>
            <h3>{item.name}</h3>
            <p>{item.meta || 'Vietnamese'}</p>
          <div className="button-row">
              <button className="btn ghost btn-sm" onClick={() => handleCardPreview(item.id, voiceSeed)} disabled={cardPreviewingId === item.id}>
                {cardPreviewingId === item.id ? '…' : t('voices.preview')}
              </button>
              <button className="btn btn-sm" onClick={() => setVoice(item.id)}>{t('voices.use')}</button>
            </div>
            <button className="btn ghost btn-sm" style={{ marginTop: '0.25rem' }} onClick={() => onSave(item.id, item.name, voiceSeed)}>
              {t('voices.save')}
            </button>
          </article>
        ))}
      </div>

      {cardPreviewUrl && (
        <audio controls autoPlay src={cardPreviewUrl} style={{ width: '100%', margin: '1rem 0' }} key={cardPreviewUrl} />
      )}

      {/* Saved Voices section */}
      <div className="saved-voices-section">
        <PageHeader title={t('voices.savedVoices')} subtitle={t('voices.savedSubtitle')} />
        {savedVoices.length === 0 ? (
          <section className="glass-panel empty-state">{t('voices.noSaved')}</section>
        ) : (
          <div className="library-list">
            {savedVoices.map(sv => (
              <article key={sv.id} className="audio-card">
                <div className="audio-card__meta">
                  <strong>{sv.name}</strong>
                  <span>{sv.voice_type}</span>
                  <span style={{ marginLeft: "0.5rem", color: "#94a3b8", fontSize: "0.8rem" }}>({t("voices.seed")}: {sv.seed || "-"})</span>
                </div>
                <div className="audio-actions">
                  <button className="btn ghost btn-sm" onClick={() => handleCardPreview(sv.voice_type, sv.seed)}>
                    {t('voices.preview')}
                  </button>
                  <button className="btn btn-sm" onClick={() => setVoice(sv.voice_type)}>{t('voices.use')}</button>
                  <button className="btn danger btn-sm" onClick={() => onDelete(sv.id)}>{t('library.delete')}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
