'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, isValid } from 'date-fns';

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await fetch('/api/blogs');
        if (res.ok) {
          const data = await res.json();
          setBlogs(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isValid(d) ? format(d, 'MMMM dd, yyyy') : '';
  };

  if (!mounted || loading) return <div className="page-content" style={{ textAlign: 'center' }}><div className="spinner"></div></div>;

  return (
    <div className="page-content fade-in">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <h1 style={{ fontSize: '32px', letterSpacing: '2px', fontWeight: 300, marginBottom: 'var(--space-sm)' }}>
            THE JOURNAL
          </h1>
          <p className="text-secondary" style={{ maxWidth: '600px', margin: '0 auto' }}>
            Stories, insights, and updates from Galerie Varinchi.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 'var(--space-xl)'
        }}>
          {Array.isArray(blogs) && blogs.map(blog => (
            <Link key={blog.id} href={`/blogs/${blog.slug}`} style={{ textDecoration: 'none', color: 'inherit' }} prefetch={false}>
              <div style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
                backgroundColor: 'var(--color-bg-light)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {blog.coverImage ? (
                  <div style={{ width: '100%', height: '200px', backgroundImage: 'url(' + blog.coverImage + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                ) : (
                  <div style={{ width: '100%', height: '200px', backgroundColor: 'var(--color-border)' }} />
                )}
                <div style={{ padding: 'var(--space-md)' }}>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    {formatDate(blog.publishedAt)}
                  </p>
                  <h3 style={{ fontSize: '18px', marginBottom: '8px', lineHeight: 1.3 }}>{blog.title}</h3>
                  <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {blog.excerpt}
                  </p>
                  <div style={{ marginTop: '16px', fontSize: '13px', fontWeight: 600, color: 'var(--color-accent)' }}>
                    Read Article →
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {blogs.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 0' }}>
              <p className="text-secondary">No articles published yet. Check back soon!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
