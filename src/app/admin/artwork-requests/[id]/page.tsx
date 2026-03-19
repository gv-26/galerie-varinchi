'use client';
export const runtime = 'edge';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ArtRequest {
  id: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  yearCreated: string;
  specifications: string; // JSON Array
  images: string; // JSON Array
  additionalInfo: string | null;
  createdAt: string;
  artist: { fullName: string };
  category: { name: string };
  subCategory: { name: string };
}

export default function AdminArtworkReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<ArtRequest | null>(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/artwork-requests/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setRequest(data.request);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load artwork request');
        setLoading(false);
      });
  }, [id]);

  const handleDecline = async () => {
    setActionLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/artwork-requests/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DECLINE' }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push('/admin/artwork-requests');
      } else {
        setError(data.error || 'Failed to decline request');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="page-content"><div className="spinner"></div></div>;
  if (error || !request) return <div className="page-content alert alert-error">{error || 'Artwork Request Not Found'}</div>;

  const images: string[] = JSON.parse(request.images || '[]');
  const specs: any[] = JSON.parse(request.specifications || '[]');

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Link href="/admin/artwork-requests" className="text-sm text-muted">← Back to Artwork Requests</Link>
        </div>

        <h1 className="heading-serif" style={{ marginBottom: 'var(--space-md)' }}>Review Artwork Submission</h1>
        <p className="text-muted" style={{ marginBottom: 'var(--space-xl)' }}>
          Submitted by <strong>{request.artist.fullName}</strong> on {new Date(request.createdAt).toLocaleDateString()}
        </p>

        <div className="profile-card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <div>
              <label className="text-xs text-muted">Artwork Title</label>
              <p><strong>{request.title}</strong></p>
            </div>
            <div>
              <label className="text-xs text-muted">Year Created</label>
              <p>{request.yearCreated}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <div>
              <label className="text-xs text-muted">Category</label>
              <p>{request.category.name}</p>
            </div>
            <div>
              <label className="text-xs text-muted">Sub-Category</label>
              <p>{request.subCategory.name}</p>
            </div>
          </div>

          <div className="form-group">
            <label className="text-xs text-muted">Description</label>
            <p style={{ whiteSpace: 'pre-wrap' }}>{request.description}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <div>
              <label className="text-xs text-muted">Suggested Pricing</label>
              <p style={{ fontWeight: 'bold' }}>${request.price.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-xs text-muted">Quantity</label>
              <p>{request.quantity}</p>
            </div>
          </div>

          {request.additionalInfo && (
            <div className="form-group">
              <label className="text-xs text-muted">Additional Information From Artist</label>
              <p style={{ background: 'var(--color-bg-light)', padding: 'var(--space-sm)', borderRadius: '4px' }}>{request.additionalInfo}</p>
            </div>
          )}

          <hr style={{ margin: 'var(--space-xl) 0', border: 0, borderTop: '1px solid var(--color-border-light)' }} />

          <h3>Specifications</h3>
          {specs.length === 0 ? (
            <p className="text-sm text-muted">No custom specifications provided.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)' }}>
              {specs.map((s, i) => (
                <div key={i} className="profile-card" style={{ padding: 'var(--space-sm)', background: 'var(--color-bg-light)' }}>
                  <label className="text-xs text-muted">{s.name}</label>
                  <p style={{ margin: 0, marginTop: '2px' }}>{s.options.join(', ')}</p>
                </div>
              ))}
            </div>
          )}

          <hr style={{ margin: 'var(--space-xl) 0', border: 0, borderTop: '1px solid var(--color-border-light)' }} />

          <h3>Artwork Images ({images.length})</h3>
          {images.length === 0 ? (
            <p className="text-sm text-muted">No images uploaded.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)' }}>
              {images.map((file, i) => (
                <div key={i} className="profile-card" style={{ padding: 'var(--space-sm)', background: 'var(--color-bg-light)', textAlign: 'center' }}>
                  <img src={file} alt={`Artwork ${i+1}`} style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '4px' }} />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-2xl)' }}>
            <Link 
              href={`/admin/add-product?requestId=${request.id}`} 
              className="btn btn-primary btn-full" 
              style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)', textAlign: 'center' }}
            >
              Add to Products
            </Link>
            <button 
              className="btn btn-danger btn-full" 
              onClick={handleDecline} 
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
