import React from 'react';
import { API_BASE_URL } from '../../config';

export default function BatchJobCard({
  job,
  t,
  expandedJobId,
  handleToggleJob,
  handleDeleteJob,
  handleRetryJob,
  playingJobId,
  setPlayingJobId,
  jobTasks,
  fetchTasksForJob,
  loadingTasks,
  handleRetryTask
}) {
  const isExpanded = expandedJobId === job.job_id;
  const total = job.total || 0;
  const done = job.done || 0;
  const error = job.error || 0;
  const processing = job.processing || 0;

  const donePct = total > 0 ? (done / total) * 100 : 0;
  const errorPct = total > 0 ? (error / total) * 100 : 0;
  const procPct = total > 0 ? (processing / total) * 100 : 0;

  // Map status style class
  const statusClass = job.status.toLowerCase();

  return (
    <div className="job-item">
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

        {/* Actions row for completed/failed jobs */}
        {(job.status === "Completed" || job.status === "Error" || error > 0) && (
          <div
            style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            {error > 0 && !job.temp_files_exist && (
              <span style={{ fontSize: '0.75rem', color: '#f87171', marginRight: 'auto' }}>
                ⚠️ Đã quá 60 phút (Không thể thử lại)
              </span>
            )}

            {error > 0 && (
              <button
                className="btn btn-sm"
                disabled={!job.temp_files_exist}
                onClick={(e) => handleRetryJob(e, job.job_id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.8rem',
                  background: job.temp_files_exist
                    ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)'
                    : '#334155',
                  border: 'none',
                  color: '#fff',
                  opacity: job.temp_files_exist ? 1 : 0.5,
                  cursor: job.temp_files_exist ? 'pointer' : 'not-allowed'
                }}
                title={job.temp_files_exist ? "Chạy lại toàn bộ task bị lỗi" : "Không thể thử lại vì file tạm đã bị xóa"}
              >
                🔄 Thử lại lỗi
              </button>
            )}

            {job.status === "Completed" && (
              <>
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
              </>
            )}
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
  );
}
