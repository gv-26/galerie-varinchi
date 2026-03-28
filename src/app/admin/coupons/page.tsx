'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export default function AdminCouponsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // New coupon form
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) router.push('/auth/signin');
  }, [authLoading, user, router]);

  const fetchCoupons = () => {
    fetch('/api/admin/coupons')
      .then(res => res.json())
      .then(data => { setCoupons(data.coupons || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (user?.isAdmin) fetchCoupons();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code.toUpperCase().trim(),
        discountPercent: parseFloat(discountPercent),
        expiresAt: expiresAt || null,
      }),
    });

    const data = await res.json();
    setCreating(false);

    if (res.ok) {
      setCode('');
      setDiscountPercent('');
      setExpiresAt('');
      fetchCoupons();
    } else {
      setError(data.error || 'Failed to create coupon');
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/coupons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, isActive: !isActive } : c));
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setCoupons(prev => prev.filter(c => c.id !== id));
    }
  };

  if (authLoading || !user?.isAdmin) {
    return <div className="page-content" style={{ textAlign: 'center' }}><div className="spinner"></div></div>;
  }

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Link href="/admin" className="text-sm text-muted">← Back to Dashboard</Link>
        </div>
        <h1 style={{ marginBottom: 'var(--space-xl)' }}>Manage Coupons</h1>

        {/* Create New Coupon */}
        <div className="profile-card" style={{ marginBottom: 'var(--space-xl)' }}>
          <h3>Create New Coupon</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label>Coupon Code</label>
                <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. SUMMER20" required />
              </div>
              <div className="form-group">
                <label>Discount %</label>
                <input type="number" min="1" max="100" step="1" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} placeholder="20" required />
              </div>
              <div className="form-group">
                <label>Expires At (optional)</label>
                <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" type="submit" disabled={creating}>
              {creating ? <span className="spinner"></span> : 'Create Coupon'}
            </button>
          </form>
        </div>

        {/* Coupon List */}
        {loading ? (
          <div style={{ textAlign: 'center' }}><div className="spinner"></div></div>
        ) : coupons.length === 0 ? (
          <p className="text-muted">No coupons created yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {coupons.map(c => (
              <div key={c.id} className="profile-card" style={{ opacity: c.isActive ? 1 : 0.6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '16px', fontFamily: 'monospace', letterSpacing: '1px' }}>{c.code}</span>
                  <span className="text-sm text-muted" style={{ marginLeft: 'var(--space-md)' }}>
                    {c.discountPercent}% off
                  </span>
                  {c.expiresAt && (
                    <span className="text-xs text-muted" style={{ marginLeft: 'var(--space-sm)' }}>
                      • Expires {new Date(c.expiresAt).toLocaleDateString('en-IN')}
                    </span>
                  )}
                  <span className="text-xs" style={{
                    display: 'inline-block', marginLeft: 'var(--space-sm)', padding: '2px 6px', borderRadius: '4px',
                    background: c.isActive ? '#f0f7f1' : 'var(--color-bg-alt)',
                    color: c.isActive ? 'var(--color-success)' : 'var(--color-text-secondary)',
                  }}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(c.id, c.isActive)}>
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="btn btn-sm" onClick={() => deleteCoupon(c.id)}
                    style={{ background: 'var(--color-error)', color: 'white', border: 'none' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
