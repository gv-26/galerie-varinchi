'use client';

import { useState, useEffect } from 'react';
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

export default function SubmitArtPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
  const [images, setImages] = useState<FileList | null>(null);

  // Dynamic Specifications
  const [specs, setSpecs] = useState<Spec[]>([]);

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

  // Dynamic Spec Helpers
  const addSpec = () => {
    const id = Math.random().toString(36).substring(2, 9);
    setSpecs([...specs, { id, name: '', options: [{ value: '' }] }]);
  };

  const removeSpec = (id: string) => {
    setSpecs(specs.filter(s => s.id !== id));
  };

  const updateSpecName = (id: string, name: string) => {
    setSpecs(specs.map(s => s.id === id ? { ...s, name } : s));
  };

  const addOption = (specId: string) => {
    setSpecs(specs.map(s => {
      if (s.id === specId) {
        return { ...s, options: [...s.options, { value: '' }] };
      }
      return s;
    }));
  };

  const updateOption = (specId: string, optIndex: number, value: string) => {
    setSpecs(specs.map(s => {
      if (s.id === specId) {
        const newOptions = [...s.options];
        newOptions[optIndex] = { value };
        return { ...s, options: newOptions };
      }
      return s;
    }));
  };

  const removeOption = (specId: string, optIndex: number) => {
    setSpecs(specs.map(s => {
      if (s.id === specId) {
        return { ...s, options: s.options.filter((_, i) => i !== optIndex) };
      }
      return s;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!images || images.length === 0) {
      setError('Please upload at least one image of the artwork');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('categoryId', categoryId);
      formData.append('subCategoryId', subCategoryId);
      formData.append('yearCreated', yearCreated);
      formData.append('price', price);
      formData.append('quantity', quantity);
      formData.append('additionalInfo', additionalInfo);
      
      // Clean and append specifications
      const cleanedSpecs = specs.map(s => ({
        name: s.name.trim(),
        options: s.options.map(o => o.value.trim()).filter(Boolean)
      })).filter(s => s.name && s.options.length > 0);

      formData.append('specifications', JSON.stringify(cleanedSpecs));

      for (let i = 0; i < images.length; i++) {
        formData.append('images', images[i]);
      }

      const res = await fetch('/api/artist/art-requests', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/artist/dashboard'), 2000);
      } else {
        setError(data.error || 'Failed to submit artwork');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content fade-in">
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
              <label>Price *</label>
              <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Quantity Available *</label>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required />
            </div>
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
                  <input 
                    type="text" 
                    value={spec.name} 
                    onChange={e => updateSpecName(spec.id, e.target.value)} 
                    placeholder="Specification Name (e.g., Medium, Frame)" 
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeSpec(spec.id)}>Remove</button>
                </div>
                
                <div style={{ paddingLeft: 'var(--space-md)' }}>
                  {spec.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        value={opt.value} 
                        onChange={e => updateOption(spec.id, oIndex, e.target.value)} 
                        placeholder="Option Value (e.g., Oil, Canvas, A3)" 
                        style={{ flex: 1, padding: '6px' }}
                      />
                      <button type="button" onClick={() => removeOption(spec.id, oIndex)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => addOption(spec.id)} style={{ padding: '4px 8px', fontSize: '12px' }}>+ Add Option</button>
                </div>
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginTop: 'var(--space-xl)' }}>
            <label>Upload Artwork Images * (Multiple allowed)</label>
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e => setImages(e.target.files)} required />
          </div>

          <div className="form-group">
            <label>Additional Information</label>
            <textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} rows={3} placeholder="Any other details for the admin..." />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ marginTop: 'var(--space-md)' }}>
            {loading ? <span className="spinner"></span> : 'Submit Request to Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}
