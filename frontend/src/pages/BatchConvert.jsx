import { useState } from 'react'
import Swal from 'sweetalert2'
import PageHeader from '../components/PageHeader'

export default function BatchConvert({ t, inputDir, setInputDir, outputDir, setOutputDir, fileCount, onScan, onStart, voices, batchVoice, setBatchVoice, batchSpeed, setBatchSpeed, savedVoices = [], onPreview }) {
  const [batchSavedPreviewId, setBatchSavedPreviewId] = useState(null)
  const [batchSavedPreviewUrl, setBatchSavedPreviewUrl] = useState(null)

  return (
    <>
      <PageHeader title={t('batch.title')} subtitle={t('batch.subtitle')} />
      <section className="glass-panel form-stack">
        <label>{t('batch.input')}</label>
        <input type="text" value={inputDir} onChange={e => setInputDir(e.target.value)} placeholder="D:\input-files" />

        <label>{t('batch.output')}</label>
        <input type="text" value={outputDir} onChange={e => setOutputDir(e.target.value)} placeholder="D:\output-files" />



          {/* Current voice indicator */}
          <div style={{ marginBottom: "0.75rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
            <span>{t("batch.voice")}: <strong>{batchVoice}</strong></span>
            {(() => { const sv = savedVoices.find(s => s.voice_type === batchVoice); return sv ? <span style={{ marginLeft: "0.5rem" }}>({t("voices.seed")}: {sv.seed || "-"})</span> : null; })()}
          </div>
        <label>{t('batch.speed')}</label>
        <input type="range" min="0.5" max="2" step="0.1" value={batchSpeed} onChange={e => setBatchSpeed(Number(e.target.value))} />
        <strong>{batchSpeed}x</strong>


          {/* Saved voices */}
          {savedVoices.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{t("voices.savedVoices")}:</label>
              <div className="voice-picker">
                {savedVoices.map(sv => (
                  <div key={sv.id} className={`voice-pick-row ${batchVoice === sv.voice_type ? "active" : ""}`}
                    onClick={() => { setBatchVoice(sv.voice_type); }}>
                    <span className="voice-pick-dot">{batchVoice === sv.voice_type ? "●" : "○"}</span>
                    <span className="voice-pick-name">{sv.name}</span>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginLeft: "0.5rem" }}>({t("voices.seed")}: {sv.seed || "-"})</span>
                    <button className="btn ghost btn-sm" onClick={async (e) => { e.stopPropagation(); setBatchSavedPreviewId(sv.id); try { const url = await onPreview(sv.voice_type, null, Number(batchSpeed), sv.seed); setBatchSavedPreviewUrl(url); } catch (err) { Swal.fire({ icon: "error", title: t("common.error"), text: err.message, background: "#1e293b", color: "#fff" }); } finally { setBatchSavedPreviewId(null); } }} disabled={batchSavedPreviewId === sv.id}>
                      {batchSavedPreviewId === sv.id ? "⏳" : "▶"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {batchSavedPreviewUrl && (
            <audio controls autoPlay src={batchSavedPreviewUrl} className="preview-audio" key={batchSavedPreviewUrl} style={{ width: "100%", marginTop: "0.5rem" }} />
          )}

          <div className="button-row">
          <button className="btn ghost" onClick={onScan}>{t('batch.scan')}</button>

          <button className="btn" onClick={onStart}>{t('batch.start')}</button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {fileCount ? t('batch.found', { count: fileCount }) : t('batch.empty')}
        </p>


      </section>
    </>
  )
}
