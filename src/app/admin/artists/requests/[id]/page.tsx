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
  agreementPdfUrl?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export default function AdminArtistReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<ArtistRequest | null>(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleDownload = async (url: string, index: number) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `artist-example-${index + 1}.${blob.type.split('/')[1] || 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)' }}>
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
             <div>
              <label className="text-xs text-muted">Registration IP</label>
              <p>{request.ipAddress || 'Unknown'}</p>
            </div>
          </div>

          <hr style={{ margin: 'var(--space-xl) 0', border: 0, borderTop: '1px solid var(--color-border-light)' }} />

          <h3>Professional Details</h3>
          <div className="form-group">
            <label className="text-xs text-muted">Portfolio Link</label>
            <p><a href={request.portfolioLink} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>{request.portfolioLink} ↗</a></p>
          </div>
          {request.agreementPdfUrl && (
            <div className="form-group">
              <label className="text-xs text-muted">Signed Agreement</label>
              <p>
                <a href={request.agreementPdfUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-xs)' }}>
                  📄 View Signed Agreement PDF
                </a>
              </p>
            </div>
          )}
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
                  <div key={i} className="profile-card" style={{ padding: 'var(--space-sm)', background: 'var(--color-bg-light)', textAlign: 'center', position: 'relative' }}>
                    {isImage ? (
                      <div style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setLightboxImage(file)}>
                         <img src={file} alt={`Example ${i+1}`} style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block', margin: '0 auto' }} />
                         <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.5)', opacity: 0,
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

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, cursor: 'zoom-out', padding: '40px',
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer' }}
          >✕</button>
          <img
            src={lightboxImage}
            alt="Enlarged artwork"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', cursor: 'default' }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              const idx = exampleFiles.indexOf(lightboxImage);
              handleDownload(lightboxImage, idx >= 0 ? idx : 0);
            }}
            style={{ position: 'absolute', bottom: '20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer' }}
          >⬇ Download Image</button>
        </div>
      )}
    </div>
  );
}
