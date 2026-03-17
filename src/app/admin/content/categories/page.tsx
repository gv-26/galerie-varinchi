'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
}

function toSlug(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data);
    } catch {
      setError('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) setSlug(toSlug(val));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    });

    const data = await res.json();
    setFormLoading(false);

    if (res.ok) {
      setName('');
      setSlug('');
      setSlugEdited(false);
      fetchCategories();
    } else {
      setError(data.error || 'Something went wrong');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmation = prompt(`WARNING: Deleting this category will also delete ALL its sub-categories and ALL the products under them.\n\nTo confirm deletion, please type the name of the category exactly: "${name}"`);
    if (confirmation !== name) {
      if (confirmation !== null) {
        alert('Category name did not match. Deletion cancelled.');
      }
      return;
    }
    
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    fetchCategories();
  };

  const handleSaveEdit = async (id: string) => {
    await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    });
    setEditingId(null);
    fetchCategories();
  };

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Link href="/admin/content" className="text-sm text-muted">← Back to Website Content</Link>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-2xl)' }}>
          <Link href="/admin/content/categories" className="btn btn-sm" style={{ background: '#e0e0e0', color: '#666', pointerEvents: 'none' }}>Categories</Link>
          <Link href="/admin/content/subcategories" className="btn btn-sm btn-secondary">Sub-categories</Link>
          <Link href="/admin/content/products" className="btn btn-sm btn-secondary">Products</Link>
        </div>

        <h1 style={{ marginBottom: 'var(--space-2xl)' }}>Categories</h1>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Add Category Form */}
        <div className="profile-card" style={{ marginBottom: 'var(--space-2xl)' }}>
          <h2 style={{ fontSize: '18px', marginBottom: 'var(--space-lg)' }}>Add New Category</h2>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Art Prints"
                required
              />
            </div>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>URL Slug</label>
              <input
                type="text"
                value={slug}
                onChange={e => { setSlug(e.target.value); setSlugEdited(true); }}
                placeholder="art-prints"
                required
                pattern="[a-z0-9-]+"
              />
            </div>
            <div style={{ flex: '0 0 auto', alignSelf: 'center', marginTop: 'var(--space-md)' }}>
              <button className="btn btn-primary" type="submit" disabled={formLoading} style={{ padding: '12px 24px' }}>
                {formLoading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </div>

        {/* Categories List */}
        <div className="profile-card">
          <h2 style={{ fontSize: '18px', marginBottom: 'var(--space-lg)' }}>Existing Categories</h2>
          {loading ? (
            <div className="spinner"></div>
          ) : categories.length === 0 ? (
            <p className="text-muted">No categories exist yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--space-md)', border: '1px solid var(--color-border-light)',
                  borderRadius: 'var(--radius-md)', background: 'var(--color-bg)'
                }}>
                  {editingId === cat.id ? (
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flex: 1, marginRight: 'var(--space-md)' }}>
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)} 
                        style={{ flex: 1 }}
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(cat.id)}>Save</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <strong>{cat.name}</strong>
                        <div className="text-xs text-muted">/category/{cat.slug}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}>Edit</button>
                        <button className="btn btn-sm" style={{ background: '#ffebee', color: '#b71c1c', border: 'none' }} onClick={() => handleDelete(cat.id, cat.name)}>
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
