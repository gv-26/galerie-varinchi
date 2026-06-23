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
  frameMaterial: 'Teakwood' | 'Ashwood Light' | 'Ashwood Black',
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

  // Image Upload (global — used in Fixed mode)
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  // Fixed mode: which image is the main/cover photo
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);

  // Per-combo images (Specification mode)
  // comboImages: { [comboKey]: string[] }
  // comboMainPhoto: { [comboKey]: number } — index of main photo
  const [comboImages, setComboImages] = useState<Record<string, string[]>>({});
  const [comboMainPhoto, setComboMainPhoto] = useState<Record<string, number>>({});
  const [comboUploading, setComboUploading] = useState<Record<string, boolean>>({});

  // Frame Composer picker
  const [showFramePicker, setShowFramePicker] = useState(false);
  // pickerTargetCombo: null = fixed mode global images; string = spec mode combo key
  const [pickerTargetCombo, setPickerTargetCombo] = useState<string | null>(null);
  const [finishedImages, setFinishedImages] = useState<{ id: string; name: string; url: string; folderId?: string | null }[]>([]);
  const [folders, setFolders] = useState<{ id: string; name: string; parentId?: string | null; images: any[] }[]>([]);
  const [finishedLoading, setFinishedLoading] = useState(false);
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());
  const [pickerViewingFolderId, setPickerViewingFolderId] = useState<string | null>(null);
  const [pickerFolderPath, setPickerFolderPath] = useState<{ id: string; name: string }[]>([]);

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
  const [useAshwoodLight, setUseAshwoodLight] = useState(false);
  const [useAshwoodBlack, setUseAshwoodBlack] = useState(false);
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

  // Shipping metrics
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');

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

  // Upload images for a specific combo (spec mode)
  const handleComboImageUpload = async (combo: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    setComboUploading(prev => ({ ...prev, [combo]: true }));
    const uploadedUrls: string[] = [];
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const formData = new FormData();
        formData.append('file', selectedFiles[i]);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) uploadedUrls.push(data.url);
      }
      setComboImages(prev => ({ ...prev, [combo]: [...(prev[combo] || []), ...uploadedUrls] }));
    } catch {
      alert('Upload failed');
    } finally {
      setComboUploading(prev => ({ ...prev, [combo]: false }));
    }
  };

  // ── Frame Composer Picker Helpers ──────────────────────────────────────────
  const openFramePicker = async (comboKey: string | null = null) => {
    setPickerTargetCombo(comboKey);
    setShowFramePicker(true);
    setPickerSelected(new Set());
    setPickerViewingFolderId(null);
    if (finishedImages.length > 0 || folders.length > 0) return; // already loaded
    setFinishedLoading(true);
    try {
      const [resImg, resFold] = await Promise.all([
        fetch('/api/admin/processed-images'),
        fetch('/api/admin/processed-folders')
      ]);
      const dataImg = await resImg.json();
      const dataFold = await resFold.json();
      setFinishedImages(dataImg.processedImages || []);
      setFolders(dataFold.processedFolders || []);
    } catch {
      // silently ignore
    } finally {
      setFinishedLoading(false);
    }
  };

  const togglePickerImage = (url: string) => {
    setPickerSelected(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const confirmPickerSelection = () => {
    const newUrls = Array.from(pickerSelected);
    if (pickerTargetCombo !== null) {
      // Spec mode: add to combo
      setComboImages(prev => {
        const existing = prev[pickerTargetCombo] || [];
        const filtered = newUrls.filter(u => !existing.includes(u));
        return { ...prev, [pickerTargetCombo]: [...existing, ...filtered] };
      });
    } else {
      // Fixed mode: add to global images
      setImages(prev => [...prev, ...newUrls.filter(u => !prev.includes(u))]);
    }
    setShowFramePicker(false);
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
    const frames: Array<'Teakwood' | 'Ashwood Light' | 'Ashwood Black'> = [];
    if (useTeakwood) frames.push('Teakwood');
    if (useAshwoodLight) frames.push('Ashwood Light');
    if (useAshwoodBlack) frames.push('Ashwood Black');

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
  }, [sizes, useCanvas, usePaper, useTeakwood, useAshwoodLight, useAshwoodBlack, multiplier]);

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
    let finalShippingModifiers: Record<string, { weight: number; length: number; width: number; height: number }> = {};

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
      if (useAshwoodLight) frameOpts.push('Ashwood Light');
      if (useAshwoodBlack) frameOpts.push('Ashwood Black');
      const sizeOpts = validSizes.map(s => s.label.trim() || autoLabel(s.widthCm, s.heightCm));

      finalSpecs = [
        { name: 'Size', options: sizeOpts },
        { name: 'Print Material', options: printOpts },
        { name: 'Frame Material', options: frameOpts },
      ];

      finalBasePrice = Math.min(...calculatedPrices.map(p => p.finalPrice));
      for (const p of calculatedPrices) {
        finalPriceModifiers[p.combo] = Math.round(p.finalPrice);

        // Calculate shipping metrics for this combo based on size label
        const sizeLabel = p.combo.split(' | ')[0];
        const sizeObj = validSizes.find(s => (s.label.trim() || autoLabel(s.widthCm, s.heightCm)) === sizeLabel);
        if (sizeObj) {
          const wCm = parseFloat(sizeObj.widthCm) || 0;
          const hCm = parseFloat(sizeObj.heightCm) || 0;
          const l = Math.max(wCm, hCm) + 5;
          const w = Math.min(wCm, hCm) + 5;
          const h = 8;
          const vol = l * w * h;
          const wt = vol * 0.20708 / 1000; // Convert to kg to match fixed input
          finalShippingModifiers[p.combo] = { weight: Number(wt.toFixed(2)), length: l, width: w, height: h };
        }
      }
    }

    // Build images JSON
    let finalImageStr: string;
    if (pricingMode === 'specification') {
      // Store combo images as a control object as the first element
      const controlObj = { _combos: comboImages, _comboMain: comboMainPhoto };
      finalImageStr = JSON.stringify([JSON.stringify(controlObj)]);
    } else {
      // Fixed mode: reorder so main photo is first
      const reordered = [...images];
      if (mainPhotoIndex > 0 && mainPhotoIndex < reordered.length) {
        const [main] = reordered.splice(mainPhotoIndex, 1);
        reordered.unshift(main);
      }
      finalImageStr = JSON.stringify(reordered);
    }

    // Determine main image (cover)
    let mainImage = '/images/placeholder.jpg';
    if (pricingMode === 'specification') {
      // Use the main photo of the first combo that has images
      const firstComboWithImages = calculatedPrices.find(p => (comboImages[p.combo] || []).length > 0);
      if (firstComboWithImages) {
        const imgs = comboImages[firstComboWithImages.combo];
        const mainIdx = comboMainPhoto[firstComboWithImages.combo] || 0;
        mainImage = imgs[mainIdx] || imgs[0] || mainImage;
      }
    } else {
      const reordered = [...images];
      if (mainPhotoIndex > 0 && mainPhotoIndex < reordered.length) {
        const [main] = reordered.splice(mainPhotoIndex, 1);
        reordered.unshift(main);
      }
      mainImage = reordered[0] || mainImage;
    }

    const body = {
      title,
      description,
      image: mainImage,
      images: finalImageStr,
      subCategoryId,
      specifications: JSON.stringify(finalSpecs),
      basePrice: finalBasePrice,
      priceModifiers: JSON.stringify(finalPriceModifiers),
      shippingModifiers: JSON.stringify(finalShippingModifiers),
      unitsAvailable: hasUnits ? (parseInt(unitsAvailable) || 0) : null,
      requestId: requestId || undefined,
      artistProfileId: artistProfileId || null,
      weight: parseFloat(weight) || undefined,
      length: parseFloat(length) || undefined,
      width: parseFloat(width) || undefined,
      height: parseFloat(height) || undefined,
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
    <>
    {/* ── Frame Composer Picker Modal ── */}
    {showFramePicker && (
      <div
        id="fc-picker-modal"
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}
        onClick={() => setShowFramePicker(false)}
      >
        <div
          style={{
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
            width: '100%',
            maxWidth: '820px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {pickerFolderPath.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const newPath = [...pickerFolderPath];
                    newPath.pop();
                    setPickerFolderPath(newPath);
                    setPickerViewingFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
                  }}
                  style={{
                    padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer'
                  }}
                >
                  ← Back to {pickerFolderPath.length > 1 ? pickerFolderPath[pickerFolderPath.length - 2].name : 'Root'}
                </button>
              )}
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  {pickerFolderPath.length > 0 ? `🖼 Picking from folder: ${pickerFolderPath[pickerFolderPath.length - 1].name}` : '🖼 Pick from Frame Composer'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  Select one or more finished composited images to add to this product.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowFramePicker(false)}
              style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--color-text-muted)', lineHeight: 1 }}
            >×</button>
          </div>

          {/* Modal Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {(() => {
              const renderImageCard = (img: any) => {
                  const isSelected = pickerSelected.has(img.url);
                  const alreadyAdded = images.includes(img.url);
                  return (
                    <div
                      id={`fc-picker-img-${img.id}`}
                      key={img.id}
                      onClick={() => !alreadyAdded && togglePickerImage(img.url)}
                      style={{
                        border: `2.5px solid ${isSelected ? 'var(--color-accent)' : alreadyAdded ? 'var(--color-success, #22c55e)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        cursor: alreadyAdded ? 'default' : 'pointer',
                        position: 'relative',
                        transition: 'border-color 0.15s, transform 0.15s',
                        transform: isSelected ? 'scale(0.97)' : 'scale(1)',
                        opacity: alreadyAdded ? 0.6 : 1,
                      }}
                    >
                      <img src={img.url} alt={img.name} style={{ width: '100%', height: '150px', objectFit: 'cover', display: 'block' }} />
                      {isSelected && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--color-accent)', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>✓</div>
                      )}
                      {alreadyAdded && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--color-success, #22c55e)', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>✓</div>
                      )}
                      <div style={{ padding: '8px 10px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={img.name}>{img.name}</div>
                        {alreadyAdded && <div style={{ fontSize: '11px', color: 'var(--color-success, #22c55e)', marginTop: '2px' }}>Already added</div>}
                      </div>
                    </div>
                  );
              };

              if (finishedLoading) {
                 return (
                   <div style={{ textAlign: 'center', padding: '48px 0' }}>
                     <div className="spinner" />
                     <p style={{ marginTop: '12px', color: 'var(--color-text-muted)' }}>Loading…</p>
                   </div>
                 );
              }
              
              if (finishedImages.length === 0 && folders.length === 0) {
                 return (
                   <div style={{ textAlign: 'center', padding: '48px 0' }}>
                     <div style={{ fontSize: '40px', marginBottom: '12px' }}>✨</div>
                     <p style={{ fontWeight: 600, fontSize: '15px' }}>No finished images yet</p>
                     <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Go to Frame Composer to create composited images first.</p>
                   </div>
                 );
              }

              return (
                <>
                  {pickerViewingFolderId && (
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button type="button" onClick={() => {
                        const folderImgs = finishedImages.filter(i => i.folderId === pickerViewingFolderId);
                        const allUrls = folderImgs.map(img => img.url).filter(url => !images.includes(url));
                        setPickerSelected(prev => {
                          const next = new Set(prev);
                          allUrls.forEach(url => next.add(url));
                          return next;
                        });
                      }} style={{ fontSize: '13px', padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'none', cursor: 'pointer', fontWeight: 600 }}>Select All in Folder</button>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                    {folders.filter(f => (pickerViewingFolderId ? f.parentId === pickerViewingFolderId : !f.parentId)).map(folder => (
                      <div key={folder.id} onClick={() => { setPickerViewingFolderId(folder.id); setPickerFolderPath([...pickerFolderPath, { id: folder.id, name: folder.name }]); }} style={{ border: '2px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'pointer' }}>
                        <div style={{ width: '100%', height: '150px', background: 'var(--color-bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
                          📁
                        </div>
                        <div style={{ padding: '8px 10px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={folder.name}>
                            {folder.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{(finishedImages.filter(i => i.folderId === folder.id).length + folders.filter(f => f.parentId === folder.id).length)} items</div>
                        </div>
                      </div>
                    ))}
                    
                    {finishedImages.filter(img => (pickerViewingFolderId ? img.folderId === pickerViewingFolderId : !img.folderId)).map(renderImageCard)}
                    
                    {folders.filter(f => (pickerViewingFolderId ? f.parentId === pickerViewingFolderId : !f.parentId)).length === 0 && finishedImages.filter(img => (pickerViewingFolderId ? img.folderId === pickerViewingFolderId : !img.folderId)).length === 0 && (
                       <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Folder is empty.</div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Modal Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            background: 'var(--color-bg-light)',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              {pickerSelected.size > 0 ? `${pickerSelected.size} image${pickerSelected.size !== 1 ? 's' : ''} selected` : 'Click images to select'}
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowFramePicker(false)}
                style={{
                  padding: '9px 20px', border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', background: 'none',
                  cursor: 'pointer', fontSize: '14px',
                }}
              >Cancel</button>
              <button
                id="fc-picker-confirm-btn"
                type="button"
                disabled={pickerSelected.size === 0}
                onClick={confirmPickerSelection}
                style={{
                  padding: '9px 22px',
                  background: pickerSelected.size === 0 ? 'var(--color-border)' : 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: pickerSelected.size === 0 ? 'default' : 'pointer',
                  fontWeight: 700,
                  fontSize: '14px',
                  transition: 'background 0.2s',
                }}
              >
                Add {pickerSelected.size > 0 ? `${pickerSelected.size} ` : ''}Image{pickerSelected.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
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
                      <button type="button" style={toggleBtn(useAshwoodLight)} onClick={() => setUseAshwoodLight(v => !v)}>
                        <span>{useAshwoodLight ? '☑' : '☐'}</span> Ashwood Light <span style={{ fontSize: '11px', opacity: 0.7 }}>₹3500/cu.ft</span>
                      </button>
                      <button type="button" style={toggleBtn(useAshwoodBlack)} onClick={() => setUseAshwoodBlack(v => !v)}>
                        <span>{useAshwoodBlack ? '☑' : '☐'}</span> Ashwood Black <span style={{ fontSize: '11px', opacity: 0.7 }}>₹3500/cu.ft</span>
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

            {/* ── Product Images ── */}
            <div className="profile-card">
              <h3>Product Images</h3>
              {pricingMode === 'fixed' ? (
                <>
                  <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                    Upload images for this product. Click <strong>Set as Main</strong> to choose the cover photo shown in listings.
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageUpload} />
                    {uploading && <span className="spinner"></span>}
                  </div>
                  <div style={{ marginBottom: 'var(--space-sm)' }}>
                    <button
                      type="button"
                      onClick={() => openFramePicker(null)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '8px 16px', background: 'var(--color-bg-light)',
                        border: '1.5px dashed var(--color-accent)', borderRadius: 'var(--radius-md)',
                        color: 'var(--color-accent)', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      🖼 Pick from Frame Composer
                    </button>
                  </div>
                  {images.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                      {images.map((img, idx) => (
                        <div key={idx} style={{
                          position: 'relative', border: `2px solid ${mainPhotoIndex === idx ? 'var(--color-accent)' : 'var(--color-border)'}`,
                          borderRadius: 'var(--radius-sm)', overflow: 'hidden', transition: 'border-color 0.2s',
                        }}>
                          <img src={img} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }} />
                          {mainPhotoIndex === idx && (
                            <div style={{ position: 'absolute', top: '4px', left: '4px', background: 'var(--color-accent)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>★ Main</div>
                          )}
                          <div style={{ display: 'flex', gap: '4px', padding: '6px' }}>
                            <button type="button" onClick={() => setMainPhotoIndex(idx)}
                              style={{ flex: 1, fontSize: '11px', padding: '4px', border: `1px solid ${mainPhotoIndex === idx ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: '4px', background: mainPhotoIndex === idx ? 'rgba(var(--color-accent-rgb,100,80,60),0.1)' : 'none', color: mainPhotoIndex === idx ? 'var(--color-accent)' : 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: mainPhotoIndex === idx ? 700 : 400 }}>
                              {mainPhotoIndex === idx ? '★ Main' : 'Set Main'}
                            </button>
                            <button type="button" onClick={() => { setImages(prev => prev.filter((_, i) => i !== idx)); if (mainPhotoIndex === idx) setMainPhotoIndex(0); else if (mainPhotoIndex > idx) setMainPhotoIndex(prev => prev - 1); }}
                              style={{ width: '28px', fontSize: '14px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'none', cursor: 'pointer', color: 'var(--color-error)' }}>×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {images.length === 0 && (
                    <p className="text-sm text-muted" style={{ marginTop: 'var(--space-sm)' }}>No images uploaded yet.</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                    Upload separate images for each variant combination. Click <strong>Set as Main</strong> to select the cover photo for each variant.
                    {calculatedPrices.length === 0 && <span style={{ color: 'var(--color-error)', marginLeft: '6px' }}>Configure sizes and materials above first.</span>}
                  </p>
                  {calculatedPrices.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                      {calculatedPrices.map(p => {
                        const imgs = comboImages[p.combo] || [];
                        const mainIdx = comboMainPhoto[p.combo] || 0;
                        return (
                          <div key={p.combo} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                              <div>
                                <strong style={{ fontSize: '14px' }}>{p.combo}</strong>
                                <span className="text-xs text-muted" style={{ marginLeft: '8px' }}>{imgs.length} image{imgs.length !== 1 ? 's' : ''}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {comboUploading[p.combo] && <span className="spinner"></span>}
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--color-bg-light)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                                  📁 Upload
                                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} onChange={e => handleComboImageUpload(p.combo, e)} />
                                </label>
                                <button type="button" onClick={() => openFramePicker(p.combo)}
                                  style={{ padding: '6px 12px', background: 'var(--color-bg-light)', border: '1.5px dashed var(--color-accent)', borderRadius: 'var(--radius-md)', color: 'var(--color-accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                  🖼 Frame Composer
                                </button>
                              </div>
                            </div>
                            {imgs.length > 0 ? (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginTop: 'var(--space-sm)' }}>
                                {imgs.map((img, idx) => (
                                  <div key={idx} style={{
                                    position: 'relative', border: `2px solid ${mainIdx === idx ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                    borderRadius: 'var(--radius-sm)', overflow: 'hidden', transition: 'border-color 0.2s',
                                  }}>
                                    <img src={img} alt={`${p.combo} ${idx + 1}`} style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }} />
                                    {mainIdx === idx && (
                                      <div style={{ position: 'absolute', top: '4px', left: '4px', background: 'var(--color-accent)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>★ Main</div>
                                    )}
                                    <div style={{ display: 'flex', gap: '4px', padding: '5px' }}>
                                      <button type="button" onClick={() => setComboMainPhoto(prev => ({ ...prev, [p.combo]: idx }))}
                                        style={{ flex: 1, fontSize: '10px', padding: '3px', border: `1px solid ${mainIdx === idx ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: '4px', background: mainIdx === idx ? 'rgba(var(--color-accent-rgb,100,80,60),0.1)' : 'none', color: mainIdx === idx ? 'var(--color-accent)' : 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: mainIdx === idx ? 700 : 400 }}>
                                        {mainIdx === idx ? '★ Main' : 'Set Main'}
                                      </button>
                                      <button type="button" onClick={() => {
                                        setComboImages(prev => ({ ...prev, [p.combo]: (prev[p.combo] || []).filter((_, i) => i !== idx) }));
                                        if (mainIdx === idx) setComboMainPhoto(prev => ({ ...prev, [p.combo]: 0 }));
                                        else if (mainIdx > idx) setComboMainPhoto(prev => ({ ...prev, [p.combo]: mainIdx - 1 }));
                                      }}
                                        style={{ width: '26px', fontSize: '13px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'none', cursor: 'pointer', color: 'var(--color-error)' }}>×</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted" style={{ marginTop: '4px' }}>No images for this variant yet.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
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

            {/* ── Shipping & Dimensions ── */}
            <div className="profile-card">
              <h3>Shipping Metrics</h3>
              {pricingMode === 'fixed' ? (
                <>
                  <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-md)' }}>Required for automated courier assignment and accurate shipping rates.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)' }}>
                    <div className="form-group">
                      <label>Weight (kg)</label>
                      <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="0.5" />
                    </div>
                    <div className="form-group">
                      <label>Length (cm)</label>
                      <input type="number" step="1" value={length} onChange={e => setLength(e.target.value)} placeholder="30" />
                    </div>
                    <div className="form-group">
                      <label>Width (cm)</label>
                      <input type="number" step="1" value={width} onChange={e => setWidth(e.target.value)} placeholder="20" />
                    </div>
                    <div className="form-group">
                      <label>Height (cm)</label>
                      <input type="number" step="1" value={height} onChange={e => setHeight(e.target.value)} placeholder="5" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-md)' }}>Shipping metrics are automatically calculated based on product size.</p>
                  {validSizes.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                      {validSizes.map((sz, i) => {
                        const wCm = parseFloat(sz.widthCm) || 0;
                        const hCm = parseFloat(sz.heightCm) || 0;
                        const l = Math.max(wCm, hCm) + 5;
                        const w = Math.min(wCm, hCm) + 5;
                        const h = 8;
                        const vol = l * w * h;
                        const wt = vol * 0.20708;
                        const label = sz.label.trim() || autoLabel(sz.widthCm, sz.heightCm);

                        // Find how many items/combinations use this size
                        const matchingPrices = calculatedPrices.filter(p => p.combo.includes(label));
                        const itemCount = matchingPrices.length;
                        if (itemCount === 0) return null; // Only show if materials are selected
                        
                        const materials = matchingPrices.map(p => p.combo.split(' | ').slice(1).join(' | '));
                        const uniqueMaterials = Array.from(new Set(materials));

                        return (
                          <div key={i} style={{ 
                            padding: 'var(--space-sm) var(--space-md)', 
                            background: 'var(--color-bg-light)', 
                            border: '1px solid var(--color-border)', 
                            borderRadius: 'var(--radius-sm)' 
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '14px' }}>{label}</strong>
                              <span className="text-xs text-muted" style={{ fontWeight: 500 }}>
                                Weight: {(wt / 1000).toFixed(2)} kg
                              </span>
                            </div>
                            <div className="text-xs text-muted" style={{ marginBottom: '8px' }}>
                              Dimensions: {l}cm (L) × {w}cm (W) × {h}cm (H)
                            </div>
                            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              Applies to {itemCount} item{itemCount !== 1 ? 's' : ''}: {uniqueMaterials.join(', ')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: 'var(--space-md)' }}>
                      <p className="text-sm">Please add product sizes above to see calculated shipping metrics.</p>
                    </div>
                  )}
                </>
              )}
            </div>

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
    </>
  );
}

export default function AddProductPage() {
  return (
    <Suspense fallback={<div className="page-content" style={{ textAlign: 'center' }}><div className="spinner"></div></div>}>
      <AddProductContent />
    </Suspense>
  );
}
