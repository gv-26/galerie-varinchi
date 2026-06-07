'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import parse from 'html-react-parser';

export default function SingleBlogPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('[SingleBlog] Component mounted');
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const res = await fetch(`/api/blogs/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setBlog(data);
        } else {
          router.push('/blogs');
        }
      } catch (e) {
        console.error(e);
        router.push('/blogs');
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchBlog();
  }, [slug, router]);

  if (!mounted) return null;
  if (loading) return <div className="page-content" style={{ textAlign: 'center' }}><div className="spinner"></div></div>;
  if (!blog) return null;

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '800px' }}>
        <Link href="/blogs" style={{ textDecoration: 'none', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
          ← Back to Journal
        </Link>
        
        <header style={{ marginBottom: 'var(--space-2xl)', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '16px' }}>
            {blog.publishedAt ? format(new Date(blog.publishedAt), 'MMMM dd, yyyy') : ''}
          </p>
          <h1 style={{ fontSize: '42px', fontWeight: 300, lineHeight: 1.2, marginBottom: '24px' }}>
            {blog.title}
          </h1>
          {blog.excerpt && (
            <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto' }}>
              {blog.excerpt}
            </p>
          )}
        </header>

        {blog.coverImage && (
          <div style={{ marginBottom: 'var(--space-2xl)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <img src={blog.coverImage} alt={blog.title} style={{ width: '100%', maxHeight: '500px', objectFit: 'cover' }} />
          </div>
        )}

        {/* Use the ql-editor class to get proper styling for the react-quill output */}
        <div className="ql-snow">
          <div className="ql-editor" style={{ padding: 0, fontSize: '16px', lineHeight: 1.8, color: 'var(--color-text)' }}>
            {parse(blog.content)}
          </div>
        </div>
      </div>
    </div>
  );
}
