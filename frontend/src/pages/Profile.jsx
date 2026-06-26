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
  const usagePercentage = charsLimit > 0 ? Math.min(100, Math.round((charsUsed / charsLimit) * 100)) : 0

  const usageLabel =
    charsLimit === -1
      ? `${charsUsed.toLocaleString()} / ∞`
      : `${charsUsed.toLocaleString()} / ${charsLimit.toLocaleString()}`

  // Initial for Avatar
  const initial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')

  return (
    <>
      <PageHeader title={t('nav.profile')} subtitle={t('profile.subtitle')} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* User Card & Info */}
        <div className="profile-card" style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-lg)', padding: '2rem', backdropFilter: 'blur(12px)' }}>
          {/* Avatar Graphic */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary, #6366f1) 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)'
          }}>
            {initial}
          </div>

          <div style={{ flex: 1, minWidth: '250px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
                {user?.full_name || 'User'}
              </h2>
              <span className={`status-badge ${user?.role === 'admin' ? 'processing' : 'pending'}`} style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>
                {user?.role || 'user'}
              </span>
            </div>
            
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                <span style={{ minWidth: '100px', opacity: 0.7 }}>Email:</span>
                <strong style={{ color: 'var(--text-main)' }}>{user?.email || '-'}</strong>
              </li>
              <li style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                <span style={{ minWidth: '100px', opacity: 0.7 }}>{t('profile.workspace')}:</span>
                <strong style={{ color: 'var(--text-main)' }}>
                  {user?.workspace_name || user?.workspace_id || '-'}
                </strong>
                {user?.workspace_slug && (
                  <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                    ({user.workspace_slug})
                  </span>
                )}
              </li>
            </ul>
          </div>
        </div>

        {/* Billing & Subscription */}
        <div className="profile-card" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-lg)', padding: '2rem', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-main)', fontWeight: 600 }}>
                {t('profile.billingInfo')}
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {lang === 'vi' ? 'Quản lý hạn mức và gói dịch vụ của bạn' : 'Manage your subscription plan and limits'}
              </p>
            </div>
            <button
              className="btn"
              style={{
                width: 'auto',
                background: 'linear-gradient(135deg, var(--primary, #6366f1) 0%, #4f46e5 100%)',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
              }}
              onClick={() => navigate('/pricing')}
            >
              {t('billing.upgrade')}
            </button>
          </div>

          <div className="metric-grid" style={{ marginBottom: '2rem' }}>
            <Metric
              title={t('billing.currentPlan')}
              value={lang === 'vi' ? (sub?.plan_name_vi || 'Free') : (sub?.plan_name || 'Free')}
            />
            <Metric 
              title={t('billing.status')} 
              value={sub?.status ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1).replaceAll('_', ' ') : (lang === 'vi' ? 'Đang hoạt động' : 'Active')} 
            />
            <Metric title={t('billing.usage')} value={usageLabel} />
            <Metric
              title={lang === 'vi' ? 'Batch tối đa' : 'Max batch files'}
              value={sub?.batch_files_limit === -1 ? '∞' : sub?.batch_files_limit ?? 5}
            />
            <Metric
              title={lang === 'vi' ? 'Job đồng thời' : 'Concurrent jobs'}
              value={sub?.concurrent_jobs ?? 1}
            />
          </div>

          {/* Progress bar */}
          {charsLimit !== -1 && (
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                  {lang === 'vi' ? 'Ký tự đã sử dụng' : 'Characters used'}
                </span>
                <span style={{ fontWeight: 'bold', color: usagePercentage > 90 ? 'var(--color-error, #ef4444)' : 'var(--primary, #6366f1)' }}>
                  {usagePercentage}%
                </span>
              </div>
              
              <div className="progress-track" style={{ height: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)' }}>
                <div
                  className="progress-fill"
                  style={{
                    height: '100%',
                    borderRadius: '4px',
                    width: `${usagePercentage}%`,
                    background:
                      charsUsed / charsLimit > 0.9
                        ? 'linear-gradient(90deg, #ef4444 0%, #f43f5e 100%)'
                        : 'linear-gradient(90deg, var(--primary, #6366f1) 0%, #a855f7 100%)',
                    transition: 'width 0.5s ease-out'
                  }}
                />
              </div>
              
              <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.75rem 0 0 0' }}>
                {lang === 'vi'
                  ? `${charsUsed.toLocaleString()} / ${charsLimit.toLocaleString()} ký tự đã dùng tháng này`
                  : `${charsUsed.toLocaleString()} / ${charsLimit.toLocaleString()} characters used this month`}
              </p>
            </div>
          )}
        </div>

      </div>
    </>
  )
}



