'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Artist {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  country: string;
}

export default function AdminApprovedArtists() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/artists/list')
      .then(res => res.json())
      .then(data => {
        setArtists(data.artists || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load artists');
        setLoading(false);
      });
  }, []);

  return (
    <div className="page-content fade-in">
      <div className="container">
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Link href="/admin/artists" className="text-sm text-muted">← Back to Artists Management</Link>
        </div>

        <h1 className="heading-serif" style={{ marginBottom: 'var(--space-xl)' }}>Approved Artists</h1>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="spinner"></div>
        ) : artists.length === 0 ? (
          <div className="empty-state">
            <p className="text-muted">No approved artists found.</p>
          </div>
        ) : (
          <div className="profile-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Artist Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Location</th>
                  <th>Specialization</th>
                </tr>
              </thead>
              <tbody>
                {artists.map(artist => (
                  <tr key={artist.id}>
                    <td><strong>{artist.fullName}</strong></td>
                    <td>{artist.email}</td>
                    <td>{artist.phone}</td>
                    <td>{artist.country}</td>
                    <td>{artist.specialization}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
