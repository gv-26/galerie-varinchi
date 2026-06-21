import Link from 'next/link';
import styles from './page.module.css';
import TestimonialsClient from '@/components/TestimonialsClient';
import { db } from '@/db';
import { category as categorySchema, subCategory as subCategorySchema, product as productSchema, blogPost } from '@/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import ProductCard from '@/components/ProductCard';

// Safe JSON parse helper (mirrors server-side parseProduct)
function safeJsonParse(str: string | null): any {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

function getFirstImage(imagesJson: string, fallback: string): string {
  const parsed = safeJsonParse(imagesJson);
  if (Array.isArray(parsed) && parsed.length > 0) {
    // Check if first element is a control header
    try {
      const first = JSON.parse(parsed[0]);
      if (first && first._combos) {
        // Return first global image (index 1+)
        return parsed[1] || fallback;
      }
    } catch { /* not json, it's a URL */ }
    return parsed[0] || fallback;
  }
  return fallback;
}

export default async function Home() {
  // Fetch Art Prints products (first subcategory's products, up to 3)
  const artPrintsCategory = await db.query.category.findFirst({
    where: eq(categorySchema.slug, 'art-prints'),
    with: {
      subCategories: {
        orderBy: [asc(subCategorySchema.displayOrder)],
        with: {
          products: {
            where: eq(productSchema.status, 'active'),
            orderBy: [desc(productSchema.createdAt)],
            limit: 8,
          },
        },
      },
    },
  });

  // Flatten all Art Prints products and take first 8
  const artPrintProducts = (artPrintsCategory?.subCategories || [])
    .flatMap((s: any) => s.products || [])
    .slice(0, 8);

  // Fetch 3 latest published blog posts
  const recentBlogs = await db.query.blogPost.findMany({
    where: eq(blogPost.status, 'PUBLISHED'),
    orderBy: [desc(blogPost.publishedAt)],
    limit: 3,
  });

  return (
    <>
      {/* ── Section 1: Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroImageContainer}>
          <img
            src="/images/cover.png"
            alt="Close-up of mixed media artwork with gold leaf and ink"
            className={styles.heroImage}
          />
        </div>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Where art
            <br />
            finds home.
          </h1>
          <p className={styles.heroText}>
            A curated marketplace connecting collectors with contemporary artists.
            Discover art prints, mixed media, photography &amp; handmade originals.
          </p>
          <Link href="/category/art-prints" className="btn btn-white" style={{ padding: '14px 36px', fontSize: '12px' }}>
            Shop Now
          </Link>
        </div>
      </section>

      {/* ── Section 2: Art Prints ── */}
      <section className={styles.sectionSplit}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-2xl)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div>
              <span className={styles.overline}>Collection</span>
              <h2 className={styles.sectionTitle}>Art Prints</h2>
            </div>
          </div>

          {artPrintProducts.length > 0 ? (
            <div className="product-grid">
              {artPrintProducts.map((product: any) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  title={product.title}
                  image={getFirstImage(product.images, product.image)}
                  unitsAvailable={product.unitsAvailable}
                />
              ))}
            </div>
          ) : (
            <p className="text-secondary" style={{ textAlign: 'center', padding: '3rem 0' }}>
              New art prints coming soon.
            </p>
          )}

          {artPrintProducts.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-3xl)', paddingTop: 'var(--space-2xl)', borderTop: '1px solid var(--color-border-light)' }}>
              <Link href="/category/art-prints" className="btn btn-secondary" style={{ padding: '12px 32px' }}>
                View All Art Prints →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 3: Journal ── */}
      <section className={styles.sectionSplit} style={{ background: 'var(--color-bg-light)', paddingTop: 'var(--space-3xl)', paddingBottom: 'var(--space-3xl)' }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-2xl)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div>
              <span className={styles.overline}>Stories</span>
              <h2 className={styles.sectionTitle}>The Journal</h2>
            </div>
          </div>

          {recentBlogs.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-xl)' }}>
              {recentBlogs.map((blog: any) => (
                <Link key={blog.id} href={`/blogs/${blog.slug}`} style={{ textDecoration: 'none', color: 'inherit' }} prefetch={false}>
                  <div className={styles.journalCard}>
                    {blog.coverImage ? (
                      <div style={{ width: '100%', height: '180px', backgroundImage: `url(${blog.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    ) : (
                      <div style={{ width: '100%', height: '180px', backgroundColor: 'var(--color-border)' }} />
                    )}
                    <div style={{ padding: 'var(--space-md)' }}>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                      </p>
                      <h3 style={{ fontSize: '16px', marginBottom: '8px', lineHeight: 1.35, fontWeight: 500 }}>{blog.title}</h3>
                      {blog.excerpt && (
                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {blog.excerpt}
                        </p>
                      )}
                      <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: 600, color: 'var(--color-accent)' }}>Read →</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-secondary" style={{ textAlign: 'center', padding: '3rem 0' }}>
              Journal entries coming soon.
            </p>
          )}

          {recentBlogs.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-3xl)', paddingTop: 'var(--space-2xl)', borderTop: '1px solid var(--color-border)' }}>
              <Link href="/blogs" className="btn btn-secondary" style={{ padding: '12px 32px' }}>
                View All Journal Entries →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 4: Testimonials ── */}
      <TestimonialsClient />
    </>
  );
}
