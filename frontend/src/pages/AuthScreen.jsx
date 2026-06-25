import React, { useEffect, useRef } from 'react';
import Button from '../components/Button';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function AuthScreen({
  t, authMode, setAuthMode,
  authEmail, setAuthEmail,
  authPassword, setAuthPassword,
  authName, setAuthName,
  authError, authLoading,
  onSubmit, onGoogleSubmit
}) {
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const loadGoogleScript = () => {
      if (document.getElementById('google-gsi-script')) {
        initGoogle();
        return;
      }
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
    };

    const initGoogle = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (onGoogleSubmit && response.credential) {
            onGoogleSubmit(response.credential);
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        width: googleBtnRef.current.offsetWidth || 360,
        text: 'continue_with',
      });
    };

    loadGoogleScript();
  }, [onGoogleSubmit]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') onSubmit();
  };

  return (
    <div className="auth-page">
      {/* Background decorative blobs */}
      <div className="auth-bg-blob auth-bg-blob--1" />
      <div className="auth-bg-blob auth-bg-blob--2" />

      <section className="auth-card glass-panel">
        {/* Brand mark */}
        <div className="auth-brand">
          <div className="auth-brand-icon">🎙️</div>
          <span className="auth-brand-name">{t('app.name')}</span>
        </div>

        <h1 className="auth-heading">
          {authMode === 'login' ? t('auth.title') : t('auth.createTitle', 'Create your account')}
        </h1>
        <p className="auth-subheading">{t('auth.subtitle')}</p>

        {/* Google Sign-in */}
        {GOOGLE_CLIENT_ID && (
          <>
            <div ref={googleBtnRef} className="auth-google-btn-wrapper" />
            <div className="auth-divider">
              <span>{t('auth.orContinueWith', 'or continue with email')}</span>
            </div>
          </>
        )}

        {/* Form fields */}
        <div className="auth-form-stack" onKeyDown={handleKeyDown}>
          <div className="auth-field-group">
            <label className="auth-label">{t('auth.email')}</label>
            <input
              className="auth-input"
              type="email"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>

          {authMode === 'register' && (
            <div className="auth-field-group">
              <label className="auth-label">{t('auth.fullName')}</label>
              <input
                className="auth-input"
                type="text"
                value={authName}
                onChange={e => setAuthName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-field-group">
            <label className="auth-label">{t('auth.password')}</label>
            <input
              className="auth-input"
              type="password"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
            />
          </div>

          {authError && (
            <div className="auth-error">
              <span className="auth-error-icon">⚠</span>
              {authError}
            </div>
          )}

          <Button className="btn auth-submit-btn" onClick={onSubmit} isLoading={authLoading}>
            {authLoading
              ? t('auth.loading')
              : authMode === 'register'
                ? t('auth.createAccount')
                : t('auth.signIn')}
          </Button>
        </div>

        <button
          className="auth-switch-btn"
          onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        >
          {authMode === 'login' ? t('auth.needAccount') : t('auth.haveAccount')}
        </button>
      </section>
    </div>
  );
}
