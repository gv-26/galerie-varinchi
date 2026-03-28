'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import jsPDF from 'jspdf';
import { resizeImage } from '@/lib/image-utils';

const ARTIST_AGREEMENT_VERSION = 'v1.0';
const ARTIST_AGREEMENT_TEXT = `ARTIST AGREEMENT — GALERIE VARINCHI

Version ${ARTIST_AGREEMENT_VERSION}
Effective Date: Upon Acceptance

This Artist Agreement ("Agreement") is entered into between Galerie Varinchi ("Gallery", "We", "Us") and the undersigned Artist ("Artist", "You") upon acceptance of these terms.

1. SCOPE OF AGREEMENT
By submitting your application to join Galerie Varinchi as an Artist, you agree to abide by the terms and conditions set forth in this Agreement. This Agreement governs the listing, sale, and promotion of your artworks through our platform.

2. COMMISSION STRUCTURE
2.1 The Gallery shall retain a commission of 20% (twenty percent) on each sale of Artist's work through the platform.
2.2 The remaining 80% (eighty percent) of the sale price shall be remitted to the Artist within 14 business days of the completed transaction.
2.3 The Gallery reserves the right to modify commission rates with a 30-day written notice to the Artist.

3. ARTWORK SUBMISSIONS
3.1 All artworks submitted must be original works created by the Artist.
3.2 The Artist warrants that they have full legal rights to sell and distribute the submitted works.
3.3 The Gallery reserves the right to approve or decline any artwork submission at its sole discretion.
3.4 Submitted artwork images become part of the Gallery's catalogue for promotional purposes.

4. LICENSING AND USAGE RIGHTS
4.1 The Artist grants the Gallery a non-exclusive, worldwide license to display, reproduce, and promote the submitted artworks for the purpose of marketing and sales.
4.2 This license extends to digital and print media, including but not limited to the Gallery website, social media, newsletters, and physical catalogues.
4.3 The Artist retains all intellectual property rights to their original works.

5. PROPRIETARY RIGHTS
5.1 All platform-related intellectual property, including but not limited to the Gallery's branding, website design, marketing materials, and proprietary technology, remain the exclusive property of Galerie Varinchi.
5.2 The Artist shall not replicate, distribute, or use the Gallery's proprietary materials without prior written consent.

6. PRICING AND PAYMENTS
6.1 The Artist may suggest pricing for their works, subject to Gallery approval.
6.2 The Gallery may adjust pricing for promotional campaigns with prior notice to the Artist.
6.3 Payments shall be processed via bank transfer or other mutually agreed-upon methods.
6.4 The Artist is responsible for any applicable taxes on their earnings.

7. SHIPPING AND FULFILLMENT
7.1 The Artist is responsible for securely packaging artworks for shipment.
7.2 Shipping costs may be borne by the buyer, the Artist, or shared, as determined by the listing terms.
7.3 The Artist must ship artworks within 5 business days of order confirmation.

8. RETURNS AND DISPUTES
8.1 Returns due to damage during shipping shall be resolved between the Artist and the Gallery.
8.2 If an artwork is returned due to quality discrepancy, the Artist shall bear the return shipping cost.
8.3 The Gallery shall mediate disputes between Artists and buyers in good faith.

9. TERMINATION
9.1 Either party may terminate this Agreement with 30 days' written notice.
9.2 Upon termination, active orders shall be fulfilled, and pending payments settled within 30 days.
9.3 The Gallery may immediately terminate this Agreement if the Artist violates any terms herein.

10. LIMITATION OF LIABILITY
10.1 The Gallery shall not be liable for indirect, incidental, or consequential damages arising from the Artist's use of the platform.
10.2 The Gallery's total liability shall not exceed the total commissions earned by the Gallery from the Artist's sales in the preceding 12 months.

11. DISPUTE RESOLUTION
11.1 Any disputes arising from this Agreement shall be resolved through good-faith negotiation.
11.2 If negotiation fails, disputes shall be submitted to binding arbitration in accordance with the laws of India.
11.3 The jurisdiction for any legal proceedings shall be Bangalore, Karnataka, India.

12. AMENDMENTS
12.1 The Gallery reserves the right to modify these terms with 30 days' notice to the Artist.
12.2 Continued use of the platform after amendments indicates acceptance of the modified terms.

13. ENTIRE AGREEMENT
This Agreement, along with any annexures or addenda, constitutes the entire agreement between the parties and supersedes all prior agreements, representations, and understandings.

By checking the box below, typing your full legal name, and submitting this form, you acknowledge that you have read, understood, and agree to be bound by the terms and conditions of this Artist Agreement.

Contact: galerievarinchi@gmail.com | +91 72596 44702
`;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ArtistSignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'details' | 'otp'>('details');

  // Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [area, setArea] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [bio, setBio] = useState('');
  const [specialization, setSpecialization] = useState('');

  // Profile photo
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const profilePhotoRef = useRef<HTMLInputElement>(null);

  // Multi-file upload state (File[] for append behavior)
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fullscreen preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // T&C state
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [digitalSignature, setDigitalSignature] = useState('');
  const [userIp, setUserIp] = useState('');
  const tcContainerRef = useRef<HTMLDivElement>(null);

  // OTP
  const [otp, setOtp] = useState('');

  // Fetch user IP on mount
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(data => setUserIp(data.ip || ''))
      .catch(() => setUserIp('unknown'));
  }, []);

  // --- Multi-file upload handlers ---
  const handleFilesSelected = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newFiles = Array.from(selectedFiles);
    const combined = [...files, ...newFiles];

    const totalSize = combined.reduce((sum, f) => sum + f.size, 0);
    const maxBytes = 20 * 1024 * 1024;
    if (totalSize > maxBytes) {
      setError('Total file size exceeds 20MB limit.');
      return;
    }
    setError('');
    setFiles(combined);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFilesSelected(e.dataTransfer.files);
  }, [files]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const totalFileSize = files.reduce((sum, f) => sum + f.size, 0);

  // --- T&C scroll handler ---
  const handleTcScroll = () => {
    const el = tcContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    if (atBottom) setHasScrolledToEnd(true);
  };

  const signatureMatches = digitalSignature.trim().toLowerCase() === fullName.trim().toLowerCase();

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      try {
        const finalFile = await resizeImage(file);
        setProfilePhoto(finalFile);
        const url = URL.createObjectURL(finalFile);
        setProfilePhotoPreview(url);
        setError('');
      } catch (err) {
        setError('Failed to process image. Please try another one.');
      } finally {
        setLoading(false);
      }
    }
  };

  const getMissingFields = () => {
    const missing: string[] = [];
    if (!fullName.trim()) missing.push('Full Name');
    if (!email.trim()) missing.push('Email Address');
    if (!phone.trim()) missing.push('Phone Number');
    if (!password || password.length < 6) missing.push('Password (min 6 characters)');
    if (password !== confirmPassword) missing.push('Passwords must match');
    if (!country.trim()) missing.push('Country');
    if (!state.trim()) missing.push('State');
    if (!area.trim()) missing.push('Area');
    if (!portfolioLink.trim()) missing.push('Portfolio Link');
    if (!specialization.trim()) missing.push('Art Specialization');
    if (!bio.trim()) missing.push('Artist Bio');
    if (files.length === 0) missing.push('Example Artworks (at least one file)');
    if (!hasScrolledToEnd) missing.push('Read the full Artist Agreement (scroll to the bottom)');
    if (!agreedToTerms) missing.push('Agree to the Artist Agreement');
    if (!digitalSignature.trim()) missing.push('Digital Signature');
    else if (!signatureMatches) missing.push('Digital Signature must match your Full Name');
    return missing;
  };

  const canSubmit = getMissingFields().length === 0;

  // --- Download agreement as PDF (print-friendly) ---
  const handleDownloadAgreement = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Artist Agreement - Galerie Varinchi</title>
      <style>body { font-family: 'Georgia', serif; max-width: 700px; margin: 40px auto; padding: 20px; line-height: 1.8; color: #222; white-space: pre-wrap; } h1 { text-align: center; font-size: 20px; }</style>
      </head><body>${ARTIST_AGREEMENT_TEXT.replace(/\n/g, '<br/>')}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = getMissingFields();
    if (missing.length > 0) {
      setError('Please complete the following: ' + missing.join(', '));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Send OTP to email — works for both new and existing users
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setStep('otp');
      } else {
        setError(data.error || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Verify OTP and create user account
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password, isSignup: true }),
      });

      let verifyData;
      const verifyText = await verifyRes.text();
      try { verifyData = JSON.parse(verifyText); } catch { verifyData = { error: verifyText }; }
      
      if (!verifyRes.ok) {
        setError(verifyData.error || 'Invalid or expired OTP');
        setLoading(false);
        return;
      }

      // Helper to upload a file to S3 via Presigned URL
      const uploadToS3Presigned = async (file: File) => {
        const preRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' })
        });
        if (!preRes.ok) throw new Error('Failed to get upload URL');
        const { uploadUrl, finalUrl } = await preRes.json();
        
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file
        });
        if (!putRes.ok) throw new Error('Failed to upload file to S3');
        return finalUrl;
      };

      // 2. Generate PDF of the Agreement
      let agreementPdfUrl = null;
      try {
        const doc = new jsPDF({ format: 'a4', unit: 'pt' });
        const margin = 40;
        const pageWidth = doc.internal.pageSize.getWidth();
        const textWidth = pageWidth - margin * 2;
        
        let y = margin;
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('GALERIE VARINCHI', pageWidth / 2, y, { align: 'center' });
        y += 30;
        doc.setFontSize(16);
        doc.text('ARTIST AGREEMENT', pageWidth / 2, y, { align: 'center' });
        y += 40;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        // Auto-wrap the long text
        const lines = doc.splitTextToSize(ARTIST_AGREEMENT_TEXT, textWidth);
        for (const line of lines) {
          if (y > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += 14;
        }
        
        y += 40;
        if (y > doc.internal.pageSize.getHeight() - 100) {
          doc.addPage();
          y = margin;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('AGREEMENT SIGNATURE', margin, y);
        y += 20;
        doc.setFont('helvetica', 'normal');
        doc.text(`Digital Signature: ${digitalSignature}`, margin, y);
        y += 20;
        doc.text(`Date & Time: ${new Date().toLocaleString()}`, margin, y);
        y += 20;
        doc.text(`IP Address: ${userIp}`, margin, y);
        
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], `agreement-${Date.now()}.pdf`, { type: 'application/pdf' });
        agreementPdfUrl = await uploadToS3Presigned(pdfFile);
      } catch (pdfErr) {
        console.error('Failed to generate or upload PDF', pdfErr);
      }

      // 3. Upload Profile Photo directly to S3
      let profilePhotoUrl = null;
      if (profilePhoto) {
        profilePhotoUrl = await uploadToS3Presigned(profilePhoto);
      }

      const examplesUrls: string[] = [];
      for (const file of files) {
        examplesUrls.push(await uploadToS3Presigned(file));
      }

      // 4. Submit artist application data as JSON
      const applyPayload = {
        fullName, email, phone, country, state, area, portfolioLink, bio, specialization,
        agreementTimestamp: new Date().toISOString(),
        agreementIp: userIp,
        agreementVersion: ARTIST_AGREEMENT_VERSION,
        profilePhotoUrl,
        agreementPdfUrl,
        examples: examplesUrls
      };

      const applyRes = await fetch('/api/artist/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applyPayload)
      });

      let applyData;
      const applyText = await applyRes.text();
      try { applyData = JSON.parse(applyText); } catch { applyData = { error: applyText }; }

      if (applyRes.ok) {
        window.location.href = '/artist/dashboard';
      } else {
        let errMsg = applyData?.error;
        if (!errMsg || errMsg.trim() === '') {
          errMsg = `HTTP ${applyRes.status} ${applyRes.statusText || 'Error'}`;
        } else {
          errMsg = `Failed to submit artist profile: ${errMsg}`;
        }
        console.error('API Error:', errMsg);
        setError(errMsg.substring(0, 150));
      }
    } catch (err: any) {
      console.error('Submit Error:', err);
      setError('An error occurred: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '700px' }}>
        <h1 className="heading-serif" style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
          Sign up as an Artist
        </h1>
        <p className="text-center text-muted" style={{ marginBottom: 'var(--space-2xl)' }}>
          Onboard into Galerie Varinchi to list and showcase your creations
        </p>

        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-md)' }}>{error}</div>}

        {step === 'details' ? (
          <form onSubmit={handleSendOtp}>
            {/* Profile Photo */}
            <div className="profile-card" style={{ textAlign: 'center' }}>
              <h3>Profile Photo</h3>
              <div
                onClick={() => profilePhotoRef.current?.click()}
                style={{
                  width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto var(--space-md)',
                  border: '3px dashed var(--color-border)', cursor: 'pointer', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: profilePhotoPreview ? 'transparent' : 'var(--color-bg-light)',
                }}
              >
                {profilePhotoPreview ? (
                  <img src={profilePhotoPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '32px' }}>📷</span>
                )}
              </div>
              <p className="text-xs text-muted">Click to upload a profile photo<br/><small>(Images {'>'} 3MB will be automatically resized)</small></p>
              <input ref={profilePhotoRef} type="file" accept="image/*" onChange={handleProfilePhotoChange} style={{ display: 'none' }} />
            </div>

            {/* Personal & Contact Info */}
            <div className="profile-card">
              <h3>Personal & Contact Info</h3>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full Name" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone Number" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-secondary)' }}>{showPassword ? 'Hide' : 'Show'}</button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" minLength={6} />
                  {confirmPassword && password !== confirmPassword && <small style={{ color: 'var(--color-error)' }}>Passwords don&apos;t match</small>}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="profile-card">
              <h3>Location</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label>Country</label>
                  <input type="text" value={country} onChange={e => setCountry(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input type="text" value={state} onChange={e => setState(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Area</label>
                  <input type="text" value={area} onChange={e => setArea(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Artist Details */}
            <div className="profile-card">
              <h3>Artist Details</h3>
              <div className="form-group">
                <label>Portfolio Link (Socials / URL)</label>
                <input type="url" value={portfolioLink} onChange={e => setPortfolioLink(e.target.value)} placeholder="https://" />
              </div>
              <div className="form-group">
                <label>Art Specialization</label>
                <input type="text" value={specialization} onChange={e => setSpecialization(e.target.value)} placeholder="e.g. Mixed Media, Oil on canvas" />
              </div>
              <div className="form-group">
                <label>Artist Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="Tell us about yourself and your artistic background" />
              </div>
            </div>

            {/* Multi-File Upload */}
            <div className="profile-card">
              <h3>Example Artworks</h3>
              <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-md)' }}>Upload PDFs, Images, or Videos proving previous work. (Combined max 20MB)</p>

              {files.length === 0 ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-2xl)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--color-bg-light)',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: 'var(--space-sm)' }}>📁</div>
                  <p style={{ fontWeight: 500, marginBottom: 'var(--space-xs)' }}>Click to Upload or Drag & Drop</p>
                  <p className="text-xs text-muted">Images, PDFs, Videos (max 20MB total)</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                    {files.map((file, i) => {
                      const isImage = file.type.startsWith('image/');
                      const thumbUrl = isImage ? URL.createObjectURL(file) : '';
                      return (
                        <div key={i} style={{
                          position: 'relative',
                          border: '1px solid var(--color-border-light)',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          background: 'var(--color-bg-light)',
                        }}>
                          {isImage ? (
                            <img src={thumbUrl} alt={file.name} onClick={() => setPreviewImage(thumbUrl)} style={{ width: '100%', height: '100px', objectFit: 'cover', cursor: 'pointer' }} />
                          ) : (
                            <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>📄</div>
                          )}
                          <div style={{ padding: '4px 8px' }}>
                            <p style={{ margin: 0, fontSize: '11px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                            <p style={{ margin: 0, fontSize: '10px', color: 'var(--color-text-secondary)' }}>{formatFileSize(file.size)}</p>
                          </div>
                          <button type="button" onClick={() => removeFile(i)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(255,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      + Add More Files
                    </button>
                    <span className="text-xs text-muted">
                      {files.length} file{files.length !== 1 ? 's' : ''} · {formatFileSize(totalFileSize)} / 20 MB
                    </span>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,video/*"
                onChange={e => handleFilesSelected(e.target.files)}
                style={{ display: 'none' }}
              />
            </div>

            {/* Terms & Conditions */}
            <div className="profile-card">
              <h3>Artist Agreement</h3>
              <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-md)' }}>Please read the full agreement below. You must scroll to the bottom to proceed.</p>

              <div
                ref={tcContainerRef}
                onScroll={handleTcScroll}
                style={{
                  height: '300px',
                  overflowY: 'auto',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-md)',
                  background: 'var(--color-bg-light)',
                  whiteSpace: 'pre-wrap',
                  fontSize: '12px',
                  lineHeight: 1.7,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-md)',
                }}
              >
                {ARTIST_AGREEMENT_TEXT}
              </div>

              {!hasScrolledToEnd && (
                <p className="text-xs" style={{ color: 'var(--color-warning)', marginBottom: 'var(--space-sm)' }}>
                  ↓ Please scroll to the bottom of the agreement to continue
                </p>
              )}

              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-md)',
                opacity: hasScrolledToEnd ? 1 : 0.5,
                cursor: hasScrolledToEnd ? 'pointer' : 'not-allowed',
              }}>
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={e => hasScrolledToEnd && setAgreedToTerms(e.target.checked)}
                  disabled={!hasScrolledToEnd}
                  style={{ marginTop: '3px' }}
                />
                <span className="text-sm">
                  I have read, understood, and agree to the commission splits, licensing terms, and proprietary rights outlined in the Artist Agreement.
                </span>
              </label>

              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label>Digital Signature (Type your Full Legal Name)</label>
                <input
                  type="text"
                  value={digitalSignature}
                  onChange={e => setDigitalSignature(e.target.value)}
                  placeholder="Type your full name exactly as entered above"
                  disabled={!hasScrolledToEnd || !agreedToTerms}
                  style={{
                    fontStyle: 'italic',
                    fontFamily: "'Georgia', serif",
                    fontSize: '16px',
                    opacity: hasScrolledToEnd && agreedToTerms ? 1 : 0.5,
                  }}
                />
                {digitalSignature && !signatureMatches && (
                  <small style={{ color: 'var(--color-error)' }}>Signature must match the Full Name field above</small>
                )}
                {digitalSignature && signatureMatches && (
                  <small style={{ color: 'var(--color-success)' }}>✓ Signature matches</small>
                )}
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleDownloadAgreement}
                style={{ fontSize: '12px' }}
              >
                📥 Download Agreement as PDF
              </button>
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={loading || !canSubmit} style={{ marginTop: 'var(--space-md)' }}>
              {loading ? <span className="spinner"></span> : 'Submit & Verify Email'}
            </button>
            {!canSubmit && fullName && email && (
              <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 'var(--space-sm)' }}>
                Complete all fields, upload files, and agree to the terms to continue
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyAndSubmit} className="profile-card">
            <h3>Verify your Email</h3>
            <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-md)' }}>We sent a verification code to {email}</p>
            <div className="form-group">
              <label htmlFor="otp">Verification Code</label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                required
                style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '8px' }}
              />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Verify & Submit Profile'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-full"
              onClick={() => { setStep('details'); setOtp(''); setError(''); }}
              style={{ marginTop: 'var(--space-sm)' }}
            >
              Back to Details
            </button>
          </form>
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
