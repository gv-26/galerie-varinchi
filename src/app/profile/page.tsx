'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: { product: { title: string }; quantity: number }[];
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout, refreshUser } = useAuth();
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [ordersLimit, setOrdersLimit] = useState(10);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [prevUser, setPrevUser] = useState(user);

  if (user !== prevUser) {
    setPrevUser(user);
    if (user) {
      setAddress(user.address || '');
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }

  useEffect(() => {
    if (user) {
      fetch(`/api/orders?limit=${ordersLimit}`)
        .then(res => res.json())
        .then(data => {
          setOrders(data.orders || []);
          setTotalOrders(data.total || 0);
        });
    }
  }, [user, ordersLimit]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="page-content" style={{ textAlign: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSaveProfile = async () => {
    setSaving(true);
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, address }),
    });

    if (res.ok) {
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  const STATUS_LABELS: Record<string, string> = {
    NEW: 'Order Placed',
    PROCESSING: 'Processing',
    COMPLETED: 'Completed',
  };

  return (
    <div className="page-content fade-in">
      <div className="container profile-section">
        <div className="profile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Your Profile</h1>
            <p className="text-muted">{user.email}</p>
          </div>
          <div>
            <Link href="/profile/add-testimonial" className="btn btn-secondary btn-sm">Add Testimonial</Link>
          </div>
        </div>

        <div className="profile-card">
          <h3>Personal Information</h3>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Your phone number"
            />
          </div>
          <div className="form-group">
            <label>Delivery Address</label>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Enter your delivery address"
              rows={3}
            />
          </div>
          <button
            className={`btn ${saved ? 'btn-accent' : 'btn-primary'} btn-sm`}
            onClick={handleSaveProfile}
            disabled={saving}
          >
            {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="profile-card">
          <h3>Recent Orders</h3>
          {orders.length === 0 ? (
            <p className="text-muted text-sm">No orders yet. <Link href="/" style={{ color: 'var(--color-accent)' }}>Browse our collections</Link></p>
          ) : (
            <>
              {orders.map(order => (
                <div key={order.id} style={{
                  padding: 'var(--space-md) 0',
                  borderBottom: '1px solid var(--color-border-light)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                    <span className="text-sm" style={{ fontWeight: 500 }}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-uppercase" style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: order.status === 'COMPLETED' ? '#f0f7f1' : order.status === 'PROCESSING' ? '#fdf8ed' : 'var(--color-bg-alt)',
                      color: order.status === 'COMPLETED' ? 'var(--color-success)' : order.status === 'PROCESSING' ? 'var(--color-warning)' : 'var(--color-text-secondary)',
                    }}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <p className="text-sm text-muted">
                    {order.items.map(item => `${item.product.title} × ${item.quantity}`).join(', ')}
                  </p>
                  <p className="text-sm" style={{ fontWeight: 500 }}>₹{order.totalAmount.toLocaleString()}</p>
                </div>
              ))}

              {totalOrders > ordersLimit && (
                <button
                  className="btn btn-ghost btn-sm btn-full"
                  onClick={() => setOrdersLimit(prev => prev + 10)}
                  style={{ marginTop: 'var(--space-md)' }}
                >
                  View More Orders
                </button>
              )}
            </>
          )}
        </div>

        <button
          className="btn btn-secondary btn-full"
          onClick={handleSignOut}
          style={{ marginTop: 'var(--space-lg)' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
