'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { 
  ssr: false,
  loading: () => <div style={{ height: '400px', background: '#f5f5f5', borderRadius: '4px' }} />
});


export default function NewBlogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
   const [coverImage, setCoverImage] = useState('');
   const [uploading, setUploading] = useState(false);
   const [status, setStatus] = useState('DRAFT');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('[NewBlog] Component mounted');
    setMounted(true);
  }, []);

  const generateSlug = (str: string) => {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 5MB Limit
    if (file.size > 5 * 1024 * 1024) {
      alert('Cover image is too large. Max size is 5MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) setCoverImage(data.url);
      else alert('Upload failed: ' + data.error);
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSlug(generateSlug(newTitle));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, content, excerpt, coverImage, status })
      });

      if (res.ok) {
        router.push('/admin/blogs');
      } else {
        const data = await res.json();
        const errorMessage = data.error || 'Failed to create blog';
        setError(errorMessage + (data.details ? `: ${data.details}` : ''));
        console.error('[NewBlog] Submission failed:', data);
      }
    } catch (err: any) {
      setError('A network error occurred. Please check your connection or image sizes.');
      console.error('[NewBlog] Network error:', err);
    } finally {
      setLoading(false);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  if (!mounted) return null;

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '800px' }}>
        <div className="admin-header">
          <h1>New Blog Post</h1>
          <Link href="/admin/blogs" className="btn btn-secondary">Cancel</Link>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="profile-card">
          <div className="form-group">
            <label>Title</label>
            <input type="text" value={title} onChange={handleTitleChange} required placeholder="Post Title" />
          </div>

          <div className="form-group">
            <label>Slug</label>
            <input type="text" value={slug} onChange={e => setSlug(e.target.value)} required placeholder="post-url-slug" />
          </div>

          <div className="form-group">
            <label>Excerpt / Summary</label>
            <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={3} placeholder="Brief summary of the post..." />
          </div>

          <div className="form-group">
            <label>Cover Image</label>
            <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', marginBottom: '10px' }}>
              <input type="file" accept="image/*" onChange={handleImageUpload} />
              {uploading && <span className="spinner"></span>}
            </div>
            {coverImage && (
              <div style={{ position: 'relative', width: 'fit-content' }}>
                <img src={coverImage} alt="Cover Preview" style={{ height: '150px', objectFit: 'cover', borderRadius: '4px' }} />
                <button type="button" onClick={() => setCoverImage('')}
                  style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--color-error)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>×</button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Content</label>
            <div style={{ background: '#fff', color: '#000' }}>
              <QuillEditor value={content} onChange={setContent} modules={modules} style={{ height: '400px', marginBottom: '50px' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '2rem' }}>
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Blog Post'}
          </button>
        </form>
      </div>
    </div>
  );
}
