'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ArtistProfile {
  id: string;
  fullName: string;
  status: string;
}

interface LedgerEntry {
  id: string;
  productId: string;
  salePrice: number;
  artistShare: number;
  commissionType: string;
  status: string;
  createdAt: string;
  product?: { id: string; title: string; basePrice: number; totalCommissionPaid: number };
}

interface Wallet {
  availableBalance: number;
  pendingBalance: number;
}

export default function ArtistDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [error, setError] = useState('');

  // Art Requests
  const [pendingArts, setPendingArts] = useState([]);
  const [approvedArts, setApprovedArts] = useState([]);
  const [declinedArts, setDeclinedArts] = useState([]);

  // Wallet
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [ledgers, setLedgers] = useState<LedgerEntry[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSales, setTotalSales] = useState(0);

  useEffect(() => {
    fetch('/api/artist/profile')
      .then(res => res.json())
      .then(data => {
        if (!data.profile) { router.push('/artist/signup'); return; }
        setProfile(data.profile);
        if (data.profile.status === 'APPROVED') {
          fetchArtRequests();
          fetchWallet();
        }
        setLoading(false);
      })
      .catch(() => { setError('Failed to load dashboard'); setLoading(false); });
  }, [router]);

  const fetchArtRequests = () => {
    fetch('/api/artist/art-requests')
      .then(res => res.json())
      .then(data => {
        const arts = data.requests || [];
        setPendingArts(arts.filter((a: any) => a.status === 'PENDING'));
        setApprovedArts(arts.filter((a: any) => a.status === 'APPROVED'));
        setDeclinedArts(arts.filter((a: any) => a.status === 'DECLINED'));
      });
  };

  const fetchWallet = () => {
    fetch('/api/artist/wallet')
      .then(res => res.json())
      .then(data => {
        setWallet(data.wallet);
        setLedgers(data.ledgers || []);
        setTotalEarned(data.totalEarned || 0);
        setTotalSales(data.totalSales || 0);
      });
  };

  if (loading) return <div className="page-content" style={{ textAlign: 'center' }}><div className="spinner"></div></div>;
  if (error || !profile) return <div className="page-content alert alert-error">{error || 'Unable to access dashboard'}</div>;

  if (profile.status === 'PENDING') {
    return (
      <div className="page-content fade-in">
        <div className="container" style={{ maxWidth: '600px', textAlign: 'center', marginTop: 'var(--space-4xl)' }}>
          <div className="empty-state">
            <h2 className="heading-serif">Profile Verification In Progress</h2>
            <p className="text-muted" style={{ margin: 'var(--space-md) 0 var(--space-xl)' }}>
              Thank you for applying, {profile.fullName}! Our team is currently reviewing your portfolio.
              We will notify you and update this dashboard once you are onboarded.
            </p>
            <Link href="/" className="btn btn-secondary">← Back to Shop</Link>
          </div>
        </div>
      </div>
    );
  }

  if (profile.status === 'DECLINED') {
    return (
      <div className="page-content fade-in">
        <div className="container" style={{ maxWidth: '600px', textAlign: 'center', marginTop: 'var(--space-4xl)' }}>
          <div className="empty-state">
            <h2 className="heading-serif">Application Status</h2>
            <p className="text-muted" style={{ margin: 'var(--space-md) 0 var(--space-xl)', color: 'var(--color-error)' }}>
              We are sorry, but your artist onboarding application could not be approved at this time.
            </p>
            <Link href="/" className="btn btn-secondary">← Back to Shop</Link>
          </div>
        </div>
      </div>
    );
  }

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="page-content fade-in">
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)' }}>
          <div>
            <h1 className="heading-serif" style={{ fontSize: '32px' }}>Artist Dashboard</h1>
            <p className="text-muted">Welcome back, {profile.fullName}</p>
          </div>
          <Link href="/artist/submit-art" className="btn btn-primary">+ Submit New Artwork</Link>
        </div>

        {/* Wallet Section */}
        <div style={{ marginBottom: 'var(--space-2xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h2 className="heading-serif" style={{ fontSize: '22px' }}>My Wallet</h2>
            <Link href="/artist/edit-profile" className="btn btn-secondary btn-sm">Manage Bank Details</Link>
          </div>

          {/* Balance Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
            <div className="profile-card" style={{ background: 'linear-gradient(135deg, #0f4c2a 0%, #1a7a45 100%)', color: 'white', border: 'none' }}>
              <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: 'var(--space-xs)', letterSpacing: '1px' }}>AVAILABLE BALANCE</p>
              <p style={{ fontSize: '28px', fontWeight: 700 }}>{fmt(wallet?.availableBalance ?? 0)}</p>
              <p style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>Ready for payout</p>
            </div>
            <div className="profile-card" style={{ background: 'linear-gradient(135deg, #7c5a00 0%, #c49200 100%)', color: 'white', border: 'none' }}>
              <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: 'var(--space-xs)', letterSpacing: '1px' }}>PENDING BALANCE</p>
              <p style={{ fontSize: '28px', fontWeight: 700 }}>{fmt(wallet?.pendingBalance ?? 0)}</p>
              <p style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>Released after 5-day hold</p>
            </div>
            <div className="profile-card">
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xs)', letterSpacing: '1px' }}>LIFETIME EARNINGS</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text)' }}>{fmt(totalEarned)}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{totalSales} sale{totalSales !== 1 ? 's' : ''} total</p>
            </div>
          </div>

          {/* Sales Table */}
          <div className="profile-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0 }}>Sales History</h3>
            </div>
            {ledgers.length === 0 ? (
              <p className="text-muted" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>No sales yet. Submit artwork to get started.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-light)' }}>
                      {['Product', 'Sale Price', 'Your Cut', 'Type', 'Payout Status', 'Date'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '11px', letterSpacing: '0.5px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledgers.map(l => (
                      <tr key={l.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '10px 16px' }}>
                          <Link href={`/artist/wallet/product/${l.productId}`} style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
                            {l.product?.title || 'Product'}
                          </Link>
                        </td>
                        <td style={{ padding: '10px 16px' }}>{fmt(l.salePrice)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-success)' }}>{fmt(l.artistShare)}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
                            background: l.commissionType === 'INITIAL_33' ? 'var(--color-accent-light, #e8f4fd)' : 'var(--color-bg-light)',
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
                            {l.status === 'COMPLETED' ? 'Released' : l.status === 'CANCELLED' ? 'Cancelled' : 'Pending Hold (5d)'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--color-text-secondary)' }}>{new Date(l.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Art Requests Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-xl)' }}>
          <div className="profile-card">
            <h3>Pending Artwork Approvals ({pendingArts.length})</h3>
            {pendingArts.length === 0 ? (
              <p className="text-sm text-muted">No artwork requests pending review.</p>
            ) : (
              <ul style={{ paddingLeft: 'var(--space-md)' }}>
                {pendingArts.map((art: any) => (
                  <li key={art.id} style={{ marginBottom: 'var(--space-xs)', color: 'var(--color-text)' }}>
                    {art.title} <span className="text-xs text-muted">submitted on {new Date(art.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="profile-card">
            <h3>Approved/Published Artworks ({approvedArts.length})</h3>
            {approvedArts.length === 0 ? (
              <p className="text-sm text-muted">No artwork requests have been approved or published yet.</p>
            ) : (
              <ul style={{ paddingLeft: 'var(--space-md)' }}>
                {approvedArts.map((art: any) => (
                  <li key={art.id} style={{ marginBottom: 'var(--space-xs)', color: 'var(--color-success)' }}>
                    {art.title} <span className="text-xs text-muted">(Approved: {new Date(art.createdAt).toLocaleDateString()})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {declinedArts.length > 0 && (
            <div className="profile-card" style={{ borderColor: 'var(--color-error-light)' }}>
              <h3 style={{ color: 'var(--color-error)' }}>Declined Artworks ({declinedArts.length})</h3>
              <ul style={{ paddingLeft: 'var(--space-md)' }}>
                {declinedArts.map((art: any) => (
                  <li key={art.id} style={{ marginBottom: 'var(--space-xs)', color: 'var(--color-error)' }}>{art.title}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
