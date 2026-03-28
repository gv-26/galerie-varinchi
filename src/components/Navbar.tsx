'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useState, useEffect } from 'react';

const categories = [
  { name: 'Art Prints', slug: 'art-prints' },
  { name: 'Mixed Media', slug: 'mixed-media' },
  { name: 'Photograph Print', slug: 'photograph-print' },
  { name: 'Handmade Art', slug: 'handmade-art' },
];

export default function Navbar() {
  const { user } = useAuth();
  const { totalItems: cartCount } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminPending, setAdminPending] = useState(0);

  useEffect(() => {
    if (!user?.isAdmin) return;
    fetch('/api/admin/artists/stats', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const total = (data.pendingArtists || 0) + (data.pendingArtworks || 0);
        setAdminPending(total);
      })
      .catch(() => {});
  }, [user]);

  return (
    <nav className="navbar">
      <div className="container">
        <Link href="/" className="nav-brand" style={{ fontFamily: '"GFS Didot", "Didot", serif', textTransform: 'none', fontSize: '20px', letterSpacing: '0.04em' }}>
          Galerie Varinchi
        </Link>

        <button className="nav-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`nav-categories ${menuOpen ? 'open' : ''}`}>
          {categories.map(cat => (
            <Link key={cat.slug} href={`/category/${cat.slug}`} onClick={() => setMenuOpen(false)}>
              {cat.name}
            </Link>
          ))}
          {user?.isAdmin && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} className="nav-mobile-only" style={{ position: 'relative' }}>
              Admin Dashboard
              {adminPending > 0 && (
                <span style={{ marginLeft: '6px', background: 'var(--color-error)', color: '#fff', borderRadius: '999px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>
                  {adminPending}
                </span>
              )}
            </Link>
          )}
        </div>

        <div className="nav-actions">
          <Link href="/wishlist" className="nav-icon-btn" title="Wishlist">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            {wishlistCount > 0 && <span className="nav-badge">{wishlistCount}</span>}
          </Link>

          <Link href="/cart" className="nav-icon-btn" title="Cart">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
          </Link>

          {user?.isAdmin && (
            <Link href="/admin" className="nav-admin-link" style={{ 
              fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
              background: 'var(--color-bg-alt)', padding: '6px 12px', borderRadius: '4px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              Admin
              {adminPending > 0 && (
                <span style={{ 
                  background: 'var(--color-error)', color: 'white', 
                  minWidth: '18px', height: '18px', borderRadius: '9px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px'
                }}>
                  {adminPending}
                </span>
              )}
            </Link>
          )}

          <Link href={user ? '/profile' : '/auth/signin'} className="nav-icon-btn" style={{ position: 'relative' }} title={user ? 'Profile' : 'Sign In'}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </Link>
        </div>
      </div>
    </nav>
  );
}

