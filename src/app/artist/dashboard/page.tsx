'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ArtistProfile {
  id: string;
  fullName: string;
  status: string; // PENDING, APPROVED, DECLINED
}

export default function ArtistDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [error, setError] = useState('');

  // Art Requests Lists for APPROVED state
  const [pendingArts, setPendingArts] = useState([]);
  const [approvedArts, setApprovedArts] = useState([]);
  const [declinedArts, setDeclinedArts] = useState([]);

  useEffect(() => {
    fetch('/api/artist/profile')
      .then(res => res.json())
      .then(data => {
        if (!data.profile) {
          // If logged-in but hasn't applied, send to signup
          router.push('/artist/signup');
          return;
        }
        setProfile(data.profile);
        if (data.profile.status === 'APPROVED') {
          fetchArtRequests();
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load dashboard');
        setLoading(false);
      });
  }, [router]);

  const fetchArtRequests = () => {
    // API endpoint doesn't exist yet, we will create it next.
    fetch('/api/artist/art-requests')
      .then(res => res.json())
      .then(data => {
        const arts = data.requests || [];
        setPendingArts(arts.filter((a: any) => a.status === 'PENDING'));
        setApprovedArts(arts.filter((a: any) => a.status === 'APPROVED'));
        setDeclinedArts(arts.filter((a: any) => a.status === 'DECLINED'));
      });
  };

  if (loading) {
    return (
      <div className="page-content" style={{ textAlign: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !profile) {
    return <div className="page-content alert alert-error">{error || 'Unable to access dashboard'}</div>;
  }

  // 1. PENDING VIEW
  if (profile.status === 'PENDING') {
    return (
      <div className="page-content fade-in">
        <div className="container" style={{ maxWidth: '600px', textAlign: 'center', marginTop: 'var(--space-4xl)' }}>
          <div className="empty-state">
            <h2 className="heading-serif">Profile Verification In Progress</h2>
            <p className="text-muted" style={{ margin: 'var(--space-md) 0 var(--space-xl)' }}>
              Thank you for applying, {profile.fullName}! Our team is currently reviewing your portfolio.
              We will notify you and update this dashboard once you are onboarded.
            </p>
            <Link href="/" className="btn btn-secondary">← Back to Shop</Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. DECLINED VIEW
  if (profile.status === 'DECLINED') {
    return (
      <div className="page-content fade-in">
        <div className="container" style={{ maxWidth: '600px', textAlign: 'center', marginTop: 'var(--space-4xl)' }}>
          <div className="empty-state">
            <h2 className="heading-serif">Application Status</h2>
            <p className="text-muted" style={{ margin: 'var(--space-md) 0 var(--space-xl)', color: 'var(--color-error)' }}>
              We are sorry, but your artist onboarding application could not be approved at this time.
            </p>
            <Link href="/" className="btn btn-secondary">← Back to Shop</Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. APPROVED VIEW
  return (
    <div className="page-content fade-in">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)' }}>
          <div>
            <h1 className="heading-serif" style={{ fontSize: '32px' }}>Artist Dashboard</h1>
            <p className="text-muted">Welcome back, {profile.fullName}</p>
          </div>
          <Link href="/artist/submit-art" className="btn btn-primary">+ Submit New Artwork</Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-xl)' }}>
          <div className="profile-card">
            <h3>Pending Artwork Approvals ({pendingArts.length})</h3>
            {pendingArts.length === 0 ? (
              <p className="text-sm text-muted">No artwork requests pending review.</p>
            ) : (
              <ul style={{ paddingLeft: 'var(--space-md)' }}>
                {pendingArts.map((art: any) => (
                  <li key={art.id} style={{ marginBottom: 'var(--space-xs)', color: 'var(--color-text)' }}>
                    {art.title} <span className="text-xs text-muted">submitted on {new Date(art.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="profile-card">
            <h3>Approved/Published Artworks ({approvedArts.length})</h3>
            {approvedArts.length === 0 ? (
              <p className="text-sm text-muted">No artwork requests have been approved or published yet.</p>
            ) : (
              <ul style={{ paddingLeft: 'var(--space-md)' }}>
                {approvedArts.map((art: any) => (
                  <li key={art.id} style={{ marginBottom: 'var(--space-xs)', color: 'var(--color-success)' }}>
                    {art.title}  <span className="text-xs text-muted">(Approved: {new Date(art.createdAt).toLocaleDateString()})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {declinedArts.length > 0 && (
            <div className="profile-card" style={{ borderColor: 'var(--color-error-light)' }}>
              <h3 style={{ color: 'var(--color-error)' }}>Declined Artworks ({declinedArts.length})</h3>
              <ul style={{ paddingLeft: 'var(--space-md)' }}>
                {declinedArts.map((art: any) => (
                  <li key={art.id} style={{ marginBottom: 'var(--space-xs)', color: 'var(--color-error)' }}>
                    {art.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
