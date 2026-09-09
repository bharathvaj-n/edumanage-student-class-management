import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { LogIn, Lock, Mail, User, UserPlus, ArrowLeft, RefreshCw, Send } from 'lucide-react';

export default function Login() {
  const { login, signup, resetPassword, sendVerification, currentUser, logout, reloadUser } = useAuth();
  const { addToast } = useToast();

  // Mode: 'signin' | 'register' | 'forgot' | 'verification'
  const [mode, setMode] = useState(
    currentUser && !currentUser.emailVerified ? 'verification' : 'signin'
  );

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);

  // Map raw Firebase error codes to friendly messages
  const getErrorMessage = (err) => {
    const code = err.code || '';
    switch (code) {
      case 'auth/configuration-not-found':
        return 'Email/password authentication is not enabled for this Firebase project. Please enable it in Firebase Authentication settings.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password is too weak. Please choose a stronger password.';
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      default:
        return err.message || 'An error occurred during authentication.';
    }
  };

  // Sign In Handler
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      addToast('Welcome back, Teacher!', 'success');
    } catch (err) {
      console.error('Sign in error:', err);
      addToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Register Handler
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      addToast('Please fill in all required fields.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      addToast('Password and Confirm Password do not match.', 'error');
      return;
    }

    if (password.length < 6) {
      addToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await signup(email, password, fullName);
      addToast('Account created successfully! Verification email sent.', 'success');
      setMode('verification');
    } catch (err) {
      console.error('Registration error:', err);
      addToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset Password Handler
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      addToast('Please enter your registered email address.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(email);
      addToast('Password reset link sent to your email address.', 'success');
      setMode('signin');
    } catch (err) {
      console.error('Password reset error:', err);
      addToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Resend Email Verification Handler
  const handleResendVerification = async () => {
    setSubmitting(true);
    try {
      await sendVerification();
      addToast('Verification email resent. Please check your inbox.', 'info');
    } catch (err) {
      console.error('Verification resend error:', err);
      addToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Check verification status refresh
  const handleRefreshVerification = async () => {
    setSubmitting(true);
    try {
      await reloadUser();
      if (currentUser?.emailVerified) {
        addToast('Email verified successfully!', 'success');
      } else {
        addToast('Email not verified yet. Please check your inbox and click the verification link.', 'warning');
      }
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-brand-logo">E</div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>EduManage</h2>
          <p style={{ fontSize: '13px', color: '#64748B' }}>
            {mode === 'signin' && 'Sign in to your Teacher Portal'}
            {mode === 'register' && 'Create your Teacher Account'}
            {mode === 'forgot' && 'Reset your Password'}
            {mode === 'verification' && 'Verify your Email Address'}
          </p>
        </div>

        {/* ── MODE 1: SIGN IN ────────────────────────────────────────── */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn}>
            <div className="form-group-saas">
              <label className="form-label-saas">Email Address *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
                <input
                  type="email"
                  className="form-control-saas"
                  style={{ paddingLeft: '38px' }}
                  placeholder="teacher@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group-saas" style={{ marginBottom: '8px' }}>
              <label className="form-label-saas">Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
                <input
                  type="password"
                  className="form-control-saas"
                  style={{ paddingLeft: '38px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <button
                type="button"
                className="btn-link-saas"
                style={{ fontSize: '13px', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                onClick={() => setMode('forgot')}
              >
                Forgot password?
              </button>
            </div>

            <button type="submit" className="btn-primary-saas" style={{ width: '100%', height: '44px' }} disabled={submitting}>
              <LogIn size={18} />
              <span>{submitting ? 'Signing In...' : 'Sign In'}</span>
            </button>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#64748B' }}>
              Don't have an account?{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setMode('register')}
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* ── MODE 2: REGISTER ───────────────────────────────────────── */}
        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-group-saas">
              <label className="form-label-saas">Full Name *</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
                <input
                  type="text"
                  className="form-control-saas"
                  style={{ paddingLeft: '38px' }}
                  placeholder="Prof. Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group-saas">
              <label className="form-label-saas">Email Address *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
                <input
                  type="email"
                  className="form-control-saas"
                  style={{ paddingLeft: '38px' }}
                  placeholder="teacher@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group-saas">
              <label className="form-label-saas">Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
                <input
                  type="password"
                  className="form-control-saas"
                  style={{ paddingLeft: '38px' }}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group-saas" style={{ marginBottom: '24px' }}>
              <label className="form-label-saas">Confirm Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
                <input
                  type="password"
                  className="form-control-saas"
                  style={{ paddingLeft: '38px' }}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary-saas" style={{ width: '100%', height: '44px' }} disabled={submitting}>
              <UserPlus size={18} />
              <span>{submitting ? 'Creating Account...' : 'Create Account'}</span>
            </button>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#64748B' }}>
              Already have an account?{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setMode('signin')}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* ── MODE 3: FORGOT PASSWORD ────────────────────────────────── */}
        {mode === 'forgot' && (
          <form onSubmit={handleResetPassword}>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px', lineHeight: 1.5 }}>
              Enter your registered email address and we will send you a password reset link.
            </p>

            <div className="form-group-saas" style={{ marginBottom: '24px' }}>
              <label className="form-label-saas">Email Address *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
                <input
                  type="email"
                  className="form-control-saas"
                  style={{ paddingLeft: '38px' }}
                  placeholder="teacher@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary-saas" style={{ width: '100%', height: '44px', marginBottom: '12px' }} disabled={submitting}>
              <Send size={18} />
              <span>{submitting ? 'Sending Link...' : 'Send Reset Link'}</span>
            </button>

            <button
              type="button"
              className="btn-secondary-saas"
              style={{ width: '100%', height: '40px', justifyContent: 'center' }}
              onClick={() => setMode('signin')}
            >
              <ArrowLeft size={16} />
              <span>Back to Sign In</span>
            </button>
          </form>
        )}

        {/* ── MODE 4: EMAIL VERIFICATION PROMPT ─────────────────────── */}
        {mode === 'verification' && (
          <div style={{ textAlign: 'center', paddingTop: '10px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Mail size={28} />
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
              Verify your email address
            </h3>

            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, marginBottom: '24px' }}>
              Please verify your email address <strong>({currentUser?.email})</strong> before continuing to the portal.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="btn-primary-saas"
                style={{ width: '100%', height: '42px', justifyContent: 'center' }}
                onClick={handleRefreshVerification}
                disabled={submitting}
              >
                <RefreshCw size={16} className={submitting ? 'spin-icon' : ''} />
                <span>I've Verified Email</span>
              </button>

              <button
                type="button"
                className="btn-secondary-saas"
                style={{ width: '100%', height: '42px', justifyContent: 'center' }}
                onClick={handleResendVerification}
                disabled={submitting}
              >
                <Send size={16} />
                <span>Resend Verification Email</span>
              </button>

              <button
                type="button"
                className="btn-secondary-saas"
                style={{ width: '100%', height: '40px', justifyContent: 'center', color: '#DC2626', borderColor: '#FCA5A5' }}
                onClick={() => { logout(); setMode('signin'); }}
              >
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
