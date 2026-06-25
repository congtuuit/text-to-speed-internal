import PageHeader from '../components/PageHeader'

export default function Profile({ t, user }) {
  return (
    <>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />
      <section className="glass-panel profile-card">
        <p><strong>{t('profile.email')}:</strong> {user?.email || '-'}</p>
        <p><strong>{t('profile.role')}:</strong> {user?.role || 'user'}</p>
        <p><strong>{t('profile.workspace')}:</strong> {user?.workspace_id || '-'}</p>
      </section>
    </>
  )
}
