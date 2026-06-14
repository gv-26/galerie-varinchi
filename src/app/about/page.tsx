import Link from 'next/link';
import styles from './about.module.css';

export const metadata = {
  title: 'About Us | Galerie Varinchi',
  description: 'Learn about Galerie Varinchi — our story, mission, and passion for bringing art into every home.',
};

export default function AboutPage() {
  return (
    <div className="page-content fade-in">

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroImageWrap}>
          <img src="/images/hero-gallery.jpg" alt="Gallery interior" className={styles.heroImg} />
          <div className={styles.heroOverlay} />
        </div>
        <div className={styles.heroContent}>
          <span className={styles.overline}>Our Story</span>
          <h1 className={styles.heroTitle}>Art that belongs<br />in your world.</h1>
        </div>
      </section>

      {/* Mission split */}
      <section className={styles.split}>
        <div className={styles.splitText}>
          <span className={styles.overline}>Who We Are</span>
          <h2 className={styles.sectionTitle}>A gallery built on passion and purpose.</h2>
          <p className={styles.para}>
            Galerie Varinchi was born from a simple belief: that great art should find its way into the lives of people who love it — not just the walls of institutions or the vaults of collectors.
          </p>
          <p className={styles.para}>
            We partner with emerging and established artists to offer museum-quality prints, handmade originals, and photography that speak to real moments and real spaces.
          </p>
        </div>
        <div className={styles.splitImage}>
          <img src="/images/about.jpg" alt="Artist in studio" className={styles.splitImg} />
        </div>
      </section>

      {/* Values */}
      <section className={styles.values}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <span className={styles.overline}>What Drives Us</span>
            <h2 className={styles.sectionTitle}>Our values</h2>
          </div>
          <div className={styles.valueGrid}>
            {[
              {
                icon: '🎨',
                title: 'Artistic Integrity',
                body: 'Every piece we feature is chosen for its creative authenticity. We never compromise on the quality or vision of the artists we represent.',
              },
              {
                icon: '🌿',
                title: 'Sustainable Craft',
                body: 'We source materials responsibly and partner with printers who share our commitment to low-impact production and long-lasting quality.',
              },
              {
                icon: '🤝',
                title: 'Artist First',
                body: 'Artists receive fair, transparent commission on every sale. We believe creators deserve to thrive from the work they love.',
              },
              {
                icon: '🏡',
                title: 'Art for Everyone',
                body: 'We offer a range of sizes, mediums, and price points so that collecting art feels accessible, not exclusive.',
              },
            ].map(v => (
              <div key={v.title} className={styles.valueCard}>
                <div className={styles.valueIcon}>{v.icon}</div>
                <h3 className={styles.valueTitle}>{v.title}</h3>
                <p className={styles.valuePara}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team / story second half */}
      <section className={styles.split} style={{ flexDirection: 'row-reverse' }}>
        <div className={styles.splitText}>
          <span className={styles.overline}>Our Curation</span>
          <h2 className={styles.sectionTitle}>Every piece is hand-selected.</h2>
          <p className={styles.para}>
            Our curatorial team reviews hundreds of submissions each season, selecting works that balance technical mastery with emotional resonance. Whether it's an intimate watercolour or a large-format abstract print, each work earns its place.
          </p>
          <p className={styles.para}>
            We offer premium framing in Teakwood and Ashwood, printed on archival Canvas and Fine Art Paper — because the way a piece is presented is as important as the work itself.
          </p>
        </div>
        <div className={styles.splitImage}>
          <img src="/images/lifestyle-1.jpg" alt="Art in a home" className={styles.splitImg} />
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Start your collection.</h2>
          <p className={styles.ctaText}>Discover works that speak to you — and find the perfect piece for your space.</p>
          <div className={styles.ctaButtons}>
            <Link href="/category/art-prints" className="btn btn-primary">Browse Art Prints</Link>
            <Link href="/contact" className="btn btn-secondary">Get in Touch</Link>
          </div>
        </div>
      </section>

    </div>
  );
}
