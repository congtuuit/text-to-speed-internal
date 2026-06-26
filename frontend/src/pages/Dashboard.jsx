import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'
import Metric from '../components/Metric'
import { API_BASE_URL } from '../config'

export default function Dashboard({ t, jobs, library, authToken }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [billing, setBilling] = useState(null)

  useEffect(() => {
    if (!authToken) return
    fetch(`${API_BASE_URL}/api/billing/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(r => r.json())
      .then(d => setBilling(d))
      .catch(() => {})
  }, [authToken])

  const charsUsed = billing?.usage?.chars_used_this_month ?? 0
  const charsLimit = billing?.subscription?.chars_limit ?? 10000
  const charsRemaining =
    charsLimit === -1 ? '∞' : Math.max(0, charsLimit - charsUsed).toLocaleString()

  return (
    <>
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />
      <div className="metric-grid">
        <Metric title={t('dashboard.charactersUsed')} value={charsUsed.toLocaleString()} />
        <Metric title={t('dashboard.remainingQuota')} value={charsRemaining} />
        <Metric title={t('dashboard.generatedAudios')} value={library.length} />
        <Metric title={t('dashboard.recentJobs')} value={jobs.length} />
      </div>
      <section className="glass-panel empty-state">{t('dashboard.empty')}</section>
    </>
  )
}
