'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { format, isValid } from 'date-fns';

export default function AdminBlogsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('[AdminBlogs] Component mounted');
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log('[AdminBlogs] Auth State:', { authLoading, isAdmin: user?.isAdmin, email: user?.email });
    if (!authLoading && (!user || !user.isAdmin)) {
      console.warn('[AdminBlogs] Not authorized, redirecting to signin');
      router.push('/auth/signin');
    }
  }, [authLoading, user, router]);

  const fetchBlogs = async () => {
    console.log('[AdminBlogs] Fetching blogs...');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blogs');
      console.log('[AdminBlogs] Fetch status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[AdminBlogs] Received blogs:', Array.isArray(data) ? data.length : 'not an array');
        setBlogs(data);
      } else {
        const errText = await res.text();
        console.error('[AdminBlogs] Fetch error response:', errText);
        setError('Failed to fetch blogs: ' + res.status);
      }
    } catch (err) {
      console.error('[AdminBlogs] Fetch exception:', err);
      setError('Failed to fetch blogs due to network/system error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) fetchBlogs();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;
    try {
      await fetch(`/api/admin/blogs/${id}`, { method: 'DELETE' });
      fetchBlogs();
    } catch (e) {
      console.error(e);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isValid(d) ? format(d, 'MMM dd, yyyy') : 'Invalid Date';
  };

  if (!mounted) {
    console.log('[AdminBlogs] Not yet mounted, returning null');
    return null;
  }
  if (authLoading || loading) {
    console.log('[AdminBlogs] Loading state:', { authLoading, loading });
    return <div className="page-content" style={{ textAlign: 'center' }}><div className="spinner"></div></div>;
  }

  console.log('[AdminBlogs] Rendering list. Blogs count:', Array.isArray(blogs) ? blogs.length : 0);

  return (
    <div className="page-content fade-in">
      <div className="container">
        <div className="admin-header">
          <h1>Manage Blogs</h1>
          <Link href="/admin/blogs/new" className="btn btn-primary" prefetch={false}>+ New Blog Post</Link>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="table-responsive">
          <table className="cart-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(blogs) && blogs.map(blog => (
                <tr key={blog.id}>
                  <td>
                    <strong>{blog.title}</strong>
                    <br />
                    <small className="text-muted">{blog.slug}</small>
                  </td>
                  <td>
                    <span className={`status-badge ${blog.status === 'PUBLISHED' ? 'status-active' : 'status-pending'}`}>
                      {blog.status}
                    </span>
                  </td>
                  <td>
                    {formatDate(blog.createdAt)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/admin/blogs/${blog.id}`} className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }} prefetch={false}>Edit</Link>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }} onClick={() => handleDelete(blog.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {blogs.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No blog posts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
