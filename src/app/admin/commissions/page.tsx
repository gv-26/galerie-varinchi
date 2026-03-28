'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface LedgerEntry {
  id: string;
  salePrice: number;
  artistShare: number;
  commissionType: string;
  status: string;
  createdAt: string;
  artistProfile?: { fullName: string; email: string };
  product?: { title: string; basePrice: number };
}

interface Stats {
  totalRevenue: number;
  totalCommissions: number;
  totalSales: number;
}

export default function AdminCommissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [ledgers, setLedgers] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [artistFilter, setArtistFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) router.push('/auth/signin');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    Promise.all([
      fetch('/api/admin/commissions/stats').then(r => r.json()),
      fetch('/api/admin/commissions').then(r => r.json())
    ]).then(([s, l]) => {
      setStats(s);
      setLedgers(l.ledgers || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(() => ledgers.filter(l => {
    const af = !artistFilter || l.artistProfile?.fullName?.toLowerCase().includes(artistFilter.toLowerCase());
    const pf = !productFilter || l.product?.title?.toLowerCase().includes(productFilter.toLowerCase());
    const sf = !statusFilter || l.status === statusFilter;
    return af && pf && sf;
  }), [ledgers, artistFilter, productFilter, statusFilter]);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (authLoading || loading) return <div className="page-content" style={{ textAlign: 'center' }}><div className="spinner"></div></div>;
  if (!user?.isAdmin) return null;

  return (
    <div className="page-content fade-in">
      <div className="container">
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Link href="/admin" className="text-sm text-muted">← Back to Dashboard</Link>
        </div>
        <div className="admin-header" style={{ marginBottom: 'var(--space-2xl)' }}>
          <h1>Commission Audit</h1>
          <p className="text-muted">Platform-wide financial overview and artist payout tracking</p>
        </div>

        {/* Stats Row */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' }}>
            <div className="profile-card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', letterSpacing: '1px', marginBottom: 'var(--space-xs)' }}>TOTAL PLATFORM REVENUE</p>
              <p style={{ fontSize: '28px', fontWeight: 700 }}>{fmt(stats.totalRevenue)}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>From paid orders</p>
            </div>
            <div className="profile-card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', letterSpacing: '1px', marginBottom: 'var(--space-xs)' }}>TOTAL ARTIST COMMISSIONS</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-success)' }}>{fmt(stats.totalCommissions)}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Paid + pending combined</p>
            </div>
            <div className="profile-card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', letterSpacing: '1px', marginBottom: 'var(--space-xs)' }}>TOTAL COPIES SOLD</p>
              <p style={{ fontSize: '28px', fontWeight: 700 }}>{stats.totalSales}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>All time</p>
            </div>
            <div className="profile-card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', letterSpacing: '1px', marginBottom: 'var(--space-xs)' }}>PLATFORM MARGIN</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-accent)' }}>
                {stats.totalRevenue > 0 ? fmt(stats.totalRevenue - stats.totalCommissions) : '₹0.00'}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Revenue minus commissions</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="profile-card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-md)', alignItems: 'end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Filter by Artist</label>
              <input
                type="text" value={artistFilter}
                onChange={e => setArtistFilter(e.target.value)}
                placeholder="Artist name..."
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Filter by Product</label>
              <input
                type="text" value={productFilter}
                onChange={e => setProductFilter(e.target.value)}
                placeholder="Product title..."
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Released</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-muted" style={{ marginTop: 'var(--space-sm)' }}>
            Showing {filtered.length} of {ledgers.length} entries
          </p>
        </div>

        {/* Audit Table */}
        <div className="profile-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: 0 }}>Sales Ledger</h3>
          </div>
          {filtered.length === 0 ? (
            <p className="text-muted" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>No entries match your filters.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-light)' }}>
                    {['Date', 'Artist', 'Product', 'Sale Price', 'Artist Share', 'Type', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '11px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l => (
                    <tr key={l.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 16px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{new Date(l.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 500 }}>{l.artistProfile?.fullName || '—'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{l.artistProfile?.email}</div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div>{l.product?.title || '—'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Base: {fmt(l.product?.basePrice ?? 0)}</div>
                      </td>
                      <td style={{ padding: '10px 16px', fontWeight: 500 }}>{fmt(l.salePrice)}</td>
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-success)' }}>{fmt(l.artistShare)}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
                          background: l.commissionType === 'INITIAL_33' ? '#e8f4fd' : 'var(--color-bg-light)',
                          color: l.commissionType === 'INITIAL_33' ? 'var(--color-accent)' : 'var(--color-text-secondary)'
                        }}>
                          {l.commissionType === 'INITIAL_33' ? '33% Initial' : '7% Royalty'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
                          background: l.status === 'COMPLETED' ? '#edf7ed' : l.status === 'CANCELLED' ? '#fdecea' : '#fff8e1',
                          color: l.status === 'COMPLETED' ? '#2e7d32' : l.status === 'CANCELLED' ? '#c62828' : '#f57f17'
                        }}>
                          {l.status === 'COMPLETED' ? 'Released' : l.status === 'CANCELLED' ? 'Cancelled' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
