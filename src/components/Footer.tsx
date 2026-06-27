'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // Hide the public footer on admin and artist dashboard portals
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/artist')) {
    return null;
  }

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link href="/" className="footer-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <img src="/images/gv_logo.png?v=2" alt="Galerie Varinchi" style={{ height: '32px', width: 'auto', filter: 'invert(1)' }} />
            </Link>
            <p className="footer-description">
              Curated art for the discerning collector. Each piece is carefully selected to bring beauty and meaning to your space.
            </p>
          </div>

          <div>
            <h4>Information</h4>
            <div className="footer-links">
              <Link href="/about">About Us</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/return-policy">Return Policy</Link>
              <Link href="/shipping-policy">Shipping Policy</Link>
              <Link href="/faq">FAQ</Link>
              <Link href="/artist/signup" style={{ color: 'var(--color-primary)', fontWeight: 500 }}>Join as Artist</Link>
            </div>
          </div>

          <div>
            <h4>Contact</h4>
            <div className="footer-links">
              <Link href="/contact">Contact Us</Link>
              <a href="tel:+917259644702">+91 72596 44702</a>
              <a href="mailto:galerievarinchi@gmail.com">galerievarinchi@gmail.com</a>
              <span style={{ display: 'block', padding: 'var(--space-xs) 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>Kochi, Kerala</span>
            </div>
          </div>

          <div>
            <h4>Follow Us</h4>
            <div className="footer-links">
              <a href="https://www.instagram.com/galerievarinchi" target="_blank" rel="noopener noreferrer">Instagram</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Galerie Varinchi. All rights reserved.</span>
          <div className="footer-socials">
            <a href="https://www.instagram.com/galerievarinchi" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
