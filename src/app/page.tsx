import Link from 'next/link';

const categories = [
  { name: 'Art Prints', slug: 'art-prints', description: 'Museum-quality prints on premium materials' },
  { name: 'Mixed Media', slug: 'mixed-media', description: 'Unique multi-material artworks' },
  { name: 'Photograph Print', slug: 'photograph-print', description: 'Fine art photography prints' },
  { name: 'Handmade Art', slug: 'handmade-art', description: 'One-of-a-kind handcrafted pieces' },
];

import { prisma } from '@/lib/prisma';

interface Testimonial {
  id: string;
  text: string;
  user: { name: string };
  product: { title: string };
}

export default async function Home() {
  const testimonials = await prisma.testimonial.findMany({
    take: 6,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true } },
      product: { select: { title: true } },
    },
  });

  return (
    <>
      <section className="hero">
        <div>
          <h1 className="heading-serif">Art That Speaks<br />To Your Soul</h1>
          <p>Discover curated artworks handpicked for the discerning collector. Each piece tells a story.</p>
        </div>
      </section>

      <section className="featured-section">
        <div className="container">
          <h2 className="heading-serif">Explore Our Collections</h2>
          <div className="product-grid">
            {categories.map(cat => (
              <Link key={cat.slug} href={`/category/${cat.slug}`} className="product-card" style={{ textAlign: 'center' }}>
                <div className="product-card-image" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #f5f0eb 0%, #e8e2d9 100%)',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '24px',
                    color: 'var(--color-text-secondary)',
                    fontWeight: 300,
                  }}>
                    {cat.name}
                  </span>
                </div>
                <h3 className="product-card-title">{cat.name}</h3>
                <p className="text-muted text-sm" style={{ marginTop: '4px' }}>{cat.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: 'var(--space-4xl) 0', textAlign: 'center' }}>
        <div className="container">
          <h2 className="heading-serif" style={{ fontSize: '28px', marginBottom: 'var(--space-md)' }}>
            Every Piece, A Conversation
          </h2>
          <p className="text-secondary" style={{ maxWidth: '520px', margin: '0 auto', lineHeight: 1.8 }}>
            At Galerie Varinchie, we believe art is more than decoration — it&apos;s an expression of identity.
            Our carefully curated collection spans prints, mixed media, photography, and handmade works from
            emerging and established artists.
          </p>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section style={{ padding: 'var(--space-2xl) 0 var(--space-4xl)', background: 'var(--color-bg)' }}>
          <div className="container">
            <h2 className="heading-serif" style={{ fontSize: '28px', marginBottom: 'var(--space-xl)', textAlign: 'center' }}>
              What Collectors Say
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-xl)' }}>
              {testimonials.map((test: any) => (
                <div key={test.id} style={{ 
                  background: 'var(--color-bg)', 
                  padding: 'var(--space-lg)', 
                  border: '1px solid var(--color-border)', 
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                }}>
                  <p style={{ fontStyle: 'italic', marginBottom: 'var(--space-md)', color: 'var(--color-text)' }}>
                    &quot;{test.text}&quot;
                  </p>
                  <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{test.user.name || 'Anonymous'}</p>
                  <p className="text-xs text-muted">Bought {test.product.title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
