import { useState, useEffect, useCallback } from 'react'
import Swal from 'sweetalert2'
import PageHeader from '../components/PageHeader'
import { API_BASE_URL } from '../config'

export default function BatchConvert({
  t,
  inputDir,
  setInputDir,
  outputDir,
  setOutputDir,
  fileCount,
  onScan,
  onStart,
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

  return (
    <>
      <PageHeader title={t('batch.title')} subtitle={t('batch.subtitle')} />

      <div className="batch-layout">
        {/* Left Side: Setup Form */}
        <section className="glass-panel form-stack">
          <h3>Cấu hình Job</h3>

          <label>{t('batch.input')}</label>
          <input type="text" value={inputDir} onChange={e => setInputDir(e.target.value)} placeholder="D:\input-files" />

          <label>{t('batch.output')}</label>
          <input type="text" value={outputDir} onChange={e => setOutputDir(e.target.value)} placeholder="D:\output-files" />

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

          <div className="button-row" style={{ marginTop: '0.5rem' }}>
            <button className="btn ghost" onClick={onScan}>{t('batch.scan')}</button>
            <button className="btn" onClick={onStart}>{t('batch.start')}</button>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>
            {fileCount ? t('batch.found', { count: fileCount }) : t('batch.empty')}
          </p>
        </section>

        {/* Right Side: Jobs Monitor */}
        <section className="glass-panel jobs-monitor-panel">
          <div className="jobs-monitor-header">
            <h3>{t('batch.jobsList')}</h3>

          </div>

          {jobs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 1rem' }}>
              {t('batch.noJobs')}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn ghost btn-sm"
                  onClick={handleResetStuck}
                  disabled={isResetting}
                  title={t('batch.resetQueue')}
                >
                  {isResetting ? t('common.processing') : t('batch.resetQueue')}
                </button>
                <button
                  className="btn ghost btn-sm"
                  onClick={() => fetchJobs && fetchJobs()}
                >
                  🔄 {t('common.refresh')}
                </button>
              </div>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
