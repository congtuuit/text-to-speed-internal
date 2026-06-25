import { useState } from 'react'
import Swal from 'sweetalert2'

export default function VoicePicker({ voices, selectedId, onSelect, onPreview, t }) {
  const [previewingId, setPreviewingId] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const handlePreview = async (e, voiceId) => {
    e.stopPropagation()
    setPreviewingId(voiceId)
    setPreviewUrl(null)
    try {
      const url = await onPreview(voiceId)
      setPreviewUrl(url)
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('common.error'), text: err.message, background: '#1e293b', color: '#fff' })
    } finally {
      setPreviewingId(null)
    }
  }

  return (
    <>
      <div className="voice-picker">
        {voices.map(item => (
          <div
            key={item.id}
            className={`voice-pick-row ${selectedId === item.id ? 'active' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            <span className="voice-pick-dot">{selectedId === item.id ? '●' : '○'}</span>
            <span className="voice-pick-name">{item.name}</span>
            <button
              className="btn ghost btn-sm"
              onClick={e => handlePreview(e, item.id)}
              disabled={previewingId === item.id}
            >
              {previewingId === item.id ? '…' : '▶'}
            </button>
          </div>
        ))}
      </div>
      {previewUrl && <audio controls autoPlay src={previewUrl} className="preview-audio" key={previewUrl} />}
    </>
  )
}
