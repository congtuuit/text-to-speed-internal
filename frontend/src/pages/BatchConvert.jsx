import { useState, useEffect, useCallback } from 'react'
import Swal from 'sweetalert2'
import PageHeader from '../components/PageHeader'
import { API_BASE_URL } from '../config'

export default function BatchConvert({
  t,
  selectedFiles = [],
  setSelectedFiles,
  onStart,
  voices,
  batchVoice,
  setBatchVoice,
  batchSpeed,
  setBatchSpeed,
  savedVoices = [],
  onPreview,
  jobs = [],
  fetchJobs,
  authToken
}) {
  const [batchSavedPreviewId, setBatchSavedPreviewId] = useState(null)
  const [batchSavedPreviewUrl, setBatchSavedPreviewUrl] = useState(null)
  const [expandedJobId, setExpandedJobId] = useState(null)
  const [jobTasks, setJobTasks] = useState({})
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [playingJobId, setPlayingJobId] = useState(null)

  // Auth Headers
  const authHeaders = { Authorization: `Bearer ${authToken}` }
  const jsonHeaders = { ...authHeaders, 'Content-Type': 'application/json' }

  // Check if any job is currently active/processing
  const hasActiveJobs = jobs.some(j => j.status === 'Processing' || j.status === 'Pending')

  // Auto polling for jobs list if active jobs are running
  useEffect(() => {
    if (!authToken || !fetchJobs) return

    // Initial fetch
    fetchJobs()

    if (!hasActiveJobs) return

    const interval = setInterval(() => {
      fetchJobs()
    }, 3000)

    return () => clearInterval(interval)
  }, [authToken, hasActiveJobs])

  // Fetch tasks for the expanded job
  const fetchTasksForJob = useCallback(async (jobId) => {
    if (!authToken) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/tasks`, { headers: authHeaders })
      if (res.ok) {
        const data = await res.json()
        setJobTasks(prev => ({ ...prev, [jobId]: data.tasks || [] }))
      }
    } catch (err) {
      console.error("Failed to fetch tasks", err)
    }
  }, [authToken])

  // Toggle job detail expansion
  const handleToggleJob = async (jobId) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null)
    } else {
      setExpandedJobId(jobId)
      setLoadingTasks(true)
      await fetchTasksForJob(jobId)
      setLoadingTasks(false)
    }
  }

  // Periodic polling for tasks of the expanded active job
  useEffect(() => {
    if (!expandedJobId || !hasActiveJobs) return

    const interval = setInterval(() => {
      fetchTasksForJob(expandedJobId)
    }, 3000)

    return () => clearInterval(interval)
  }, [expandedJobId, hasActiveJobs, fetchTasksForJob])

  // Reset stuck queue
  const handleResetStuck = async () => {
    setIsResetting(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/reset-stuck`, {
        method: 'POST',
        headers: jsonHeaders
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Reset failed')

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: t('batch.resetSuccess'),
        timer: 2000,
        showConfirmButton: false,
        background: '#1e293b',
        color: '#fff'
      })
      if (fetchJobs) fetchJobs()
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('common.error'), text: err.message, background: '#1e293b', color: '#fff' })
    } finally {
      setIsResetting(false)
    }
  }

  // Delete/Cancel Job
  const handleDeleteJob = async (e, jobId) => {
    e.stopPropagation()
    const result = await Swal.fire({
      title: t('library.deleteConfirm'),
      icon: 'warning',
      showCancelButton: true,
      background: '#1e293b',
      color: '#fff'
    })
    if (!result.isConfirmed) return

    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: authHeaders
      })
      if (!res.ok) throw new Error('Failed to delete job')

      if (expandedJobId === jobId) setExpandedJobId(null)
      if (fetchJobs) fetchJobs()
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('common.error'), text: err.message, background: '#1e293b', color: '#fff' })
    }
  }

  // Retry Task
  const handleRetryTask = async (e, jobId, taskId) => {
    e.stopPropagation()
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/retry`, {
        method: 'POST',
        headers: jsonHeaders
      })
      if (!res.ok) throw new Error('Retry failed')
      await fetchTasksForJob(jobId)
      if (fetchJobs) fetchJobs()
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('common.error'), text: err.message, background: '#1e293b', color: '#fff' })
    }
  }

  const handleSaveAndWarmup = async (e) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      // 1. Fetch current settings
      const settingsRes = await fetch(`${API_BASE_URL}/api/settings`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (!settingsRes.ok) throw new Error("Không thể tải cấu hình hiện tại");
      const currentSettings = await settingsRes.json();

      // Find selected voice details
      const sv = savedVoices.find(s => s.voice_type === batchVoice);
      const seed = sv ? sv.seed : "";

      // 2. Update settings object
      const updatedSettings = {
        ...currentSettings,
        self_hosted_voice: batchVoice,
        self_hosted_seed: seed,
        output_speed: Number(batchSpeed),
        self_hosted_keep_voice: "true"
      };

      // 3. Save settings
      const saveRes = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(updatedSettings)
      });
      if (!saveRes.ok) throw new Error("Không thể lưu cấu hình");

      // 4. Trigger warmup on backend
      const selfHostedUrl = currentSettings.self_hosted_url || "http://localhost:7860";
      const warmupRes = await fetch(`${API_BASE_URL}/api/self-hosted/warmup`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          voice: batchVoice,
          seed: seed,
          self_hosted_url: selfHostedUrl,
          keep_voice: "true",
          text: "Xin chào, đây là giọng đọc ấm cấu hình cho hàng đợi."
        })
      });
      if (!warmupRes.ok) throw new Error("Không thể warmup giọng đọc");

      Swal.fire({
        icon: 'success',
        title: 'Thành công',
        text: 'Đã lưu cấu hình mặc định cho queue và gửi yêu cầu Warmup giọng đọc!',
        background: '#1e293b',
        color: '#fff',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: t('common.error'),
        text: err.message,
        background: '#1e293b',
        color: '#fff'
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const onFileDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.txt') || f.name.endsWith('.docx'));
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const onFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(f => f.name.endsWith('.txt') || f.name.endsWith('.docx'));
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <PageHeader title={t('batch.title')} subtitle={t('batch.subtitle')} />

      <div className="batch-layout">
        {/* Left Side: Setup Form */}
        <section className="glass-panel form-stack">
          <h3>Cấu hình Job</h3>

          <label>Tập tin đầu vào (.txt hoặc .docx)</label>
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={onFileDrop}
            style={{
              border: '2px dashed var(--border-glass)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.01)',
              transition: 'all 0.2s',
              marginBottom: '1rem'
            }}
            onClick={() => document.getElementById('file-input-batch').click()}
          >
            <input
              id="file-input-batch"
              type="file"
              multiple
              accept=".txt,.docx"
              onChange={onFileSelect}
              style={{ display: 'none' }}
            />
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📤</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>Kéo thả file vào đây</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>Hoặc click để chọn file từ máy tính</span>
          </div>

          {selectedFiles.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', marginBottom: '1rem', maxHeight: '150px', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Danh sách file đã chọn ({selectedFiles.length}):</div>
              {selectedFiles.map((file, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }} title={file.name}>📄 {file.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Saved voices dropdown & preview section */}
          {savedVoices.length > 0 && (
            <div style={{
              marginTop: "0.5rem",
              marginBottom: "1rem",
              background: 'rgba(255,255,255,0.01)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255,255,255,0.04)'
            }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.4rem" }}>
                {t("batch.selectedVoice")}:
              </label>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <select
                  value={batchVoice}
                  onChange={async (e) => {
                    const selectedVal = e.target.value;
                    setBatchVoice(selectedVal);

                    const sv = savedVoices.find(s => s.voice_type === selectedVal);
                    if (sv) {
                      setBatchSavedPreviewId(sv.id);
                      try {
                        const url = await onPreview(sv.voice_type, null, Number(batchSpeed), sv.seed);
                        setBatchSavedPreviewUrl(url);
                      } catch (err) {
                        Swal.fire({
                          icon: "error",
                          title: t("common.error"),
                          text: err.message,
                          background: "#1e293b",
                          color: "#fff"
                        });
                      } finally {
                        setBatchSavedPreviewId(null);
                      }
                    }
                  }}
                  style={{
                    flex: 1,
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid var(--border-glass)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-main)",
                    padding: "0.6rem 0.75rem",
                    outline: "none",
                    cursor: "pointer",
                    fontSize: "0.9rem"
                  }}
                >
                  {!savedVoices.some(sv => sv.voice_type === batchVoice) && (
                    <option value={batchVoice}>{batchVoice} (Mặc định)</option>
                  )}
                  {savedVoices.map(sv => (
                    <option key={sv.id} value={sv.voice_type}>
                      {sv.name} [{sv.seed}]
                    </option>
                  ))}
                </select>
                <button
                  className="btn ghost"
                  onClick={async (e) => {
                    e.preventDefault();
                    const sv = savedVoices.find(s => s.voice_type === batchVoice);
                    const seed = sv ? sv.seed : "";
                    const previewId = sv ? sv.id : "current";
                    setBatchSavedPreviewId(previewId);
                    try {
                      const url = await onPreview(batchVoice, null, Number(batchSpeed), seed);
                      setBatchSavedPreviewUrl(url);
                    } catch (err) {
                      Swal.fire({
                        icon: "error",
                        title: t("common.error"),
                        text: err.message,
                        background: "#1e293b",
                        color: "#fff"
                      });
                    } finally {
                      setBatchSavedPreviewId(null);
                    }
                  }}
                  disabled={batchSavedPreviewId !== null}
                  style={{
                    padding: "0.55rem 0.75rem",
                    minHeight: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  title={t("create.preview")}
                >
                  {batchSavedPreviewId !== null ? "⏳" : "▶"}
                </button>
              </div>

              {batchSavedPreviewUrl && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <audio controls autoPlay src={batchSavedPreviewUrl} className="preview-audio" key={batchSavedPreviewUrl} style={{ width: "100%", margin: 0 }} />
                </div>
              )}
            </div>
          )}

          {/* Speed slider */}
          <div className="speed-slider-container">
            <div className="speed-slider-header">
              <label>{t('batch.speed')}</label>
              <strong>{batchSpeed}x</strong>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={batchSpeed}
              onChange={e => setBatchSpeed(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
            <div className="speed-slider-labels">
              <span>0.5x</span>
              <span>1.0x (Mặc định)</span>
              <span>1.5x</span>
              <span>2.0x</span>
            </div>
          </div>

          <div className="button-row" style={{ marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              className="btn ghost"
              onClick={handleSaveAndWarmup}
              disabled={isSavingConfig}
              style={{ display: 'inline-flex', gap: '0.25rem' }}
              title="Lưu mặc định & Khởi tạo giọng nói trên máy chủ"
            >
              {isSavingConfig ? "⏳" : "💾 Lưu cấu hình"}
            </button>
            {selectedFiles.length > 0 && (
              <button className="btn ghost" onClick={() => setSelectedFiles([])}>Xóa tất cả</button>
            )}
            <button className="btn" onClick={onStart} disabled={selectedFiles.length === 0}>{t('batch.start')}</button>
          </div>
        </section>

        {/* Right Side: Jobs Monitor */}
        <section className="glass-panel jobs-monitor-panel">
          <div className="jobs-monitor-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>{t('batch.jobsList')}</h3>
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <button
                className="btn ghost btn-sm"
                onClick={handleResetStuck}
                disabled={isResetting}
                title={t('batch.resetQueue')}
                style={{ flex: 1, padding: '0.4rem 0.5rem' }}
              >
                {isResetting ? t('common.processing') : t('batch.resetQueue')}
              </button>
              <button
                className="btn ghost btn-sm"
                onClick={() => fetchJobs && fetchJobs()}
                style={{ flex: 1, padding: '0.4rem 0.5rem' }}
              >
                🔄 {t('common.refresh')}
              </button>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 1rem' }}>
              {t('batch.noJobs')}
            </div>
          ) : (
            <div>
              {jobs.map(job => {
                const isExpanded = expandedJobId === job.job_id
                const total = job.total || 0
                const done = job.done || 0
                const error = job.error || 0
                const processing = job.processing || 0

                const donePct = total > 0 ? (done / total) * 100 : 0
                const errorPct = total > 0 ? (error / total) * 100 : 0
                const procPct = total > 0 ? (processing / total) * 100 : 0

                // Map status style class
                const statusClass = job.status.toLowerCase()

                return (
                  <div key={job.job_id} className="job-item">
                    {/* Summary Row */}
                    <div className="job-summary-row" onClick={() => handleToggleJob(job.job_id)}>
                      <div className="job-meta">
                        <div className="job-title-group">
                          <span className="job-id-badge">#{job.job_id}</span>
                          <span className="job-name-text" title={job.job_name}>{job.job_name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className={`status-badge ${statusClass}`}>{job.status}</span>
                          <button
                            className="btn ghost btn-sm"
                            onClick={(e) => handleDeleteJob(e, job.job_id)}
                            style={{ padding: '0.2rem 0.4rem' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Stacked Progress Bar */}
                      <div className="job-progress-container">
                        <div className="job-progress-bar-bg">
                          <div className="job-progress-fill" style={{ width: `${donePct}%`, backgroundColor: 'var(--success)' }} />
                          <div className="job-progress-fill" style={{ width: `${procPct}%`, backgroundColor: 'var(--primary)' }} />
                          <div className="job-progress-fill" style={{ width: `${errorPct}%`, backgroundColor: 'var(--danger)' }} />
                        </div>
                      </div>

                      <div className="job-stats-text">
                        <span>{done}/{total} {t('batch.files')}</span>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          {done > 0 && <span className="stat-item done">✓ {done}</span>}
                          {processing > 0 && <span className="stat-item processing">⚡ {processing}</span>}
                          {error > 0 && <span className="stat-item error">⚠ {error}</span>}
                        </div>
                      </div>

                      {/* Actions row for completed jobs */}
                      {job.status === "Completed" && (
                        <div 
                          style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }} 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="btn ghost btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlayingJobId(playingJobId === job.job_id ? null : job.job_id);
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem' }}
                          >
                            {playingJobId === job.job_id ? "⏹️ Dừng" : "▶️ Nghe thử"}
                          </button>
                          <a
                            href={`${API_BASE_URL}/api/jobs/${job.job_id}/download-result`}
                            download
                            className="btn btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.3rem 0.6rem',
                              textDecoration: 'none',
                              fontSize: '0.8rem',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              border: 'none',
                              color: '#fff',
                              boxShadow: 'none'
                            }}
                          >
                            ⬇️ Tải về
                          </a>
                        </div>
                      )}

                      {playingJobId === job.job_id && (
                        <div 
                          onClick={(e) => e.stopPropagation()} 
                          style={{ marginTop: '0.5rem', background: 'rgba(0,0,0,0.15)', padding: '0.35rem', borderRadius: 'var(--radius-sm)' }}
                        >
                          <audio 
                            controls 
                            autoPlay 
                            src={`${API_BASE_URL}/api/jobs/${job.job_id}/download-result`} 
                            style={{ width: '100%', height: '28px' }} 
                          />
                        </div>
                      )}
                    </div>

                    {/* Details view for this job */}
                    {isExpanded && (
                      <div className="job-details-area">
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Danh sách file tasks</span>
                          <button className="btn ghost btn-sm" onClick={() => fetchTasksForJob(job.job_id)} style={{ fontSize: '0.75rem' }}>
                            {t('common.refresh')}
                          </button>
                        </h4>

                        {loadingTasks && !jobTasks[job.job_id] ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
                            {t('common.loading')}
                          </div>
                        ) : !jobTasks[job.job_id] || jobTasks[job.job_id].length === 0 ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
                            Không tìm thấy task nào.
                          </div>
                        ) : (
                          <div className="tasks-table-container">
                            <table className="tasks-table">
                              <thead>
                                <tr>
                                  <th>{t('batch.taskName')}</th>
                                  <th style={{ width: '100px' }}>{t('batch.taskStatus')}</th>
                                  <th style={{ width: '80px', textAlign: 'right' }}>{t('batch.actions')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {jobTasks[job.job_id].map(task => (
                                  <tr key={task.id}>
                                    <td style={{ wordBreak: 'break-all' }}>
                                      <div>{task.file_name}</div>
                                      {task.error_message && (
                                        <div style={{ color: 'var(--danger)', fontSize: '0.7rem', marginTop: '0.2rem' }}>
                                          {task.error_message}
                                        </div>
                                      )}
                                    </td>
                                    <td>
                                      <span className={`status-badge ${task.status.toLowerCase()}`}>
                                        {task.status}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      {task.status === 'Error' && (
                                        <button
                                          className="btn ghost btn-sm"
                                          onClick={(e) => handleRetryTask(e, job.job_id, task.id)}
                                          style={{ padding: '0.1rem 0.3rem', fontSize: '0.75rem' }}
                                        >
                                          {t('batch.retry')}
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
