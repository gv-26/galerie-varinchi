import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import styles from './page.module.css';

export default async function Home() {
  const testimonials = await prisma.testimonial.findMany({
    take: 6,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true } },
      product: { select: { title: true } },
    },
  });

  const showcaseItems = [
    {
      image: "/images/lifestyle-1.jpg",
      alt: "Minimalist interior with framed art print on wall",
      label: "Art Prints",
      slug: "art-prints",
      description: "Museum-quality prints on fine art paper and canvas.",
    },
    {
      image: "/images/lifestyle-2.jpg",
      alt: "Framed black and white photograph in gallery lighting",
      label: "Photography",
      slug: "photograph-print",
      description: "Limited-edition photographic prints by contemporary artists.",
    },
    {
      image: "/images/lifestyle-3.jpg",
      alt: "Close-up of mixed media artwork with gold leaf and ink",
      label: "Mixed Media",
      slug: "mixed-media",
      description: "Textured, layered works that blur the line between craft and fine art.",
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroImageContainer}>
          <img
            src="/images/mustafa-bepari.jpg"
            alt="Contemporary art gallery interior with abstract painting"
            className={styles.heroImage}
          />
          <div className={styles.heroOverlay} />
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
          <Link href="/category/art-prints" className="btn btn-primary" style={{ padding: '14px 36px', fontSize: '12px' }}>
            Explore Collection
          </Link>
        </div>
      </section>

      {/* Brand Philosophy */}
      <section className={styles.sectionSplit}>
        <div className={styles.gridSplit}>
          <div className={styles.textCol}>
            <span className={styles.overline}>Our Philosophy</span>
            <h2 className={styles.sectionTitle}>Every piece tells a story.</h2>
            <p className={styles.paragraph}>
              Galerie Varinchie is a curated space where emerging and established
              artists share their vision with collectors who appreciate the
              extraordinary. We believe art should be accessible, personal, and
              transformative.
            </p>
            <p className={styles.paragraph}>
              From limited-edition prints to one-of-a-kind handmade pieces, every
              work is selected for its ability to evoke emotion and elevate the
              spaces we inhabit.
            </p>

          </div>
          <div className={styles.imgCol}>
            <div className={styles.imageFrame}>
              <img
                src="/images/about.jpg"
                alt="Artist in a sunlit studio with art pieces"
                className={styles.aspectImage}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Visual Showcase */}
      <section className={styles.sectionSplit} style={{ paddingTop: 0 }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto 3rem' }}>
          <span className={styles.overline}>What We Offer</span>
          <h2 className={styles.sectionTitle}>Art for every sensibility.</h2>
        </div>
        <div className={styles.showcaseGrid}>
          {showcaseItems.map((item) => (
            <Link href={`/category/${item.slug}`} key={item.label} className={styles.card}>
              <div className={styles.cardImageFrame}>
                <img src={item.image} alt={item.alt} className={styles.cardImage} />
              </div>
              <h3 className={styles.cardTitle}>{item.label}</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContainer}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: '1rem' }}>Begin your collection.</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
            Discover works from talented artists around the world. Each piece is
            carefully curated and available with premium framing options.
          </p>
          <div className={styles.flexCenter}>
            <Link href="/category/art-prints" className="btn btn-primary btn-sm">Browse Art</Link>
            <Link href="/contact" className="btn btn-secondary btn-sm">Contact Us</Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section style={{ padding: 'var(--space-2xl) 0 var(--space-4xl)', background: 'var(--color-bg)' }}>
          <div className="container">
            <h2 className={styles.overline} style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>What Collectors Say</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-xl)' }}>
              {testimonials.map((test) => (
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
