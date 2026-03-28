'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  product: { title: string; category: string };
  quantity: number;
  medium: string | null;
  frameType: string | null;
  frameColor: string | null;
  price: number;
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  transactionId: string | null;
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  customerAddress: string | null;
  createdAt: string;
  items: OrderItem[];
  discountAmount?: number | null;
}

const TABS = [
  { key: 'NEW', label: 'New Orders' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'COMPLETED', label: 'Completed' },
];

const NEXT_STATUS: Record<string, string> = {
  NEW: 'PROCESSING',
  PROCESSING: 'COMPLETED',
};

const CATEGORY_LABELS: Record<string, string> = {
  ART_PRINT: 'Art Print',
  MIXED_MEDIA: 'Mixed Media',
  PHOTOGRAPH_PRINT: 'Photograph',
  HANDMADE_ART: 'Handmade',
};

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState('NEW');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?status=${activeTab}&limit=100`);
      const data = await res.json();
      setOrders(data.orders || []);
      setSelected(new Set());
    } catch (e) {
      console.error('Failed to fetch orders', e);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Client-side filtering
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Date filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter(o => new Date(o.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(o => new Date(o.createdAt) <= to);
    }

    // Search filter (customer name/email, product title, order ID)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => {
        const items = (o as any).orderItems || o.items || [];
        const productMatch = items.some((item: any) => item?.product?.title?.toLowerCase().includes(q));
        return (
          o.id.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.customerEmail?.toLowerCase().includes(q) ||
          o.transactionId?.toLowerCase().includes(q) ||
          productMatch
        );
      });
    }

    return result;
  }, [orders, dateFrom, dateTo, searchQuery]);

  const toggleSelectAll = () => {
    if (selected.size === (filteredOrders || []).length) {
      setSelected(new Set());
    } else {
      setSelected(new Set((filteredOrders || []).map(o => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelected(newSet);
  };

  const handleMove = async () => {
    const nextStatus = NEXT_STATUS[activeTab];
    if (!nextStatus || selected.size === 0) return;

    setMoving(true);
    try {
      await Promise.all(
        Array.from(selected).map(id =>
          fetch(`/api/orders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus }),
          })
        )
      );
      await fetchOrders();
    } catch (e) {
      console.error('Failed to move orders', e);
    } finally {
      setMoving(false);
    }
  };

  const handleExport = () => {
    window.open(`/api/orders/export?status=${activeTab}`, '_blank');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = searchQuery || dateFrom || dateTo;

  return (
    <div className="page-content fade-in">
      <div className="container">
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Link href="/admin" className="text-sm text-muted">← Back to Dashboard</Link>
        </div>
        <div className="admin-header">
          <h1>Order Management</h1>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              ↓ Export Excel
            </button>
            {NEXT_STATUS[activeTab] && selected.size > 0 && (
              <button className="btn btn-primary btn-sm" onClick={handleMove} disabled={moving}>
                {moving ? 'Moving...' : `Move to ${NEXT_STATUS[activeTab]} (${selected.size})`}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="profile-card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md) var(--space-lg)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 'var(--space-md)', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="text-xs text-muted">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by customer, product, order ID..."
                style={{ fontSize: '13px' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="text-xs text-muted">From Date</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ fontSize: '13px' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="text-xs text-muted">To Date</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ fontSize: '13px' }} />
            </div>
            {hasFilters && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ whiteSpace: 'nowrap' }}>
                ✕ Clear
              </button>
            )}
          </div>
          {hasFilters && (
            <p className="text-xs text-muted" style={{ marginTop: 'var(--space-sm)' }}>
              Showing {filteredOrders.length} of {orders.length} orders
            </p>
          )}
        </div>

        <div className="tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
            <div className="spinner"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <p>{hasFilters ? 'No orders match your filters.' : 'No orders in this category.'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selected.size === (filteredOrders || []).length && (filteredOrders || []).length > 0}
                      onChange={toggleSelectAll}
                      style={{ width: 16, height: 16 }}
                    />
                  </th>
                  <th>Order ID</th>
                  <th>Date & Time</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Details</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Transaction ID</th>
                </tr>
              </thead>
              <tbody>
                {(filteredOrders || []).map(order => {
                  const items = (order as any).orderItems || order.items || [];
                  return (items || []).map((item: any, idx: number) => {
                    return (
                      <tr key={`${order?.id || Math.random()}-${idx}`}>
                      <td>
                        {idx === 0 && (
                          <input
                            type="checkbox"
                            checked={selected.has(order.id)}
                            onChange={() => toggleSelect(order.id)}
                            style={{ width: 16, height: 16 }}
                          />
                        )}
                      </td>
                      <td className="text-xs" style={{ fontFamily: 'monospace, sans-serif' }}>
                        {idx === 0 ? order.id.substring(0, 8) + '...' : ''}
                      </td>
                      <td className="text-sm">
                        {idx === 0 && (
                          <>
                            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            <br />
                            <span className="text-muted">
                              {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        )}
                      </td>
                      <td>{item?.product?.title || 'Unknown'} × {item?.quantity || 0}</td>
                      <td className="text-xs">{CATEGORY_LABELS[item?.product?.category || ''] || item?.product?.category || '—'}</td>
                      <td className="text-xs text-muted">
                        {[item.medium, item.frameType, item.frameColor].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="text-xs">
                        {idx === 0 && (
                          <>
                            <strong>{order.customerName}</strong><br />
                            {order.customerEmail}<br />
                            {order.customerPhone && <>{order.customerPhone}<br /></>}
                            {order.customerAddress && <span className="text-muted">{order.customerAddress}</span>}
                          </>
                        )}
                      </td>
                      <td>
                        {idx === 0 && (
                          <>
                            ₹{order.totalAmount.toLocaleString()}
                            {order.discountAmount ? (
                              <span className="text-xs text-muted" style={{ display: 'block' }}>
                                -₹{order.discountAmount.toLocaleString()} discount
                              </span>
                            ) : null}
                          </>
                        )}
                      </td>
                      <td className="text-xs" style={{ fontFamily: 'monospace, sans-serif' }}>
                        {idx === 0 ? (order.transactionId || '—') : ''}
                      </td>
                    </tr>
                  );
                });
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
