import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'
import Metric from '../components/Metric'
import { API_BASE_URL } from '../config'

export default function Profile({ t, user, authToken }) {
  const navigate = useNavigate()
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

  const sub = billing?.subscription
  const usage = billing?.usage

  const charsUsed = usage?.chars_used_this_month ?? 0
  const charsLimit = sub?.chars_limit ?? 50000
  const usageLabel =
    charsLimit === -1
      ? `${charsUsed.toLocaleString()} / ∞`
      : `${charsUsed.toLocaleString()} / ${charsLimit.toLocaleString()}`

  return (
    <>
      <PageHeader title={t('nav.profile')} subtitle={t('profile.subtitle')} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Account Info */}
        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
            {t('profile.accountInfo')}
          </h2>
          <div className="profile-card">
            <p style={{ margin: '0.5rem 0' }}>
              <strong>{t('profile.email')}:</strong> {user?.email || '-'}
            </p>
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

        {/* Billing Summary */}
        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
            {t('profile.billingInfo')}
          </h2>
          <div className="metric-grid">
            <Metric
              title={t('billing.currentPlan')}
              value={lang === 'vi' ? (sub?.plan_name_vi || 'Miễn phí') : (sub?.plan_name || 'Free')}
            />
            <Metric title={t('billing.status')} value={sub?.status || 'active'} />
            <Metric title={t('billing.usage')} value={usageLabel} />
            <Metric
              title={lang === 'vi' ? 'Batch tối đa' : 'Max batch files'}
              value={sub?.batch_files_limit === -1 ? '∞' : sub?.batch_files_limit ?? 5}
            />
          </div>

          {/* Progress bar */}
          {charsLimit !== -1 && (
            <div style={{ marginTop: '1rem' }}>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, Math.round((charsUsed / charsLimit) * 100))}%`,
                    background:
                      charsUsed / charsLimit > 0.9
                        ? 'var(--color-error, #ef4444)'
                        : 'var(--color-primary, #6366f1)',
                  }}
                />
              </div>
              <p style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {lang === 'vi'
                  ? `${charsUsed.toLocaleString()} / ${charsLimit.toLocaleString()} ký tự đã dùng tháng này`
                  : `${charsUsed.toLocaleString()} / ${charsLimit.toLocaleString()} characters used this month`}
              </p>
            </div>
          )}

          <button
            className="btn"
            style={{ width: 'auto', marginTop: '1rem' }}
            onClick={() => navigate('/pricing')}
          >
            {t('billing.upgrade')}
          </button>
        </section>
      </div>
    </>
  )
}
