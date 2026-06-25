import PageHeader from '../components/PageHeader'
import Metric from '../components/Metric'

export default function Billing({ t }) {
  return (
    <>
      <PageHeader title={t('billing.title')} subtitle={t('billing.subtitle')} />
      <section className="metric-grid">
        <Metric title={t('billing.currentPlan')} value="Free" />
        <Metric title={t('billing.status')} value="Trial" />
        <Metric title={t('billing.usage')} value="0 / 5,000" />
      </section>
      <button className="btn" style={{ width: 'auto', marginTop: '1rem' }}>{t('billing.upgrade')}</button>
    </>
  )
}
