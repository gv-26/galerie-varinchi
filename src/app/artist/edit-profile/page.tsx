'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { resizeImage } from '@/lib/image-utils';

export default function EditProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form States
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [bio, setBio] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  
  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [bankSuccess, setBankSuccess] = useState('');

  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
      return;
    }

    if (user) {
      fetch('/api/artist/profile')
        .then(res => res.json())
        .then(data => {
          if (data.profile) {
            const p = data.profile;
            setFullName(p.fullName || '');
            setPhone(p.phone || '');
            setPortfolioLink(p.portfolioLink || '');
            setSpecialization(p.specialization || '');
            setBio(p.bio || '');
            setProfilePhotoUrl(p.profilePhoto || '');
            setPhotoPreview(p.profilePhoto || '');
            setBankName(p.bankName || '');
            setAccountNumber(p.accountNumber || '');
            setIfscCode(p.ifscCode || '');
            setBankBranch(p.bankBranch || '');
          } else {
            setError('Artist profile not found.');
          }
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to load profile.');
          setLoading(false);
        });
    }
  }, [user, authLoading, router]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSaving(true);
      try {
        const finalFile = await resizeImage(file);
        setNewPhoto(finalFile);
        setPhotoPreview(URL.createObjectURL(finalFile));
        setError('');
      } catch (err) {
        setError('Failed to process image. Please try another one.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let finalPhotoUrl = profilePhotoUrl;

      // Upload new photo if selected
      if (newPhoto) {
        const preRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: newPhoto.name, contentType: newPhoto.type })
        });
        if (!preRes.ok) throw new Error('Failed to get upload URL');
        const { uploadUrl, finalUrl } = await preRes.json();
        
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': newPhoto.type },
          body: newPhoto
        });
        if (!putRes.ok) throw new Error('Failed to upload photo');
        finalPhotoUrl = finalUrl;
      }

      const res = await fetch('/api/artist/profile/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          portfolioLink,
          specialization,
          bio,
          profilePhoto: finalPhotoUrl
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Profile updated successfully!');
        setProfilePhotoUrl(finalPhotoUrl);
        setTimeout(() => router.push(`/artist/${data.profile.id}`), 1500);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <div className="page-content" style={{ textAlign: 'center' }}><div className="spinner"></div></div>;
  }

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '600px' }}>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Link href="/artist/dashboard" className="text-sm text-muted">← Back to Dashboard</Link>
        </div>

        <h1 className="heading-serif" style={{ marginBottom: 'var(--space-xl)' }}>Edit Profile</h1>

        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-md)' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: 'var(--space-md)' }}>{success}</div>}

        <form onSubmit={handleSubmit} className="profile-card">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto var(--space-sm)',
                border: '3px solid var(--color-border-light)', cursor: 'pointer', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--color-bg-light)', position: 'relative'
              }}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '40px' }}>🎨</span>
              )}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '10px', padding: '2px' }}>Change</div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
            <p className="text-xs text-muted">Profile Photo<br/><small>(Images {'>'} 3MB resized automatically)</small></p>
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={fullName} disabled style={{ backgroundColor: 'var(--color-bg-light)', cursor: 'not-allowed' }} />
            <small className="text-muted">Contact us to change your legal name</small>
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Portfolio Link / Socials</label>
            <input type="url" value={portfolioLink} onChange={e => setPortfolioLink(e.target.value)} placeholder="https://" />
          </div>

          <div className="form-group">
            <label>Art Specialization</label>
            <input type="text" value={specialization} onChange={e => setSpecialization(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Artist Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={6} />
          </div>

          <div style={{ marginTop: 'var(--space-xl)' }}>
            <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
              {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>

        {/* Bank Details Section */}
        <div className="profile-card" style={{ marginTop: 'var(--space-xl)' }}>
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>Bank Details for Payouts</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
            These details are used to process your wallet payouts. They are stored securely and never shared publicly.
          </p>
          {bankSuccess && <div className="alert alert-success" style={{ marginBottom: 'var(--space-md)' }}>{bankSuccess}</div>}
          <div className="form-group">
            <label>Bank Name</label>
            <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. HDFC Bank" />
          </div>
          <div className="form-group">
            <label>Account Number</label>
            <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Your account number" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label>IFSC Code</label>
              <input type="text" value={ifscCode} onChange={e => setIfscCode(e.target.value.toUpperCase())} placeholder="e.g. HDFC0001234" />
            </div>
            <div className="form-group">
              <label>Branch</label>
              <input type="text" value={bankBranch} onChange={e => setBankBranch(e.target.value)} placeholder="Branch name" />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={savingBank}
            onClick={async () => {
              setSavingBank(true);
              setBankSuccess('');
              setError('');
              try {
                const res = await fetch('/api/artist/wallet/bank', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ bankName, accountNumber, ifscCode, bankBranch })
                });
                if (res.ok) {
                  setBankSuccess('Bank details saved successfully!');
                  setTimeout(() => setBankSuccess(''), 4000);
                } else {
                  const d = await res.json();
                  setError(d.error || 'Failed to save bank details');
                }
              } catch {
                setError('An error occurred saving bank details');
              } finally {
                setSavingBank(false);
              }
            }}
          >
            {savingBank ? 'Saving...' : 'Save Bank Details'}
          </button>
        </div>
      </div>
    </div>
  );
}
