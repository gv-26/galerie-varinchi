'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface Testimonial {
  id: string;
  text: string;
  isActive: boolean;
  createdAt: string;
  user: { name: string } | null;
  product: { title: string } | null;
}

export default function AdminTestimonialsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) router.push('/auth/signin');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.isAdmin) {
      fetch('/api/testimonials')
        .then(res => res.json())
        .then(data => { setTestimonials(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [user]);

  const toggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/testimonials/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      setTestimonials(prev => prev.map(t => t.id === id ? { ...t, isActive: !isActive } : t));
    }
  };

  const deleteTestimonial = async (id: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;
    const res = await fetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTestimonials(prev => prev.filter(t => t.id !== id));
    }
  };

  if (authLoading || !user?.isAdmin) {
    return <div className="page-content" style={{ textAlign: 'center' }}><div className="spinner"></div></div>;
  }

  return (
    <div className="page-content fade-in">
      <div className="container">
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Link href="/admin" className="text-sm text-muted">← Back to Dashboard</Link>
        </div>
        <h1 style={{ marginBottom: 'var(--space-xl)' }}>Manage Testimonials</h1>

        {loading ? (
          <div style={{ textAlign: 'center' }}><div className="spinner"></div></div>
        ) : testimonials.length === 0 ? (
          <p className="text-muted">No testimonials yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {testimonials.map(t => (
              <div key={t.id} className="profile-card" style={{ opacity: t.isActive ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', marginBottom: 'var(--space-sm)' }}>"{t.text}"</p>
                    <p className="text-xs text-muted">
                      By {t.user?.name || 'Anonymous'} • Product: {t.product?.title || 'N/A'} •{' '}
                      {new Date(t.createdAt).toLocaleDateString('en-IN')}
                    </p>
                    <span className="text-xs" style={{
                      display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '4px',
                      background: t.isActive ? '#f0f7f1' : 'var(--color-bg-alt)',
                      color: t.isActive ? 'var(--color-success)' : 'var(--color-text-secondary)',
                    }}>
                      {t.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(t.id, t.isActive)}>
                      {t.isActive ? 'Hide' : 'Show'}
                    </button>
                    <button className="btn btn-sm" onClick={() => deleteTestimonial(t.id)}
                      style={{ background: 'var(--color-error)', color: 'white', border: 'none' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
