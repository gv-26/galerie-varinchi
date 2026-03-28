'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function SignInPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      await refreshUser();
      router.push('/');
    } else {
      setError(data.error);
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="form-card">
        <h1>Welcome Back</h1>
        <p className="subtitle">Sign in to your account</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSignIn}>
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
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
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
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <span className="spinner"></span> : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
          <Link href="/auth/forgot-password" style={{ color: 'var(--color-accent)', fontSize: '13px', fontWeight: 500 }}>
            Forgot Password?
          </Link>
        </div>

        <p className="text-center text-sm text-muted" style={{ marginTop: 'var(--space-xl)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
