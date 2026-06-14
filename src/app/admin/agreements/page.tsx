'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface AgreementVersion {
  id: string;
  versionNumber: string;
  title: string;
  content: string;
  pdfUrl: string | null;
  isActive: boolean;
  notifyArtists: boolean;
  publishedAt: string | null;
  createdAt: string;
}

function suggestNextVersion(versions: AgreementVersion[]): string {
  if (versions.length === 0) return '1.0';
  const latest = versions[0].versionNumber;
  const parts = latest.split('.');
  if (parts.length >= 2) {
    const minor = parseInt(parts[1], 10);
    return `${parts[0]}.${minor + 1}`;
  }
  return `${parseFloat(latest) + 0.1}`;
}

export default function AdminAgreementsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [versions, setVersions] = useState<AgreementVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [previewVersion, setPreviewVersion] = useState<AgreementVersion | null>(null);

  // New version form
  const [showForm, setShowForm] = useState(false);
  const [formVersionNumber, setFormVersionNumber] = useState('');
  const [formTitle, setFormTitle] = useState('Artist Collaboration Agreement');
  const [formContent, setFormContent] = useState('');
  const [formPdfFile, setFormPdfFile] = useState<File | null>(null);
  const [formNotify, setFormNotify] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push('/auth/signin');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.isAdmin) fetchVersions();
  }, [user]);

  const fetchVersions = async () => {
    setLoadingVersions(true);
    try {
      const res = await fetch('/api/admin/agreements', { cache: 'no-store' });
      const data = await res.json();
      setVersions(data.versions || []);
    } catch {
      // ignore
    } finally {
      setLoadingVersions(false);
    }
  };

  const openForm = () => {
    const next = suggestNextVersion(versions);
    setFormVersionNumber(next);
    // Pre-fill with active version content
    const active = versions.find(v => v.isActive);
    setFormContent(active?.content || '');
    setFormError('');
    setFormSuccess('');
    setShowForm(true);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVersionNumber.trim() || !formContent.trim()) {
      setFormError('Version number and agreement text are required.');
      return;
    }
    setFormLoading(true);
    setFormError('');
    try {
      let pdfUrl = null;
      if (formPdfFile) {
        const ext = formPdfFile.name.split('.').pop() || 'pdf';
        const filename = `agreement-${formVersionNumber}-${Date.now()}.${ext}`;
        const preRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, contentType: formPdfFile.type || 'application/pdf' })
        });
        if (!preRes.ok) throw new Error('Failed to get upload URL');
        const { uploadUrl, finalUrl } = await preRes.json();
        
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': formPdfFile.type || 'application/pdf' },
          body: formPdfFile
        });
        if (!putRes.ok) throw new Error('Failed to upload PDF');
        pdfUrl = finalUrl;
      }

      const res = await fetch('/api/admin/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionNumber: formVersionNumber.trim(),
          title: formTitle.trim(),
          content: formContent,
          pdfUrl,
          notifyArtists: formNotify,
        }),
      });
      if (res.ok) {
        setFormSuccess(`Version ${formVersionNumber} published successfully!${formNotify ? ' Notification emails are being sent to all artists.' : ''}`);
        setShowForm(false);
        fetchVersions();
      } else {
        const data = await res.json();
        setFormError(data.error || 'Failed to publish agreement.');
      }
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  if (authLoading || !user?.isAdmin) {
    return <div className="page-content" style={{ textAlign: 'center' }}><div className="spinner" /></div>;
  }

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '900px' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <Link href="/admin" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '13px' }}>
            ← Admin Dashboard
          </Link>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2xl)' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px' }}>Artist Agreement</h1>
            <p className="text-muted" style={{ marginTop: '6px' }}>
              Manage agreement versions. The active version is shown to all artists during signup and must be re-signed when updated.
            </p>
          </div>
          {!showForm && (
            <button
              id="new-agreement-btn"
              className="btn btn-primary"
              onClick={openForm}
              style={{ whiteSpace: 'nowrap' }}
            >
              + New Version
            </button>
          )}
        </div>

        {formSuccess && (
          <div className="alert alert-success" style={{ marginBottom: 'var(--space-xl)' }}>
            ✅ {formSuccess}
          </div>
        )}

        {/* New Version Form */}
        {showForm && (
          <div className="profile-card" style={{ marginBottom: 'var(--space-2xl)', border: '2px solid var(--color-accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>📝 Publish New Agreement Version</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Version Number</label>
                  <input
                    type="text"
                    value={formVersionNumber}
                    onChange={e => setFormVersionNumber(e.target.value)}
                    placeholder="e.g. 1.1"
                    required
                  />
                  <p className="text-xs text-muted" style={{ marginTop: '4px' }}>Auto-suggested based on previous version.</p>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Agreement Title</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="Artist Collaboration Agreement"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Reference PDF (Optional)</label>
                <p className="text-xs text-muted" style={{ marginBottom: '8px' }}>
                  Upload a PDF version of the agreement for record-keeping.
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => setFormPdfFile(e.target.files?.[0] || null)}
                  style={{
                    padding: '8px 12px',
                    border: '1px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    width: '100%',
                    background: 'var(--color-bg-light)',
                  }}
                />
              </div>

              <div className="form-group">
                <label>Agreement Text</label>
                <p className="text-xs text-muted" style={{ marginBottom: '8px' }}>
                  The full text of the agreement. Artists will see this in a scrollable area, and it will be used to generate their signed PDF.
                </p>
                <textarea
                  ref={textareaRef}
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  rows={20}
                  required
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    lineHeight: 1.7,
                    resize: 'vertical',
                    background: 'var(--color-bg-light)',
                  }}
                  placeholder="Paste or type the full agreement text here..."
                />
                <p className="text-xs text-muted" style={{ marginTop: '4px' }}>
                  {formContent.length} characters · {formContent.split('\n').length} lines
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-md)',
                background: 'var(--color-bg-light)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-xl)',
                border: '1px solid var(--color-border)',
              }}>
                <input
                  id="notify-artists-check"
                  type="checkbox"
                  checked={formNotify}
                  onChange={e => setFormNotify(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                />
                <label htmlFor="notify-artists-check" style={{ cursor: 'pointer', margin: 0 }}>
                  <strong>Notify existing artists</strong>
                  <p className="text-xs text-muted" style={{ margin: '2px 0 0' }}>
                    When checked, all approved artists will receive an email asking them to re-read and sign the new agreement. 
                    They will also see a pop-up on their dashboard and will be blocked from submitting artworks until they sign.
                  </p>
                </label>
              </div>

              {formError && (
                <div className="alert alert-error" style={{ marginBottom: 'var(--space-md)' }}>{formError}</div>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                >
                  {formLoading ? <><span className="spinner" /> Publishing…</> : '🚀 Publish & Activate'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                  disabled={formLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Version History */}
        <div className="profile-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Version History</h2>
            <span className="text-xs text-muted">Newest first · {versions.length} version{versions.length !== 1 ? 's' : ''}</span>
          </div>

          {loadingVersions ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}><div className="spinner" /></div>
          ) : versions.length === 0 ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
              <p style={{ fontSize: '40px', marginBottom: '12px' }}>📜</p>
              <p className="text-muted">No agreement versions yet.</p>
              <button className="btn btn-primary btn-sm" onClick={openForm} style={{ marginTop: '12px' }}>
                Create First Version
              </button>
            </div>
          ) : (
            <div>
              {versions.map((v, idx) => (
                <div
                  key={v.id}
                  style={{
                    padding: 'var(--space-lg)',
                    borderBottom: idx < versions.length - 1 ? '1px solid var(--color-border)' : 'none',
                    background: v.isActive ? 'rgba(var(--color-accent-rgb, 100,80,60), 0.04)' : 'transparent',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '16px' }}>v{v.versionNumber}</span>
                          {v.isActive && (
                            <span style={{
                              fontSize: '11px', fontWeight: 700, padding: '2px 10px',
                              borderRadius: '20px', letterSpacing: '0.5px',
                              background: 'var(--color-accent)', color: 'white',
                            }}>
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                          {v.title}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {v.isActive && v.publishedAt
                            ? `Published ${new Date(v.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
                            : `Created ${new Date(v.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                          {' · '}{v.content.length.toLocaleString()} characters
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setPreviewVersion(previewVersion?.id === v.id ? null : v)}
                      >
                        {previewVersion?.id === v.id ? '▲ Hide' : '👁 Preview'}
                      </button>
                      {v.pdfUrl && (
                        <a href={v.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                          📄 Reference PDF
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Preview panel */}
                  {previewVersion?.id === v.id && (
                    <div style={{
                      marginTop: 'var(--space-md)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        padding: '10px 16px',
                        background: 'var(--color-bg-light)',
                        borderBottom: '1px solid var(--color-border)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                      }}>
                        Agreement Text — v{v.versionNumber}
                      </div>
                      <pre style={{
                        margin: 0,
                        padding: 'var(--space-md)',
                        fontSize: '12px',
                        lineHeight: 1.7,
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        background: 'var(--color-bg)',
                      }}>
                        {v.content}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
