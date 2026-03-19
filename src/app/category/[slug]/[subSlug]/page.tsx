export const runtime = 'edge';
import ProductCard from '@/components/ProductCard';
import { db } from '@/db';
import { category as categorySchema, subCategory as subCategorySchema, product as productSchema } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function SubCategoryPage({
  params,
}: {
  params: Promise<{ slug: string; subSlug: string }>;
}) {
  const { slug, subSlug } = await params;

  const category = await db.query.category.findFirst({
    where: eq(categorySchema.slug, slug),
    with: {
      subCategories: {
        where: eq(subCategorySchema.slug, subSlug),
        with: {
          products: {
            where: eq(productSchema.status, 'active'),
            orderBy: [desc(productSchema.createdAt)],
          },
        },
      },
    },
  });

  if (!category || category.subCategories.length === 0) {
    notFound();
  }

  const subCategory = category.subCategories[0];

  return (
    <div className="page-content fade-in">
      <div className="container">
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Link href={`/category/${category.slug}`} className="text-sm text-muted">
            ← Back to {category.name}
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <p className="text-uppercase text-muted" style={{ marginBottom: 'var(--space-sm)' }}>
            {category.name}
          </p>
          <h1 className="heading-serif" style={{ fontSize: '36px' }}>{subCategory.name}</h1>
        </div>

        {subCategory.products.length === 0 ? (
          <div className="empty-state">
            <h2>Coming Soon</h2>
            <p>New pieces are being added to this collection.</p>
          </div>
        ) : (
          <div className="product-grid">
            {subCategory.products.map((product: any) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                image={product.image}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
