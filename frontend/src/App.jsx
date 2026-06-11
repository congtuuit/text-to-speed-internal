import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Swal from 'sweetalert2'
import './index.css'
import { API_BASE_URL } from './config'

const GEMINI_VOICES = [
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'Male',
    description: 'Giọng nam trầm ấm, rõ ràng.'
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'Male',
    description: 'Giọng nam trung, tự nhiên.'
  },
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'Female',
    description: 'Giọng nữ nhẹ nhàng, truyền cảm.'
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'Male',
    description: 'Giọng nam mạnh mẽ, dứt khoát.'
  },
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'Female',
    description: 'Giọng nữ ấm áp, linh hoạt.'
  }
];

function App() {
  const { t, i18n } = useTranslation()
  const [inputDir, setInputDir] = useState(() => localStorage.getItem('tts_input_dir') || 'D:\\Truyen\\input')
  const [outputDir, setOutputDir] = useState(() => localStorage.getItem('tts_output_dir') || 'D:\\Truyen\\output')
  const [voice, setVoice] = useState(() => localStorage.getItem('tts_voice') || 'Aoede')
  const [testText, setTestText] = useState(() => localStorage.getItem('tts_test_text') || 'Xin chào, đây là giọng đọc thử.')
  const [apiKey, setApiKey] = useState('')
  const [modelName, setModelName] = useState(() => localStorage.getItem('tts_model_name') || 'gemini-2.5-flash-preview-tts')
  const [models, setModels] = useState([])

  const [isScanning, setIsScanning] = useState(false)
  const [fileCount, setFileCount] = useState(0)
  const [isTestingVoice, setIsTestingVoice] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)

  const [quickText, setQuickText] = useState(() => localStorage.getItem('tts_quick_text') || '')
  const [isQuickConverting, setIsQuickConverting] = useState(false)
  const [quickAudioUrl, setQuickAudioUrl] = useState(null)

  const [progress, setProgress] = useState({
    status: 'Idle',
    total: 0,
    done: 0,
    error: 0,
    processing: 0,
    tasks: []
  })

  const fetchModels = async (key) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/models?api_key=${key}`)
      const data = await res.json()
      if (data.models) {
        setModels(data.models)
      }
    } catch (err) { }
  }

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.api_key) {
          setApiKey(data.api_key)
          fetchModels(data.api_key)
        }
        if (data.model_name) {
          setModelName(data.model_name)
        }
      })
      .catch(err => console.error(err))
  }, [])

  useEffect(() => {
    localStorage.setItem('tts_input_dir', inputDir)
    localStorage.setItem('tts_output_dir', outputDir)
    localStorage.setItem('tts_voice', voice)
    localStorage.setItem('tts_test_text', testText)
    localStorage.setItem('tts_model_name', modelName)
  }, [inputDir, outputDir, voice, testText, modelName])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/jobs/latest/progress`)
        const data = await res.json()
        if (data && data.status) {
          setProgress(data)
        }
      } catch (err) {
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleSaveSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, model_name: modelName })
      })
      if (res.ok) {
        alert(t("alerts.saved_success"))
        fetchModels(apiKey)
      }
    } catch (err) {
      alert(t("alerts.save_failed"))
    }
  }

  const handleModelChange = async (e) => {
    const newModel = e.target.value;
    setModelName(newModel);
    try {
      await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, model_name: newModel })
      });
    } catch (err) {}
  }

  const handleScan = async () => {
    setIsScanning(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: inputDir })
      })
      const data = await res.json()
      if (res.ok) {
        setFileCount(data.total)
      } else {
        alert(t("alerts.scan_error") + (data.detail || "Unknown error"))
      }
    } catch (err) {
      alert(t("alerts.conn_error"))
    }
    setIsScanning(false)
  }

  const handleBrowse = async (setter) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/browse-folder`)
      const data = await res.json()
      if (data.path) {
        setter(data.path)
      } else if (data.error) {
        console.error("Browse error:", data.error)
      }
    } catch (err) {
      alert(t("alerts.browse_error"))
    }
  }

  const handleStartJob = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_dir: inputDir, output_dir: outputDir, voice: voice, model_name: modelName, api_key: apiKey })
      })
      const data = await res.json()
      if (res.ok) {
        alert(t("alerts.start_job", { jobId: data.job_id, files: data.total_files }))
      } else {
        alert(t("alerts.start_job_error") + (data.detail || "Unknown error"))
      }
    } catch (err) {
      alert(t("alerts.conn_error"))
    }
  }

  const handleDeleteJob = async () => {
    if (!progress.job_id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${progress.job_id}`, { method: 'DELETE' })
      if (res.ok) {
        setProgress({ status: 'Idle', total: 0, done: 0, error: 0, processing: 0, tasks: [] })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleTestVoice = async () => {
    setIsTestingVoice(true)
    setAudioUrl(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/test-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice: voice, text: testText, api_key: apiKey, model_name: modelName })
      })
      if (res.ok) {
        const blob = await res.blob()
        setAudioUrl(URL.createObjectURL(blob))
      } else {
        const errData = await res.json()
        Swal.fire({
          icon: 'error',
          title: 'Gemini API Error',
          text: errData.detail || t("alerts.test_voice_error"),
          background: '#1e293b',
          color: '#fff',
          confirmButtonColor: '#3b82f6'
        })
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: t("alerts.conn_error"),
        background: '#1e293b',
        color: '#fff',
        confirmButtonColor: '#3b82f6'
      })
    }
    setIsTestingVoice(false)
  }

  const toggleLang = () => {
    const newLang = i18n.language === 'vi' ? 'en' : 'vi'
    i18n.changeLanguage(newLang)
  }

  const handleQuickConvert = async () => {
    if (!quickText.trim()) return;
    setIsQuickConverting(true)
    setQuickAudioUrl(null)
    localStorage.setItem('tts_quick_text', quickText)
    try {
      const res = await fetch(`${API_BASE_URL}/api/test-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice: voice, text: quickText, api_key: apiKey, model_name: modelName })
      })
      if (res.ok) {
        const blob = await res.blob()
        setQuickAudioUrl(URL.createObjectURL(blob))
      } else {
        const errData = await res.json()
        Swal.fire({
          icon: 'error',
          title: 'Gemini API Error',
          text: errData.detail || t("alerts.test_voice_error"),
          background: '#1e293b',
          color: '#fff',
          confirmButtonColor: '#3b82f6'
        })
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: t("alerts.conn_error"),
        background: '#1e293b',
        color: '#fff',
        confirmButtonColor: '#3b82f6'
      })
    }
    setIsQuickConverting(false)
  }

  const percent = progress.total > 0 ? Math.round((progress.done + progress.error) / progress.total * 100) : 0;

  // Deduplicate default model and fetched models
  const fallbackModels = [
    { name: 'models/gemini-2.5-flash-preview-tts', displayName: 'Gemini 2.5 Flash Preview TTS' }
  ];
  const allModels = models && models.length > 0 ? models : fallbackModels;

  return (
    <div className="app-container">
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <button
          className="btn"
          style={{ width: 'auto', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem' }}
          onClick={toggleLang}
        >
          {i18n.language === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}
        </button>
      </div>

      <div className="header">
        <h1>Gemini TTS Batcher</h1>
        <p>{t('title')}</p>
      </div>

      <div className="dashboard-layout">
        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="glass-panel">
            <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>{t('settings')}</h2>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>{t('api_key')}</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{ flex: 1, background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'white' }}
                />
                <button className="btn" style={{ width: 'auto', background: '#334155' }} onClick={handleSaveSettings}>{t('save_key')}</button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Google Gemini Model</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={modelName}
                  onChange={handleModelChange}
                  style={{ flex: 1 }}
                >
                  {fallbackModels.map(fallback => {
                    const val = fallback.name.replace('models/', '');
                    if (models && models.length > 0 && !models.find(m => m.name === fallback.name || m.name === val)) {
                      return <option key={'fb_' + val} value={val}>{val}</option>;
                    }
                    return null;
                  })}
                  {allModels.map(m => {
                    const val = m.name.replace('models/', '');
                    return <option key={m.name} value={val}>{m.displayName || val}</option>
                  })}
                </select>
                <button className="btn" style={{ width: 'auto', background: '#3b82f6' }} onClick={() => fetchModels(apiKey)}>Refresh</button>
              </div>
            </div>
          </div>

          <div className="glass-panel">
            <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>{t('test_voice_preview')}</h2>
            <div className="form-group">
              <label>{t('voice_selection')}</label>
              <select value={voice} onChange={e => setVoice(e.target.value)}>
                {GEMINI_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.gender}) - {v.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('test_text')}</label>
              <textarea
                rows="3"
                value={testText}
                onChange={e => setTestText(e.target.value)}
                style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: 'white',
                  fontSize: '1rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <button className="btn" style={{ background: '#475569' }} onClick={handleTestVoice} disabled={isTestingVoice || !apiKey}>
              {isTestingVoice ? t('testing') : (apiKey ? t('test_voice', { voice: voice }) : t('api_key_required'))}
            </button>
            {audioUrl && (
              <audio src={audioUrl} controls autoPlay style={{ marginTop: '15px', width: '100%', borderRadius: '8px' }} />
            )}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="main-content">
          {/* QUICK TTS PANEL */}
          <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>{t('quick_tts')}</h2>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <textarea
                rows="6"
                value={quickText}
                onChange={e => setQuickText(e.target.value)}
                placeholder={t('quick_placeholder')}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '1rem',
                  color: 'white',
                  fontSize: '1rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button 
              className="btn btn-giant" 
              style={{ width: 'auto', padding: '0.75rem 2.5rem', fontSize: '1.1rem' }}
              onClick={handleQuickConvert} 
              disabled={isQuickConverting || !apiKey || !quickText.trim()}
            >
              {isQuickConverting ? t('testing') : t('quick_convert')}
            </button>
            {quickAudioUrl && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <audio src={quickAudioUrl} controls autoPlay style={{ flex: 1, borderRadius: '8px' }} />
                <a 
                  href={quickAudioUrl} 
                  download={`tts_audio_${new Date().toISOString().replace(/[:T]/g, '-').split('.')[0]}.wav`} 
                  className="btn" 
                  style={{ background: '#10b981', width: 'auto', padding: '0.75rem 1.5rem', textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}
                >
                  ⬇ Tải về
                </a>
              </div>
            )}
          </div>
          <div className="glass-panel">
            <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>{t('batch_setup')}</h2>
            <div className="form-group">
              <label>{t('input_dir')}</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={inputDir}
                  onChange={e => setInputDir(e.target.value)}
                  placeholder="D:\Books\txt"
                  style={{ flex: 1 }}
                />
                <button className="btn" style={{ width: 'auto', background: '#334155' }} onClick={() => handleBrowse(setInputDir)}>{t('browse')}</button>
                <button className="btn" style={{ width: 'auto' }} onClick={handleScan} disabled={isScanning}>
                  {isScanning ? t('scanning') : t('scan')}
                </button>
              </div>
              {fileCount > 0 && <small style={{ color: '#10b981' }}>{t('found_files', { count: fileCount })}</small>}
            </div>

            <div className="form-group">
              <label>{t('output_dir')}</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={outputDir}
                  onChange={e => setOutputDir(e.target.value)}
                  placeholder="D:\Books\mp3"
                  style={{ flex: 1 }}
                />
                <button className="btn" style={{ width: 'auto', background: '#334155' }} onClick={() => handleBrowse(setOutputDir)}>{t('browse')}</button>
              </div>
            </div>

            <button className="btn btn-giant" onClick={handleStartJob} disabled={fileCount === 0 && progress.status !== 'Pending'}>
              {t('start_batch')}
            </button>
          </div>

          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{t('status_dashboard')}</h2>
              {progress.status === 'Completed' && (
                <button 
                  className="btn" 
                  style={{ width: 'auto', padding: '0.4rem 1rem', background: '#ef4444', fontSize: '0.9rem' }} 
                  onClick={handleDeleteJob}
                >
                  Xóa Lịch Sử
                </button>
              )}
            </div>

            <div className="stats">
              <span>{t('state')} <strong style={{ color: progress.is_paused ? '#ef4444' : '#fff' }}>{progress.is_paused ? 'PAUSED (QUOTA/KEY ERROR)' : progress.status}</strong></span>
              <span>{t('total_tasks')} <strong style={{ color: '#fff' }}>{progress.total}</strong></span>
            </div>

            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${percent}%` }}></div>
            </div>

            <div className="stats">
              <span>{t('done')} <strong style={{ color: '#10b981' }}>{progress.done}</strong></span>
              <span>{t('error')} <strong style={{ color: '#ef4444' }}>{progress.error}</strong></span>
              <span>{t('processing')} <strong style={{ color: '#3b82f6' }}>{progress.processing}</strong></span>
            </div>

            <div className="task-list">
              {progress.tasks && progress.tasks.map((task, idx) => (
                <div className="task-item" key={idx}>
                  <span>{task.file_name}</span>
                  <span className={`status-badge ${task.status.toLowerCase()}`}>{task.status}</span>
                </div>
              ))}
              {(!progress.tasks || progress.tasks.length === 0) && (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>{t('no_active_tasks')}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
