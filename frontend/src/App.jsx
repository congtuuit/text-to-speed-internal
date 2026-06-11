import { useState, useEffect } from 'react'
import './index.css'

function App() {
  const [inputDir, setInputDir] = useState(() => localStorage.getItem('tts_input_dir') || 'D:\\Truyen\\input')
  const [outputDir, setOutputDir] = useState(() => localStorage.getItem('tts_output_dir') || 'D:\\Truyen\\output')
  const [voice, setVoice] = useState(() => localStorage.getItem('tts_voice') || 'Aoede')
  const [testText, setTestText] = useState(() => localStorage.getItem('tts_test_text') || 'Xin chào, đây là giọng đọc thử.')
  const [apiKey, setApiKey] = useState('')
  
  const [isScanning, setIsScanning] = useState(false)
  const [fileCount, setFileCount] = useState(0)
  const [isTestingVoice, setIsTestingVoice] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  
  const [progress, setProgress] = useState({
    status: 'Idle',
    total: 0,
    done: 0,
    error: 0,
    processing: 0,
    tasks: []
  })

  // Load Settings from backend
  useEffect(() => {
    fetch('http://localhost:8000/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.api_key) setApiKey(data.api_key)
      })
      .catch(err => console.error(err))
  }, [])

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('tts_input_dir', inputDir)
    localStorage.setItem('tts_output_dir', outputDir)
    localStorage.setItem('tts_voice', voice)
    localStorage.setItem('tts_test_text', testText)
  }, [inputDir, outputDir, voice, testText])

  // Polling for progress
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:8000/api/jobs/latest/progress')
        const data = await res.json()
        if (data && data.status) {
          setProgress(data)
        }
      } catch (err) {
        // Ignore fetch errors during polling if server is down
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleSaveSettings = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey })
      })
      if (res.ok) alert("Settings saved successfully!")
    } catch (err) {
      alert("Failed to save settings")
    }
  }

  const handleScan = async () => {
    setIsScanning(true)
    try {
      const res = await fetch('http://localhost:8000/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: inputDir })
      })
      const data = await res.json()
      if (res.ok) {
        setFileCount(data.total)
      } else {
        alert("Error scanning directory: " + (data.detail || "Unknown error"))
      }
    } catch (err) {
      alert("Failed to connect to backend")
    }
    setIsScanning(false)
  }

  const handleBrowse = async (setter) => {
    try {
      const res = await fetch('http://localhost:8000/api/browse-folder')
      const data = await res.json()
      if (data.path) {
        setter(data.path)
      } else if (data.error) {
        console.error("Browse error:", data.error)
      }
    } catch (err) {
      alert("Failed to connect to backend for browsing. Is the backend running?")
    }
  }

  const handleStartJob = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_dir: inputDir, output_dir: outputDir, voice: voice })
      })
      const data = await res.json()
      if (res.ok) {
        alert(`Started job ${data.job_id} with ${data.total_files} files.`)
      } else {
        alert("Error creating job: " + (data.detail || "Unknown error"))
      }
    } catch (err) {
      alert("Failed to connect to backend")
    }
  }

  const handleTestVoice = async () => {
    setIsTestingVoice(true)
    setAudioUrl(null)
    try {
      const res = await fetch('http://localhost:8000/api/test-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice: voice, text: testText, api_key: apiKey })
      })
      if (res.ok) {
        const blob = await res.blob()
        setAudioUrl(URL.createObjectURL(blob))
      } else {
        alert("Failed to generate test voice audio")
      }
    } catch (err) {
      alert("Failed to connect to backend")
    }
    setIsTestingVoice(false)
  }

  const percent = progress.total > 0 ? Math.round((progress.done + progress.error) / progress.total * 100) : 0;

  return (
    <div className="app-container">
      <div className="header">
        <h1>Gemini TTS Batcher</h1>
        <p>Mass Text-to-Speech Converter powered by Google Gemini 2.0 Flash</p>
      </div>

      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>⚙️ Settings</h2>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Google Gemini API Key</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="password" 
              value={apiKey} 
              onChange={e => setApiKey(e.target.value)} 
              placeholder="AIzaSy..."
              style={{ flex: 1, background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'white' }}
            />
            <button className="btn" style={{ width: 'auto', background: '#334155' }} onClick={handleSaveSettings}>Save Key</button>
          </div>
        </div>
      </div>

      <div className="glass-panel">
        <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>1. Batch Setup</h2>
        <div className="form-group">
          <label>Input Directory</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              value={inputDir} 
              onChange={e => setInputDir(e.target.value)} 
              placeholder="e.g. D:\Books\txt"
              style={{ flex: 1 }}
            />
            <button className="btn" style={{ width: 'auto', background: '#334155' }} onClick={() => handleBrowse(setInputDir)}>Browse</button>
            <button className="btn" style={{ width: 'auto' }} onClick={handleScan} disabled={isScanning}>
              {isScanning ? 'Scanning...' : 'Scan'}
            </button>
          </div>
          {fileCount > 0 && <small style={{ color: '#10b981' }}>Found {fileCount} .txt files</small>}
        </div>

        <div className="form-group">
          <label>Output Directory</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              value={outputDir} 
              onChange={e => setOutputDir(e.target.value)} 
              placeholder="e.g. D:\Books\mp3"
              style={{ flex: 1 }}
            />
            <button className="btn" style={{ width: 'auto', background: '#334155' }} onClick={() => handleBrowse(setOutputDir)}>Browse</button>
          </div>
        </div>

        <div className="form-group">
          <label>Gemini Voice Selection</label>
          <select value={voice} onChange={e => setVoice(e.target.value)}>
            <option value="Aoede">Aoede</option>
            <option value="Charon">Charon</option>
            <option value="Fenrir">Fenrir</option>
            <option value="Kore">Kore</option>
            <option value="Puck">Puck</option>
          </select>
        </div>

        <button className="btn" onClick={handleStartJob} disabled={fileCount === 0 && progress.status !== 'Pending'} style={{ marginTop: '1rem' }}>
          START BATCH CONVERSION
        </button>
      </div>

      <div className="glass-panel">
        <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>2. Test Voice Preview</h2>
        <div className="form-group">
          <label>Test Text</label>
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
          {isTestingVoice ? 'Testing...' : (apiKey ? `Test Voice (${voice})` : 'API Key Required')}
        </button>
        {audioUrl && (
          <audio src={audioUrl} controls autoPlay style={{ marginTop: '15px', width: '100%', borderRadius: '8px' }} />
        )}
      </div>

      <div className="glass-panel">
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.25rem' }}>Status Dashboard</h2>
        
        <div className="stats">
          <span>State: <strong style={{ color: '#fff' }}>{progress.status}</strong></span>
          <span>Total Tasks: <strong style={{ color: '#fff' }}>{progress.total}</strong></span>
        </div>

        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${percent}%` }}></div>
        </div>
        
        <div className="stats">
          <span>Done: <strong style={{ color: '#10b981' }}>{progress.done}</strong></span>
          <span>Error: <strong style={{ color: '#ef4444' }}>{progress.error}</strong></span>
          <span>Processing: <strong style={{ color: '#3b82f6' }}>{progress.processing}</strong></span>
        </div>

        <div className="task-list">
          {progress.tasks && progress.tasks.map((task, idx) => (
            <div className="task-item" key={idx}>
              <span>{task.file_name}</span>
              <span className={`status-badge ${task.status.toLowerCase()}`}>{task.status}</span>
            </div>
          ))}
          {(!progress.tasks || progress.tasks.length === 0) && (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>No active tasks</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
