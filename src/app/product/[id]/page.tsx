'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import QuantitySelector from '@/components/QuantitySelector';

interface Specification {
  name: string;
  options: string[];
}

interface Product {
  id: string;
  title: string;
  description: string;
  image: string;
  images: string[];
  category: string;
  mediums: string[];
  frameTypes: string[];
  frameColors: string[];
  specifications?: Specification[];
  basePrice: number;
  priceModifiers: Record<string, any>;
  unitsAvailable: number | null;
  subCategory?: {
    category?: {
      slug: string;
      name: string;
    }
  };
}

/** Parse per-combo images from product.images array.
 *  If images[0] is a JSON object with _combos key, that contains combo-specific images.
 *  Otherwise treat as flat global image list.
 */
function parseProductImages(images: string[]): {
  globalImages: string[];
  comboImages: Record<string, string[]>;
  comboMain: Record<string, number>;
} {
  if (images.length > 0 && typeof images[0] === 'string') {
    try {
      const first = JSON.parse(images[0]);
      if (first && first._combos) {
        return {
          globalImages: images.slice(1),
          comboImages: first._combos || {},
          comboMain: first._comboMain || {},
        };
      }
    } catch { /* not JSON, treat as URL */ }
  }
  return { globalImages: images, comboImages: {}, comboMain: {} };
}

const CATEGORY_LABELS: Record<string, string> = {
  ART_PRINT: 'Art Print',
  MIXED_MEDIA: 'Mixed Media',
  PHOTOGRAPH_PRINT: 'Photograph Print',
  HANDMADE_ART: 'Handmade Art',
};

export default function ProductPage() {
  const router = useRouter();
  const { id } = useParams();
  const { items, addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Legacy states
  const [selectedMedium, setSelectedMedium] = useState<string>('');
  const [selectedFrame, setSelectedFrame] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');

  // Dynamic spec states
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});

  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  // Gallery state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data?.product || null);
        if (data?.product && Array.isArray(data.product.specifications) && data.product.specifications.length > 0) {
          const initialSpecs: Record<string, string> = {};
          data.product.specifications.forEach((s: any) => {
            if (s && s.name && Array.isArray(s.options) && s.options.length > 0) {
              initialSpecs[s.name] = s.options[0];
            }
          });
          setSelectedSpecs(initialSpecs);
        } else {
          if (data.product.mediums?.length > 0) setSelectedMedium(data.product.mediums[0]);
          if (data.product.frameTypes?.length > 0) setSelectedFrame(data.product.frameTypes[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // Reset gallery index when combo changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedSpecs, selectedMedium, selectedFrame]);

  if (loading) {
    return (
      <div className="page-content" style={{ textAlign: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-content">
        <div className="container empty-state">
          <h2>Product Not Found</h2>
          <p>This product may have been removed or doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  const hasDynamicSpecs = Array.isArray(product.specifications) && product.specifications.length > 0;

  const calculatePrice = () => {
    let price = product.basePrice;
    const modifiers = product.priceModifiers;

    if (hasDynamicSpecs) {
      const comboName = (product?.specifications || []).map((s: any) => selectedSpecs[s?.name] || '').filter(Boolean).join(' | ');
      if (modifiers && modifiers[comboName] !== undefined) return Number(modifiers[comboName]);
      return price;
    }

    const mPart = selectedMedium || '';
    const fPart = selectedFrame && selectedFrame !== 'colored' ? selectedFrame : (selectedFrame === 'colored' ? 'colored' : '');
    const key = `${mPart}-${fPart}`;
    if (modifiers && modifiers[key] !== undefined) return Number(modifiers[key]);
    if (selectedMedium && modifiers?.medium?.[selectedMedium]) price += modifiers.medium[selectedMedium];
    if (selectedFrame && modifiers?.frameType?.[selectedFrame]) price += modifiers.frameType[selectedFrame];
    return price;
  };

  const currentPrice = calculatePrice();
  const wishlisted = isWishlisted(product.id);

  const isArtPrint = product.subCategory?.category?.slug === 'art-prints' || product.category === 'ART_PRINT';
  const isPhotoPrint = product.subCategory?.category?.slug === 'photograph-print' || product.category === 'PHOTOGRAPH_PRINT';
  const hasLegacyFrameOptions = !hasDynamicSpecs && (isArtPrint || isPhotoPrint);
  const hasLegacyMediumOptions = hasLegacyFrameOptions && product.mediums.length > 0;
  const showLegacyColorPicker = selectedFrame === 'colored';

  // Determine images to display
  const { globalImages, comboImages, comboMain } = parseProductImages(product.images || []);
  const comboKey = hasDynamicSpecs
    ? (product?.specifications || []).map((s: any) => selectedSpecs[s?.name] || '').filter(Boolean).join(' | ')
    : '';
  const rawImages: string[] =
    hasDynamicSpecs && comboKey && comboImages[comboKey]?.length > 0
      ? comboImages[comboKey]
      : globalImages.length > 0 ? globalImages : [product.image].filter(Boolean);

  // Put main photo first
  const mainIdx = hasDynamicSpecs && comboKey ? (comboMain[comboKey] ?? 0) : 0;
  const sortedImages: string[] = rawImages.length > 0
    ? [rawImages[mainIdx] || rawImages[0], ...rawImages.filter((_, i) => i !== mainIdx)]
    : [product.image].filter(Boolean);

  const clampedIndex = Math.min(currentImageIndex, Math.max(0, sortedImages.length - 1));
  const displayImage = sortedImages[clampedIndex] || product.image;

  const handleAddToCart = async () => {
    let optionsPayload = {};
    if (hasDynamicSpecs) {
      optionsPayload = { selectedOptions: JSON.stringify(selectedSpecs), medium: null, frameType: null, frameColor: null };
    } else {
      optionsPayload = { medium: selectedMedium || null, frameType: selectedFrame || null, frameColor: showLegacyColorPicker ? selectedColor : null };
    }
    await addToCart({ productId: product.id, title: product.title, image: displayImage, quantity, price: currentPrice, ...optionsPayload } as any);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleWishlistToggle = async () => {
    if (wishlisted) await removeFromWishlist(product.id);
    else await addToWishlist(product.id, product.title, displayImage);
  };

  return (
    <div className="page-content fade-in">
      <div className="container">
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-muted"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ← Back
          </button>
        </div>
        <div className="product-detail">
          {/* Image Gallery */}
          <div className="product-image-main" style={{ position: 'relative' }}>
            <img src={displayImage} alt={product.title} style={{ width: '100%', display: 'block' }} />

            {sortedImages.length > 1 && (
              <>
                {/* Prev arrow */}
                <button
                  onClick={() => setCurrentImageIndex(i => Math.max(0, i - 1))}
                  disabled={clampedIndex === 0}
                  aria-label="Previous image"
                  style={{
                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.88)', border: 'none', borderRadius: '50%',
                    width: '40px', height: '40px', cursor: clampedIndex === 0 ? 'default' : 'pointer',
                    fontSize: '22px', fontWeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: clampedIndex === 0 ? 0.3 : 1,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.18)', transition: 'opacity 0.2s',
                  }}
                >‹</button>

                {/* Next arrow */}
                <button
                  onClick={() => setCurrentImageIndex(i => Math.min(sortedImages.length - 1, i + 1))}
                  disabled={clampedIndex === sortedImages.length - 1}
                  aria-label="Next image"
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.88)', border: 'none', borderRadius: '50%',
                    width: '40px', height: '40px', cursor: clampedIndex === sortedImages.length - 1 ? 'default' : 'pointer',
                    fontSize: '22px', fontWeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: clampedIndex === sortedImages.length - 1 ? 0.3 : 1,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.18)', transition: 'opacity 0.2s',
                  }}
                >›</button>

                {/* Image counter */}
                <div style={{
                  position: 'absolute', bottom: '12px', right: '12px',
                  background: 'rgba(0,0,0,0.52)', color: '#fff',
                  borderRadius: '999px', fontSize: '12px', padding: '3px 10px', fontWeight: 500,
                }}>
                  {clampedIndex + 1} / {sortedImages.length}
                </div>
              </>
            )}

            {/* Thumbnail strip */}
            {sortedImages.length > 1 && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                {sortedImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    aria-label={`View image ${idx + 1}`}
                    style={{
                      width: '60px', height: '60px', padding: 0,
                      border: `2px solid ${idx === clampedIndex ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer',
                      background: 'none', transition: 'border-color 0.2s', flexShrink: 0,
                    }}
                  >
                    <img src={imgUrl} alt={`View ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-info">
            <p className="text-uppercase text-muted" style={{ marginBottom: 'var(--space-sm)' }}>
              {product.subCategory?.category?.name || CATEGORY_LABELS[product.category] || product.category}
            </p>
            {(product as any).artistProfile && (
              <p className="text-sm" style={{ marginBottom: 'var(--space-sm)' }}>
                By{' '}
                <Link href={`/artist/${(product as any).artistProfile.id}`} style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
                  {(product as any).artistProfile.fullName}
                </Link>
              </p>
            )}
            <h1>{product.title}</h1>
            <p className="price">₹{currentPrice.toLocaleString()}</p>
            <p className="description">{product.description}</p>

            {hasDynamicSpecs ? (
              (product?.specifications || []).map((spec: any) => (
                <div key={spec?.name} className="option-group">
                  <label>{spec?.name}</label>
                  <div className="option-pills">
                    {(spec?.options || []).map((opt: string) => (
                      <button
                        key={opt}
                        className={`option-pill ${selectedSpecs[spec.name] === opt ? 'selected' : ''}`}
                        onClick={() => setSelectedSpecs(prev => ({ ...prev, [spec.name]: opt }))}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <>
                {hasLegacyMediumOptions && (
                  <div className="option-group">
                    <label>Medium</label>
                    <div className="option-pills">
                      {(product?.mediums || []).map(medium => (
                        <button
                          key={medium}
                          className={`option-pill ${selectedMedium === medium ? 'selected' : ''}`}
                          onClick={() => setSelectedMedium(medium)}
                        >
                          {medium.charAt(0).toUpperCase() + medium.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {hasLegacyFrameOptions && product.frameTypes.length > 0 && (
                  <div className="option-group">
                    <label>Frame Type</label>
                    <div className="option-pills">
                      {(product?.frameTypes || []).map(frame => (
                        <button
                          key={frame}
                          className={`option-pill ${selectedFrame === frame ? 'selected' : ''}`}
                          onClick={() => { setSelectedFrame(frame); if (frame !== 'colored') setSelectedColor(''); }}
                        >
                          {frame.charAt(0).toUpperCase() + frame.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {showLegacyColorPicker && product.frameColors.length > 0 && (
                  <div className="option-group">
                    <label>Frame Color</label>
                    <div className="color-swatches">
                      {(product?.frameColors || []).map(color => (
                        <button
                          key={color}
                          className={`color-swatch ${selectedColor === color ? 'selected' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setSelectedColor(color)}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {product.unitsAvailable !== null && (
              <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                {product.unitsAvailable > 0 ? `${product.unitsAvailable} units available` : 'Out of stock'}
              </p>
            )}

            <div className="option-group">
              <label>Quantity</label>
              <QuantitySelector quantity={quantity} onChange={setQuantity} max={product.unitsAvailable ?? undefined} />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-xl)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-md)', flex: 1 }}>
                <button
                  className={`btn ${addedToCart ? 'btn-accent' : 'btn-primary'} btn-full`}
                  style={{ flex: 1 }}
                  onClick={handleAddToCart}
                  disabled={product.unitsAvailable !== null && product.unitsAvailable === 0}
                >
                  {addedToCart ? '✓ Added to Cart' : 'Add to Cart'}
                </button>
                {items && items.length > 0 && (
                  <Link href="/cart" style={{ flex: 1, textDecoration: 'none' }}>
                    <button className="btn btn-secondary btn-full" style={{ width: '100%', height: '100%' }}>
                      Checkout
                    </button>
                  </Link>
                )}
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleWishlistToggle}
                title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                style={{ padding: '12px 16px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill={wishlisted ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>
            </div>

            {!user && (
              <p className="text-xs text-muted" style={{ marginTop: 'var(--space-sm)', textAlign: 'center' }}>
                Sign in to save items to your wishlist
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
