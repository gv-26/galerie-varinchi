'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useState, useEffect } from 'react';

interface Category {
  name: string;
  slug: string;
}

export default function Navbar({ categories }: { categories: Category[] }) {
  const { user } = useAuth();
  const { totalItems: cartCount } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isArtist, setIsArtist] = useState(false);
  const [pendingAdminCount, setPendingAdminCount] = useState(0);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories || []);

  useEffect(() => {
    if (!categories || categories.length === 0) {
      fetch('/api/categories')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setLocalCategories(data.map((c: any) => ({ name: c.name, slug: c.slug })));
          }
        })
        .catch(console.error);
    } else {
      setLocalCategories(categories);
    }
  }, [categories]);

  useEffect(() => {
    if (user && !user.isAdmin) {
      fetch('/api/artist/profile')
        .then(res => res.json())
        .then(data => setIsArtist(!!data.profile))
        .catch(() => setIsArtist(false));
    } else {
      setIsArtist(false);
    }
    
    if (user && user.isAdmin) {
      fetch('/api/admin/artists/stats')
        .then(res => res.json())
        .then(data => {
          setPendingAdminCount((data.pendingArtists || 0) + (data.pendingArtworks || 0));
        })
        .catch(console.error);
    }
  }, [user]);

  return (
    <nav className="navbar">
      <div className="container">
        <Link href="/" className="nav-brand" style={{ fontFamily: '"GFS Didot", "Didot", serif', fontSize: '20px', letterSpacing: '0.04em', textTransform: 'none', fontWeight: 400 }}>
          Galerie Varinchi
        </Link>

        <button className="nav-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`nav-categories ${menuOpen ? 'open' : ''}`}>
          {localCategories.map(cat => (
            <Link key={cat.slug} href={`/category/${cat.slug}`} onClick={() => setMenuOpen(false)} style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, color: 'var(--color-text)' }}>
              {cat.name}
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          <Link href="/wishlist" className="nav-icon-btn" title="Wishlist">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" width={18} height={18}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            {wishlistCount > 0 && <span className="nav-badge" style={{ fontSize: '9px', padding: '2px 4px' }}>{wishlistCount}</span>}
          </Link>

          <Link href="/cart" className="nav-icon-btn" title="Cart">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" width={18} height={18}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {cartCount > 0 && <span className="nav-badge" style={{ fontSize: '9px', padding: '2px 4px' }}>{cartCount}</span>}
          </Link>

          {user && user.isAdmin && (
            <Link href="/admin" className="nav-admin-link" style={{ color: 'var(--color-accent)', fontWeight: 500, fontSize: '11px', position: 'relative' }}>
              Admin Dashboard
              {pendingAdminCount > 0 && <span className="nav-badge" style={{ position: 'absolute', top: '-6px', right: '-12px', fontSize: '9px', padding: '2px 4px', background: 'var(--color-error)' }}>{pendingAdminCount}</span>}
            </Link>
          )}

          {user && !user.isAdmin && isArtist && (
            <Link href="/artist/dashboard" className="nav-admin-link" style={{ color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '11px' }}>
              Artist Dashboard
            </Link>
          )}

          <Link href={user ? '/profile' : '/auth/signin'} className="nav-icon-btn" title={user ? 'Profile' : 'Sign In'}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" width={18} height={18}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </Link>
        </div>
      </div>
    </nav>
  );
}
