'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubCategory { id: string; name: string; }
interface Category { id: string; name: string; subCategories: SubCategory[]; }
interface SpecOption { value: string; }
interface Specification { id: string; name: string; options: SpecOption[]; }
interface Artist { id: string; fullName: string; }

interface PriceBreakdown {
  combo: string;
  printMaterial: string;
  frameMaterial: string;
  printingCost: number;
  outerFrameCost: number;
  subFrameCost: number;
  laborCharge: number;
  settingCharge: number;
  polishCharge: number;
  framingCost: number;
  addons: number;
  baseCost: number;
  priceBeforeGST: number;
  gst: number;
  finalPrice: number;
  artistRoyalty: number;
  companyMargin: number;
}

// ─── Calculation Engine ───────────────────────────────────────────────────────

function calculateSpecPrice(
  widthCm: number,
  heightCm: number,
  printMaterial: 'Canvas' | 'Paper',
  frameMaterial: 'Teakwood' | 'Ashwood'
): PriceBreakdown {
  // Printing
  const areaSqft = (widthCm * heightCm) / 900;
  const printRate = printMaterial === 'Canvas' ? 120 : 90;
  const printingCost = areaSqft * printRate;

  // Framing
  const widthFt = widthCm / 30.48;
  const heightFt = heightCm / 30.48;
  const woodWidth = 0.098;
  const woodThickness = 0.0164;
  const verticalVol = heightFt * woodWidth * woodThickness * 2;
  const horizontalVol = widthFt * woodWidth * woodThickness * 2;
  const totalVol = verticalVol + horizontalVol;
  const frameRate = frameMaterial === 'Teakwood' ? 5000 : 3500;
  const outerFrameCost = totalVol * frameRate;
  const subFrameCost = outerFrameCost * 0.5;
  const laborCharge = 300;
  const settingCharge = 300;
  const surfaceArea = (heightFt * woodWidth * 2) + (widthFt * woodWidth * 2);
  const polishCharge = surfaceArea * 300;
  const framingCost = outerFrameCost + subFrameCost + laborCharge + settingCharge + polishCharge;

  // Fixed costs
  const addons = 500 + 500 + 1500; // transport + packaging + shipping

  // Final price
  const baseCost = printingCost + framingCost + addons;
  const priceBeforeGST = baseCost * 3;
  const gst = priceBeforeGST * 0.18;
  const finalPrice = priceBeforeGST + gst;

  // Internal breakdown
  const artistRoyalty = priceBeforeGST / 3;
  const companyMargin = priceBeforeGST / 3;

  return {
    combo: `${printMaterial} | ${frameMaterial}`,
    printMaterial,
    frameMaterial,
    printingCost,
    outerFrameCost,
    subFrameCost,
    laborCharge,
    settingCharge,
    polishCharge,
    framingCost,
    addons,
    baseCost,
    priceBeforeGST,
    gst,
    finalPrice,
    artistRoyalty,
    companyMargin,
  };
}

const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// ─── Main Component ───────────────────────────────────────────────────────────

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

  // ── Pricing Mode ──────────────────────────────────────────────────────────
  const [pricingMode, setPricingMode] = useState<'fixed' | 'specification'>('fixed');

  // Fixed pricing
  const [basePrice, setBasePrice] = useState('');

  // Specification pricing
  const [widthCm, setWidthCm] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [useCanvas, setUseCanvas] = useState(true);
  const [usePaper, setUsePaper] = useState(false);
  const [useTeakwood, setUseTeakwood] = useState(true);
  const [useAshwood, setUseAshwood] = useState(false);

  // Expanded row tracking for breakdown
  const [expandedCombo, setExpandedCombo] = useState<string | null>(null);

  // Fixed mode: Dynamic Specifications (manual)
  const [specs, setSpecs] = useState<Specification[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});

  // Units
  const [hasUnits, setHasUnits] = useState(false);
  const [unitsAvailable, setUnitsAvailable] = useState('');

  // Artists dropdown
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistProfileId, setArtistProfileId] = useState('');

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(data => {
      setCategories(data);
      if (data.length > 0 && !requestId) {
        setCategoryId(data[0].id);
        setSubCategories(data[0].subCategories);
        if (data[0].subCategories.length > 0) setSubCategoryId(data[0].subCategories[0].id);
      }
    });
    fetch('/api/admin/artists/list').then(r => r.json()).then(data => {
      setArtists(data.artists || []);
    }).catch(console.error);
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
          if (req.artistId) setArtistProfileId(req.artistId);
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
        if (res.ok) uploadedUrls.push(data.url);
      }
      setImages(prev => [...prev, ...uploadedUrls]);
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ── Manual Spec Helpers (Fixed mode) ─────────────────────────────────────
  const addSpec = () => setSpecs([...specs, { id: Math.random().toString(36).substring(2, 9), name: '', options: [{ value: '' }] }]);
  const removeSpec = (id: string) => setSpecs(specs.filter(s => s.id !== id));
  const updateSpecName = (id: string, name: string) => setSpecs(specs.map(s => s.id === id ? { ...s, name } : s));
  const addSpecOption = (specId: string) => setSpecs(specs.map(s => s.id === specId ? { ...s, options: [...s.options, { value: '' }] } : s));
  const removeSpecOption = (specId: string, optIndex: number) => setSpecs(specs.map(s => {
    if (s.id !== specId) return s;
    const newOpts = [...s.options];
    newOpts.splice(optIndex, 1);
    return { ...s, options: newOpts };
  }));
  const updateSpecOption = (specId: string, optIndex: number, value: string) => setSpecs(specs.map(s => {
    if (s.id !== specId) return s;
    const newOpts = [...s.options];
    newOpts[optIndex].value = value;
    return { ...s, options: newOpts };
  }));
  const moveOption = (specId: string, optIndex: number, direction: 'up' | 'down') => setSpecs(specs.map(s => {
    if (s.id !== specId) return s;
    const newOpts = [...s.options];
    const target = direction === 'up' ? optIndex - 1 : optIndex + 1;
    if (target < 0 || target >= newOpts.length) return s;
    [newOpts[optIndex], newOpts[target]] = [newOpts[target], newOpts[optIndex]];
    return { ...s, options: newOpts };
  }));

  const validSpecs = specs.filter(s => s.name.trim() !== '' && s.options.filter(o => o.value.trim() !== '').length > 0);
  const generateCombinations = (): string[] => {
    if (validSpecs.length === 0) return [];
    let combos: string[][] = [[]];
    for (const spec of validSpecs) {
      const validOpts = spec.options.map(o => o.value.trim()).filter(Boolean);
      const newCombos: string[][] = [];
      for (const combo of combos) for (const opt of validOpts) newCombos.push([...combo, opt]);
      combos = newCombos;
    }
    return combos.map(c => c.join(' | '));
  };
  const combinations = generateCombinations();
  const handlePriceChange = (combo: string, val: string) => setPrices(prev => ({ ...prev, [combo]: val }));

  // ── Spec Pricing Calculator ───────────────────────────────────────────────
  const calculatedPrices = useMemo((): PriceBreakdown[] => {
    const w = parseFloat(widthCm);
    const h = parseFloat(heightCm);
    if (!w || !h || w <= 0 || h <= 0) return [];

    const prints: Array<'Canvas' | 'Paper'> = [];
    if (useCanvas) prints.push('Canvas');
    if (usePaper) prints.push('Paper');
    const frames: Array<'Teakwood' | 'Ashwood'> = [];
    if (useTeakwood) frames.push('Teakwood');
    if (useAshwood) frames.push('Ashwood');

    const results: PriceBreakdown[] = [];
    for (const p of prints) for (const f of frames) results.push(calculateSpecPrice(w, h, p, f));
    return results;
  }, [widthCm, heightCm, useCanvas, usePaper, useTeakwood, useAshwood]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let finalSpecs: { name: string; options: string[] }[] = [];
    let finalBasePrice: number;
    let finalPriceModifiers: Record<string, number> = {};

    if (pricingMode === 'fixed') {
      finalSpecs = validSpecs.map(s => ({
        name: s.name.trim(),
        options: s.options.map(o => o.value.trim()).filter(Boolean),
      }));
      finalBasePrice = parseFloat(basePrice) || 0;
      for (const combo of combinations) {
        if (prices[combo]) finalPriceModifiers[combo] = parseFloat(prices[combo]);
      }
    } else {
      if (calculatedPrices.length === 0) {
        setError('Please enter valid dimensions and select at least one print and frame material.');
        setLoading(false);
        return;
      }

      // Build specs from enabled materials
      const printOpts: string[] = [];
      if (useCanvas) printOpts.push('Canvas');
      if (usePaper) printOpts.push('Paper');
      const frameOpts: string[] = [];
      if (useTeakwood) frameOpts.push('Teakwood');
      if (useAshwood) frameOpts.push('Ashwood');

      finalSpecs = [
        { name: 'Print Material', options: printOpts },
        { name: 'Frame Material', options: frameOpts },
      ];

      // Use lowest price as base price
      finalBasePrice = Math.min(...calculatedPrices.map(p => p.finalPrice));
      for (const p of calculatedPrices) {
        finalPriceModifiers[p.combo] = Math.round(p.finalPrice);
      }
    }

    const body = {
      title,
      description,
      image: images[0] || '/images/placeholder.jpg',
      images: JSON.stringify(images),
      subCategoryId,
      specifications: JSON.stringify(finalSpecs),
      basePrice: finalBasePrice,
      priceModifiers: JSON.stringify(finalPriceModifiers),
      unitsAvailable: hasUnits ? (parseInt(unitsAvailable) || 0) : null,
      requestId: requestId || undefined,
      artistProfileId: artistProfileId || null,
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

  // ── Styles ────────────────────────────────────────────────────────────────
  const modeBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '12px 16px',
    border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    background: active ? 'var(--color-accent)' : 'var(--color-bg-light)',
    color: active ? '#fff' : 'var(--color-text)',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
  });

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    background: active ? 'rgba(var(--color-accent-rgb, 100,80,60), 0.1)' : 'var(--color-bg-light)',
    color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    fontWeight: active ? 600 : 400,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '720px' }}>
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

            {/* ── Category ── */}
            <div className="profile-card">
              <h3>Category</h3>
              <div className="form-group">
                <label>Category</label>
                <select value={categoryId} onChange={e => handleCategoryChange(e.target.value)}>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Sub-Category</label>
                {subCategories.length === 0 ? (
                  <p className="text-sm text-muted">No subcategories yet. <Link href="/admin/content/subcategories" style={{ color: 'var(--color-accent)' }}>Add one →</Link></p>
                ) : (
                  <select value={subCategoryId} onChange={e => setSubCategoryId(e.target.value)}>
                    {subCategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* ── Artist ── */}
            <div className="profile-card">
              <h3>Artist</h3>
              <div className="form-group">
                <label>Assign to Artist (optional)</label>
                <select value={artistProfileId} onChange={e => setArtistProfileId(e.target.value)}>
                  <option value="">— No artist —</option>
                  {artists.map(a => <option key={a.id} value={a.id}>{a.fullName}</option>)}
                </select>
              </div>
            </div>

            {/* ── Product Details ── */}
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
                        <button type="button" onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                          style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(255,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Pricing Mode Toggle ── */}
            <div className="profile-card">
              <h3>Pricing</h3>
              <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-md)' }}>Choose how pricing is set for this product.</p>
              <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                <button type="button" style={modeBtn(pricingMode === 'fixed')} onClick={() => setPricingMode('fixed')}>
                  🏷️ Fixed Pricing
                  <div style={{ fontSize: '11px', fontWeight: 400, marginTop: '2px', opacity: 0.85 }}>Single price, optional variants</div>
                </button>
                <button type="button" style={modeBtn(pricingMode === 'specification')} onClick={() => setPricingMode('specification')}>
                  🧮 Specification Pricing
                  <div style={{ fontSize: '11px', fontWeight: 400, marginTop: '2px', opacity: 0.85 }}>Auto-calculated from dimensions</div>
                </button>
              </div>

              {/* ── Fixed Pricing ── */}
              {pricingMode === 'fixed' && (
                <div>
                  <div className="form-group">
                    <label>Base Price (₹)</label>
                    <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-xs)' }}>This applies if no specific options are selected, or as a default.</p>
                    <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} required min="0" step="0.01" placeholder="2500" />
                  </div>
                </div>
              )}

              {/* ── Specification Pricing ── */}
              {pricingMode === 'specification' && (
                <div>
                  {/* Dimensions */}
                  <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: 'var(--space-sm)' }}>Dimensions</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Width (cm)</label>
                        <input type="number" value={widthCm} onChange={e => setWidthCm(e.target.value)} min="1" step="0.1" placeholder="e.g. 40" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Height (cm)</label>
                        <input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} min="1" step="0.1" placeholder="e.g. 30" />
                      </div>
                    </div>
                    {widthCm && heightCm && (
                      <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                        Area: {((parseFloat(widthCm) * parseFloat(heightCm)) / 900).toFixed(3)} sqft
                      </p>
                    )}
                  </div>

                  {/* Print Material */}
                  <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: 'var(--space-sm)' }}>Print Material</label>
                    <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-sm)' }}>Select which print materials are available. Pricing is calculated for each enabled material.</p>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                      <button type="button" style={toggleBtn(useCanvas)} onClick={() => setUseCanvas(v => !v)}>
                        <span>{useCanvas ? '☑' : '☐'}</span> Canvas <span style={{ fontSize: '11px', opacity: 0.7 }}>₹120/sqft</span>
                      </button>
                      <button type="button" style={toggleBtn(usePaper)} onClick={() => setUsePaper(v => !v)}>
                        <span>{usePaper ? '☑' : '☐'}</span> Paper <span style={{ fontSize: '11px', opacity: 0.7 }}>₹90/sqft</span>
                      </button>
                    </div>
                  </div>

                  {/* Frame Material */}
                  <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: 'var(--space-sm)' }}>Frame Material</label>
                    <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-sm)' }}>Select which frame materials are available.</p>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                      <button type="button" style={toggleBtn(useTeakwood)} onClick={() => setUseTeakwood(v => !v)}>
                        <span>{useTeakwood ? '☑' : '☐'}</span> Teakwood <span style={{ fontSize: '11px', opacity: 0.7 }}>₹5000/cu.ft</span>
                      </button>
                      <button type="button" style={toggleBtn(useAshwood)} onClick={() => setUseAshwood(v => !v)}>
                        <span>{useAshwood ? '☑' : '☐'}</span> Ashwood <span style={{ fontSize: '11px', opacity: 0.7 }}>₹3500/cu.ft</span>
                      </button>
                    </div>
                  </div>

                  {/* Pricing Preview Table */}
                  {calculatedPrices.length > 0 && (
                    <div style={{ marginTop: 'var(--space-lg)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                        <label style={{ fontWeight: 600, fontSize: '14px' }}>Calculated Pricing Preview</label>
                        <span className="text-xs text-muted">Click a row for full breakdown</span>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: 'var(--color-bg-light)', borderBottom: '2px solid var(--color-border)' }}>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Combination</th>
                              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Printing</th>
                              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Framing</th>
                              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Add-ons</th>
                              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Pre-GST</th>
                              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>GST (18%)</th>
                              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-accent)' }}>Final Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {calculatedPrices.map((p, i) => (
                              <>
                                <tr
                                  key={p.combo}
                                  onClick={() => setExpandedCombo(expandedCombo === p.combo ? null : p.combo)}
                                  style={{
                                    borderBottom: expandedCombo === p.combo ? 'none' : '1px solid var(--color-border-light)',
                                    cursor: 'pointer',
                                    background: i % 2 === 0 ? 'transparent' : 'var(--color-bg-light)',
                                    transition: 'background 0.15s',
                                  }}
                                >
                                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                                    <span style={{ marginRight: '6px', fontSize: '10px', opacity: 0.5 }}>{expandedCombo === p.combo ? '▼' : '▶'}</span>
                                    {p.combo}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(p.printingCost)}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(p.framingCost)}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(p.addons)}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(p.priceBeforeGST)}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(p.gst)}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-accent)', fontSize: '14px' }}>{fmt(p.finalPrice)}</td>
                                </tr>
                                {expandedCombo === p.combo && (
                                  <tr key={`${p.combo}-expanded`} style={{ background: 'var(--color-bg-light)', borderBottom: '1px solid var(--color-border)' }}>
                                    <td colSpan={7} style={{ padding: '12px 24px' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
                                        <div>
                                          <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Printing Breakdown</div>
                                          <div className="text-xs" style={{ lineHeight: 1.9 }}>
                                            <div>Area: {((parseFloat(widthCm) * parseFloat(heightCm)) / 900).toFixed(3)} sqft</div>
                                            <div>Rate: ₹{p.printMaterial === 'Canvas' ? 120 : 90}/sqft ({p.printMaterial})</div>
                                            <div style={{ fontWeight: 600 }}>Total: {fmt(p.printingCost)}</div>
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Framing Breakdown</div>
                                          <div className="text-xs" style={{ lineHeight: 1.9 }}>
                                            <div>Outer frame: {fmt(p.outerFrameCost)}</div>
                                            <div>Sub-frame: {fmt(p.subFrameCost)}</div>
                                            <div>Labour: {fmt(p.laborCharge)}</div>
                                            <div>Setting: {fmt(p.settingCharge)}</div>
                                            <div>Polish: {fmt(p.polishCharge)}</div>
                                            <div style={{ fontWeight: 600 }}>Total: {fmt(p.framingCost)}</div>
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Fixed Add-ons</div>
                                          <div className="text-xs" style={{ lineHeight: 1.9 }}>
                                            <div>Transportation: ₹500</div>
                                            <div>Packaging: ₹500</div>
                                            <div>Shipping: ₹1,500</div>
                                            <div style={{ fontWeight: 600 }}>Total: {fmt(p.addons)}</div>
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Internal (Admin only)</div>
                                          <div className="text-xs" style={{ lineHeight: 1.9 }}>
                                            <div>Base cost: {fmt(p.baseCost)}</div>
                                            <div>Artist royalty share: {fmt(p.artistRoyalty)}</div>
                                            <div>Company margin: {fmt(p.companyMargin)}</div>
                                            <div>GST (18%): {fmt(p.gst)}</div>
                                            <div style={{ fontWeight: 700 }}>Final price: {fmt(p.finalPrice)}</div>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--color-bg-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)' }}>
                        <p className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.8 }}>
                          <strong>How prices are saved:</strong> The lowest calculated price becomes the base price. All combination prices are stored as variant modifiers and used at checkout.
                          <br />
                          <strong>Price formula:</strong> Base Cost × 3 + 18% GST
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Warning if no selections */}
                  {calculatedPrices.length === 0 && (widthCm || heightCm || useCanvas || usePaper) && (
                    <div className="alert alert-error" style={{ fontSize: '13px' }}>
                      Enter valid dimensions and select at least one print material and one frame material to calculate pricing.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Manual Specs (Fixed mode only) ── */}
            {pricingMode === 'fixed' && (
              <div className="profile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                  <h3 style={{ margin: 0 }}>Product Specifications</h3>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addSpec}>+ Add Specification</button>
                </div>
                <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-md)' }}>Define customizable specs (like Medium, Frame, Size) and their options.</p>

                {specs.length === 0 ? (
                  <p className="text-sm text-muted">No specifications added yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                    {specs.map((spec) => (
                      <div key={spec.id} style={{ padding: 'var(--space-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                          <input type="text" value={spec.name} onChange={(e) => updateSpecName(spec.id, e.target.value)} placeholder="e.g. Frame Size" style={{ flex: 1, marginRight: 'var(--space-md)', fontWeight: 600 }} />
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
                              <input type="text" value={opt.value} onChange={(e) => updateSpecOption(spec.id, oIdx, e.target.value)} placeholder="e.g. Large (24x36)" style={{ flex: 1 }} />
                              {spec.options.length > 1 && (
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeSpecOption(spec.id, oIdx)}>✕</button>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={() => addSpecOption(spec.id)} style={{ color: 'var(--color-accent)', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 'var(--space-xs)', padding: 0, fontSize: '13px' }}>+ Add Option</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Manual Variant Pricing (Fixed mode only) ── */}
            {pricingMode === 'fixed' && combinations.length > 0 && (
              <div className="profile-card">
                <h3>Variant Pricing</h3>
                <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-md)' }}>Set the final price for each combination. (Leave empty to use Base Price)</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {combinations.map(combo => (
                    <div key={combo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ margin: 0, fontSize: '14px', maxWidth: '60%' }}>{combo}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <span>₹</span>
                        <input type="number" style={{ width: '120px' }} placeholder={basePrice} value={prices[combo] || ''} onChange={(e) => handlePriceChange(combo, e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Inventory ── */}
            <div className="profile-card">
              <h3>Inventory</h3>
              <label className="checkbox-label" style={{ marginBottom: 'var(--space-md)' }}>
                <input type="checkbox" checked={hasUnits} onChange={e => setHasUnits(e.target.checked)} />
                Limit available units (for unique / limited pieces)
              </label>
              {hasUnits && (
                <div className="form-group">
                  <label>Units Available</label>
                  <input type="number" value={unitsAvailable} onChange={e => setUnitsAvailable(e.target.value)} min="0" placeholder="10" />
                </div>
              )}
            </div>

            <button
              className="btn btn-primary btn-full"
              type="submit"
              disabled={loading || uploading || !subCategoryId || (pricingMode === 'specification' && calculatedPrices.length === 0)}
              style={{ marginTop: 'var(--space-lg)' }}
            >
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
