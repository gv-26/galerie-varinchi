'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { Suspense } from 'react';

interface SubCategory {
  id: string;
  name: string;
}
interface Category {
  id: string;
  name: string;
  subCategories: SubCategory[];
}

interface SpecOption {
  value: string;
}

interface Specification {
  id: string;
  name: string;
  options: SpecOption[];
}

function AddProductContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('requestId');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Image Upload
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [basePrice, setBasePrice] = useState('');

  // Dynamic Specifications
  const [specs, setSpecs] = useState<Specification[]>([]);

  // Prices combination
  const [prices, setPrices] = useState<Record<string, string>>({});

  // Units
  const [hasUnits, setHasUnits] = useState(false);
  const [unitsAvailable, setUnitsAvailable] = useState('');

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(data => {
      setCategories(data);
      if (data.length > 0 && !requestId) {
        setCategoryId(data[0].id);
        setSubCategories(data[0].subCategories);
        if (data[0].subCategories.length > 0) setSubCategoryId(data[0].subCategories[0].id);
      }
    });
  }, [requestId]);

  useEffect(() => {
    if (!requestId || categories.length === 0) return;

    fetch(`/api/admin/artwork-requests/${requestId}`)
      .then(res => res.json())
      .then(data => {
        if (data.request) {
          const req = data.request;
          setTitle(req.title);
          setDescription(req.description);
          setBasePrice(req.price.toString());
          setUnitsAvailable(req.quantity.toString());
          setHasUnits(req.quantity > 0);
          
          setCategoryId(req.categoryId);
          const cat = categories.find(c => c.id === req.categoryId);
          if (cat) {
            setSubCategories(cat.subCategories || []);
            setSubCategoryId(req.subCategoryId);
          }

          const parsedSpecs = JSON.parse(req.specifications || '[]');
          setSpecs(parsedSpecs.map((s: any) => ({
            id: Math.random().toString(36).substring(2, 9),
            name: s.name,
            options: s.options.map((o: string) => ({ value: o }))
          })));

          const parsedImages = JSON.parse(req.images || '[]');
          setImages(parsedImages);
        }
      });
  }, [requestId, categories]);

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    const cat = categories.find(c => c.id === id);
    const subs = cat?.subCategories ?? [];
    setSubCategories(subs);
    setSubCategoryId(subs.length > 0 ? subs[0].id : '');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const formData = new FormData();
        formData.append('file', selectedFiles[i]);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) {
          uploadedUrls.push(data.url);
        }
      }
      setImages(prev => [...prev, ...uploadedUrls]);
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Dynamic Specification Helpers
  const addSpec = () => {
    setSpecs([...specs, { id: Math.random().toString(36).substring(2, 9), name: '', options: [{ value: '' }] }]);
  };

  const removeSpec = (id: string) => {
    setSpecs(specs.filter(s => s.id !== id));
  };

  const updateSpecName = (id: string, name: string) => {
    setSpecs(specs.map(s => s.id === id ? { ...s, name } : s));
  };

  const addSpecOption = (specId: string) => {
    setSpecs(specs.map(s => s.id === specId ? { ...s, options: [...s.options, { value: '' }] } : s));
  };

  const removeSpecOption = (specId: string, optIndex: number) => {
    setSpecs(specs.map(s => {
      if (s.id !== specId) return s;
      const newOpts = [...s.options];
      newOpts.splice(optIndex, 1);
      return { ...s, options: newOpts };
    }));
  };

  const updateSpecOption = (specId: string, optIndex: number, value: string) => {
    setSpecs(specs.map(s => {
      if (s.id !== specId) return s;
      const newOpts = [...s.options];
      newOpts[optIndex].value = value;
      return { ...s, options: newOpts };
    }));
  };

  const moveOption = (specId: string, optIndex: number, direction: 'up' | 'down') => {
    setSpecs(specs.map(s => {
      if (s.id !== specId) return s;
      const newOpts = [...s.options];
      const target = direction === 'up' ? optIndex - 1 : optIndex + 1;
      if (target < 0 || target >= newOpts.length) return s;
      [newOpts[optIndex], newOpts[target]] = [newOpts[target], newOpts[optIndex]];
      return { ...s, options: newOpts };
    }));
  };

  // Generate Combinations based on specs that have a name and valid options
  const validSpecs = specs.filter(s => s.name.trim() !== '' && s.options.filter(o => o.value.trim() !== '').length > 0);
  
  const generateCombinations = (): string[] => {
    if (validSpecs.length === 0) return [];
    
    let combos: string[][] = [[]];
    for (const spec of validSpecs) {
      const validOpts = spec.options.map(o => o.value.trim()).filter(Boolean);
      const newCombos: string[][] = [];
      for (const combo of combos) {
        for (const opt of validOpts) {
          newCombos.push([...combo, opt]);
        }
      }
      combos = newCombos;
    }
    
    return combos.map(c => c.join(' | '));
  };

  const combinations = generateCombinations();

  const handlePriceChange = (combo: string, val: string) => {
    setPrices(prev => ({ ...prev, [combo]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const finalPrices: Record<string, number> = {};
    for (const combo of combinations) {
      if (prices[combo]) {
        finalPrices[combo] = parseFloat(prices[combo]);
      }
    }

    const cleanedSpecs = validSpecs.map(s => ({
      name: s.name.trim(),
      options: s.options.map(o => o.value.trim()).filter(Boolean)
    }));

    const body = {
      title,
      description,
      image: images[0] || '/images/placeholder.jpg',
      images: JSON.stringify(images),
      subCategoryId,
      specifications: JSON.stringify(cleanedSpecs),
      basePrice: parseFloat(basePrice),
      priceModifiers: JSON.stringify(finalPrices),
      unitsAvailable: hasUnits ? (parseInt(unitsAvailable) || 0) : null,
      requestId: requestId || undefined,
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/admin/content/products'), 1500);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add product');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '640px' }}>
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <Link href="/admin/content" className="text-sm text-muted">← Back to Website Content</Link>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: 'var(--space-xl)' }}>Add New Product</h1>

        {success && <div className="alert alert-success">Product added successfully! Redirecting...</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {categories.length === 0 ? (
          <div className="empty-state">
            <h2>No Categories Yet</h2>
            <p>You need to <Link href="/admin/content/categories" style={{ color: 'var(--color-accent)' }}>create a category</Link> and a <Link href="/admin/content/subcategories" style={{ color: 'var(--color-accent)' }}>subcategory</Link> before adding products.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="profile-card">
              <h3>Category</h3>
              <div className="form-group">
                <label>Category</label>
                <select value={categoryId} onChange={e => handleCategoryChange(e.target.value)}>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Sub-Category</label>
                {subCategories.length === 0 ? (
                  <p className="text-sm text-muted">No subcategories in this category yet. <Link href="/admin/content/subcategories" style={{ color: 'var(--color-accent)' }}>Add one →</Link></p>
                ) : (
                  <select value={subCategoryId} onChange={e => setSubCategoryId(e.target.value)}>
                    {subCategories.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="profile-card">
              <h3>Product Details</h3>
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Product title" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} required placeholder="Product description" rows={4} />
              </div>
              <div className="form-group">
                <label>Product Images</label>
                <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageUpload} />
                  {uploading && <span className="spinner"></span>}
                </div>
                {images.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                    {images.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                        <img src={img} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                        <button 
                          type="button" 
                          onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                          style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(255,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Base Price (₹)</label>
                <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-xs)' }}>This applies if no specific options are selected, or as a default.</p>
                <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} required min="0" step="0.01" placeholder="2500" />
              </div>
            </div>

            <div className="profile-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h3 style={{ margin: 0 }}>Product Specifications</h3>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addSpec}>+ Add Specification</button>
              </div>
              <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-md)' }}>Define customized specs (like Medium, Frame, Size) and their options.</p>
              
              {specs.length === 0 ? (
                <p className="text-sm text-muted">No specifications added yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  {specs.map((spec, sIdx) => (
                    <div key={spec.id} style={{ padding: 'var(--space-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                        <input 
                          type="text" 
                          value={spec.name} 
                          onChange={(e) => updateSpecName(spec.id, e.target.value)} 
                          placeholder="e.g. Frame Size" 
                          style={{ flex: 1, marginRight: 'var(--space-md)', fontWeight: 600 }}
                        />
                        <button type="button" className="text-sm text-muted" onClick={() => removeSpec(spec.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>Remove</button>
                      </div>
                      
                      <div style={{ paddingLeft: 'var(--space-md)' }}>
                        <label className="text-xs text-muted">Options</label>
                        {spec.options.map((opt, oIdx) => (
                          <div key={oIdx} style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <button type="button" disabled={oIdx === 0} onClick={() => moveOption(spec.id, oIdx, 'up')} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '3px', cursor: oIdx === 0 ? 'default' : 'pointer', padding: '0px 4px', fontSize: '8px', opacity: oIdx === 0 ? 0.3 : 1, lineHeight: '14px' }}>▲</button>
                              <button type="button" disabled={oIdx === spec.options.length - 1} onClick={() => moveOption(spec.id, oIdx, 'down')} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '3px', cursor: oIdx === spec.options.length - 1 ? 'default' : 'pointer', padding: '0px 4px', fontSize: '8px', opacity: oIdx === spec.options.length - 1 ? 0.3 : 1, lineHeight: '14px' }}>▼</button>
                            </div>
                            <input 
                              type="text" 
                              value={opt.value} 
                              onChange={(e) => updateSpecOption(spec.id, oIdx, e.target.value)} 
                              placeholder="e.g. Large (24x36)" 
                              style={{ flex: 1 }}
                            />
                            {spec.options.length > 1 && (
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeSpecOption(spec.id, oIdx)}>X</button>
                            )}
                          </div>
                        ))}
                        <button type="button" className="text-sm" onClick={() => addSpecOption(spec.id)} style={{ color: 'var(--color-accent)', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 'var(--space-xs)', padding: 0 }}>+ Add Option</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {combinations.length > 0 && (
              <div className="profile-card">
                <h3>Variant Pricing</h3>
                <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-md)' }}>Set the final absolute price for each combination. (Leave empty to use Base Price)</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {combinations.map(combo => (
                    <div key={combo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ margin: 0, fontSize: '14px', maxWidth: '60%' }}>{combo}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <span>₹</span>
                        <input 
                          type="number" 
                          style={{ width: '120px' }} 
                          placeholder={basePrice}
                          value={prices[combo] || ''}
                          onChange={(e) => handlePriceChange(combo, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="profile-card">
              <h3>Inventory</h3>
              <label className="checkbox-label" style={{ marginBottom: 'var(--space-md)' }}>
                <input type="checkbox" checked={hasUnits} onChange={e => setHasUnits(e.target.checked)} />
                Limit available units (for unique / limited pieces)
              </label>
              {hasUnits && (
                <div className="form-group">
                  <label>Units Available</label>
                  <input
                    type="number"
                    value={unitsAvailable}
                    onChange={e => setUnitsAvailable(e.target.value)}
                    min="0"
                    placeholder="10"
                  />
                </div>
              )}
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={loading || uploading || !subCategoryId} style={{ marginTop: 'var(--space-lg)' }}>
              {loading ? <span className="spinner"></span> : 'Add Product'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AddProductPage() {
  return (
    <Suspense fallback={<div className="page-content" style={{ textAlign: 'center' }}><div className="spinner"></div></div>}>
      <AddProductContent />
    </Suspense>
  );
}
