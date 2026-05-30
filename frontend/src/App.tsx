import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ClassesPage from './pages/ClassesPage';
import ClassStudentsPage from './pages/ClassStudentsPage';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import EmployeesPage from './pages/EmployeesPage';
import { clearGlobalReauthState, getGlobalReauthState, REAUTH_STATE_EVENT } from './api';

function App() {
  const [reauthMessage, setReauthMessage] = useState<string | null>(() => getGlobalReauthState()?.message ?? null);

  useEffect(() => {
    const syncState = () => {
      setReauthMessage(getGlobalReauthState()?.message ?? null);
    };

    window.addEventListener(REAUTH_STATE_EVENT, syncState);
    window.addEventListener('storage', syncState);
    syncState();

    return () => {
      window.removeEventListener(REAUTH_STATE_EVENT, syncState);
      window.removeEventListener('storage', syncState);
    };
  }, []);

  function handleGoToLogin() {
    clearGlobalReauthState();
    window.location.href = '/';
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/classes/:malop/students" element={<ClassStudentsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {reauthMessage && (
        <div style={reauthBackdropStyle}>
          <div style={reauthModalStyle}>
            <div style={reauthGlowStyle} />
            <div style={reauthHeaderStyle}>
              <div style={reauthIconStyle}>!</div>
              <div>
                <div style={reauthTitleStyle}>Quyền tài khoản đã thay đổi</div>
              </div>
            </div>
            <div style={reauthMessageBoxStyle}>{reauthMessage}</div>
            <button type="button" onClick={handleGoToLogin} style={reauthButtonStyle}>
              Đến màn hình đăng nhập
            </button>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;

const reauthBackdropStyle = {
  position: 'fixed' as const,
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  background: 'rgba(15, 23, 42, 0.30)',
  backdropFilter: 'blur(6px)',
};

const reauthModalStyle = {
  width: 'min(620px, 100%)',
  position: 'relative' as const,
  overflow: 'hidden',
  borderRadius: '24px',
  padding: '28px 30px 24px',
  border: '1px solid rgba(59, 130, 246, 0.18)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.98) 100%)',
  boxShadow: '0 28px 80px rgba(15, 23, 42, 0.28)',
  textAlign: 'center' as const,
};

const reauthGlowStyle = {
  position: 'absolute' as const,
  inset: '-80px -120px auto auto',
  width: '220px',
  height: '220px',
  borderRadius: '999px',
  background: 'radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, rgba(59, 130, 246, 0.06) 45%, rgba(59, 130, 246, 0) 72%)',
  pointerEvents: 'none' as const,
};

const reauthHeaderStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  gap: '12px',
  marginBottom: '14px',
  position: 'relative' as const,
  zIndex: 1,
};

const reauthIconStyle = {
  width: '52px',
  height: '52px',
  borderRadius: '999px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)',
  color: '#fff',
  fontWeight: 900,
  fontSize: '24px',
  boxShadow: '0 14px 30px rgba(37, 99, 235, 0.30)',
  flex: '0 0 auto' as const,
};

const reauthTitleStyle = {
  fontSize: '20px',
  fontWeight: 900,
  color: '#1d4ed8',
  lineHeight: 1.2,
  textAlign: 'center' as const,
};

const reauthMessageBoxStyle = {
  position: 'relative' as const,
  zIndex: 1,
  marginBottom: '18px',
  padding: '12px 14px',
  borderRadius: '14px',
  background: 'rgba(59, 130, 246, 0.08)',
  border: '1px solid rgba(59, 130, 246, 0.14)',
  color: '#1e3a8a',
  lineHeight: 1.5,
  fontSize: '13.5px',
  textAlign: 'center' as const,
};

const reauthButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '40px',
  padding: '0 18px',
  background: 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: '14px',
  fontFamily: 'inherit',
  lineHeight: 1,
  letterSpacing: '0.1px',
  boxShadow: '0 14px 26px rgba(37, 99, 235, 0.28)',
};
