import { useState } from 'react'
import Swal from 'sweetalert2'
import PageHeader from '../components/PageHeader'

export default function Voices({ t, voice, setVoice, voices, savedVoices, onPreview, onSave, onDelete, currentUser, authToken }) {
  const [cardPreviewingId, setCardPreviewingId] = useState(null)
  const [cardPreviewUrl, setCardPreviewUrl] = useState(null)

  // Store a seed per base voice. If not generated, it will be undefined or empty.
  const [voiceSeeds, setVoiceSeeds] = useState({})

  const handleCardPreview = async (voiceId, seed, keepVoice = "true") => {
    setCardPreviewingId(voiceId)
    setCardPreviewUrl(null)
    try {
      const url = await onPreview(voiceId, null, 1.0, seed || "", keepVoice)
      setCardPreviewUrl(url)
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('common.error'), text: err.message, background: '#1e293b', color: '#fff' })
    } finally {
      setCardPreviewingId(null)
    }
  }

  const handleRandomSeed = (voiceId) => {
    // Generate a random 5 digit seed
    const newSeed = Math.floor(10000 + Math.random() * 90000).toString()
    setVoiceSeeds(prev => ({ ...prev, [voiceId]: newSeed }))
    // Automatically preview the new voice
    handleCardPreview(voiceId, newSeed, "false")
  }

  const handleSavePrompt = async (voiceId, defaultName) => {
    const currentSeed = voiceSeeds[voiceId] || ""
    const { value: voiceName } = await Swal.fire({
      title: '<span style="font-size: 1.5rem; font-weight: 700;">💾 Lưu Giọng Đọc</span>',
      html: '<p style="color: var(--text-muted); font-size: 0.95rem; margin-top: 0.5rem; margin-bottom: 1.5rem;">Thêm giọng đọc này vào thư viện để sử dụng lại sau này.</p>',
      input: 'text',
      inputLabel: 'Tên gợi nhớ cho giọng đọc',
      inputPlaceholder: 'Ví dụ: Giọng quảng cáo nữ...',
      inputValue: `${defaultName} ${currentSeed ? `(ID ${currentSeed})` : `#${Math.floor(1000 + Math.random() * 9000)}`}`,
      showCancelButton: true,
      confirmButtonText: 'Lưu vào thư viện',
      cancelButtonText: 'Hủy bỏ',
      background: 'transparent',
      color: 'var(--text-main)',
      customClass: {
        popup: 'glass-panel',
        confirmButton: 'btn success',
        cancelButton: 'btn ghost',
        actions: 'swal2-actions-custom',
        input: 'swal2-input-custom',
        inputLabel: 'swal2-label-custom'
      },
      buttonsStyling: false,
      inputValidator: (value) => {
        if (!value) return 'Tên không được để trống!'
      }
    })

    if (voiceName) {
      onSave(voiceId, voiceName, currentSeed)
    }
  }

  const handleSaveToCommonPrompt = async (voiceId, defaultName) => {
    const currentSeed = voiceSeeds[voiceId] || ""
    const { value: voiceName } = await Swal.fire({
      title: '<span style="font-size: 1.5rem; font-weight: 700;">💾 Lưu vào Common</span>',
      html: '<p style="color: var(--text-muted); font-size: 0.95rem; margin-top: 0.5rem; margin-bottom: 1.5rem;">Thêm giọng đọc này làm giọng mặc định hệ thống cho tất cả người dùng.</p>',
      input: 'text',
      inputLabel: 'Tên hiển thị mặc định',
      inputPlaceholder: 'Ví dụ: Nam, giọng mặc định...',
      inputValue: `${defaultName} ${currentSeed ? `(ID ${currentSeed})` : `#${Math.floor(1000 + Math.random() * 9000)}`}`,
      showCancelButton: true,
      confirmButtonText: 'Lưu vào Common',
      cancelButtonText: 'Hủy bỏ',
      background: 'transparent',
      color: 'var(--text-main)',
      customClass: {
        popup: 'glass-panel',
        confirmButton: 'btn success',
        cancelButton: 'btn ghost',
        actions: 'swal2-actions-custom',
        input: 'swal2-input-custom',
        inputLabel: 'swal2-label-custom'
      },
      buttonsStyling: false,
      inputValidator: (value) => {
        if (!value) return 'Tên không được để trống!'
      }
    })

    if (voiceName) {
      try {
        Swal.fire({
          title: 'Đang xử lý...',
          didOpen: () => { Swal.showLoading() },
          background: 'transparent',
          color: 'var(--text-main)',
          customClass: { popup: 'glass-panel' },
          showConfirmButton: false,
          allowOutsideClick: false
        })

        const res = await fetch(`${API_BASE_URL}/api/admin/common-voices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            name: voiceName,
            voice: voiceId,
            seed: currentSeed
          })
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.detail || 'Failed to save common voice')
        }

        Swal.fire({
          icon: 'success',
          title: 'Thành công',
          text: 'Đã lưu giọng đọc vào common_voices thành công!',
          background: '#1e293b',
          color: '#fff',
          timer: 2000,
          showConfirmButton: false
        })
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: t('common.error'),
          text: err.message,
          background: '#1e293b',
          color: '#fff'
        })
      }
    }
  }

  return (
    <>
      <PageHeader title={t('voices.title')} subtitle={t('voices.subtitle')} />

      {/* Global audio player for previewing */}
      <div style={{
        position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100,
        background: 'var(--bg-glass)', padding: '0.5rem 1rem',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--border-glass)',
        opacity: cardPreviewUrl ? 1 : 0,
        pointerEvents: cardPreviewUrl ? 'auto' : 'none',
        transform: cardPreviewUrl ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        width: '350px',
        maxWidth: 'calc(100vw - 4rem)'
      }}>
        {cardPreviewUrl && (
          <audio controls autoPlay src={cardPreviewUrl} style={{ width: '100%', height: '40px' }} key={cardPreviewUrl} />
        )}
      </div>

      {/* Saved Voices section (Moved to top) */}
      <div className="saved-voices-section" style={{ marginBottom: "3rem", marginTop: 0 }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.25rem", color: "var(--text-main)" }}>Thư viện giọng nói của tôi</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>Các giọng nói bạn đã lưu sẽ hiển thị ở đây</p>

        {savedVoices.length === 0 ? (
          <section className="glass-panel empty-state">{t('voices.noSaved')}</section>
        ) : (
          <div className="voice-grid">
            {savedVoices.map(sv => (
              <article key={sv.id} className="voice-card saved-card" style={{ padding: "1rem", gap: "0.5rem", minHeight: "auto" }}>
                <h3 style={{ minHeight: "50px", margin: "0.5rem 0", fontSize: "1.1rem", color: "var(--text-main)" }}>{sv.name}</h3>

                <div className="button-grid" style={{ marginTop: "0" }}>
                  <button className="btn ghost btn-sm" style={{ minWidth: "90px" }} onClick={() => handleCardPreview(sv.voice_type, sv.seed)} disabled={cardPreviewingId === sv.voice_type}>
                    {cardPreviewingId === sv.voice_type ? '…' : '🎧 Nghe'}
                  </button>
                  <button className="btn danger-soft btn-sm" onClick={() => onDelete(sv.id)}>
                    🗑️
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)', marginBottom: '3rem' }} />

      {/* Base Voice gallery */}
      <div className="base-voices-section">
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.25rem", color: "var(--text-main)" }}>Khám phá giọng mẫu</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>Đổi giọng ngẫu nhiên dựa trên các mẫu giọng gốc</p>

        <div className="voice-grid">
          {voices.map(item => {
            const currentSeed = voiceSeeds[item.id] || ""
            const isSelected = voice === item.id && !currentSeed

            return (
              <article
                key={item.id}
                className={`voice-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setVoice(item.id)}
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                <div className="voice-avatar">{item.name[0]}</div>
                <h3>{item.name}</h3>
                <div className="button-grid" style={{ gridTemplateColumns: '1fr', gap: '0.4rem', width: '100%', marginTop: 'auto' }}>
                  <button
                    className="btn ghost btn-sm"
                    style={{ whiteSpace: 'nowrap', padding: '0.3rem 0.4rem', fontSize: '0.75rem' }}
                    onClick={(e) => { e.stopPropagation(); handleCardPreview(item.id, currentSeed, "false"); }}
                    disabled={cardPreviewingId === item.id}
                  >
                    {cardPreviewingId === item.id ? '…' : '🎧 Nghe thử'}
                  </button>
                  <button
                    className="btn ghost btn-sm"
                    style={{ whiteSpace: 'nowrap', padding: '0.3rem 0.4rem', fontSize: '0.75rem' }}
                    onClick={(e) => { e.stopPropagation(); handleRandomSeed(item.id); }}
                  >
                    🎲 Đổi giọng
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ whiteSpace: 'nowrap', padding: '0.4rem', fontSize: '0.8rem' }}
                    onClick={(e) => { e.stopPropagation(); handleSavePrompt(item.id, item.name); }}
                  >
                    💾 Lưu vào thư viện
                  </button>
                  {currentUser?.role === 'admin' && (
                    <button
                      className="btn secondary btn-sm"
                      style={{ whiteSpace: 'nowrap', padding: '0.4rem', fontSize: '0.8rem' }}
                      onClick={(e) => { e.stopPropagation(); handleSaveToCommonPrompt(item.id, item.name); }}
                    >
                      📁 Lưu vào common
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </>
  )
}
