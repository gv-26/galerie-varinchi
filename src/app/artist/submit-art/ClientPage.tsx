'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SubCategory {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  subCategories: SubCategory[];
}

interface Spec {
  id: string;
  name: string;
  options: { value: string }[];
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function SubmitArtPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Categories Dropdowns
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [subCategoryId, setSubCategoryId] = useState('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [yearCreated, setYearCreated] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [images, setImages] = useState<File[]>([]);

  // Dynamic Specifications
  const [specs, setSpecs] = useState<Spec[]>([]);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        setCategories(data);
        if (data.length > 0) {
          setCategoryId(data[0].id);
          const subs = data[0].subCategories || [];
          setSubCategories(subs);
          if (subs.length > 0) setSubCategoryId(subs[0].id);
        }
      });
  }, []);

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    const cat = categories.find(c => c.id === id);
    const subs = cat?.subCategories || [];
    setSubCategories(subs);
    setSubCategoryId(subs.length > 0 ? subs[0].id : '');
  };

  const handleFilesSelected = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    setImages(prev => [...prev, ...newFiles]);
  }, []);

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const valid = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    setImages(prev => [...prev, ...valid]);
  }, []);

  // Dynamic Spec Helpers
  const addSpec = () => {
    const id = Math.random().toString(36).substring(2, 9);
    setSpecs([...specs, { id, name: '', options: [{ value: '' }] }]);
  };
  const removeSpec = (id: string) => setSpecs(specs.filter(s => s.id !== id));
  const updateSpecName = (id: string, name: string) => setSpecs(specs.map(s => s.id === id ? { ...s, name } : s));
  const addOption = (specId: string) => setSpecs(specs.map(s => s.id === specId ? { ...s, options: [...s.options, { value: '' }] } : s));
  const updateOption = (specId: string, optIndex: number, value: string) => setSpecs(specs.map(s => {
    if (s.id !== specId) return s;
    const newOptions = [...s.options];
    newOptions[optIndex] = { value };
    return { ...s, options: newOptions };
  }));
  const removeOption = (specId: string, optIndex: number) => setSpecs(specs.map(s => s.id === specId ? { ...s, options: s.options.filter((_, i) => i !== optIndex) } : s));
  const moveOption = (specId: string, optIndex: number, direction: 'up' | 'down') => setSpecs(specs.map(s => {
    if (s.id !== specId) return s;
    const newOpts = [...s.options];
    const target = direction === 'up' ? optIndex - 1 : optIndex + 1;
    if (target < 0 || target >= newOpts.length) return s;
    [newOpts[optIndex], newOpts[target]] = [newOpts[target], newOpts[optIndex]];
    return { ...s, options: newOpts };
  }));

  const uploadToS3Presigned = async (file: File): Promise<string> => {
    const preRes = await fetch('/api/upload/presigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type || 'image/jpeg' })
    });
    if (!preRes.ok) throw new Error('Failed to get upload URL');
    const { uploadUrl, finalUrl } = await preRes.json();
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'image/jpeg' },
      body: file
    });
    if (!putRes.ok) throw new Error('Failed to upload image');
    return finalUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      setError('Please upload at least one image of the artwork');
      return;
    }
    if (!title.trim() || !description.trim() || !price) {
      setError('Please fill in title, description, and base price');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Upload images directly to S3 via presigned URLs
      const uploadedUrls: string[] = [];
      for (const img of images) {
        uploadedUrls.push(await uploadToS3Presigned(img));
      }

      // 2. Clean specifications
      const cleanedSpecs = specs.map(s => ({
        name: s.name.trim(),
        options: s.options.map(o => o.value.trim()).filter(Boolean)
      })).filter(s => s.name && s.options.length > 0);

      // 3. Submit JSON payload
      const res = await fetch('/api/artist/art-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          categoryId,
          subCategoryId,
          yearCreated,
          price: parseFloat(price),
          quantity: parseInt(quantity) || 1,
          additionalInfo,
          specifications: JSON.stringify(cleanedSpecs),
          images: uploadedUrls,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/artist/dashboard'), 2000);
      } else {
        setError(data.error || 'Failed to submit artwork');
      }
    } catch (err: any) {
      setError('An error occurred: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content fade-in">
      {/* Full screen preview modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, cursor: 'zoom-out'
          }}
        >
          <img src={previewImage} alt="Preview" style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
          <button onClick={() => setPreviewImage(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>
      )}

      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Link href="/artist/dashboard" className="text-sm text-muted">← Back to Dashboard</Link>
        </div>

        <h1 className="heading-serif" style={{ marginBottom: 'var(--space-xl)' }}>Submit New Artwork</h1>

        {success && <div className="alert alert-success">Artwork submitted for review successfully! Redirecting...</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="profile-card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label>Artwork Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Year Created *</label>
              <input type="text" value={yearCreated} onChange={e => setYearCreated(e.target.value)} placeholder="e.g. 2025" required />
            </div>
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label>Category *</label>
              <select value={categoryId} onChange={e => handleCategoryChange(e.target.value)} required>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Sub-Category *</label>
              <select value={subCategoryId} onChange={e => setSubCategoryId(e.target.value)} required disabled={subCategories.length === 0}>
                {subCategories.length === 0 && <option value="">No sub-categories</option>}
                {subCategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
            <div className="form-group">
              <label>Base Price (₹) *</label>
              <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Quantity Available *</label>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required min="1" />
            </div>
          </div>

          {/* Image Upload — folder grid style, images only */}
          <div style={{ marginTop: 'var(--space-xl)', borderTop: '1px solid var(--color-border-light)', paddingTop: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Artwork Images *</h3>
            <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-md)' }}>Upload images of your artwork (JPG, PNG, WEBP). Click any image for full-screen preview.</p>

            {images.length === 0 ? (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                style={{ border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2xl)', textAlign: 'center', cursor: 'pointer', background: 'var(--color-bg-light)' }}
              >
                <div style={{ fontSize: '32px', marginBottom: 'var(--space-sm)' }}>🖼️</div>
                <p style={{ fontWeight: 500, marginBottom: 'var(--space-xs)' }}>Click to Upload or Drag & Drop</p>
                <p className="text-xs text-muted">Images only (JPG, PNG, WEBP)</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                  {images.map((file, i) => {
                    const thumbUrl = URL.createObjectURL(file);
                    return (
                      <div key={i} style={{ position: 'relative', border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--color-bg-light)' }}>
                        <img
                          src={thumbUrl}
                          alt={file.name}
                          onClick={() => setPreviewImage(thumbUrl)}
                          style={{ width: '100%', height: '100px', objectFit: 'cover', cursor: 'zoom-in' }}
                        />
                        <div style={{ padding: '4px 8px' }}>
                          <p style={{ margin: 0, fontSize: '11px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                          <p style={{ margin: 0, fontSize: '10px', color: 'var(--color-text-secondary)' }}>{formatFileSize(file.size)}</p>
                        </div>
                        <button type="button" onClick={() => removeImage(i)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(255,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>+ Add More Images</button>
                  <span className="text-xs text-muted">{images.length} image{images.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={e => handleFilesSelected(e.target.files)}
              style={{ display: 'none' }}
            />
          </div>

          {/* Dynamic Specifications */}
          <div style={{ marginTop: 'var(--space-xl)', borderTop: '1px solid var(--color-border-light)', paddingTop: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <h3 style={{ margin: 0 }}>Product Specifications</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addSpec}>+ Add Specification</button>
            </div>
            {specs.map((spec) => (
              <div key={spec.id} className="profile-card" style={{ marginBottom: 'var(--space-md)', background: 'var(--color-bg-light)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                  <input type="text" value={spec.name} onChange={e => updateSpecName(spec.id, e.target.value)} placeholder="Specification Name (e.g., Medium, Frame)" style={{ flex: 1 }} />
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeSpec(spec.id)}>Remove</button>
                </div>
                <div style={{ paddingLeft: 'var(--space-md)' }}>
                  {spec.options.map((opt, optIdx) => (
                    <div key={optIdx} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                      <input type="text" value={opt.value} onChange={e => updateOption(spec.id, optIdx, e.target.value)} placeholder={`Option ${optIdx + 1}`} style={{ flex: 1 }} />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveOption(spec.id, optIdx, 'up')} disabled={optIdx === 0}>↑</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveOption(spec.id, optIdx, 'down')} disabled={optIdx === spec.options.length - 1}>↓</button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => removeOption(spec.id, optIdx)}>×</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => addOption(spec.id)} style={{ marginTop: 'var(--space-xs)' }}>+ Add Option</button>
                </div>
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
            <label>Additional Info</label>
            <textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} rows={3} placeholder="Any additional details about the artwork..." />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 'var(--space-md)' }}>
            {loading ? <span className="spinner"></span> : 'Submit Artwork for Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
