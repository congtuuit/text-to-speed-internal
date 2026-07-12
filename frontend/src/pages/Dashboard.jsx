import { useEffect, useState, useRef } from 'react'
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

  const [playingTrack, setPlayingTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)

  const audioRef = useRef(null)

  const handlePlayPauseTrack = (track) => {
    if (playingTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current?.pause()
        setIsPlaying(false)
      } else {
        audioRef.current?.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error("Playback failed", err))
      }
    } else {
      setPlayingTrack(track)
    }
  }

  useEffect(() => {
    if (playingTrack && audioRef.current) {
      audioRef.current.load()
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error("Playback failed", err)
          setIsPlaying(false)
        })
    }
  }, [playingTrack])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleSliderChange = (e) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (val > 0) {
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleClosePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setPlayingTrack(null)
    setIsPlaying(false)
  }

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const getAudioSrc = (track) => {
    if (!track) return ''
    return track.audio_url?.startsWith('http') 
      ? track.audio_url 
      : `${API_BASE_URL}${track.audio_url}`
  }

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
                const createdAt = new Date(item.created_at)
                const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
                const daysLeft = Math.max(0, 30 - daysSinceCreation)
                return (
                  <article key={item.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <strong style={{ fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.file_name}>
                          {item.file_name}
                        </strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {item.storage_provider === 'local' ? 'TTS Studio' : item.storage_provider} • {createdAt.toLocaleDateString()}
                        </span>
                      </div>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '12px', 
                        background: daysLeft <= 3 ? 'var(--danger, #ef4444)' : 'var(--warning, #f59e0b)', 
                        color: '#fff', 
                        whiteSpace: 'nowrap',
                        fontWeight: '500',
                        flexShrink: 0
                      }}>
                        {daysLeft <= 0 ? 'Sắp xóa' : `⏳ ${daysLeft} ngày`}
                      </span>
                    </div>
                    
                    <div className="audio-actions" style={{ justifyContent: 'flex-end', gap: '0.5rem', display: 'flex', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      <button 
                        className={`btn ${playingTrack?.id === item.id && isPlaying ? 'primary' : 'success'} btn-sm icon-btn`} 
                        onClick={() => handlePlayPauseTrack(item)}
                        title={playingTrack?.id === item.id && isPlaying ? t('library.pause') : t('library.play')}
                      >
                        {playingTrack?.id === item.id && isPlaying ? '⏸' : '▶'}
                      </button>
                      <button className="btn ghost btn-sm icon-btn" onClick={() => onCopy(item)} title={t('library.copy')}>🔗</button>
                      <a className="btn success btn-sm icon-btn" href={src} download title={t('library.download')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                      </a>
                      <button className="btn danger btn-sm icon-btn" onClick={() => onDelete(item)} title={t('library.delete')}>🗑️</button>
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

      {/* Docked Footer Audio Player */}
      {playingTrack && (
        <div className="floating-audio-player">
          <audio
            ref={audioRef}
            src={getAudioSrc(playingTrack)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
          />
          
          <div className="fap-info">
            <span className="fap-title" title={playingTrack.file_name}>
              {playingTrack.file_name}
            </span>
            <span className="fap-meta">
              {playingTrack.storage_provider === 'local' ? 'TTS Studio' : playingTrack.storage_provider}
            </span>
          </div>

          <div className="fap-controls">
            <button className="fap-play-btn" onClick={() => handlePlayPauseTrack(playingTrack)} aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            
            <div className="fap-progress-container">
              <span className="fap-time">{formatTime(currentTime)}</span>
              <input
                type="range"
                className="fap-slider"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSliderChange}
              />
              <span className="fap-time">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="fap-right">
            <div className="fap-volume">
              <button className="fap-vol-btn" onClick={toggleMute} aria-label="Mute/Unmute">
                {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
              </button>
              <input
                type="range"
                className="fap-vol-slider"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
              />
            </div>
            
            <button className="fap-close-btn" onClick={handleClosePlayer} title={t('common.close')}>
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Spacer to prevent player overlapping library cards at the bottom */}
      {playingTrack && <div style={{ height: '100px' }} />}
    </>
  )
}