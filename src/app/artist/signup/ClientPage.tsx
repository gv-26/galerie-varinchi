'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import jsPDF from 'jspdf';
import { resizeImage } from '@/lib/image-utils';

const ARTIST_AGREEMENT_VERSION = 'v1.0';
const ARTIST_AGREEMENT_TEXT = `GALERIE VARINCHI — ARTIST COLLABORATION TERMS AND CONDITIONS

Effective Date: April 3, 2026
Version ${ARTIST_AGREEMENT_VERSION}

These Terms and Conditions govern the collaboration between Galerie Varinchi ("the Platform") and the Artist whose artworks are licensed for reproduction and sale through the Galerie Varinchi platform. By entering into collaboration with Galerie Varinchi, the Artist agrees to the following terms.

1. DEFINITIONS

Artist: The creator and copyright holder of the artwork licensed to Galerie Varinchi.
Artwork: Any digital artwork, illustration, painting, photograph, or visual work submitted by the Artist for reproduction and sale.
Artist Base Value (X): The original price assigned to the artwork by the Artist.
Retail Price (Y): The final selling price of the artwork to customers, excluding Goods and Services Tax (GST).
Net Revenue: The retail selling price excluding GST.

2. NATURE OF COLLABORATION

The Artist grants Galerie Varinchi a non-exclusive license to reproduce selected artworks as curated prints and sell them through the Galerie Varinchi platform. This collaboration allows the Artist to monetize their artwork while Galerie Varinchi manages production, logistics, and sales operations.

3. OWNERSHIP & COPYRIGHT

All artworks remain the intellectual property of the Artist. The Artist retains:
- Full copyright ownership
- Moral rights associated with the artwork
- The right to sell original artworks
- The right to license the artwork to other parties

Galerie Varinchi receives only the limited rights necessary to reproduce and sell prints of the artwork under the agreed licensing terms.

Exclusions: Some prints are made under special request exclusively for Galerie Varinchi and will be sold as limited edition prints. They will be exclusive, sold limited in numbers, and should not be available through any other channels to maintain uniqueness.

4. LICENSING RIGHTS

The Artist grants Galerie Varinchi the right to:
- Reproduce the artwork as printed editions
- Display the artwork on the Galerie Varinchi website and marketing materials
- Sell the printed artwork to customers through official Galerie Varinchi sales channels

This license is non-exclusive, meaning the Artist may continue to sell or license the artwork elsewhere. However, some selected limited edition prints released through the platform may be exclusive to Galerie Varinchi and will not be made available for sale through other channels.

5. USAGE LIMITATIONS

5.1 Print Reproduction Only: The artwork may be reproduced only for the purpose of producing and selling art prints through the Galerie Varinchi platform. The artwork will not be used for merchandise such as clothing or home decor unrelated to prints without explicit written permission.
5.2 No Unauthorized Modification: Galerie Varinchi will not alter the artwork in a manner that changes its artistic integrity. Permitted adjustments include resizing, color correction for print accuracy, and cropping for standard ratios.
5.3 No Third-Party Licensing: Galerie Varinchi will not sublicense or distribute the artwork to third-party marketplaces without the Artist's written consent.
5.4 Marketing Use: Galerie Varinchi may use the artwork images for website display, social media, and marketing campaigns to promote the artwork and the platform.

6. ROYALTY STRUCTURE

6.1 Digital Artworks (Art print reproduction)
Royalty payments are calculated based on Net Revenue (Retail Price excluding GST).
Artist Base Value (X): Decided by Artist during submission. Final listing price is determined by Galerie Varinchi (adding framing, packaging, shipping, margin, etc.).

Phase 1 — Initial Royalty Recovery: For each sale, the Artist receives 33% of Net Revenue (excluding GST). This continues until total royalty paid equals the Artist Base Value (X).
Phase 2 — Ongoing Royalty: Once cumulative royalties reach the Artist Base Value (X), the Artist will receive 7% of Net Revenue (excluding GST) for as long as the artwork remains available.

6.2 Handmade Artworks (Single piece)
Artist Base Value (X) decided by the Artist will be paid upon sale. Product photoshoot must be done before listing; product must be handed over to Galerie Varinchi for Photoshoot.

6.3 Payment Schedule
Royalty payout is done monthly. It takes up to 18 days for royalty to be credited to the Artist’s wallet after each sale (to account for the return window). If a return occurs, the royalty for that particular sale will be cancelled.

7. PRODUCTION & FULFILMENT

Galerie Varinchi manages the entire process: fine art printing, framing, packaging, order processing, shipping, and customer support. Artists are not required to manage operational aspects of fulfilment.

8. SALES REPORTING & PAYMENTS

Galerie Varinchi will maintain records of all artwork sales. Artists will receive periodic royalty statements and payments according to the agreed payment cycle.

9. ARTIST RESPONSIBILITIES

The Artist agrees to:
- Provide high-resolution artwork files suitable for printing.
- Confirm they hold full rights to the artwork and do not infringe on third-party copyrights.
- Provide accurate information regarding the artwork.
The Artist is responsible for any legal claims arising from ownership disputes.

10. QUALITY & FILE REQUIREMENTS

Artists must provide files suitable for professional printing (high-resolution, correct color profiles, adequate dimensions). Galerie Varinchi may request revised files if standards are not met.

11. ARTIST PROMOTION

Promotion of Artists will be done by Galerie Varinchi through web and social channels. Artist grants permission for using their photographs, bio, and process videos/photos for promotional purposes.

12. ARTIST EXIT POLICY

An Artist may terminate collaboration with written notice. Upon termination:
- The Artist's profile may be removed.
- No new listings will be created.
- Existing orders placed prior to termination will be fulfilled.

13. ARTWORK WITHDRAWAL POLICY

Artists may request removal of specific artworks. Withdrawal stops new sales, but existing orders will be fulfilled. Previously sold artworks remain valid collectible prints.

14. PLATFORM RIGHTS TO REMOVE ARTWORK

Galerie Varinchi reserves the right to remove artwork for legal violations, copyright disputes, or failure to meet platform standards.

15. LIMITATION OF LIABILITY

Galerie Varinchi is not liable for market performance, sales volume, or external disruptions affecting production/shipping.

16. AMENDMENTS TO TERMS

Galerie Varinchi may update these Terms when necessary. Artists will be notified of significant changes.

17. GOVERNING LAW

These Terms shall be governed by the laws of India. Any disputes shall fall under the jurisdiction of the appropriate courts in India.

By checking the box below, typing your full legal name, and submitting this form, you acknowledge that you have read, understood, and agree to be bound by the terms and conditions of this Artist Collaboration Agreement.
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
