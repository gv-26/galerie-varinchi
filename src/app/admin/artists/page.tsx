'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminArtistsDashboard() {
  const [stats, setStats] = useState({
    pendingArtists: 0,
    approvedArtists: 0,
    pendingArtworks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/artists/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '900px' }}>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Link href="/admin" className="text-sm text-muted">← Back to Dashboard</Link>
        </div>

        <h1 className="heading-serif" style={{ marginBottom: 'var(--space-xl)' }}>Artist Management</h1>

        {loading ? (
          <div className="spinner"></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-lg)' }}>
            <Link href="/admin/artists/requests" className="profile-card" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-accent)', marginBottom: 'var(--space-xs)' }}>
                {stats.pendingArtists}
              </div>
              <h3 style={{ margin: 0 }}>Artist Requests</h3>
              <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>Pending onboarding reviews</p>
            </Link>

            <Link href="/admin/artwork-requests" className="profile-card" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-accent)', marginBottom: 'var(--space-xs)' }}>
                {stats.pendingArtworks}
              </div>
              <h3 style={{ margin: 0 }}>Artwork Requests</h3>
              <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>Arts awaiting site listings</p>
            </Link>

            <Link href="/admin/artists/list" className="profile-card" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-success)', marginBottom: 'var(--space-xs)' }}>
                {stats.approvedArtists}
              </div>
              <h3 style={{ margin: 0 }}>Artists List</h3>
              <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>View all approved profiles</p>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
