'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ArtRequest {
  id: string;
  title: string;
  description: string;
  price: number | string | null;
  quantity: number | string | null;
  yearCreated: string;
  specifications: string; // JSON Array
  images: string; // JSON Array
  additionalInfo: string | null;
  createdAt: string;
  artistProfile?: { fullName: string } | null;
  artist?: { fullName: string } | null;
  category?: { name: string } | null;
  subCategory?: { name: string } | null;
}

export default function AdminArtworkReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<ArtRequest | null>(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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

  const handleDownload = async (url: string, index: number) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `artwork-${index + 1}.${blob.type.split('/')[1] || 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
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
          Submitted by <strong>{request.artistProfile?.fullName || request.artist?.fullName || 'Unknown Artist'}</strong> on {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '—'}
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
              <p>{request.category?.name || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-muted">Sub-Category</label>
              <p>{request.subCategory?.name || '—'}</p>
            </div>
          </div>

          <div className="form-group">
            <label className="text-xs text-muted">Description</label>
            <p style={{ whiteSpace: 'pre-wrap' }}>{request.description}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <div>
              <label className="text-xs text-muted">Suggested Pricing</label>
              <p style={{ fontWeight: 'bold' }}>₹{Number(request.price || 0).toLocaleString()}</p>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)' }}>
              {images.map((file, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', aspectRatio: '1', cursor: 'pointer', border: '1px solid var(--color-border-light)' }}
                  onClick={() => setLightboxImage(file)}
                >
                  <img
                    src={file}
                    alt={`Artwork ${i+1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    opacity: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                    transition: 'opacity 0.2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setLightboxImage(file); }}
                      style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Enlarge"
                    >🔍</button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDownload(file, i); }}
                      style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Download"
                    >⬇</button>
                  </div>
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

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'zoom-out',
            padding: '40px',
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
          <img
            src={lightboxImage}
            alt="Enlarged artwork"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
              cursor: 'default',
            }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              const idx = images.indexOf(lightboxImage);
              handleDownload(lightboxImage, idx >= 0 ? idx : 0);
            }}
            style={{
              position: 'absolute',
              bottom: '20px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ⬇ Download Image
          </button>
        </div>
      )}
    </div>
  );
}
