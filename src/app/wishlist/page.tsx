export const dynamic = 'force-dynamic';
'use client';

import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function WishlistPage() {
  const { items, removeFromWishlist } = useWishlist();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="page-content">
        <div className="container empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <h2>Sign in to view your wishlist</h2>
          <p>Save your favourite pieces for later.</p>
          <Link href="/auth/signin" className="btn btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="page-content">
        <div className="container empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <h2>Your Wishlist is Empty</h2>
          <p>Browse our collections and save pieces you love.</p>
          <Link href="/" className="btn btn-primary">Browse Collections</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content fade-in">
      <div className="container">
        <h1 className="heading-serif" style={{ fontSize: '28px', marginBottom: 'var(--space-xl)', textAlign: 'center' }}>
          Your Wishlist
        </h1>
        <div className="product-grid">
          {items.map(item => (
            <div key={item.id} className="product-card">
              <Link href={`/product/${item.productId}`}>
                <div className="product-card-image">
                  <img src={item.image} alt={item.title} />
                </div>
                <h3 className="product-card-title">{item.title}</h3>
              </Link>
              <button
                className="btn-remove"
                onClick={() => removeFromWishlist(item.productId)}
                style={{ marginTop: 'var(--space-xs)' }}
              >
                Remove from wishlist
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
