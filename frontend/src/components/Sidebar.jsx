import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = ['dashboard', 'create', 'batch', 'voices', 'library', 'billing', 'profile', 'admin'];

export default function Sidebar({ t, i18n, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = location.pathname === '/' ? 'dashboard' : location.pathname.slice(1);

  return (
    <aside className="saas-sidebar">
      <div className="brand-card">
        <div className="brand-mark">T</div>
        <div>
          <strong>{t('app.name')}</strong>
          <span>{t('app.tagline')}</span>
        </div>
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
