'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setStep('reset');
    } else {
      setError(data.error);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setSuccess('Password updated successfully! You can now sign in.');
    } else {
      setError(data.error);
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="form-card">
        <h1>Reset Password</h1>
        <p className="subtitle">
          {step === 'email'
            ? 'Enter your email to receive a verification code'
            : `Enter the code sent to ${email} and your new password`}
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && (
          <div className="alert alert-success">
            {success}{' '}
            <Link href="/auth/signin" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              Sign in →
            </Link>
          </div>
        )}

        {!success && step === 'email' && (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Send Verification Code'}
            </button>
          </form>
        )}

        {!success && step === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label htmlFor="otp">Verification Code</label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                required
                style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '8px' }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={6}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <small style={{ color: 'var(--color-error)' }}>Passwords do not match</small>
              )}
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Reset Password'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-full"
              onClick={() => { setStep('email'); setOtp(''); setError(''); }}
              style={{ marginTop: 'var(--space-sm)' }}
            >
              Change email
            </button>
          </form>
        )}

        <p className="text-center text-sm text-muted" style={{ marginTop: 'var(--space-xl)' }}>
          Remember your password?{' '}
          <Link href="/auth/signin" style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
