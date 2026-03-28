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

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);

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

  const discountAmount = couponApplied ? Math.round(totalPrice * discountPercent / 100) : 0;
  const finalTotal = totalPrice - discountAmount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok && data.discount) {
        setDiscountPercent(data.discount);
        setCouponApplied(true);
        setCouponError('');
      } else {
        setCouponError(data.error || 'Invalid or expired coupon code');
        setCouponApplied(false);
        setDiscountPercent(0);
      }
    } catch {
      setCouponError('Failed to validate coupon. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponApplied(false);
    setDiscountPercent(0);
    setCouponError('');
  };

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
          couponCode: couponApplied ? couponCode.trim().toUpperCase() : undefined,
          discountAmount,
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
          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: 'var(--space-xs)' }}>
              <span>Subtotal</span>
              <span>₹{totalPrice.toLocaleString()}</span>
            </div>
            {couponApplied && discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--color-success)', marginBottom: 'var(--space-xs)' }}>
                <span>Discount ({discountPercent}% off)</span>
                <span>- ₹{discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '16px', marginTop: 'var(--space-sm)' }}>
              <span>Total</span>
              <span>₹{finalTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Coupon Code */}
        <div className="profile-card">
          <h3>Coupon Code</h3>
          {!couponApplied ? (
            <div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                  style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                />
                <button
                  className="btn btn-secondary"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                >
                  {couponLoading ? <span className="spinner" style={{ width: '16px', height: '16px' }}></span> : 'Apply'}
                </button>
              </div>
              {couponError && <p style={{ color: 'var(--color-error)', fontSize: '13px', marginTop: 'var(--space-xs)' }}>{couponError}</p>}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>✓ {couponCode}</span>
                <span style={{ marginLeft: 'var(--space-sm)', fontSize: '13px', color: 'var(--color-success)' }}>
                  {discountPercent}% discount applied
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleRemoveCoupon}>Remove</button>
            </div>
          )}
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
          {loading ? <span className="spinner"></span> : `Place Order — ₹${finalTotal.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}
