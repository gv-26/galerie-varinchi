'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SubCategory {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  subCategories: SubCategory[];
}

interface Product {
  id: string;
  title: string;
}

export default function AddTestimonialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [subCategoryId, setSubCategoryId] = useState('');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  
  const [text, setText] = useState('');

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(data => {
      setCategories(data);
      if (data.length > 0) {
        setCategoryId(data[0].id);
        const subs = data[0].subCategories;
        setSubCategories(subs);
        if (subs.length > 0) {
          setSubCategoryId(subs[0].id);
        }
      }
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (subCategoryId) {
      fetch(`/api/products?subCategoryId=${subCategoryId}`)
        .then(r => r.json())
        .then(data => {
          if (!isMounted) return;
          const prods = data.products || [];
          setProducts(prods);
          setProductId(prods.length > 0 ? prods[0].id : '');
        });
    } else {
      setProducts([]);
      setProductId('');
    }
    return () => { isMounted = false; };
  }, [subCategoryId]);

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    const cat = categories.find(c => c.id === id);
    const subs = cat?.subCategories ?? [];
    setSubCategories(subs);
    setSubCategoryId(subs.length > 0 ? subs[0].id : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      setError('Please select a product');
      return;
    }
    if (!text.trim()) {
      setError('Please write a testimonial');
      return;
    }

    setLoading(true);
    setError('');

    const res = await fetch('/api/testimonials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, text }),
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push('/profile'), 2000);
    } else {
      const data = await res.json();
      setError(data.error || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '600px' }}>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Link href="/profile" className="text-sm text-muted">← Back to Profile</Link>
        </div>
        
        <h1 style={{ marginBottom: 'var(--space-xl)' }}>Add a Testimonial</h1>
        
        {success && <div className="alert alert-success">Thank you for your testimonial! Redirecting...</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="profile-card">
          <div className="form-group">
            <label>Category</label>
            <select value={categoryId} onChange={e => handleCategoryChange(e.target.value)}>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Sub-Category</label>
            <select value={subCategoryId} onChange={e => setSubCategoryId(e.target.value)} disabled={subCategories.length === 0}>
              {subCategories.length === 0 && <option value="">No sub-categories</option>}
              {subCategories.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Product</label>
            <select value={productId} onChange={e => setProductId(e.target.value)} disabled={products.length === 0}>
              {products.length === 0 && <option value="">No products found</option>}
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Your Testimonial</label>
            <textarea 
              value={text} 
              onChange={e => setText(e.target.value)} 
              rows={5} 
              placeholder="What did you love about this artwork?"
              required
            />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading || !productId}>
            {loading ? <span className="spinner"></span> : 'Submit Testimonial'}
          </button>
        </form>
      </div>
    </div>
  );
}
