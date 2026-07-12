import { useState, useRef, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import { API_BASE_URL } from '../config'

export default function AudioLibrary({ t, library, onRefresh, onCopy, onDelete }) {
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

  useEffect(() => {
    onRefresh && onRefresh();
  }, [])

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

  return (
    <>
      <PageHeader title={t('library.title')} subtitle={t('library.subtitle')} />

      <button className="btn ghost refresh-button" onClick={onRefresh} style={{ marginBottom: '1.5rem' }}>
        {t('common.refresh')}
      </button>
      <div className="library-table-container">
        {library.length === 0 ? (
          <section className="glass-panel empty-state">{t('library.empty')}</section>
        ) : (
          <div className="library-table">
            <div className="library-table-header hidden-mobile">
              <div className="th-col">Tên File</div>
              <div className="th-col">Ngày tạo</div>
              <div className="th-col">Trạng thái</div>
              <div className="th-col actions-col">Thao tác</div>
            </div>
            <div className="library-table-body">
              {library.map(item => {
                const src = item.audio_url?.startsWith('http') ? item.audio_url : `${API_BASE_URL}${item.audio_url}`
                const isCurrent = playingTrack?.id === item.id
                const createdAt = new Date(item.created_at)
                
                let daysLeft = 30
                if (item.expires_at) {
                  const expiresAt = new Date(item.expires_at)
                  daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                } else {
                  const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
                  daysLeft = Math.max(0, 30 - daysSinceCreation)
                }
                
                return (
                  <article 
                    key={item.id} 
                    className={`library-table-row ${isCurrent ? 'active' : ''}`}
                  >
                    <div className="td-col td-file">
                      <span className="mobile-label">Tên File:</span>
                      <strong>{item.file_name}</strong>
                    </div>

                    <div className="td-col td-date">
                      <span className="mobile-label">Ngày tạo:</span>
                      <span>{createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString()}</span>
                    </div>

                    <div className="td-col td-status">
                      <span className="mobile-label">Trạng thái:</span>
                      <span className={`status-badge ${daysLeft <= 3 ? 'danger' : 'warning'}`}>
                        {daysLeft <= 0 ? 'Sắp xóa' : `⏳ Xóa sau ${daysLeft} ngày`}
                      </span>
                    </div>

                    <div className="td-col td-actions actions-col">
                      <div className="audio-actions">
                        <button 
                          className={`btn ${isCurrent && isPlaying ? 'primary' : 'success'} btn-sm icon-btn`} 
                          onClick={() => handlePlayPauseTrack(item)}
                          title={isCurrent && isPlaying ? t('library.pause') : t('library.play')}
                        >
                          {isCurrent && isPlaying ? '⏸' : '▶'}
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
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}
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