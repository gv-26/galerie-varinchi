'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Product {
  id: string;
  title: string;
  status: string;
  basePrice: number;
  subCategory: {
    name: string;
    category: { name: string };
  };
}

interface GroupedProducts {
  [categoryName: string]: {
    [subCategoryName: string]: Product[];
  };
}

const STATUS_COLORS: Record<string, string> = {
  active: '#2e7d32',
  inactive: '#e65100',
  deleted: '#b71c1c',
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchProducts = async () => {
    const res = await fetch(`/api/products?includeInactive=true&t=${Date.now()}`);
    const data = await res.json();
    // Also fetch deleted products (separate call)
    setProducts(data.products || []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const changeStatus = async (id: string, status: string) => {
    setUpdating(id);
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      if (status === 'deleted') {
        setProducts(prev => prev.filter(p => p.id !== id));
      } else {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      }
    }
    setUpdating(null);
  };

  // Group products by category → subcategory
  const grouped: GroupedProducts = {};
  for (const p of products) {
    const catName = p.subCategory?.category?.name || 'Uncategorized';
    const subName = p.subCategory?.name || 'No Subcategory';
    if (!grouped[catName]) grouped[catName] = {};
    if (!grouped[catName][subName]) grouped[catName][subName] = [];
    grouped[catName][subName].push(p);
  }

  return (
    <div className="page-content fade-in">
      <div className="container">
        <div style={{ marginBottom: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/admin/content" className="text-sm text-muted">← Back to Website Content</Link>
          <Link href="/admin/add-product" className="btn btn-primary btn-sm">+ Add Product</Link>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-2xl)' }}>
          <Link href="/admin/content/categories" className="btn btn-sm btn-secondary">Categories</Link>
          <Link href="/admin/content/subcategories" className="btn btn-sm btn-secondary">Sub-categories</Link>
          <Link href="/admin/content/products" className="btn btn-sm" style={{ background: '#e0e0e0', color: '#666', pointerEvents: 'none' }}>Products</Link>
        </div>

        <h1 style={{ marginBottom: 'var(--space-2xl)' }}>Current Products</h1>

        {loading ? (
          <div style={{ textAlign: 'center' }}><div className="spinner"></div></div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <h2>No Products</h2>
            <p>Add your first product to get started.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([catName, subCats]) => (
            <div key={catName} style={{ marginBottom: 'var(--space-2xl)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-sm)', borderBottom: '2px solid var(--color-border)' }}>
                {catName}
              </h2>
              {Object.entries(subCats).map(([subName, prods]) => (
                <div key={subName} style={{ marginBottom: 'var(--space-xl)' }}>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
                    {subName}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {prods.map(product => (
                      <div key={product.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--space-md) var(--space-lg)',
                        border: '1px solid var(--color-border-light)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-bg)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: 8, height: 8, borderRadius: '50%',
                              background: STATUS_COLORS[product.status] || '#999',
                            }}
                          />
                          <span style={{ fontWeight: 500 }}>{product.title}</span>
                          <span className="text-sm text-muted">₹{product.basePrice.toLocaleString()}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                          {product.status !== 'active' && (
                            <button
                              className="btn btn-sm"
                              style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none' }}
                              disabled={updating === product.id}
                              onClick={() => changeStatus(product.id, 'active')}
                            >
                              Active
                            </button>
                          )}
                          {product.status !== 'inactive' && (
                            <button
                              className="btn btn-sm"
                              style={{ background: '#fff3e0', color: '#e65100', border: 'none' }}
                              disabled={updating === product.id}
                              onClick={() => changeStatus(product.id, 'inactive')}
                            >
                              Inactive
                            </button>
                          )}
                          <button
                            className="btn btn-sm"
                            style={{ background: '#ffebee', color: '#b71c1c', border: 'none' }}
                            disabled={updating === product.id}
                            onClick={() => {
                              if (confirm(`Delete "${product.title}"? This cannot be undone.`)) {
                                changeStatus(product.id, 'deleted');
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
