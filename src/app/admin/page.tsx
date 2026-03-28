'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface Stats {
  pendingArtists: number;
  approvedArtists: number;
  pendingArtworks: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats>({ pendingArtists: 0, approvedArtists: 0, pendingArtworks: 0 });
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push('/auth/signin');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.isAdmin) {
      fetch('/api/admin/artists/stats')
        .then(res => res.json())
        .then(data => {
          setStats(data);
          if (data.pendingArtists > 0 || data.pendingArtworks > 0) {
            setShowNotif(true);
          }
        })
        .catch(console.error);
    }
  }, [user]);

  if (authLoading || !user?.isAdmin) {
    return (
      <div className="page-content" style={{ textAlign: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const totalPending = stats.pendingArtists + stats.pendingArtworks;

  return (
    <div className="page-content fade-in">
      <div className="container">
        {/* Notification popup */}
        {showNotif && totalPending > 0 && (
          <div style={{
            background: 'var(--color-accent)', color: 'white',
            padding: 'var(--space-md) var(--space-lg)',
            borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xl)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            animation: 'fadeIn 0.3s ease-in',
          }}>
            <div>
              <strong>🔔 Pending Reviews</strong>
              <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.9 }}>
                {stats.pendingArtists > 0 && `${stats.pendingArtists} artist application${stats.pendingArtists > 1 ? 's' : ''}`}
                {stats.pendingArtists > 0 && stats.pendingArtworks > 0 && ' and '}
                {stats.pendingArtworks > 0 && `${stats.pendingArtworks} artwork submission${stats.pendingArtworks > 1 ? 's' : ''}`}
                {' '}awaiting review.
              </p>
            </div>
            <button onClick={() => setShowNotif(false)} style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
            }}>×</button>
          </div>
        )}

        <div className="admin-header">
          <h1>Admin Dashboard</h1>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--space-xl)',
        }}>
          <Link href="/admin/content" className="profile-card" style={{ textDecoration: 'none', transition: 'box-shadow 0.2s' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Website Content</h3>
            <p className="text-sm text-muted">Manage categories, subcategories and products</p>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <span className="btn btn-primary btn-sm">Manage Content →</span>
            </div>
          </Link>

          <Link href="/admin/orders" className="profile-card" style={{ textDecoration: 'none', transition: 'box-shadow 0.2s' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Manage Orders</h3>
            <p className="text-sm text-muted">View and manage customer orders</p>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <span className="btn btn-secondary btn-sm">View Orders →</span>
            </div>
          </Link>

          <Link href="/admin/artists" className="profile-card" style={{ textDecoration: 'none', transition: 'box-shadow 0.2s', position: 'relative' }}>
            {totalPending > 0 && (
              <span style={{
                position: 'absolute', top: '-8px', right: '-8px',
                background: 'var(--color-error)', color: 'white',
                borderRadius: '50%', width: '24px', height: '24px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700,
              }}>{totalPending}</span>
            )}
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Manage Artists</h3>
            <p className="text-sm text-muted">
              Review onboarding applications and artwork requests
              {totalPending > 0 && (
                <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>
                  {' '}• {totalPending} pending
                </span>
              )}
            </p>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <span className="btn btn-accent btn-sm">Manage Artists →</span>
            </div>
          </Link>

          <Link href="/admin/testimonials" className="profile-card" style={{ textDecoration: 'none', transition: 'box-shadow 0.2s' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Manage Testimonials</h3>
            <p className="text-sm text-muted">Activate, deactivate, or delete customer testimonials</p>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <span className="btn btn-secondary btn-sm">Manage Testimonials →</span>
            </div>
          </Link>

          <Link href="/admin/coupons" className="profile-card" style={{ textDecoration: 'none', transition: 'box-shadow 0.2s' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Manage Coupons</h3>
            <p className="text-sm text-muted">Create and manage discount coupon codes</p>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <span className="btn btn-secondary btn-sm">Manage Coupons →</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
