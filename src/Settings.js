import React from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { User, Mail, Shield, Key, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';

export default function Settings() {
  const { currentUser, userProfile, resetPassword, sendVerification, logout } = useAuth();
  const { addToast } = useToast();

  const handlePasswordReset = async () => {
    if (!currentUser?.email) return;
    try {
      await resetPassword(currentUser.email);
      addToast(`Password reset link sent to ${currentUser.email}`, 'success');
    } catch (err) {
      console.error('Password reset error:', err);
      addToast('Failed to send password reset link. Please try again.', 'error');
    }
  };

  const handleResendVerify = async () => {
    try {
      await sendVerification();
      addToast('Verification email sent. Please check your inbox.', 'info');
    } catch (err) {
      console.error('Verification resend error:', err);
      addToast('Failed to send verification email.', 'error');
    }
  };

  const name = userProfile?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Teacher';
  const email = currentUser?.email || '—';
  const role = userProfile?.role || 'Teacher';
  const isVerified = currentUser?.emailVerified;
  const initial = name.charAt(0).toUpperCase();

  return (
    <div>
      {/* Page Header */}
      <div className="page-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Settings & Profile</h1>
          <p className="page-subtitle">Manage your teacher account and security preferences.</p>
        </div>
      </div>

      <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Profile Details Card */}
        <div className="saas-card">
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="avatar-circle" style={{ width: '54px', height: '54px', fontSize: '22px' }}>
              {initial}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{name}</h2>
              <span className="badge-saas badge-info" style={{ marginTop: '4px' }}>{role}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} /> Email Address
              </span>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '4px 0 0 0' }}>{email}</p>
            </div>

            <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={14} /> Email Status
              </span>
              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isVerified ? (
                  <span className="badge-saas badge-present" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={14} /> Verified
                  </span>
                ) : (
                  <span className="badge-saas badge-late" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} /> Pending Verification
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #F1F5F9', gridColumn: '1 / -1' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} /> Teacher Unique ID (UID)
              </span>
              <p style={{ fontSize: '13px', fontFamily: 'monospace', color: '#334155', margin: '4px 0 0 0', wordBreak: 'break-all' }}>
                {currentUser?.uid || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Security & Actions Card */}
        <div className="saas-card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
            Account Security
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <strong style={{ fontSize: '14px', color: '#0F172A', display: 'block' }}>Password Management</strong>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Receive an email link to reset or update your password.</span>
              </div>
              <button className="btn-secondary-saas" onClick={handlePasswordReset}>
                <Key size={16} />
                <span>Reset Password</span>
              </button>
            </div>

            {!isVerified && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: '#0F172A', display: 'block' }}>Email Verification</strong>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Resend verification email to confirm address.</span>
                </div>
                <button className="btn-secondary-saas" onClick={handleResendVerify}>
                  <Mail size={16} />
                  <span>Resend Verification</span>
                </button>
              </div>
            )}

            <div style={{ paddingTop: '16px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-secondary-saas" style={{ color: '#DC2626', borderColor: '#FCA5A5' }} onClick={logout}>
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
