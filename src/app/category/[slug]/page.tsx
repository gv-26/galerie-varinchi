export const runtime = 'edge';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Look up the category by slug from the DB
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      subCategories: {
        orderBy: { displayOrder: 'asc' },
        include: {
          products: {
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!category) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalProducts = category.subCategories.reduce((sum: number, s: any) => sum + s.products.length, 0);

  return (
    <div className="page-content fade-in">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <p className="text-uppercase text-muted" style={{ marginBottom: 'var(--space-sm)' }}>Collection</p>
          <h1 className="heading-serif" style={{ fontSize: '36px' }}>{category.name}</h1>
        </div>

        {totalProducts === 0 ? (
          <div className="empty-state">
            <h2>Coming Soon</h2>
            <p>New pieces are being added to this collection. Check back soon.</p>
          </div>
        ) : (
          category.subCategories.map((sub: any) => (
            sub.products.length === 0 ? null : (
              <div key={sub.id} style={{ marginBottom: 'var(--space-3xl)' }}>
                <div style={{ marginBottom: 'var(--space-xl)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'baseline', gap: 'var(--space-md)' }}>
                  <h2 style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 400 }}>{sub.name}</h2>
                  <span className="text-xs text-muted">{sub.products.length} piece{sub.products.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="product-grid">
                  {sub.products.slice(0, 3).map((product: any) => (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      title={product.title}
                      image={product.image}
                    />
                  ))}
                </div>
                {sub.products.length > 3 && (
                  <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center' }}>
                    <Link href={`/category/${category.slug}/${sub.slug}`} className="btn btn-secondary">
                      View all {sub.products.length} {sub.name} pieces →
                    </Link>
                  </div>
                )}
              </div>
            )
          ))
        )}
      </div>
    </div>
  );
}
