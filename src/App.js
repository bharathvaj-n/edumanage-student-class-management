import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './Home';
import Classdetails from './Classdetails';
import Studentdetails from './Studentdetails';
import Settings from './Settings';
import Login from './Login';
import Layout from './Layout';
import { ToastProvider } from './ToastContext';
import { AuthProvider, useAuth } from './AuthContext';
import { Loader2 } from 'lucide-react';

function AppRoutes() {
  const { currentUser, loadingAuth, logout } = useAuth();

  if (loadingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        color: '#64748B'
      }}>
        <Loader2 size={36} className="spin-icon" style={{ color: '#2563EB', marginBottom: '12px' }} />
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>Authenticating EduManage...</span>
      </div>
    );
  }

  // Unauthenticated users or users with unverified email see Login / Verification page
  const isAuth = Boolean(currentUser);
  const isVerified = currentUser?.emailVerified;

  if (!isAuth || !isVerified) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout onLogout={logout}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/class" element={<Classdetails />} />
        <Route path="/student" element={<Studentdetails />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
