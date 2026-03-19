'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ArtistRequest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  createdAt: string;
}

export default function AdminArtistRequests() {
  const [requests, setRequests] = useState<ArtistRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/artists/requests')
      .then(res => res.json())
      .then(data => {
        setRequests(data.requests || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load requests');
        setLoading(false);
      });
  }, []);

  return (
    <div className="page-content fade-in">
      <div className="container">
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Link href="/admin/artists" className="text-sm text-muted">← Back to Artists Management</Link>
        </div>

        <h1 className="heading-serif" style={{ marginBottom: 'var(--space-xl)' }}>Artist Onboarding Requests</h1>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="spinner"></div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <p className="text-muted">No pending artist requests received.</p>
          </div>
        ) : (
          <div className="profile-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Artist Name</th>
                  <th>Email / Phone</th>
                  <th>Specialization</th>
                  <th>Received Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id}>
                    <td><strong>{req.fullName}</strong></td>
                    <td>
                      <div>{req.email}</div>
                      <div className="text-xs text-muted">{req.phone}</div>
                    </td>
                    <td>{req.specialization}</td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link href={`/admin/artists/requests/${req.id}`} className="btn btn-secondary btn-sm">
                        Review
                      </Link>
                    </td>
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
