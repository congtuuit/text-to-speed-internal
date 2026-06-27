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
      
      <div className="library-list">
        {library.length === 0 ? (
          <section className="glass-panel empty-state">{t('library.empty')}</section>
        ) : library.map(item => {
          const src = item.audio_url?.startsWith('http') ? item.audio_url : `${API_BASE_URL}${item.audio_url}`
          const isCurrent = playingTrack?.id === item.id
          const createdAt = new Date(item.created_at)
          const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
          const daysLeft = Math.max(0, 30 - daysSinceCreation)
          
          return (
            <article 
              key={item.id} 
              className="audio-card" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.75rem', 
                alignItems: 'stretch',
                gridTemplateColumns: 'none', // Override index.css grid
                border: isCurrent ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                boxShadow: isCurrent ? 'var(--shadow-glow)' : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div className="audio-card__meta" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong>{item.file_name}</strong>
                    <span>
                      {item.storage_provider === 'local' ? 'TTS Studio' : item.storage_provider} 
                      {' • '} 
                      {createdAt.toLocaleString()}
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '4px', 
                    background: daysLeft <= 3 ? 'var(--danger, #ef4444)' : 'var(--warning, #f59e0b)', 
                    color: '#fff', 
                    whiteSpace: 'nowrap',
                    fontWeight: '500'
                  }}>
                    {daysLeft <= 0 ? 'Sắp xóa' : `⏳ Xóa sau ${daysLeft} ngày`}
                  </span>
                </div>
                <div className="audio-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button 
                    className={`btn ${isCurrent && isPlaying ? 'primary' : 'success'} btn-sm`} 
                    onClick={() => handlePlayPauseTrack(item)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    {isCurrent && isPlaying ? '⏸' : '▶'} {isCurrent && isPlaying ? t('library.pause') : t('library.play')}
                  </button>
                  <button className="btn ghost btn-sm" onClick={() => onCopy(item)}>{t('library.copy')}</button>
                  <a className="btn success btn-sm" href={src} download>{t('library.download')}</a>
                  <button className="btn danger btn-sm" onClick={() => onDelete(item)}>{t('library.delete')}</button>
                </div>
              </div>
            </article>
          )
        })}
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