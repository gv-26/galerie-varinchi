'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SubCategory {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  subCategories: SubCategory[];
}

function toSlug(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function SubcategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [categoryId, setCategoryId] = useState('');
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
      if (data.length > 0 && !categoryId) setCategoryId(data[0].id);
    } catch {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) setSlug(toSlug(val));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      setError('Please select a category first');
      return;
    }

    setFormLoading(true);
    setError('');

    const res = await fetch('/api/subcategories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, categoryId }),
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
    const confirmation = prompt(`WARNING: Deleting this sub-category will also delete ALL the products under it.\n\nTo confirm deletion, please type the name of the sub-category exactly: "${name}"`);
    if (confirmation !== name) {
      if (confirmation !== null) {
        alert('Sub-category name did not match. Deletion cancelled.');
      }
      return;
    }
    
    await fetch(`/api/subcategories/${id}`, { method: 'DELETE' });
    fetchCategories();
  };

  const handleSaveEdit = async (id: string) => {
    await fetch(`/api/subcategories/${id}`, {
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
          <Link href="/admin/content/categories" className="btn btn-sm btn-secondary">Categories</Link>
          <Link href="/admin/content/subcategories" className="btn btn-sm" style={{ background: '#e0e0e0', color: '#666', pointerEvents: 'none' }}>Sub-categories</Link>
          <Link href="/admin/content/products" className="btn btn-sm btn-secondary">Products</Link>
        </div>

        <h1 style={{ marginBottom: 'var(--space-2xl)' }}>Sub-categories</h1>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Add SubCategory Form */}
        <div className="profile-card" style={{ marginBottom: 'var(--space-2xl)' }}>
          <h2 style={{ fontSize: '18px', marginBottom: 'var(--space-lg)' }}>Add New Sub-category</h2>
          {categories.length === 0 ? (
            <p className="text-muted">You must create a category first.</p>
          ) : (
            <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) minmax(150px, 1fr) minmax(150px, 1fr) auto', gap: 'var(--space-md)', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Parent Category</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Abstract"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>URL Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={e => { setSlug(e.target.value); setSlugEdited(true); }}
                  placeholder="abstract"
                  required
                  pattern="[a-z0-9-]+"
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={formLoading} style={{ padding: '12px 24px' }}>
                {formLoading ? 'Adding...' : 'Add'}
              </button>
            </form>
          )}
        </div>

        {/* Categories & Subcategories List */}
        <div className="profile-card">
          <h2 style={{ fontSize: '18px', marginBottom: 'var(--space-lg)' }}>Existing Sub-categories</h2>
          {loading ? (
            <div className="spinner"></div>
          ) : categories.length === 0 ? (
            <p className="text-muted">No categories exist yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
              {categories.map(cat => (
                <div key={cat.id}>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-sm)' }}>
                    {cat.name}
                  </h3>
                  {cat.subCategories.length === 0 ? (
                    <p className="text-sm text-muted" style={{ paddingLeft: 'var(--space-md)' }}>No subcategories.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                      {cat.subCategories.map(sub => (
                        <div key={sub.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: 'var(--space-sm) var(--space-md)', border: '1px solid var(--color-border-light)',
                          borderRadius: 'var(--radius-md)', background: 'var(--color-bg)'
                        }}>
                          {editingId === sub.id ? (
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', flex: 1, marginRight: 'var(--space-md)' }}>
                              <input 
                                type="text" 
                                value={editName} 
                                onChange={e => setEditName(e.target.value)} 
                                style={{ flex: 1 }}
                              />
                              <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(sub.id)}>Save</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                            </div>
                          ) : (
                            <>
                              <div>
                                <strong>{sub.name}</strong>
                                <span className="text-xs text-muted" style={{ marginLeft: 'var(--space-sm)' }}>slug: {sub.slug}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => { setEditingId(sub.id); setEditName(sub.name); }}>Edit</button>
                                <button className="btn btn-sm" style={{ background: '#ffebee', color: '#b71c1c', border: 'none' }} onClick={() => handleDelete(sub.id, sub.name)}>
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
