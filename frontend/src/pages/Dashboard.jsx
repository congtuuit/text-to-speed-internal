import PageHeader from '../components/PageHeader'
import Metric from '../components/Metric'

export default function Dashboard({ t, jobs, library }) {
  return (
    <>
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />
      <div className="metric-grid">
        <Metric title={t('dashboard.charactersUsed')} value="0" />
        <Metric title={t('dashboard.remainingQuota')} value="5,000" />
        <Metric title={t('dashboard.generatedAudios')} value={library.length} />
        <Metric title={t('dashboard.recentJobs')} value={jobs.length} />
      </div>
      <section className="glass-panel empty-state">{t('dashboard.empty')}</section>
    </>
  )
}
