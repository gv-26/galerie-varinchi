'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface ArtistProfile {
  id: string;
  fullName: string;
  email: string;
  bio: string;
  specialization: string;
  portfolioLink: string;
  profilePhoto: string | null;
  userId: string;
  examples: string;
  country: string;
  state: string;
  status: string;
}

export default function ArtistProfilePage() {
  const router = useRouter();
  const { id } = useParams();
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetch(`/api/artist/${id}`)
      .then(res => res.json())
      .then(data => { setArtist(data.profile || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="page-content" style={{ textAlign: 'center' }}><div className="spinner"></div></div>;
  }

  if (!artist) {
    return (
      <div className="page-content">
        <div className="container empty-state">
          <h2>Artist Not Found</h2>
          <p>This artist profile doesn&apos;t exist or hasn&apos;t been approved yet.</p>
        </div>
      </div>
    );
  }

  const examples = (() => { try { return JSON.parse(artist.examples || '[]'); } catch { return []; } })();

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <button 
            onClick={() => router.back()} 
            className="text-sm text-muted"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ← Back
          </button>
        </div>

        <div className="profile-card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
          {artist.profilePhoto ? (
            <img
              src={artist.profilePhoto.startsWith('http') || artist.profilePhoto.startsWith('/') ? artist.profilePhoto : `/${artist.profilePhoto}`}
              alt={artist.fullName}
              style={{
                width: '120px', height: '120px', borderRadius: '50%',
                objectFit: 'cover', margin: '0 auto var(--space-md)',
                display: 'block', border: '3px solid var(--color-border-light)',
              }}
            />
          ) : (
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%',
              background: 'var(--color-bg-light)', margin: '0 auto var(--space-md)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '40px', border: '3px solid var(--color-border-light)',
            }}>🎨</div>
          )}
          <h1 style={{ marginBottom: 'var(--space-xs)' }}>{artist.fullName}</h1>
          <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-sm)' }}>
            {artist.specialization} • {artist.state}, {artist.country}
          </p>
          {user && artist.userId === user.id && (
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <Link href="/artist/edit-profile" className="btn btn-secondary btn-sm">
                ✎ Edit Profile
              </Link>
            </div>
          )}
          {artist.portfolioLink && (
            <a
              href={artist.portfolioLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm"
              style={{ color: 'var(--color-accent)' }}
            >
              View Portfolio →
            </a>
          )}
        </div>

        <div className="profile-card" style={{ marginTop: 'var(--space-lg)' }}>
          <h3>About</h3>
          <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{artist.bio}</p>
        </div>

        {examples.length > 0 && (
          <div className="profile-card" style={{ marginTop: 'var(--space-lg)' }}>
            <h3>Portfolio</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 'var(--space-md)',
              marginTop: 'var(--space-md)',
            }}>
              {examples.map((url: string, i: number) => (
                <div key={i} style={{
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--color-border-light)',
                }}>
                  <img
                    src={url}
                    alt={`${artist.fullName} artwork ${i + 1}`}
                    onClick={() => setPreviewImage(url)}
                    style={{ width: '100%', height: '200px', objectFit: 'cover', cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <button
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'rgba(255,255,255,0.2)', color: 'white',
              border: 'none', borderRadius: '50%', width: '40px', height: '40px',
              fontSize: '20px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
          <img
            src={previewImage}
            alt="Full screen preview"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              objectFit: 'contain', borderRadius: '8px',
              cursor: 'default',
            }}
          />
        </div>
      )}
    </div>
  );
}
