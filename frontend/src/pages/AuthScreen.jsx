import React from 'react';
import Button from '../components/Button';

export default function AuthScreen({ t, authMode, setAuthMode, authEmail, setAuthEmail, authPassword, setAuthPassword, authName, setAuthName, authError, authLoading, onSubmit }) {
  return (
    <div className="auth-page">
      <section className="auth-card glass-panel">
        <h1>{t('auth.title')}</h1>
        <p>{t('auth.subtitle')}</p>
        <label>{t('auth.email')}</label>
        <input type="text" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@company.com" />
        {authMode === 'register' && <><label>{t('auth.fullName')}</label><input type="text" value={authName} onChange={e => setAuthName(e.target.value)} /></>}
        <label>{t('auth.password')}</label>
        <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
        {authError && <div className="error-text">{authError}</div>}
        <Button className="btn" onClick={onSubmit} isLoading={authLoading}>{authMode === 'register' ? t('auth.createAccount') : t('auth.signIn')}</Button>
        <button className="link-button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? t('auth.needAccount') : t('auth.haveAccount')}</button>
      </section>
    </div>
  )
}
