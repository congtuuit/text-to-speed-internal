import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
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
import AdminSettings from './AdminSettings';

function App() {
  const { t, i18n } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    authToken, currentUser, authMode, setAuthMode, authEmail, setAuthEmail,
    authPassword, setAuthPassword, authName, setAuthName, authError, authLoading,
    handleAuthSubmit, handleLogout
  } = useAuth();

  const {
    library, jobs, voices, savedVoices, selfHostedUrl,
    jsonHeaders, fetchAdminSettings, fetchLibrary, fetchJobs, fetchVoices, fetchSavedVoices,
    handlePreviewVoice, handleCopyAudio, handleDeleteAudio, handleSaveSavedVoice, handleDeleteSavedVoice
  } = useAppData(authToken, t);

  const {
    text, setText, voice, setVoice, createVoiceSeed, setCreateVoiceSeed,
    speed, setSpeed, audioUrl, isGenerating, handleGenerate, progressState
  } = useCreateAudio(t, handlePreviewVoice, selfHostedUrl);

  const {
    selectedFiles, setSelectedFiles,
    batchVoice, setBatchVoice, batchSpeed, setBatchSpeed, handleStartBatch
  } = useBatchConvert(authToken, selfHostedUrl, fetchJobs, t);

  if (!authToken) {
    return <AuthScreen t={t} authMode={authMode} setAuthMode={setAuthMode} authEmail={authEmail} setAuthEmail={setAuthEmail} authPassword={authPassword} setAuthPassword={setAuthPassword} authName={authName} setAuthName={setAuthName} authError={authError} authLoading={authLoading} onSubmit={handleAuthSubmit} />;
  }

  return (
    <div className="saas-shell">
      {/* Mobile Top Bar */}
      <header className="mobile-header">
        <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>
          ☰
        </button>
        <span className="mobile-brand-name">{t('app.name')}</span>
      </header>

      {/* Sidebar Overlay on Mobile */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      <Sidebar t={t} i18n={i18n} onLogout={handleLogout} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} currentUser={currentUser} />

      <main className="saas-main">
        <Routes>
          <Route path="/" element={<Dashboard t={t} jobs={jobs} library={library} />} />
          <Route path="/dashboard" element={<Dashboard t={t} jobs={jobs} library={library} />} />
          <Route path="/create" element={<CreateAudio t={t} text={text} setText={setText} voice={voice} setVoice={setVoice} createVoiceSeed={createVoiceSeed} setCreateVoiceSeed={setCreateVoiceSeed} speed={speed} setSpeed={setSpeed} audioUrl={audioUrl} isGenerating={isGenerating} onGenerate={handleGenerate} voices={voices} savedVoices={savedVoices} onPreview={handlePreviewVoice} progressState={progressState} />} />
          <Route path="/batch" element={<BatchConvert t={t} selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} onStart={handleStartBatch} voices={voices} batchVoice={batchVoice} setBatchVoice={setBatchVoice} batchSpeed={batchSpeed} setBatchSpeed={setBatchSpeed} savedVoices={savedVoices} onPreview={handlePreviewVoice} jobs={jobs} fetchJobs={fetchJobs} authToken={authToken} />} />
          <Route path="/voices" element={<Voices t={t} voice={voice} setVoice={setVoice} voices={voices} savedVoices={savedVoices} onPreview={handlePreviewVoice} onSave={handleSaveSavedVoice} onDelete={handleDeleteSavedVoice} />} />
          <Route path="/library" element={<AudioLibrary t={t} library={library} onRefresh={fetchLibrary} onCopy={handleCopyAudio} onDelete={handleDeleteAudio} />} />

          <Route path="/profile" element={<Profile t={t} user={currentUser} />} />
          <Route path="/admin" element={<AdminSettings authToken={authToken} onSettingsSaved={fetchAdminSettings} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;