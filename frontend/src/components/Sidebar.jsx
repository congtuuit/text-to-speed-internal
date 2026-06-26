import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar({ t, i18n, onLogout, isOpen, onClose, currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = location.pathname === '/' ? 'dashboard' : location.pathname.slice(1);

  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]);

  const navItems = ['dashboard', 'create', 'batch', 'voices', 'library', 'pricing', 'profile'];
  if (currentUser?.role === 'admin') {
    navItems.push('admin');
  }

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
        {navItems.map(item => (
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
