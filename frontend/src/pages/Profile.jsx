import PageHeader from '../components/PageHeader'
import Metric from '../components/Metric'

export default function Profile({ t, user }) {
  return (
    <>
      <PageHeader title={t('nav.profile')} subtitle={t('profile.subtitle')} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Account Info Section */}
        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
            {t('profile.accountInfo', 'ThÃƒÂ´ng tin tÃƒÂ i khoÃ¡ÂºÂ£n')}
          </h2>
          <div className="profile-card">
            <p style={{ margin: '0.5rem 0' }}><strong>{t('profile.email')}:</strong> {user?.email || '-'}</p>
            <p style={{ margin: '0.5rem 0' }}>
              <strong>{t('profile.workspace')}:</strong>{' '}
              {user?.workspace_name || user?.workspace_id || '-'}
              {user?.workspace_slug && (
                <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ({user.workspace_slug})
                </span>
              )}
            </p>
          </div>
        </section>

        {/* Billing Section */}
        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
            {t('profile.billingInfo', 'GÃƒÂ³i dÃ¡Â»â€¹ch vÃ¡Â»Â¥ & HÃ¡ÂºÂ¡n mÃ¡Â»Â©c')}
          </h2>
          <div className="metric-grid">
            <Metric title={t('billing.currentPlan')} value="Free" />
            <Metric title={t('billing.status')} value="Trial" />
            <Metric title={t('billing.usage')} value="0 / 5,000" />
          </div>
          <button className="btn" style={{ width: 'auto', marginTop: '0.5rem' }}>
            {t('billing.upgrade')}
          </button>
        </section>
      </div>
    </>
  )
}

