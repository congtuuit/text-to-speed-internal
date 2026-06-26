import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function LandingPage({ authToken }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const handleAction = () => {
    if (authToken) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const changeLanguage = (newLang) => {
    i18n.changeLanguage(newLang);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-dark, #0f172a)',
      color: 'var(--text-main, #f8fafc)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Background Glow Blobs */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '-10%',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '-5%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Header Navigation */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
        background: 'rgba(15, 23, 42, 0.7)',
        borderBottom: '1px solid var(--border-glass, rgba(255, 255, 255, 0.05))',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.4rem', background: 'linear-gradient(135deg, #fff 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', cursor: 'pointer' }} onClick={() => navigate('/')}>
          ⚡ {t('app.name', 'Text to Speed')}
        </div>

        {/* Navigation & Language Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Language Selector */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255, 255, 255, 0.05)', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.05))' }}>
            <button 
              onClick={() => changeLanguage('vi')}
              style={{
                background: lang === 'vi' ? 'var(--primary, #6366f1)' : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '0.2rem 0.5rem',
                fontSize: '0.75rem',
                borderRadius: '3px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              VI
            </button>
            <button 
              onClick={() => changeLanguage('en')}
              style={{
                background: lang === 'en' ? 'var(--primary, #6366f1)' : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '0.2rem 0.5rem',
                fontSize: '0.75rem',
                borderRadius: '3px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              EN
            </button>
          </div>

          {/* CTA */}
          <button 
            onClick={handleAction}
            className="btn primary"
            style={{ 
              width: 'auto', 
              padding: '0.5rem 1.25rem', 
              fontSize: '0.85rem',
              background: 'linear-gradient(135deg, var(--primary, #6366f1) 0%, #4f46e5 100%)',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
              border: 'none'
            }}
          >
            {authToken ? (lang === 'vi' ? 'Vào Dashboard' : 'Go to Dashboard') : (lang === 'vi' ? 'Đăng nhập' : 'Sign In')}
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', zIndex: 1, position: 'relative' }}>
        
        {/* HERO SECTION */}
        <section style={{ padding: '6rem 0 4rem 0', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 850,
            lineHeight: 1.15,
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #ffffff 30%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em'
          }}>
            {lang === 'vi' ? 'Chuyển Đổi Văn Bản Thành Giọng Nói' : 'Transform Text Into Speech'}<br />
            <span style={{ background: 'linear-gradient(135deg, #a855f7 0%, var(--primary, #6366f1) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {lang === 'vi' ? 'Hàng Loạt - Tốc Độ Cao' : 'In Bulk - At Scale'}
            </span>
          </h1>
          
          <p style={{
            fontSize: '1.2rem',
            color: 'var(--text-muted, #94a3b8)',
            maxWidth: '700px',
            margin: '0 auto 2.5rem auto',
            lineHeight: 1.6
          }}>
            {lang === 'vi' 
              ? 'Giải pháp tối ưu chuyển đổi sách nói, tài liệu docx, và hàng loạt tệp văn bản sang giọng đọc tiếng Việt tự nhiên và truyền cảm chỉ trong vài giây.'
              : 'The ultimate tool to convert audiobooks, docx documents, and bulk text files into natural Vietnamese voices in just seconds.'}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button 
              onClick={handleAction}
              className="btn"
              style={{
                width: 'auto',
                padding: '0.8rem 2rem',
                fontSize: '1rem',
                background: 'linear-gradient(135deg, var(--primary, #6366f1) 0%, #4f46e5 100%)',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                fontWeight: 600
              }}
            >
              {lang === 'vi' ? 'Dùng thử miễn phí' : 'Get Started Free'}
            </button>
            <a 
              href="#pricing"
              className="btn ghost"
              style={{
                width: 'auto',
                padding: '0.8rem 2rem',
                fontSize: '1rem',
                border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))',
                background: 'rgba(255, 255, 255, 0.02)',
                color: '#fff',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600
              }}
            >
              {lang === 'vi' ? 'Xem bảng giá' : 'View Pricing'}
            </a>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" style={{ padding: '5rem 0', borderTop: '1px solid var(--border-glass, rgba(255, 255, 255, 0.03))' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-main, #f8fafc)' }}>
              {lang === 'vi' ? 'Tính Năng Vượt Trội' : 'Powerful Features'}
            </h2>
            <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '1rem' }}>
              {lang === 'vi' ? 'Được tinh chỉnh tối đa để đáp ứng nhu cầu sản xuất nội dung âm thanh lớn' : 'Fully optimized for high-volume audio content production'}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Feature 1 */}
            <div className="profile-card" style={{ padding: '1.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass, rgba(255,255,255,0.05))', borderRadius: 'var(--radius-lg, 12px)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📦</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.75rem', color: '#fff' }}>
                {lang === 'vi' ? 'Chuyển đổi hàng loạt' : 'Bulk Processing'}
              </h3>
              <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                {lang === 'vi'
                  ? 'Tải lên hàng chục tệp tin cùng một lúc. Hệ thống tự động phân phối tác vụ qua hàng đợi đa luồng để xử lý song song siêu tốc.'
                  : 'Upload dozens of files simultaneously. The system auto-distributes tasks to process in parallel using multi-threaded queue.'}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="profile-card" style={{ padding: '1.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass, rgba(255,255,255,0.05))', borderRadius: 'var(--radius-lg, 12px)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.75rem', color: '#fff' }}>
                {lang === 'vi' ? 'Hỗ trợ tệp DOCX / TXT' : 'DOCX & TXT Support'}
              </h3>
              <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                {lang === 'vi'
                  ? 'Tự động đọc, phân tích cấu trúc chương từ tài liệu Microsoft Word (.docx) và chuyển thành tệp audio chất lượng cao hoàn chỉnh.'
                  : 'Automatically parse and read chapter structures from Microsoft Word (.docx) documents, converting them into finished audio.'}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="profile-card" style={{ padding: '1.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass, rgba(255,255,255,0.05))', borderRadius: 'var(--radius-lg, 12px)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🗣️</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.75rem', color: '#fff' }}>
                {lang === 'vi' ? 'Đa dạng giọng đọc' : 'Natural Voice Selection'}
              </h3>
              <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                {lang === 'vi'
                  ? 'Tương thích với các nhà cung cấp TTS hàng đầu (Google, FPT, Self-Hosted) cùng công cụ lưu trữ giọng đọc mẫu (Voice Seeds).'
                  : 'Compatible with top TTS providers (Google, FPT, Self-Hosted) and customizable voice seed manager.'}
              </p>
            </div>

          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" style={{ padding: '5rem 0', borderTop: '1px solid var(--border-glass, rgba(255, 255, 255, 0.03))' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-main, #f8fafc)' }}>
              {lang === 'vi' ? 'Gói Dịch Vụ Linh Hoạt' : 'Flexible Subscription Tiers'}
            </h2>
            <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '1rem' }}>
              {lang === 'vi' ? 'Lựa chọn gói hạn mức phù hợp với khối lượng công việc của bạn' : 'Choose the limit that matches your content scale'}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            maxWidth: '1050px',
            margin: '0 auto'
          }}>
            {/* Free Plan */}
            <div className="profile-card" style={{ padding: '2.5rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-glass, rgba(255,255,255,0.05))', borderRadius: 'var(--radius-lg, 12px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '420px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', margin: '0 0 0.5rem 0' }}>FREE</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff' }}>0đ</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/ {lang === 'vi' ? 'tháng' : 'month'}</span>
                </div>
                <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', lineHeight: 1.8, margin: '0 0 2rem 0' }}>
                  <li>{lang === 'vi' ? '50.000 ký tự / tháng' : '50,000 characters / month'}</li>
                  <li>{lang === 'vi' ? 'Tối đa 3 tệp mỗi lô' : 'Up to 3 files per batch'}</li>
                  <li>{lang === 'vi' ? 'Lưu trữ 30 tệp âm thanh' : '30 audios stored in library'}</li>
                  <li>{lang === 'vi' ? 'Giới hạn 1 job chạy đồng thời' : '1 concurrent job limit'}</li>
                </ul>
              </div>
              <button onClick={handleAction} className="btn ghost" style={{ width: '100%', border: '1px solid var(--border-glass, rgba(255,255,255,0.08))', color: '#fff', fontWeight: 600 }}>
                {lang === 'vi' ? 'Dùng miễn phí' : 'Get Started'}
              </button>
            </div>

            {/* Starter Plan */}
            <div className="profile-card" style={{ padding: '2.5rem', background: 'rgba(99, 102, 241, 0.03)', border: '1px solid var(--primary, #6366f1)', borderRadius: 'var(--radius-lg, 12px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '420px', position: 'relative', boxShadow: '0 8px 30px rgba(99, 102, 241, 0.1)' }}>
              <div style={{ position: 'absolute', top: '1rem', right: '1.25rem', background: 'var(--primary, #6366f1)', color: '#fff', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                {lang === 'vi' ? 'Phổ biến' : 'Popular'}
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary, #6366f1)', margin: '0 0 0.5rem 0' }}>STARTER</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff' }}>149.000đ</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/ {lang === 'vi' ? 'tháng' : 'month'}</span>
                </div>
                <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-main, #f8fafc)', fontSize: '0.9rem', lineHeight: 1.8, margin: '0 0 2rem 0' }}>
                  <li>{lang === 'vi' ? '300.000 ký tự / tháng' : '300,000 characters / month'}</li>
                  <li>{lang === 'vi' ? 'Tối đa 20 tệp mỗi lô' : 'Up to 20 files per batch'}</li>
                  <li>{lang === 'vi' ? 'Lưu trữ 200 tệp âm thanh' : '200 audios stored in library'}</li>
                  <li>{lang === 'vi' ? 'Giới hạn 2 job chạy đồng thời' : '2 concurrent jobs limit'}</li>
                  <li>{lang === 'vi' ? 'Hỗ trợ ưu tiên qua Email' : 'Priority Email support'}</li>
                </ul>
              </div>
              <button onClick={handleAction} className="btn primary" style={{ width: '100%', background: 'linear-gradient(135deg, var(--primary, #6366f1) 0%, #4f46e5 100%)', border: 'none', fontWeight: 600 }}>
                {lang === 'vi' ? 'Nâng cấp ngay' : 'Buy Now'}
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="profile-card" style={{ padding: '2.5rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-glass, rgba(255,255,255,0.05))', borderRadius: 'var(--radius-lg, 12px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '420px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', margin: '0 0 0.5rem 0' }}>ENTERPRISE</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '2.3rem', fontWeight: 800, color: '#fff' }}>Liên hệ</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}></span>
                </div>
                <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', lineHeight: 1.8, margin: '0 0 2rem 0' }}>
                  <li><strong>{lang === 'vi' ? 'Không giới hạn ký tự' : 'Unlimited characters'}</strong></li>
                  <li>{lang === 'vi' ? 'Không giới hạn tệp mỗi lô' : 'Unlimited files per batch'}</li>
                  <li>{lang === 'vi' ? 'Lưu trữ không giới hạn' : 'Unlimited audio library storage'}</li>
                  <li><strong>{lang === 'vi' ? 'Không giới hạn job đồng thời' : 'Unlimited concurrent jobs'}</strong></li>
                  <li>{lang === 'vi' ? 'Hạ tầng xử lý riêng biệt (SLA)' : 'Dedicated infrastructure + SLA'}</li>
                </ul>
              </div>
              <button onClick={handleAction} className="btn ghost" style={{ width: '100%', border: '1px solid var(--border-glass, rgba(255,255,255,0.08))', color: '#fff', fontWeight: 600 }}>
                {lang === 'vi' ? 'Liên hệ chúng tôi' : 'Contact Sales'}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        marginTop: '6rem',
        borderTop: '1px solid var(--border-glass, rgba(255, 255, 255, 0.03))',
        padding: '3rem 2rem',
        textAlign: 'center',
        background: 'rgba(10, 15, 30, 0.5)',
        fontSize: '0.85rem',
        color: 'var(--text-muted, #94a3b8)'
      }}>
        <div style={{ marginBottom: '1rem', fontWeight: 650, color: '#fff' }}>
          ⚡ {t('app.name', 'Text to Speed')}
        </div>
        <div>
          &copy; {new Date().getFullYear()} Text to Speed. All rights reserved. Custom-made for high-performance TTS production.
        </div>
      </footer>
    </div>
  );
}
