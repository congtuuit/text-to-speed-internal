import { useState, useEffect, useCallback } from 'react'
import Swal from 'sweetalert2'
import PageHeader from '../components/PageHeader'
import { API_BASE_URL } from '../config'
import BatchSetupForm from '../components/batch/BatchSetupForm'
import BatchJobList from '../components/batch/BatchJobList'
import { useJobTasksQuery } from '../queries/useJobTasksQuery'

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
  const [expandedJobId, setExpandedJobId] = useState(null)
  const [isResetting, setIsResetting] = useState(false)
  const [playingJobId, setPlayingJobId] = useState(null)
  const [autoRetry, setAutoRetry] = useState(false)

  // Auth Headers
  const authHeaders = { Authorization: `Bearer ${authToken}` }
  const jsonHeaders = { ...authHeaders, 'Content-Type': 'application/json' }

  // Load auto-retry setting on mount
  useEffect(() => {
    if (!authToken) return
    const loadSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings`, { headers: authHeaders })
        if (res.ok) {
          const data = await res.json()
          setAutoRetry(data.auto_retry === 'true')
          if (data.self_hosted_voice) {
            setBatchVoice(data.self_hosted_voice)
          }
        }
      } catch (err) {
        console.error("Failed to load settings", err)
      }
    }
    loadSettings()
  }, [authToken])

  // Check if any job is currently active/processing
  const hasActiveJobs = jobs.some(j => j.status === 'Processing' || j.status === 'Pending')

  // Use React Query for tasks polling automatically
  const { 
    data: jobTasksData = [], 
    isLoading: loadingTasks, 
    refetch: fetchTasksForJob 
  } = useJobTasksQuery(authToken, expandedJobId, hasActiveJobs)

  // Format to match old shape: { [jobId]: tasks }
  const jobTasks = expandedJobId ? { [expandedJobId]: jobTasksData } : {}

  // Toggle job detail expansion
  const handleToggleJob = (jobId) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null)
    } else {
      setExpandedJobId(jobId)
    }
  }

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
      if (fetchTasksForJob) fetchTasksForJob()
      if (fetchJobs) fetchJobs()
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('common.error'), text: err.message, background: '#1e293b', color: '#fff' })
    }
  }

  // Retry Job
  const handleRetryJob = async (e, jobId) => {
    e.stopPropagation()
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/retry`, {
        method: 'POST',
        headers: jsonHeaders
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Retry failed')

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Đang chạy lại các task lỗi...',
        timer: 2000,
        showConfirmButton: false,
        background: '#1e293b',
        color: '#fff'
      })

      if (expandedJobId === jobId) {
        if (fetchTasksForJob) fetchTasksForJob()
      }
      if (fetchJobs) fetchJobs()
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('common.error'), text: err.message, background: '#1e293b', color: '#fff' })
    }
  }

  return (
    <>
      <PageHeader title={t('batch.title')} subtitle={t('batch.subtitle')} />

      <div className="batch-layout">
        <BatchSetupForm
          t={t}
          authToken={authToken}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          batchVoice={batchVoice}
          setBatchVoice={setBatchVoice}
          batchSpeed={batchSpeed}
          setBatchSpeed={setBatchSpeed}
          savedVoices={savedVoices}
          onPreview={onPreview}
          onStart={(e) => {
            setPlayingJobId(null);
            if (onStart) onStart(e);
          }}
          autoRetry={autoRetry}
          setAutoRetry={setAutoRetry}
        />
        <BatchJobList
          jobs={jobs}
          t={t}
          expandedJobId={expandedJobId}
          handleToggleJob={handleToggleJob}
          handleDeleteJob={handleDeleteJob}
          handleRetryJob={handleRetryJob}
          playingJobId={playingJobId}
          setPlayingJobId={setPlayingJobId}
          jobTasks={jobTasks}
          fetchTasksForJob={fetchTasksForJob}
          loadingTasks={loadingTasks}
          handleRetryTask={handleRetryTask}
          fetchJobs={fetchJobs}
        />
      </div>
    </>
  )
}
