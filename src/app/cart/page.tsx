'use client';

import { useCart } from '@/context/CartContext';
import QuantitySelector from '@/components/QuantitySelector';
import Link from 'next/link';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div className="page-content">
        <div className="container empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <h2>Your Cart is Empty</h2>
          <p>Looks like you haven&apos;t added any art to your cart yet.</p>
          <Link href="/" className="btn btn-primary">Browse Collections</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '800px' }}>
        <h1 className="heading-serif" style={{ fontSize: '28px', marginBottom: 'var(--space-xl)' }}>Your Cart</h1>

        {items.map(item => (
          <div key={item.id} className="cart-item">
            <div className="cart-item-image">
              <img src={item.image} alt={item.title} />
            </div>
            <div className="cart-item-details">
              <h3>{item.title}</h3>
              <div className="cart-item-meta">
                {item.medium && <span>Medium: {item.medium}</span>}
                {item.frameType && <span> · Frame: {item.frameType}</span>}
                {item.frameColor && <span> · Color: {item.frameColor}</span>}
              </div>
              <p style={{ fontWeight: 500 }}>₹{(item.price * item.quantity).toLocaleString()}</p>
              <div className="cart-item-actions">
                <QuantitySelector
                  quantity={item.quantity}
                  onChange={(qty) => updateQuantity(item.id, qty)}
                />
                <button className="btn-remove" onClick={() => removeFromCart(item.id)}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="cart-summary">
          <div className="cart-summary-row">
            <span>Subtotal ({items.length} item{items.length > 1 ? 's' : ''})</span>
            <span>₹{totalPrice.toLocaleString()}</span>
          </div>
          <div className="cart-summary-row">
            <span>Shipping</span>
            <span className="text-muted">Calculated at checkout</span>
          </div>
          <div className="cart-summary-row cart-summary-total">
            <span>Total</span>
            <span>₹{totalPrice.toLocaleString()}</span>
          </div>
          <Link
            href="/checkout"
            className="btn btn-primary btn-full"
            style={{ marginTop: 'var(--space-lg)' }}
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
