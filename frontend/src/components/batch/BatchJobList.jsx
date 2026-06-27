import React from 'react';
import BatchJobCard from './BatchJobCard';

export default function BatchJobList({
  jobs,
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
  handleRetryTask,
  fetchJobs
}) {
  return (
    <section className="glass-panel jobs-monitor-panel">
      <div className="jobs-monitor-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>{t('batch.jobsList')}</h3>
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
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
          {jobs.map(job => (
            <BatchJobCard
              key={job.job_id}
              job={job}
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
            />
          ))}
        </div>
      )}
    </section>
  );
}
