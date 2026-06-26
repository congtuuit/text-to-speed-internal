import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'
import { API_BASE_URL } from '../config'

// Competitor comparison bar shown below the pricing grid
function CompareTable({ lang }) {
  const rows = [
    {
      name: 'TTS Studio Free',
      chars: '50,000',
      price: lang === 'vi' ? 'Mien phi' : 'Free',
      note: lang === 'vi' ? '5x ElevenLabs' : '5x ElevenLabs free',
      highlight: true,
    },
    {
      name: 'ElevenLabs Free',
      chars: '10,000',
      price: lang === 'vi' ? 'Mien phi' : 'Free',
      note: '',
      highlight: false,
    },
    {
      name: 'TTS Studio Starter',
      chars: '300,000',
      price: lang === 'vi' ? '149,000d' : '$6',
      note: lang === 'vi' ? '~500d/1K ky tu' : '~$0.02/1K chars',
      highlight: true,
    },
    {
      name: 'FPT AI',
      chars: lang === 'vi' ? 'Tra theo ky tu' : 'Pay per char',
      price: lang === 'vi' ? '10,000d/1K' : '~$0.04/1K',
      note: lang === 'vi' ? 'Dat gap doi' : '2x more expensive',
      highlight: false,
    },
    {
      name: 'ElevenLabs Starter',
      chars: '30,000',
      price: lang === 'vi' ? '~190,000d' : '$5',
      note: lang === 'vi' ? 'it hon Studio' : 'fewer than Studio',
      highlight: false,
    },
  ]

  return (
    <div className="glass-panel" style={{ marginTop: '2rem', overflowX: 'auto' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
        {lang === 'vi' ? 'So sanh voi doi thu' : 'Competitor comparison'}
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            {['Platform', lang === 'vi' ? 'Chars/thang' : 'Chars/month', lang === 'vi' ? 'Gia' : 'Price', ''].map((h, i) => (
              <th key={i} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{
                borderBottom: '1px solid var(--border-color)',
                background: row.highlight ? 'rgba(99,102,241,0.06)' : 'transparent',
              }}
            >
              <td style={{ padding: '0.55rem 0.75rem', fontWeight: row.highlight ? 700 : 400, color: row.highlight ? 'var(--color-primary, #6366f1)' : 'var(--text-main)' }}>{row.name}</td>
              <td style={{ padding: '0.55rem 0.75rem' }}>{row.chars}</td>
              <td style={{ padding: '0.55rem 0.75rem' }}>{row.price}</td>
              <td style={{ padding: '0.55rem 0.75rem', color: row.highlight ? '#22c55e' : 'var(--text-muted)', fontSize: '0.8rem' }}>{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PlanCard({ plan, currentPlanId, onUpgrade, lang }) {
  const isCurrent = plan.id === currentPlanId
  const features = lang === 'vi' ? plan.features_vi : plan.features_en
  const price = lang === 'vi' ? plan.price_vnd : plan.price_usd
  const cta = lang === 'vi' ? plan.cta_vi : plan.cta_en
  const name = lang === 'vi' ? plan.name_vi : plan.name
  const badge = lang === 'vi' ? plan.badge_vi : plan.badge_en

  const priceLabel =
    price === null
      ? (lang === 'vi' ? 'Lien he' : 'Contact us')
      : price === 0
      ? (lang === 'vi' ? 'Mien phi' : 'Free')
      : lang === 'vi'
      ? price.toLocaleString('vi-VN') + 'd / thang'
      : '$' + price + ' / month'

  return (
    <div className={['pricing-card', plan.highlight ? 'pricing-card--highlight' : '', isCurrent ? 'pricing-card--current' : ''].filter(Boolean).join(' ')}>
      {badge && <div className="pricing-badge">{badge}</div>}

      <h3 className="pricing-plan-name">{name}</h3>
      <div className="pricing-price">{priceLabel}</div>

      <ul className="pricing-features">
        {features.map((f, i) => (
          <li key={i}>
            <span className="pricing-check">v</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        className={['btn', 'pricing-cta', plan.highlight ? 'btn-primary' : ''].filter(Boolean).join(' ')}
        disabled={isCurrent}
        onClick={() => onUpgrade(plan.id)}
      >
        {isCurrent ? (lang === 'vi' ? 'Gói hiện tại' : 'Current plan') : cta}
      </button>
    </div>
  )
}

export default function PricingPlans({ authToken, currentUser }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [plans, setPlans] = useState([])
  const [billing, setBilling] = useState(null)
  const [loading, setLoading] = useState(true)
  const [upgradeMsg, setUpgradeMsg] = useState('')
  const [showCompare, setShowCompare] = useState(false)

  useEffect(() => {
    fetch(API_BASE_URL + '/api/billing/plans')
      .then(r => r.json())
      .then(d => setPlans(d.plans || []))
      .catch(() => {})

    if (authToken) {
      fetch(API_BASE_URL + '/api/billing/me', {
        headers: { Authorization: 'Bearer ' + authToken },
      })
        .then(r => r.json())
        .then(d => setBilling(d))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [authToken])

  const handleUpgrade = (planId) => {
    if (planId === 'enterprise') {
      window.open('mailto:sales@ttsstudio.io?subject=Enterprise Plan Inquiry', '_blank')
      return
    }
    setUpgradeMsg(
      lang === 'vi'
        ? 'Tính năng nâng cấp gói đang được phát triển. Vui lòng liên hệ quản trị viên để được hỗ trợ.'
        : 'Payment integration coming soon. Please contact admin to upgrade.'
    )
    setTimeout(() => setUpgradeMsg(''), 6000)
  }

  const sub = billing?.subscription
  const usage = billing?.usage
  const currentPlanId = sub?.plan_id || 'free'
  const charsUsed = usage?.chars_used_this_month || 0
  const charsLimit = sub?.chars_limit || 50000
  const charsRemaining = usage?.chars_remaining ?? (charsLimit === -1 ? -1 : Math.max(0, charsLimit - charsUsed))
  const pct = charsLimit > 0 && charsLimit !== -1 ? Math.min(100, Math.round((charsUsed / charsLimit) * 100)) : 0

  return (
    <>
      <PageHeader
        title={t('pricing.title')}
        subtitle={t('pricing.subtitle')}
      />

      {billing && (
        <div className="glass-panel pricing-usage-bar" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem' }}>
              {t('pricing.usedThisMonth')}: <strong>{charsUsed.toLocaleString()}</strong>
              {' / '}
              {charsLimit === -1 ? '\u221e' : charsLimit.toLocaleString()}
              {' '}{t('pricing.chars')}
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {t('pricing.remaining')}: <strong style={{ color: pct > 90 ? 'var(--color-error, #ef4444)' : 'inherit' }}>
                {charsLimit === -1 ? '\u221e' : charsRemaining.toLocaleString()}
              </strong>
            </span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: pct + '%',
                background: pct > 90
                  ? 'var(--color-error, #ef4444)'
                  : pct > 70
                  ? '#f59e0b'
                  : 'var(--color-primary, #6366f1)',
              }}
            />
          </div>
          <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {lang === 'vi'
              ? 'Gói hiện tại: ' + (sub?.plan_name || 'Free') + ' - ' + (sub?.status || 'active')
              : 'Current plan: ' + (sub?.plan_name || 'Free') + ' \u2014 ' + (sub?.status || 'active')}
          </div>
        </div>
      )}

      {upgradeMsg && (
        <div className="glass-panel" style={{ marginBottom: '1.5rem', color: 'var(--color-primary)', fontSize: '0.9rem' }}>
          {upgradeMsg}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
      ) : (
        <div className="pricing-grid">
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlanId={currentPlanId}
              onUpgrade={handleUpgrade}
              lang={lang}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          className="btn ghost"
          style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
          onClick={() => setShowCompare(v => !v)}
        >
          {showCompare
            ? (lang === 'vi' ? 'An bang so sanh' : 'Hide comparison')
            : (lang === 'vi' ? 'So sanh voi FPT / ElevenLabs' : 'Compare with FPT / ElevenLabs')}
        </button>
      </div>

      {showCompare && <CompareTable lang={lang} />}

      <div className="glass-panel" style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        {t('pricing.footnote')}
      </div>
    </>
  )
}
