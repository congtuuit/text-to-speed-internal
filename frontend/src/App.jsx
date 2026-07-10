import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './index.css';

import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';
import { useCreateAudio } from './hooks/useCreateAudio';
import { useBatchConvert } from './hooks/useBatchConvert';

import Sidebar from './components/Sidebar';
import AuthScreen from './pages/AuthScreen';
import Dashboard from './pages/Dashboard';
import CreateAudio from './pages/CreateAudio';
import BatchConvert from './pages/BatchConvert';
import Voices from './pages/Voices';
import AudioLibrary from './pages/AudioLibrary';
import Profile from './pages/Profile';
import PricingPlans from './pages/PricingPlans';
import AdminSettings from './AdminSettings';
import LandingPage from './pages/LandingPage';
import Policies from './pages/Policies';

function RequireAuth({ children, authToken }) {
  const location = useLocation();
  if (!authToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function RedirectIfAuth({ children, authToken }) {
  const location = useLocation();
  let from = location.state?.from?.pathname || '/dashboard';
  if (from === '/') {
    from = '/dashboard';
  }
  if (authToken) {
    return <Navigate to={from} replace />;
  }
  return children;
}

function App() {
  const { t, i18n } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    authToken, currentUser, authMode, setAuthMode, authEmail, setAuthEmail,
    authPassword, setAuthPassword, authName, setAuthName, authError, authLoading,
    handleAuthSubmit, handleLogout, handleGoogleLogin
  } = useAuth();
  const {
    library, jobs, voices, savedVoices, selfHostedUrl, settings,
    jsonHeaders, fetchAdminSettings, fetchLibrary, fetchJobs, fetchVoices, fetchSavedVoices,
    handlePreviewVoice, handleCopyAudio, handleDeleteAudio, handleSaveSavedVoice, handleDeleteSavedVoice
  } = useAppData(authToken, t);

  const {
    text, setText, voice, setVoice, createVoiceSeed, setCreateVoiceSeed, setVoiceAndSeed,
    speed, setSpeed, audioUrl, isGenerating, handleGenerate, progressState, maxChars
  } = useCreateAudio(t, handlePreviewVoice, selfHostedUrl, settings, fetchAdminSettings);
  const {
    selectedFiles, setSelectedFiles,
    batchVoice, setBatchVoice, batchSpeed, setBatchSpeed, handleStartBatch
  } = useBatchConvert(authToken, selfHostedUrl, fetchJobs, t);

  const authScreenProps = {
    t, authMode, setAuthMode,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    authName, setAuthName,
    authError, authLoading,
    onSubmit: handleAuthSubmit,
    onGoogleSubmit: handleGoogleLogin,
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage authToken={authToken} />} />
      <Route path="/policies" element={<Policies />} />
      <Route
        path="/login"
        element={
          <RedirectIfAuth authToken={authToken}>
            <AuthScreen {...authScreenProps} />
          </RedirectIfAuth>
        }
      />

      <Route
        path="/*"
        element={
          <RequireAuth authToken={authToken}>
            <div className="saas-shell">
              <header className="mobile-header">
                <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>
                  ☰
                </button>
                <span className="mobile-brand-name">{t('app.name')}</span>
              </header>

              {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
              )}

              <Sidebar t={t} i18n={i18n} onLogout={handleLogout} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} currentUser={currentUser} />

              <main className="saas-main">
                <Routes>
                  <Route path="/" element={<Dashboard t={t} jobs={jobs} library={library} authToken={authToken} currentUser={currentUser} onCopy={handleCopyAudio} onDelete={handleDeleteAudio} />} />
                  <Route path="/dashboard" element={<Dashboard t={t} jobs={jobs} library={library} authToken={authToken} currentUser={currentUser} onCopy={handleCopyAudio} onDelete={handleDeleteAudio} />} />
                  <Route path="/create" element={<CreateAudio t={t} text={text} setText={setText} voice={voice} setVoice={setVoice} createVoiceSeed={createVoiceSeed} setCreateVoiceSeed={setCreateVoiceSeed} setVoiceAndSeed={setVoiceAndSeed} speed={speed} setSpeed={setSpeed} audioUrl={audioUrl} isGenerating={isGenerating} onGenerate={handleGenerate} voices={voices} savedVoices={savedVoices} onPreview={handlePreviewVoice} progressState={progressState} maxChars={maxChars || 5000} />} />
                  <Route path="/batch" element={<BatchConvert t={t} selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} onStart={handleStartBatch} voices={voices} batchVoice={batchVoice} setBatchVoice={setBatchVoice} batchSpeed={batchSpeed} setBatchSpeed={setBatchSpeed} savedVoices={savedVoices} onPreview={handlePreviewVoice} jobs={jobs} fetchJobs={fetchJobs} authToken={authToken} />} />
                  <Route path="/voices" element={<Voices t={t} voice={voice} setVoice={setVoice} voices={voices} savedVoices={savedVoices} onPreview={handlePreviewVoice} onSave={handleSaveSavedVoice} onDelete={handleDeleteSavedVoice} currentUser={currentUser} authToken={authToken} />} />
                  <Route path="/library" element={<AudioLibrary t={t} library={library} onRefresh={fetchLibrary} onCopy={handleCopyAudio} onDelete={handleDeleteAudio} currentUser={currentUser} authToken={authToken} />} />
                  <Route path="/profile" element={<Profile t={t} user={currentUser} authToken={authToken} />} />
                  <Route path="/pricing" element={<PricingPlans authToken={authToken} currentUser={currentUser} onCopy={handleCopyAudio} onDelete={handleDeleteAudio} />} />
                  <Route path="/admin" element={<AdminSettings authToken={authToken} onSettingsSaved={fetchAdminSettings} />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default App;
