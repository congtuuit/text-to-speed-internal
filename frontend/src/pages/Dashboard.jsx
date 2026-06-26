import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Metric from '../components/Metric'
import { API_BASE_URL } from '../config'

export default function Dashboard({ t, jobs, library, authToken, currentUser, onCopy, onDelete }) {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [billing, setBilling] = useState(null)

  useEffect(() => {
    if (!authToken) return
    fetch(`${API_BASE_URL}/api/billing/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(r => r.json())
      .then(d => setBilling(d))
      .catch(() => {})
  }, [authToken])

  const sub = billing?.subscription
  const usage = billing?.usage

  const charsUsed = usage?.chars_used_this_month ?? 0
  const charsLimit = sub?.chars_limit ?? 50000
  const charsRemaining =
    charsLimit === -1 ? '∞' : Math.max(0, charsLimit - charsUsed).toLocaleString()

  const pct = charsLimit > 0 && charsLimit !== -1 ? Math.min(100, Math.round((charsUsed / charsLimit) * 100)) : 0

  const recentAudios = library.slice(0, 3)
  const activeJobs = jobs.filter(j => j.status === 'Processing' || j.status === 'Pending').slice(0, 3)

  return (
    <>
      {/* Welcome banner */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '2rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.5rem', 
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)', 
          border: '1px solid var(--border-glass)', 
          borderRadius: 'var(--radius-lg)', 
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'var(--primary)', opacity: 0.15, filter: 'blur(50px)', pointerEvents: 'none' }} />
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
          {lang === 'vi' 
            ? `Chào mừng quay trở lại, ${currentUser?.full_name || currentUser?.email || 'bạn'}!` 
            : `Welcome back, ${currentUser?.full_name || currentUser?.email || 'User'}!`}
        </h1>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
          {lang === 'vi' 
            ? 'Quản lý giọng đọc và các tệp âm thanh chuyển đổi của bạn ngay tại đây.' 
            : 'Manage your voices, generated files, and batch jobs in one place.'}
        </p>
      </div>

      {/* Metrics grid */}
      <div className="metric-grid">
        <Metric title={t('dashboard.charactersUsed')} value={charsUsed.toLocaleString()} />
        <Metric title={t('dashboard.remainingQuota')} value={charsRemaining} />
        <Metric title={t('dashboard.generatedAudios')} value={library.length} />
        <Metric title={t('dashboard.recentJobs')} value={jobs.length} />
      </div>

      {/* Quota Progress Bar */}
      {charsLimit !== -1 && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {lang === 'vi' ? 'Hạn mức sử dụng tháng này' : 'Monthly Quota Usage'}
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {pct}% ({charsUsed.toLocaleString()} / {charsLimit.toLocaleString()} {t('pricing.chars')})
            </span>
          </div>
          <div className="progress-track" style={{ height: '8px' }}>
            <div
              className="progress-fill"
              style={{
                width: `${pct}%`,
                background: pct > 90
                  ? 'var(--color-error, #ef4444)'
                  : pct > 75
                  ? '#f59e0b'
                  : 'var(--color-primary, #6366f1)',
              }}
            />
          </div>
        </div>
      )}

      {/* Main Grid: Recent Audios & Active/Recent Jobs */}
      <div className="composer-grid">
        {/* Left Column: Recent Audios */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              {lang === 'vi' ? 'Lịch sử âm thanh mới nhất' : 'Recent Audio Library'}
            </h2>
            {library.length > 3 && (
              <button className="btn ghost btn-sm" onClick={() => navigate('/library')}>
                {lang === 'vi' ? 'Xem tất cả' : 'View all'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentAudios.length === 0 ? (
              <div className="glass-panel empty-state" style={{ padding: '2rem' }}>
                <p>{t('library.empty')}</p>
                <button className="btn btn-sm" onClick={() => navigate('/create')}>
                  {t('create.title')}
                </button>
              </div>
            ) : (
              recentAudios.map(item => {
                const src = item.audio_url?.startsWith('http') ? item.audio_url : `${API_BASE_URL}${item.audio_url}`
                return (
                  <article key={item.id} className="audio-card" style={{ padding: '1rem', background: 'var(--bg-glass)', gridTemplateColumns: '1fr' }}>
                    <div className="audio-card__meta">
                      <strong style={{ fontSize: '0.95rem' }}>{item.file_name}</strong>
                      <span style={{ fontSize: '0.8rem' }}>
                        {item.storage_provider} • {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                    <audio controls src={src} style={{ width: '100%', margin: '0.5rem 0' }} />
                    <div className="audio-actions" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button className="btn ghost btn-sm" onClick={() => onCopy(item)}>{t('library.copy')}</button>
                      <a className="btn success btn-sm" href={src} download>{t('library.download')}</a>
                      <button className="btn danger btn-sm" onClick={() => onDelete(item)}>{t('library.delete')}</button>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Jobs & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
            {lang === 'vi' ? 'Tiến độ chuyển đổi theo lô' : 'Active Batch Jobs'}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeJobs.length === 0 ? (
              <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  {lang === 'vi' ? 'Không có tiến trình chuyển đổi lô nào đang chạy.' : 'No active batch conversion jobs.'}
                </p>
                <button className="btn secondary btn-sm" onClick={() => navigate('/batch')}>
                  {lang === 'vi' ? 'Chuyển đổi lô' : 'Go to Batch'}
                </button>
              </div>
            ) : (
              activeJobs.map(job => (
                <div key={job.job_id} className="glass-panel" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                      {job.job_name}
                    </strong>
                    <span className="status-badge processing" style={{ fontSize: '0.75rem' }}>
                      {job.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{lang === 'vi' ? 'Hoàn thành' : 'Completed'}: {job.done}/{job.total}</span>
                    <span>{Math.round((job.done / job.total) * 100)}%</span>
                  </div>
                  <div className="progress-track" style={{ height: '4px', marginTop: '0.4rem' }}>
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${Math.round((job.done / job.total) * 100)}%`,
                        background: 'var(--color-primary, #6366f1)' 
                      }} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}