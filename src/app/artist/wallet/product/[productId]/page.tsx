'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ProductCommissionPage() {
  const { productId } = useParams<{ productId: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!productId) return;
    fetch(`/api/artist/wallet/product/${productId}`)
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load data'); setLoading(false); });
  }, [productId]);

  if (loading) return <div className="page-content" style={{ textAlign: 'center' }}><div className="spinner"></div></div>;
  if (error || !data) return <div className="page-content alert alert-error">{error || 'Not found'}</div>;

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const { product, ledgers, totalEarned, totalSales } = data;
  const basePrice = product?.basePrice ?? 0;
  const progress = basePrice > 0 ? Math.min(100, (totalEarned / basePrice) * 100) : 100;

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '900px' }}>
        <Link href="/artist/dashboard" className="btn btn-secondary btn-sm" style={{ marginBottom: 'var(--space-xl)' }}>← Back to Dashboard</Link>

        <h1 className="heading-serif" style={{ marginBottom: 'var(--space-xs)' }}>{product?.title}</h1>
        <p className="text-muted" style={{ marginBottom: 'var(--space-2xl)' }}>Per-product commission breakdown</p>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' }}>
          <div className="profile-card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', letterSpacing: '1px' }}>TOTAL EARNED</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-success)' }}>{fmt(totalEarned)}</p>
          </div>
          <div className="profile-card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', letterSpacing: '1px' }}>ARTIST BASE PRICE</p>
            <p style={{ fontSize: '28px', fontWeight: 700 }}>{fmt(basePrice)}</p>
          </div>
          <div className="profile-card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', letterSpacing: '1px' }}>TOTAL SALES</p>
            <p style={{ fontSize: '28px', fontWeight: 700 }}>{totalSales}</p>
          </div>
        </div>

        {/* Progress Bar: earnings toward base price */}
        <div className="profile-card" style={{ marginBottom: 'var(--space-2xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              {progress >= 100 ? '🎉 Base Price Reached — Earning Royalties' : `Progress to Base Price`}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{fmt(totalEarned)} / {fmt(basePrice)}</span>
          </div>
          <div style={{ height: '10px', background: 'var(--color-bg-light)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: progress >= 100 ? 'linear-gradient(90deg, #2e7d32, #4caf50)' : 'linear-gradient(90deg, var(--color-accent), #a8d8ff)',
              borderRadius: '8px', transition: 'width 0.6s ease'
            }} />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: 'var(--space-sm)' }}>
            {progress >= 100
              ? 'You are now earning 7% royalty on every sale of this product.'
              : `Earning 33% per sale until you reach your base price of ${fmt(basePrice)}.`}
          </p>
        </div>

        {/* Ledger Table */}
        <div className="profile-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: 0 }}>Individual Sales</h3>
          </div>
          {ledgers.length === 0 ? (
            <p className="text-muted" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>No sales recorded for this product yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-light)' }}>
                    {['Date', 'Sale Price', 'Your Cut', 'Commission Type', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '11px', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledgers.map((l: any) => (
                    <tr key={l.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 16px', color: 'var(--color-text-secondary)' }}>{new Date(l.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '10px 16px' }}>{fmt(l.salePrice)}</td>
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
                          {l.status === 'COMPLETED' ? 'Released to Wallet' : l.status === 'CANCELLED' ? 'Cancelled (Refund)' : 'Pending (5-day hold)'}
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
