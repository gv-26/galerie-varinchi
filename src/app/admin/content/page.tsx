export const runtime = 'edge';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function AdminContentPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect('/auth/signin');

  return (
    <div className="page-content fade-in">
      <div className="container">
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <Link href="/admin" className="text-sm text-muted">← Back to Dashboard</Link>
        </div>
        <h1 style={{ marginBottom: 'var(--space-2xl)' }}>Website Content</h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 'var(--space-xl)',
        }}>
          <Link href="/admin/content/categories" className="profile-card" style={{ textDecoration: 'none' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Categories</h3>
            <p className="text-sm text-muted">Manage main categories shown in the navigation bar.</p>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <span className="btn btn-secondary btn-sm">Manage →</span>
            </div>
          </Link>

          <Link href="/admin/content/subcategories" className="profile-card" style={{ textDecoration: 'none' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Sub-categories</h3>
            <p className="text-sm text-muted">Manage groupings for your products under each category.</p>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <span className="btn btn-secondary btn-sm">Manage →</span>
            </div>
          </Link>

          <Link href="/admin/content/products" className="profile-card" style={{ textDecoration: 'none' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Products</h3>
            <p className="text-sm text-muted">Add new artworks and manage pricing & inventory.</p>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <span className="btn btn-secondary btn-sm">Manage →</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
