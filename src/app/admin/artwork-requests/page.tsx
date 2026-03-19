'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ArtRequest {
  id: string;
  title: string;
  artist: { fullName: string };
  price: number;
  createdAt: string;
}

export default function AdminArtworkRequests() {
  const [requests, setRequests] = useState<ArtRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/artwork-requests')
      .then(res => res.json())
      .then(data => {
        setRequests(data.requests || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load artwork requests');
        setLoading(false);
      });
  }, []);

  return (
    <div className="page-content fade-in">
      <div className="container">
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Link href="/admin/artists" className="text-sm text-muted">← Back to Artists Management</Link>
        </div>

        <h1 className="heading-serif" style={{ marginBottom: 'var(--space-xl)' }}>Artwork Listing Requests</h1>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="spinner"></div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <p className="text-muted">No pending artwork requests found.</p>
          </div>
        ) : (
          <div className="profile-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Artwork Title</th>
                  <th>Artist Name</th>
                  <th>Price</th>
                  <th>Submitted Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id}>
                    <td><strong>{req.title}</strong></td>
                    <td>{req.artist.fullName}</td>
                    <td>${req.price.toFixed(2)}</td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link href={`/admin/artwork-requests/${req.id}`} className="btn btn-secondary btn-sm">
                        Review & Publish
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
