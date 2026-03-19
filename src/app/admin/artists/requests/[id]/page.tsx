'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ArtistRequest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  area: string;
  portfolioLink: string;
  bio: string;
  specialization: string;
  examples: string; // JSON Array String
  createdAt: string;
}

export default function AdminArtistReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<ArtistRequest | null>(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/artists/requests/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setRequest(data.request);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load application');
        setLoading(false);
      });
  }, [id]);

  const handleAction = async (action: 'APPROVE' | 'DECLINE') => {
    setActionLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/artists/requests/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push('/admin/artists/requests');
      } else {
        setError(data.error || 'Failed to complete action');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="page-content"><div className="spinner"></div></div>;
  if (error || !request) return <div className="page-content alert alert-error">{error || 'Request Not Found'}</div>;

  const exampleFiles: string[] = JSON.parse(request.examples || '[]');

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Link href="/admin/artists/requests" className="text-sm text-muted">← Back to Requests</Link>
        </div>

        <h1 className="heading-serif" style={{ marginBottom: 'var(--space-md)' }}>Review Artist Application</h1>
        <p className="text-muted" style={{ marginBottom: 'var(--space-xl)' }}>Submitted on {new Date(request.createdAt).toLocaleDateString()}</p>

        <div className="profile-card">
          <h3>Personal / Contact Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <div>
              <label className="text-xs text-muted">Full Name</label>
              <p><strong>{request.fullName}</strong></p>
            </div>
            <div>
              <label className="text-xs text-muted">Email Address</label>
              <p>{request.email}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)' }}>
            <div>
              <label className="text-xs text-muted">Phone Number</label>
              <p>{request.phone}</p>
            </div>
            <div>
              <label className="text-xs text-muted">Country</label>
              <p>{request.country}</p>
            </div>
            <div>
              <label className="text-xs text-muted">State / Area</label>
              <p>{request.state}, {request.area}</p>
            </div>
          </div>

          <hr style={{ margin: 'var(--space-xl) 0', border: 0, borderTop: '1px solid var(--color-border-light)' }} />

          <h3>Professional Details</h3>
          <div className="form-group">
            <label className="text-xs text-muted">Portfolio Link</label>
            <p><a href={request.portfolioLink} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>{request.portfolioLink} ↗</a></p>
          </div>
          <div className="form-group">
            <label className="text-xs text-muted">Specialization</label>
            <p>{request.specialization}</p>
          </div>
          <div className="form-group">
            <label className="text-xs text-muted">Artist Bio</label>
            <p style={{ whiteSpace: 'pre-wrap' }}>{request.bio}</p>
          </div>

          <hr style={{ margin: 'var(--space-xl) 0', border: 0, borderTop: '1px solid var(--color-border-light)' }} />

          <h3>Example Artworks ({exampleFiles.length})</h3>
          {exampleFiles.length === 0 ? (
            <p className="text-sm text-muted">No example files uploaded.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)' }}>
              {exampleFiles.map((file, i) => {
                const isImage = file.match(/\.(jpeg|jpg|png|webp)$/i);
                return (
                  <div key={i} className="profile-card" style={{ padding: 'var(--space-sm)', background: 'var(--color-bg-light)', textAlign: 'center' }}>
                    {isImage ? (
                      <img src={file} alt={`Example ${i+1}`} style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px' }} />
                    ) : (
                      <div style={{ padding: 'var(--space-md)' }}>
                        📄 <a href={file} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 'var(--space-xs)', color: 'var(--color-accent)' }}>View Attachment {i+1} ↗</a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-2xl)' }}>
            <button 
              className="btn btn-primary btn-full" 
              onClick={() => handleAction('APPROVE')} 
              disabled={actionLoading}
              style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
            >
              Approve Artist Onboard
            </button>
            <button 
              className="btn btn-danger btn-full" 
              onClick={() => handleAction('DECLINE')} 
              disabled={actionLoading}
            >
              Decline Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
