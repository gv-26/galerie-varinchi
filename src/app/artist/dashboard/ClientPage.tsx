'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { resizeImage } from '@/lib/image-utils';
import jsPDF from 'jspdf';
import { GV_SIGNATURE_BASE64 } from '@/constants/agreement';

interface ArtistProfile {
  id: string;
  fullName: string;
  email: string;
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

interface PendingVersion {
  id: string;
  versionNumber: string;
  title: string;
  content: string;
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

  // Re-agreement
  const [pendingVersion, setPendingVersion] = useState<PendingVersion | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [agreementError, setAgreementError] = useState('');
  const [agreementSuccess, setAgreementSuccess] = useState(false);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signatureImage, setSignatureImage] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState('');
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const tcContainerRef = useRef<HTMLDivElement>(null);
  const [userIp, setUserIp] = useState('');

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(data => setUserIp(data.ip || ''))
      .catch(() => setUserIp('unknown'));
  }, []);

  useEffect(() => {
    fetch(`/api/artist/profile?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (!data.profile) { router.push('/artist/signup'); return; }
        setProfile(data.profile);
        if (data.profile.status === 'APPROVED') {
          fetchArtRequests();
          fetchWallet();
          checkPendingAgreement();
        }
        setLoading(false);
      })
      .catch(() => { setError('Failed to load dashboard'); setLoading(false); });
  }, [router]);

  const fetchArtRequests = () => {
    fetch(`/api/artist/art-requests?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        const arts = data.requests || [];
        setPendingArts(arts.filter((a: any) => a.status === 'PENDING'));
        setApprovedArts(arts.filter((a: any) => a.status === 'APPROVED'));
        setDeclinedArts(arts.filter((a: any) => a.status === 'DECLINED'));
      });
  };

  const fetchWallet = () => {
    fetch(`/api/artist/wallet?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        setWallet(data.wallet);
        setLedgers(data.ledgers || []);
        setTotalEarned(data.totalEarned || 0);
        setTotalSales(data.totalSales || 0);
      });
  };

  const checkPendingAgreement = () => {
    fetch(`/api/artist/agreements/pending?t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        console.log('Pending agreement data:', data);
        if (data.pendingVersion) setPendingVersion(data.pendingVersion); 
      })
      .catch(e => { console.error('Failed to fetch pending agreement:', e); });
  };

  const handleTcScroll = () => {
    const el = tcContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    if (atBottom) setHasScrolledToEnd(true);
  };

  useEffect(() => {
    const el = tcContainerRef.current;
    if (el && pendingVersion) {
      if (el.scrollHeight <= el.clientHeight) {
        setHasScrolledToEnd(true);
      }
    }
  }, [pendingVersion]);

  const handleSignatureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|jpg)$/)) {
      setAgreementError('Signature must be a JPG or PNG image.');
      return;
    }
    try {
      const finalFile = await resizeImage(file);
      setSignatureImage(finalFile);
      setSignaturePreview(URL.createObjectURL(finalFile));
      setAgreementError('');
    } catch {
      setAgreementError('Failed to process signature image.');
    }
  };

  const generateSignedPDF = async (version: PendingVersion, fullName: string): Promise<Blob> => {
    const doc = new jsPDF({ format: 'a4', unit: 'pt' });
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const textWidth = pageWidth - margin * 2;
    let y = margin + 20;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(version.title.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 12;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Version ${version.versionNumber}`, pageWidth / 2, y + 10, { align: 'center' });
    y += 40;

    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    const lines = doc.splitTextToSize(version.content, textWidth);
    for (const line of lines) {
      if (y > pageHeight - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 12;
    }

    y += 40;
    if (y > pageHeight - 180) { doc.addPage(); y = margin; }

    const colWidth = textWidth / 2;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Artist', margin, y);
    doc.text('Galerie Varinchi', margin + colWidth, y);
    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${fullName}`, margin, y);
    doc.text('Name: Nikhil George', margin + colWidth, y);
    y += 20;

    if (signaturePreview) {
      try { doc.addImage(signaturePreview, 'PNG', margin, y, 100, 40); } catch {}
    }
    if (GV_SIGNATURE_BASE64) {
      try { doc.addImage(`data:image/jpeg;base64,${GV_SIGNATURE_BASE64}`, 'JPEG', margin + colWidth, y, 100, 40); } catch {}
    }
    y += 50;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y);
    doc.text('Date: May 3 - 2026', margin + colWidth, y);
    y += 20;
    doc.setFontSize(8);
    doc.text(`IP: ${userIp}`, margin, y);

    return doc.output('blob');
  };

  const handleSignAgreement = async () => {
    if (!pendingVersion || !profile) return;
    if (!hasScrolledToEnd) { setAgreementError('Please scroll to the bottom of the agreement.'); return; }
    if (!agreedToTerms) { setAgreementError('Please check the agreement checkbox.'); return; }
    if (!signatureImage) { setAgreementError('Please upload your signature image.'); return; }

    setAgreementLoading(true);
    setAgreementError('');
    try {
      // Upload signature
      const sigPresigned = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: signatureImage.name, contentType: signatureImage.type }),
      }).then(r => r.json());
      await fetch(sigPresigned.uploadUrl, { method: 'PUT', headers: { 'Content-Type': signatureImage.type }, body: signatureImage });
      const signatureImageUrl = sigPresigned.finalUrl;

      // Generate and upload signed PDF
      const pdfBlob = await generateSignedPDF(pendingVersion, profile.fullName);
      const pdfFile = new File([pdfBlob], `agreement-v${pendingVersion.versionNumber}-${Date.now()}.pdf`, { type: 'application/pdf' });
      const pdfPresigned = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: pdfFile.name, contentType: pdfFile.type }),
      }).then(r => r.json());
      await fetch(pdfPresigned.uploadUrl, { method: 'PUT', headers: { 'Content-Type': pdfFile.type }, body: pdfFile });
      const agreementPdfUrl = pdfPresigned.finalUrl;

      // Record consent in DB
      const res = await fetch('/api/artist/agreements/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreementVersionId: pendingVersion.id,
          signatureImageUrl,
          agreementPdfUrl,
          ipAddress: userIp,
        }),
      });
      if (!res.ok) throw new Error('Failed to record agreement consent.');
      setAgreementSuccess(true);
      setTimeout(() => {
        setPendingVersion(null);
        setAgreementSuccess(false);
        setHasScrolledToEnd(false);
        setAgreedToTerms(false);
        setSignatureImage(null);
        setSignaturePreview('');
      }, 2500);
    } catch (err: any) {
      setAgreementError(err.message || 'Something went wrong.');
    } finally {
      setAgreementLoading(false);
    }
  };

  if (loading) return <div className="page-content" style={{ textAlign: 'center' }}><div className="spinner" /></div>;
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
      {/* ── Re-Agreement Modal Overlay ── */}
      {pendingVersion && !agreementSuccess && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
            width: '100%', maxWidth: '700px', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid var(--color-border)',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              color: 'white',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '28px' }}>📜</span>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Updated Artist Agreement</h2>
              </div>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>
                A new version of the Artist Collaboration Agreement (v{pendingVersion.versionNumber}) has been published.
                Please read and sign it to continue submitting artworks.
              </p>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
              <p className="text-xs text-muted" style={{ marginBottom: '12px' }}>
                Scroll to the bottom of the agreement to proceed.
              </p>
              <div
                ref={tcContainerRef}
                onScroll={handleTcScroll}
                style={{
                  height: '280px', overflowY: 'auto',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-md)', background: 'var(--color-bg-light)',
                  whiteSpace: 'pre-wrap', fontSize: '12px', lineHeight: 1.7,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-md)',
                }}
              >
                {pendingVersion.content}
              </div>

              {!hasScrolledToEnd && (
                <p className="text-xs" style={{ color: 'var(--color-warning)', marginBottom: 'var(--space-sm)' }}>
                  ↓ Scroll to the bottom of the agreement to enable signing
                </p>
              )}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: 'var(--space-md)',
                opacity: hasScrolledToEnd ? 1 : 0.5,
                cursor: hasScrolledToEnd ? 'pointer' : 'not-allowed',
              }}>
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={e => hasScrolledToEnd && setAgreedToTerms(e.target.checked)}
                  disabled={!hasScrolledToEnd}
                  style={{ marginTop: '3px', flexShrink: 0, width: '16px', height: '16px' }}
                />
                <span className="text-sm" style={{ lineHeight: '1.4' }}>
                  I have read, understood, and agree to the updated Artist Agreement (v{pendingVersion.versionNumber}).
                </span>
              </label>

              <div className="form-group" style={{
                marginBottom: 'var(--space-md)',
                opacity: hasScrolledToEnd && agreedToTerms ? 1 : 0.4,
                pointerEvents: hasScrolledToEnd && agreedToTerms ? 'auto' : 'none',
              }}>
                <label>Physical Signature Upload (JPG/PNG)</label>
                {signaturePreview ? (
                  <div style={{ position: 'relative', width: '200px', height: '100px', border: '1px solid var(--color-border)', borderRadius: '4px', overflow: 'hidden', background: '#fff' }}>
                    <img src={signaturePreview} alt="Signature" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <button type="button" onClick={() => { setSignatureImage(null); setSignaturePreview(''); }}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer' }}>×</button>
                  </div>
                ) : (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => signatureInputRef.current?.click()} style={{ width: 'fit-content' }}>
                    Upload Signature Image
                  </button>
                )}
                <input ref={signatureInputRef} type="file" accept="image/jpeg,image/png,image/jpg" onChange={handleSignatureChange} style={{ display: 'none' }} />
                <p className="text-xs text-muted" style={{ marginTop: '6px' }}>Upload a clear photo of your signature on white paper.</p>
              </div>

              {agreementError && (
                <div className="alert alert-error" style={{ marginBottom: 'var(--space-md)' }}>{agreementError}</div>
              )}
            </div>

            {/* Footer actions */}
            <div style={{
              padding: '20px 28px',
              borderTop: '1px solid var(--color-border)',
              background: 'var(--color-bg-light)',
              display: 'flex', gap: '12px', alignItems: 'center',
            }}>
              <button
                id="sign-agreement-btn"
                className="btn btn-primary"
                onClick={handleSignAgreement}
                disabled={agreementLoading || !hasScrolledToEnd || !agreedToTerms || !signatureImage}
              >
                {agreementLoading ? <><span className="spinner" /> Signing…</> : '✍️ Sign & Submit Agreement'}
              </button>
              <p className="text-xs text-muted">
                A signed copy will be emailed to you and saved on your profile.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Agreement success flash */}
      {agreementSuccess && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--color-bg)', borderRadius: 'var(--radius-lg)',
            padding: '48px', textAlign: 'center', maxWidth: '400px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ margin: '0 0 8px' }}>Agreement Signed!</h2>
            <p className="text-muted">Thank you. A signed copy will be emailed to you shortly.</p>
          </div>
        </div>
      )}

      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)' }}>
          <div>
            <h1 className="heading-serif" style={{ fontSize: '32px' }}>Artist Dashboard</h1>
            <p className="text-muted">Welcome back, {profile.fullName}</p>
          </div>
          {pendingVersion ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-warning)', fontWeight: 600 }}>
                ⚠️ Agreement signature required
              </span>
              <span className="btn btn-primary btn-sm" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                + Submit New Artwork
              </span>
            </div>
          ) : (
            <Link href="/artist/submit-art" className="btn btn-primary">+ Submit New Artwork</Link>
          )}
        </div>

        {/* Pending agreement banner */}
        {pendingVersion && (
          <div style={{
            background: 'linear-gradient(135deg, #7c5a00 0%, #c49200 100%)',
            color: 'white',
            padding: 'var(--space-md) var(--space-lg)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-xl)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <strong>📜 New Agreement Requires Your Signature</strong>
              <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.9 }}>
                Version {pendingVersion.versionNumber} of the Artist Collaboration Agreement has been published. 
                Please sign it to continue submitting artworks. Check the pop-up that appeared on your screen.
              </p>
            </div>
          </div>
        )}

        {/* Wallet Section */}
        <div style={{ marginBottom: 'var(--space-2xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h2 className="heading-serif" style={{ fontSize: '22px' }}>My Wallet</h2>
            <Link href="/artist/edit-profile" className="btn btn-secondary btn-sm">Manage Bank Details</Link>
          </div>

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

        {/* Art Requests */}
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
