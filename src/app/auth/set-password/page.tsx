'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SetPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
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
    } else if (res.status === 404) {
      setError('No order found with this email address. Please check the email or browse our shop.');
    } else {
      setError(data.error || 'Something went wrong. Please try again.');
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
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
      setSuccess('Password created successfully!');
    } else {
      setError(data.error || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="form-card">
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark, #8a6a3a))',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 'var(--space-sm)'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" style={{ width: '28px', height: '28px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
        </div>

        <h1>Create Your Password</h1>
        <p className="subtitle">
          {step === 'email'
            ? 'Enter the email you used when placing your order'
            : `Enter the verification code sent to ${email}`}
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        {success && (
          <div className="alert alert-success">
            <strong>{success}</strong>
            <p style={{ marginTop: 'var(--space-xs)', fontSize: '13px' }}>
              You can now sign in with your email and new password to view your orders.
            </p>
            <Link
              href={`/auth/signin?email=${encodeURIComponent(email)}`}
              className="btn btn-primary"
              style={{ marginTop: 'var(--space-sm)', display: 'inline-block' }}
            >
              Sign in now →
            </Link>
          </div>
        )}

        {!success && step === 'email' && (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label htmlFor="sp-email">Email Address</label>
              <input
                id="sp-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Use the same email you entered when placing your order
              </p>
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Send Verification Code'}
            </button>
          </form>
        )}

        {!success && step === 'reset' && (
          <form onSubmit={handleSetPassword}>
            <div className="form-group">
              <label htmlFor="sp-otp">Verification Code</label>
              <input
                id="sp-otp"
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
              <label htmlFor="sp-password">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="sp-password"
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
              <label htmlFor="sp-confirm">Confirm Password</label>
              <input
                id="sp-confirm"
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
              {loading ? <span className="spinner"></span> : 'Create Password'}
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
          Already have a password?{' '}
          <Link href="/auth/signin" style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="page-content"><div className="container empty-state"><span className="spinner"></span></div></div>}>
      <SetPasswordForm />
    </Suspense>
  );
}
