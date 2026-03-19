export const dynamic = 'force-dynamic';
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ArtistSignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'details' | 'otp'>('details');

  // Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [area, setArea] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [bio, setBio] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);

  const [otp, setOtp] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = e.target.files;
      let totalSize = 0;
      for (let i = 0; i < selectedFiles.length; i++) {
        totalSize += selectedFiles[i].size;
      }

      const maxBytes = 20 * 1024 * 1024; // 20MB
      if (totalSize > maxBytes) {
        setError('Total file size exceeds 20MB limit.');
        setFiles(null);
        e.target.value = '';
        return;
      }
      setError('');
      setFiles(selectedFiles);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // First, trigger OTP send
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setStep('otp');
      } else {
        setError(data.error || 'Failed to send OTP. Email might already be registered.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Verify OTP and create user account
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, isSignup: true }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error || 'Invalid or expired OTP');
        setLoading(false);
        return;
      }

      // 2. account provisioned successfully. Now submit artist application.
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('country', country);
      formData.append('state', state);
      formData.append('area', area);
      formData.append('portfolioLink', portfolioLink);
      formData.append('bio', bio);
      formData.append('specialization', specialization);

      if (files) {
        for (let i = 0; i < files.length; i++) {
          formData.append('examples', files[i]);
        }
      }

      const applyRes = await fetch('/api/artist/apply', {
        method: 'POST',
        body: formData, // No Content-Type header so browser sets correct boundary
      });

      const applyData = await applyRes.json();
      if (applyRes.ok) {
        window.location.href = '/artist/dashboard';
      } else {
        setError(applyData.error || 'Failed to submit artist profile');
      }
    } catch (err) {
      setError('An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '650px' }}>
        <h1 className="heading-serif" style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
          Sign up as an Artist
        </h1>
        <p className="text-center text-muted" style={{ marginBottom: 'var(--space-2xl)' }}>
          Onboard into Galerie Varinchie to list and showcase your creations
        </p>

        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-md)' }}>{error}</div>}

        {step === 'details' ? (
          <form onSubmit={handleSendOtp} className="profile-card">
            <h3>Personal & Contact Info</h3>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full Name" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" required />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone Number" required />
              </div>
            </div>

            <h3 style={{ marginTop: 'var(--space-xl)' }}>Location</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label>Country</label>
                <input type="text" value={country} onChange={e => setCountry(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>State</label>
                <input type="text" value={state} onChange={e => setState(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Area</label>
                <input type="text" value={area} onChange={e => setArea(e.target.value)} required />
              </div>
            </div>

            <h3 style={{ marginTop: 'var(--space-xl)' }}>Artist Details</h3>
            <div className="form-group">
              <label>Portfolio Link (Socials / URL)</label>
              <input type="url" value={portfolioLink} onChange={e => setPortfolioLink(e.target.value)} placeholder="https://" required />
            </div>
            <div className="form-group">
              <label>Art Specialization</label>
              <input type="text" value={specialization} onChange={e => setSpecialization(e.target.value)} placeholder="e.g. Mixed Media, Oil on canvas" required />
            </div>
            <div className="form-group">
              <label>Artist Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="Tell us about yourself and your artistic background" required />
            </div>

            <div className="form-group">
              <label>Example Artworks (Combined max 20MB)</label>
              <input type="file" onChange={handleFileChange} multiple accept="image/*,application/pdf,video/*" required />
              <small className="text-muted">Upload PDFs, Images, or Videos proving previous work.</small>
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ marginTop: 'var(--space-md)' }}>
              {loading ? <span className="spinner"></span> : 'Submit & Verify Email'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndSubmit} className="profile-card">
            <h3>Verify your Email</h3>
            <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-md)' }}>We sent a verification code to {email}</p>
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
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Verify & Submit Profile'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-full"
              onClick={() => { setStep('details'); setOtp(''); setError(''); }}
              style={{ marginTop: 'var(--space-sm)' }}
            >
              Back to Details
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
