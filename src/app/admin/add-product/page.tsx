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

interface SizeEntry {
  id: string;
  label: string;   // custom label, e.g. "Small", "Large" — auto-filled as "40×30 cm" if blank
  widthCm: string;
  heightCm: string;
}

interface PriceBreakdown {
  combo: string;          // "40×30 cm | Canvas | Teakwood"
  sizeLabel: string;
  printMaterial: string;
  frameMaterial: string;
  widthCm: number;
  heightCm: number;
  printingCost: number;
  outerFrameCost: number;
  subFrameCost: number;
  laborCharge: number;
  settingCharge: number;
  polishCharge: number;
  framingSubtotal: number;       // before partner margin
  framingPartnerMargin: number;  // 15% of framingSubtotal
  framingCost: number;           // framingSubtotal + partner margin
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
  sizeLabel: string,
  printMaterial: 'Canvas' | 'Paper',
  frameMaterial: 'Teakwood' | 'Ashwood',
  multiplier: number = 3
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
  const framingSubtotal = outerFrameCost + subFrameCost + laborCharge + settingCharge + polishCharge;
  const framingPartnerMargin = framingSubtotal * 0.15; // 15% framing partner margin
  const framingCost = framingSubtotal + framingPartnerMargin;

  // Fixed costs
  const addons = 500 + 500 + 1500; // transport + packaging + shipping

  // Final price
  const baseCost = printingCost + framingCost + addons;
  const priceBeforeGST = baseCost * multiplier;
  const gst = priceBeforeGST * 0.18;
  const finalPrice = priceBeforeGST + gst;

  // Internal breakdown
  const artistRoyalty = priceBeforeGST / multiplier;
  const companyMargin = priceBeforeGST / multiplier;

  return {
    combo: `${sizeLabel} | ${printMaterial} | ${frameMaterial}`,
    sizeLabel,
    printMaterial,
    frameMaterial,
    widthCm,
    heightCm,
    printingCost,
    outerFrameCost,
    subFrameCost,
    laborCharge,
    settingCharge,
    polishCharge,
    framingSubtotal,
    framingPartnerMargin,
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
const genId = () => Math.random().toString(36).substring(2, 9);
const autoLabel = (w: string, h: string) => (w && h ? `${w}×${h} cm` : '');

// ─── Predefined sizes ────────────────────────────────────────────────────────
const PRESET_SIZES: { label: string; group: string; w: number; h: number }[] = [
  // Rectangular
  { label: '30×45 cm', group: 'Rectangular', w: 30, h: 45 },
  { label: '60×90 cm', group: 'Rectangular', w: 60, h: 90 },
  { label: '90×120 cm', group: 'Rectangular', w: 90, h: 120 },
  // Square
  { label: '30×30 cm', group: 'Square', w: 30, h: 30 },
  { label: '60×60 cm', group: 'Square', w: 60, h: 60 },
  { label: '90×90 cm', group: 'Square', w: 90, h: 90 },
  { label: '150×150 cm', group: 'Square', w: 150, h: 150 },
];

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

  // Specification pricing — multiple sizes
  const [sizes, setSizes] = useState<SizeEntry[]>([
    { id: genId(), label: '', widthCm: '', heightCm: '' }
  ]);
  const [useCanvas, setUseCanvas] = useState(true);
  const [usePaper, setUsePaper] = useState(false);
  const [useTeakwood, setUseTeakwood] = useState(true);
  const [useAshwood, setUseAshwood] = useState(false);
  const [multiplier, setMultiplier] = useState('3');

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
            id: genId(),
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

  // ── Size Helpers ──────────────────────────────────────────────────────────
  const addSize = () => setSizes(prev => [...prev, { id: genId(), label: '', widthCm: '', heightCm: '' }]);
  const removeSize = (id: string) => setSizes(prev => prev.filter(s => s.id !== id));
  const updateSize = (id: string, field: keyof SizeEntry, value: string) =>
    setSizes(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));

  // ── Manual Spec Helpers (Fixed mode) ─────────────────────────────────────
  const addSpec = () => setSpecs([...specs, { id: genId(), name: '', options: [{ value: '' }] }]);
  const removeSpec = (id: string) => setSpecs(specs.filter(s => s.id !== id));
  const updateSpecName = (id: string, name: string) => setSpecs(specs.map(s => s.id === id ? { ...s, name } : s));
  const addSpecOption = (specId: string) => setSpecs(specs.map(s => s.id === specId ? { ...s, options: [...s.options, { value: '' }] } : s));
  const removeSpecOption = (specId: string, optIndex: number) => setSpecs(specs.map(s => {
    if (s.id !== specId) return s;
    const newOpts = [...s.options]; newOpts.splice(optIndex, 1); return { ...s, options: newOpts };
  }));
  const updateSpecOption = (specId: string, optIndex: number, value: string) => setSpecs(specs.map(s => {
    if (s.id !== specId) return s;
    const newOpts = [...s.options]; newOpts[optIndex].value = value; return { ...s, options: newOpts };
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

  // ── Spec Pricing Calculator (sizes × prints × frames) ────────────────────
  const calculatedPrices = useMemo((): PriceBreakdown[] => {
    const m = parseFloat(multiplier);
    if (!m || m <= 0) return [];

    const prints: Array<'Canvas' | 'Paper'> = [];
    if (useCanvas) prints.push('Canvas');
    if (usePaper) prints.push('Paper');
    const frames: Array<'Teakwood' | 'Ashwood'> = [];
    if (useTeakwood) frames.push('Teakwood');
    if (useAshwood) frames.push('Ashwood');

    if (prints.length === 0 || frames.length === 0) return [];

    const results: PriceBreakdown[] = [];
    for (const size of sizes) {
      const w = parseFloat(size.widthCm);
      const h = parseFloat(size.heightCm);
      if (!w || !h || w <= 0 || h <= 0) continue;
      const label = size.label.trim() || autoLabel(size.widthCm, size.heightCm);
      for (const p of prints) {
        for (const f of frames) {
          results.push(calculateSpecPrice(w, h, label, p, f, m));
        }
      }
    }
    return results;
  }, [sizes, useCanvas, usePaper, useTeakwood, useAshwood, multiplier]);

  // Valid sizes = sizes where both w and h are filled
  const validSizes = sizes.filter(s => parseFloat(s.widthCm) > 0 && parseFloat(s.heightCm) > 0);

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
        setError('Please add at least one valid size and select at least one print and frame material.');
        setLoading(false);
        return;
      }

      const printOpts: string[] = [];
      if (useCanvas) printOpts.push('Canvas');
      if (usePaper) printOpts.push('Paper');
      const frameOpts: string[] = [];
      if (useTeakwood) frameOpts.push('Teakwood');
      if (useAshwood) frameOpts.push('Ashwood');
      const sizeOpts = validSizes.map(s => s.label.trim() || autoLabel(s.widthCm, s.heightCm));

      finalSpecs = [
        { name: 'Size', options: sizeOpts },
        { name: 'Print Material', options: printOpts },
        { name: 'Frame Material', options: frameOpts },
      ];

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
      <div className="container" style={{ maxWidth: '760px' }}>
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
                <div className="form-group">
                  <label>Base Price (₹)</label>
                  <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-xs)' }}>This applies if no specific options are selected, or as a default.</p>
                  <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} required min="0" step="0.01" placeholder="2500" />
                </div>
              )}

              {/* ── Specification Pricing ── */}
              {pricingMode === 'specification' && (
                <div>

                  {/* Sizes */}
                  <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: 'var(--space-sm)' }}>Sizes</label>
                    <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                      Pick from predefined sizes or add custom dimensions below. Pricing is calculated independently for each size.
                    </p>

                    {/* Predefined size chips */}
                    {(['Rectangular', 'Square'] as const).map(group => (
                      <div key={group} style={{ marginBottom: 'var(--space-md)' }}>
                        <div className="text-xs text-muted" style={{ fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{group}</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {PRESET_SIZES.filter(p => p.group === group).map(preset => {
                            const alreadyAdded = sizes.some(
                              s => parseFloat(s.widthCm) === preset.w && parseFloat(s.heightCm) === preset.h
                            );
                            return (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  if (alreadyAdded) return;
                                  // If only one empty size row exists, fill it; otherwise append
                                  const emptyIdx = sizes.findIndex(s => !s.widthCm && !s.heightCm);
                                  if (emptyIdx !== -1) {
                                    setSizes(prev => prev.map((s, i) =>
                                      i === emptyIdx
                                        ? { ...s, widthCm: String(preset.w), heightCm: String(preset.h), label: s.label || preset.label }
                                        : s
                                    ));
                                  } else {
                                    setSizes(prev => [...prev, { id: genId(), label: preset.label, widthCm: String(preset.w), heightCm: String(preset.h) }]);
                                  }
                                }}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  fontWeight: alreadyAdded ? 600 : 400,
                                  border: `2px solid ${alreadyAdded ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                  borderRadius: 'var(--radius-md)',
                                  background: alreadyAdded ? 'rgba(var(--color-accent-rgb,100,80,60),0.1)' : 'var(--color-bg-light)',
                                  color: alreadyAdded ? 'var(--color-accent)' : 'var(--color-text)',
                                  cursor: alreadyAdded ? 'default' : 'pointer',
                                  transition: 'all 0.15s',
                                }}
                              >
                                {alreadyAdded ? '✓ ' : ''}{preset.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Custom size rows */}
                    <div style={{ marginTop: 'var(--space-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Custom Sizes</div>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={addSize}>+ Add Custom</button>
                      </div>

                      {sizes.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                          {/* Header */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 32px', gap: 'var(--space-sm)', padding: '0 2px' }}>
                            <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Label (optional)</span>
                            <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Width (cm)</span>
                            <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Height (cm)</span>
                            <span />
                          </div>

                          {sizes.map((size) => {
                            const w = parseFloat(size.widthCm);
                            const h = parseFloat(size.heightCm);
                            const areaSqft = (w && h) ? ((w * h) / 900).toFixed(3) : null;
                            return (
                              <div key={size.id}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 32px', gap: 'var(--space-sm)', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    value={size.label}
                                    onChange={e => updateSize(size.id, 'label', e.target.value)}
                                    placeholder={autoLabel(size.widthCm, size.heightCm) || 'e.g. Small'}
                                    style={{ fontSize: '13px' }}
                                  />
                                  <input
                                    type="number"
                                    value={size.widthCm}
                                    onChange={e => updateSize(size.id, 'widthCm', e.target.value)}
                                    min="1"
                                    step="0.1"
                                    placeholder="40"
                                    style={{ fontSize: '13px' }}
                                  />
                                  <input
                                    type="number"
                                    value={size.heightCm}
                                    onChange={e => updateSize(size.id, 'heightCm', e.target.value)}
                                    min="1"
                                    step="0.1"
                                    placeholder="30"
                                    style={{ fontSize: '13px' }}
                                  />
                                  <button
                                    type="button"
                                    disabled={sizes.length === 1}
                                    onClick={() => removeSize(size.id)}
                                    style={{
                                      background: 'none', border: '1px solid var(--color-border)',
                                      borderRadius: 'var(--radius-sm)', cursor: sizes.length === 1 ? 'default' : 'pointer',
                                      opacity: sizes.length === 1 ? 0.4 : 1, color: 'var(--color-error)',
                                      fontWeight: 700, fontSize: '14px', padding: '4px', lineHeight: 1,
                                    }}
                                  >×</button>
                                </div>
                                {areaSqft && (
                                  <div className="text-xs text-muted" style={{ marginTop: '3px', paddingLeft: '2px' }}>
                                    Area: {areaSqft} sqft
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Print Material */}
                  <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: 'var(--space-sm)' }}>Print Material</label>
                    <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-sm)' }}>Select available print materials. Pricing is calculated for each enabled option.</p>
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
                    <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-sm)' }}>Select available frame materials.</p>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                      <button type="button" style={toggleBtn(useTeakwood)} onClick={() => setUseTeakwood(v => !v)}>
                        <span>{useTeakwood ? '☑' : '☐'}</span> Teakwood <span style={{ fontSize: '11px', opacity: 0.7 }}>₹5000/cu.ft</span>
                      </button>
                      <button type="button" style={toggleBtn(useAshwood)} onClick={() => setUseAshwood(v => !v)}>
                        <span>{useAshwood ? '☑' : '☐'}</span> Ashwood <span style={{ fontSize: '11px', opacity: 0.7 }}>₹3500/cu.ft</span>
                      </button>
                    </div>
                  </div>

                  {/* Pricing Multiplier */}
                  <div style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--color-bg-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: 'var(--space-xs)' }}>Pricing Multiplier</label>
                    <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-sm)' }}>
                      Final price before GST = Base Cost &times; Multiplier. Default is 3 (cost + artist royalty + company margin).
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Base Cost &times;</span>
                      <input type="number" value={multiplier} onChange={e => setMultiplier(e.target.value)}
                        min="1" max="20" step="0.1" style={{ width: '90px', fontWeight: 600, fontSize: '15px' }} />
                      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>+ 18% GST = Final Price</span>
                    </div>
                  </div>

                  {/* Pricing Preview Table */}
                  {calculatedPrices.length > 0 && (
                    <div style={{ marginTop: 'var(--space-lg)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                        <label style={{ fontWeight: 600, fontSize: '14px' }}>
                          Calculated Pricing Preview
                          <span className="text-xs text-muted" style={{ fontWeight: 400, marginLeft: '8px' }}>
                            {calculatedPrices.length} combination{calculatedPrices.length !== 1 ? 's' : ''}
                          </span>
                        </label>
                        <span className="text-xs text-muted">Click a row for breakdown</span>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: 'var(--color-bg-light)', borderBottom: '2px solid var(--color-border)' }}>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Size</th>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Print</th>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Frame</th>
                              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Printing</th>
                              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Framing</th>
                              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Add-ons</th>
                              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Pre-GST</th>
                              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>GST 18%</th>
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
                                    background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                                  }}
                                >
                                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                                    <span style={{ marginRight: '6px', fontSize: '10px', opacity: 0.5 }}>{expandedCombo === p.combo ? '▼' : '▶'}</span>
                                    {p.sizeLabel}
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>{p.printMaterial}</td>
                                  <td style={{ padding: '10px 12px' }}>{p.frameMaterial}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(p.printingCost)}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(p.framingCost)}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(p.addons)}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(p.priceBeforeGST)}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(p.gst)}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-accent)', fontSize: '14px' }}>{fmt(p.finalPrice)}</td>
                                </tr>
                                {expandedCombo === p.combo && (
                                  <tr key={`${p.combo}-exp`} style={{ background: 'var(--color-bg-light)', borderBottom: '1px solid var(--color-border)' }}>
                                    <td colSpan={9} style={{ padding: '14px 24px' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                                        <div>
                                          <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Printing</div>
                                          <div className="text-xs" style={{ lineHeight: 2 }}>
                                            <div>Dimensions: {p.widthCm}×{p.heightCm} cm</div>
                                            <div>Area: {((p.widthCm * p.heightCm) / 900).toFixed(4)} sqft</div>
                                            <div>Rate: ₹{p.printMaterial === 'Canvas' ? 120 : 90}/sqft ({p.printMaterial})</div>
                                            <div style={{ fontWeight: 600 }}>Total: {fmt(p.printingCost)}</div>
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Framing</div>
                                          <div className="text-xs" style={{ lineHeight: 2 }}>
                                            <div>Outer frame: {fmt(p.outerFrameCost)}</div>
                                            <div>Sub-frame (50%): {fmt(p.subFrameCost)}</div>
                                            <div>Labour: {fmt(p.laborCharge)}</div>
                                            <div>Setting: {fmt(p.settingCharge)}</div>
                                            <div>Polish: {fmt(p.polishCharge)}</div>
                                            <div>Subtotal: {fmt(p.framingSubtotal)}</div>
                                            <div>Partner margin (15%): {fmt(p.framingPartnerMargin)}</div>
                                            <div style={{ fontWeight: 600 }}>Total: {fmt(p.framingCost)}</div>
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Fixed Add-ons</div>
                                          <div className="text-xs" style={{ lineHeight: 2 }}>
                                            <div>Transportation: ₹500</div>
                                            <div>Packaging: ₹500</div>
                                            <div>Shipping: ₹1,500</div>
                                            <div style={{ fontWeight: 600 }}>Total: {fmt(p.addons)}</div>
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Internal (Admin only)</div>
                                          <div className="text-xs" style={{ lineHeight: 2 }}>
                                            <div>Base cost: {fmt(p.baseCost)}</div>
                                            <div>Multiplier: ×{multiplier}</div>
                                            <div>Pre-GST: {fmt(p.priceBeforeGST)}</div>
                                            <div>Artist royalty: {fmt(p.artistRoyalty)}</div>
                                            <div>Company margin: {fmt(p.companyMargin)}</div>
                                            <div>GST (18%): {fmt(p.gst)}</div>
                                            <div style={{ fontWeight: 700 }}>Final: {fmt(p.finalPrice)}</div>
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
                          <strong>How prices are saved:</strong> The lowest calculated price becomes the base price. All {calculatedPrices.length} combination prices are stored as variant modifiers and used at checkout.
                          <br />
                          <strong>Spec axes:</strong> Size ({validSizes.length}) × Print Material × Frame Material = {calculatedPrices.length} combinations · <strong>Formula:</strong> Base Cost &times; {multiplier || 3} + 18% GST
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Warning if selections incomplete */}
                  {calculatedPrices.length === 0 && validSizes.length > 0 && (
                    <div className="alert alert-error" style={{ fontSize: '13px' }}>
                      Select at least one print material and one frame material to calculate pricing.
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
              disabled={
                loading || uploading || !subCategoryId ||
                (pricingMode === 'specification' && calculatedPrices.length === 0)
              }
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
