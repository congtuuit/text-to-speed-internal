import PageHeader from '../components/PageHeader'
import { API_BASE_URL } from '../config'

export default function AudioLibrary({ t, library, onRefresh, onCopy, onDelete }) {
  return (
    <>
      <PageHeader title={t('library.title')} subtitle={t('library.subtitle')} />

      <button className="btn ghost refresh-button" onClick={onRefresh}>{t('common.refresh')}</button>
      <div className="library-list">
        {library.length === 0 ? (
          <section className="glass-panel empty-state">{t('library.empty')}</section>
        ) : library.map(item => {
          const src = item.audio_url?.startsWith('http') ? item.audio_url : `${API_BASE_URL}${item.audio_url}`
          return (
            <article key={item.id} className="audio-card">
              <div className="audio-card__meta">
                <strong>{item.file_name}</strong>
                <span>{item.storage_provider} • {new Date(item.created_at).toLocaleString()}</span>
              </div>
              <audio controls src={src} />
              <div className="audio-actions">
                <button className="btn ghost btn-sm" onClick={() => onCopy(item)}>{t('library.copy')}</button>
                <a className="btn success btn-sm" href={src} download>{t('library.download')}</a>
                <button className="btn danger btn-sm" onClick={() => onDelete(item)}>{t('library.delete')}</button>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
