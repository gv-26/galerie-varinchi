'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');

  if (!user) {
    return (
      <div className="page-content">
        <div className="container empty-state">
          <h2>Sign in to checkout</h2>
          <p>You need to be signed in to place an order.</p>
          <Link href="/auth/signin" className="btn btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !orderPlaced) {
    return (
      <div className="page-content">
        <div className="container empty-state">
          <h2>Your cart is empty</h2>
          <p>Add some art to your cart first.</p>
          <Link href="/" className="btn btn-primary">Browse Collections</Link>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="page-content">
        <div className="container empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="var(--color-success)">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2>Order Placed Successfully!</h2>
          <p>Order ID: {orderId}</p>
          <p className="text-muted text-sm">A confirmation has been sent to your email.</p>
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginTop: 'var(--space-lg)' }}>
            <Link href="/profile" className="btn btn-secondary">View Orders</Link>
            <Link href="/" className="btn btn-primary">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            medium: item.medium,
            frameType: item.frameType,
            frameColor: item.frameColor,
            price: item.price,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrderId(data.order.id);
        setOrderPlaced(true);
        await clearCart();
      }
    } catch (error) {
      console.error('Order error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '600px' }}>
        <h1 className="heading-serif" style={{ fontSize: '28px', marginBottom: 'var(--space-xl)', textAlign: 'center' }}>
          Checkout
        </h1>

        <div className="profile-card">
          <h3>Order Summary</h3>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-sm) 0', fontSize: '14px' }}>
              <span>
                {item.title} × {item.quantity}
                {item.medium ? ` (${item.medium})` : ''}
                {item.frameType ? ` - ${item.frameType}` : ''}
              </span>
              <span style={{ fontWeight: 500 }}>₹{(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '16px' }}>
            <span>Total</span>
            <span>₹{totalPrice.toLocaleString()}</span>
          </div>
        </div>

        <div className="profile-card">
          <h3>Delivery Address</h3>
          {user.address ? (
            <p className="text-sm">{user.address}</p>
          ) : (
            <p className="text-sm text-muted">
              No address saved. <Link href="/profile" style={{ color: 'var(--color-accent)' }}>Add address</Link>
            </p>
          )}
        </div>

        <div className="profile-card" style={{ background: '#fdf8ed', border: '1px solid #f0e4c3' }}>
          <h3 style={{ color: 'var(--color-warning)' }}>Payment</h3>
          <p className="text-sm text-muted">
            Razorpay integration coming soon. Click &quot;Place Order&quot; to simulate a purchase.
          </p>
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={handlePlaceOrder}
          disabled={loading}
          style={{ marginTop: 'var(--space-lg)' }}
        >
          {loading ? <span className="spinner"></span> : `Place Order — ₹${totalPrice.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}
