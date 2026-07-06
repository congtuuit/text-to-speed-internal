import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Policies() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <div 
      className="app-page"
      style={{
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
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.4rem', background: 'linear-gradient(135deg, #fff 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', cursor: 'pointer' }} 
          onClick={() => navigate('/')}
        >
          ⚡ {t('app.name', 'Text to Speed')}
        </div>

        <button 
          onClick={() => navigate('/')}
          className="btn ghost"
          style={{ border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))', color: '#fff', fontSize: '0.85rem' }}
        >
          {lang === 'vi' ? 'Trở về trang chủ' : 'Back to Home'}
        </button>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 2rem', zIndex: 1, position: 'relative' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem', textAlign: 'center' }}>
          {lang === 'vi' ? 'Chính sách & Điều khoản' : 'Policies & Terms'}
        </h1>

        <div className="glass-panel" style={{ padding: '2.5rem', lineHeight: 1.8, fontSize: '1rem', color: 'var(--text-muted, #94a3b8)' }}>
          
          <h2 style={{ color: '#fff', fontSize: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', marginTop: '1rem' }}>
            {lang === 'vi' ? '1. Điều khoản sử dụng (Terms of Service)' : '1. Terms of Service'}
          </h2>
          <p>
            {lang === 'vi' 
              ? 'Bằng việc truy cập và sử dụng Text to Speed, bạn đồng ý tuân thủ các điều khoản này. Bạn không được sử dụng dịch vụ cho bất kỳ mục đích bất hợp pháp nào. Các tệp âm thanh được tạo ra thuộc về bạn, tuy nhiên bạn phải chịu trách nhiệm hoàn toàn về bản quyền và nội dung văn bản đầu vào.'
              : 'By accessing and using Text to Speed, you agree to comply with these terms. You may not use the service for any illegal purposes. The generated audio files belong to you, but you take full responsibility for the copyright and content of the input text.'}
          </p>

          <h2 style={{ color: '#fff', fontSize: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', marginTop: '2.5rem' }}>
            {lang === 'vi' ? '2. Chính sách bảo mật (Privacy Policy)' : '2. Privacy Policy'}
          </h2>
          <p>
            {lang === 'vi' 
              ? 'Chúng tôi coi trọng quyền riêng tư của bạn. Chúng tôi thu thập các thông tin cơ bản để duy trì tài khoản (như email). Các văn bản bạn tải lên hệ thống để chuyển đổi có thể được lưu trữ tạm thời nhằm mục đích tạo file audio và sẽ bị xóa tự động theo chính sách lưu trữ của chúng tôi. Chúng tôi không chia sẻ nội dung của bạn với bên thứ ba vì mục đích quảng cáo.'
              : 'We value your privacy. We collect basic information to maintain your account (such as email). The text you upload for conversion may be temporarily stored for the purpose of generating audio files and will be automatically deleted according to our storage policy. We do not share your content with third parties for advertising purposes.'}
          </p>

          <h2 style={{ color: '#fff', fontSize: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', marginTop: '2.5rem' }}>
            {lang === 'vi' ? '3. Miễn trừ trách nhiệm (Disclaimer)' : '3. Disclaimer'}
          </h2>
          <p>
            {lang === 'vi' 
              ? 'Dịch vụ được cung cấp "như nguyên trạng" (as-is) và không có bất kỳ hình thức bảo hành nào. Chúng tôi không đảm bảo rằng dịch vụ sẽ không bị gián đoạn, không có lỗi, hoặc hoàn toàn bảo mật. Text to Speed từ chối mọi trách nhiệm liên quan đến các tổn thất hoặc thiệt hại phát sinh từ việc sử dụng hoặc không thể sử dụng dịch vụ của chúng tôi.'
              : 'The service is provided "as-is" without any warranties of any kind. We do not guarantee that the service will be uninterrupted, error-free, or completely secure. Text to Speed disclaims any liability for any loss or damage arising from the use or inability to use our services.'}
          </p>

        </div>
      </main>

      {/* Footer */}
      <footer style={{
        marginTop: '2rem',
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
