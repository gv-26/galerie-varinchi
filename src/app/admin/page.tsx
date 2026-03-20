import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user?.isAdmin) {
    redirect('/auth/signin');
  }

  return (
    <div className="page-content fade-in">
      <div className="container">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--space-xl)',
        }}>
          <Link href="/admin/content" className="profile-card" style={{ textDecoration: 'none', transition: 'box-shadow 0.2s' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Website Content</h3>
            <p className="text-sm text-muted">Manage categories, subcategories and products</p>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <span className="btn btn-primary btn-sm">Manage Content →</span>
            </div>
          </Link>

          <Link href="/admin/orders" className="profile-card" style={{ textDecoration: 'none', transition: 'box-shadow 0.2s' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Manage Orders</h3>
            <p className="text-sm text-muted">View and manage customer orders</p>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <span className="btn btn-secondary btn-sm">View Orders →</span>
            </div>
          </Link>

          <Link href="/admin/artists" className="profile-card" style={{ textDecoration: 'none', transition: 'box-shadow 0.2s' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Manage Artists</h3>
            <p className="text-sm text-muted">Review onboarding applications and artwork requests</p>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <span className="btn btn-accent btn-sm">Manage Artists →</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
