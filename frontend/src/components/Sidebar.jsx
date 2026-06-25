import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = ['dashboard', 'create', 'batch', 'voices', 'library', 'profile', 'admin'];

export default function Sidebar({ t, i18n, onLogout, isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = location.pathname === '/' ? 'dashboard' : location.pathname.slice(1);

  // Automatically close sidebar when navigation path changes
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]);

  return (
    <aside className={`saas-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="brand-card">
        <div className="brand-mark">T</div>
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <strong>{t('app.name')}</strong>
          <span className="brand-tagline">{t('app.tagline')}</span>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">✕</button>
      </div>
      <nav className="saas-nav">
        {NAV_ITEMS.map(item => (
          <button key={item} className={activePage === item ? 'active' : ''} onClick={() => navigate('/' + item)}>
            {t(`nav.${item}`)}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <select value={i18n.language} onChange={e => i18n.changeLanguage(e.target.value)}>
          <option value="vi">Tiếng Việt</option>
          <option value="en">English</option>
        </select>
        <button className="btn ghost" onClick={onLogout}>{t('app.logout')}</button>
      </div>
    </aside>
  );
}

