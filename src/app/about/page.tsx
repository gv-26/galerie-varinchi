import Link from 'next/link';
import styles from './about.module.css';

export const metadata = {
  title: 'About Us | Galerie Varinchi',
  description: 'Learn about Galerie Varinchi — our story, founding story, and passion for bringing art into every home.',
};

export default function AboutPage() {
  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '1000px' }}>
        
        {/* About Section */}
        <section className={styles.aboutSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.overline}>The Platform</span>
            <h1 className="heading-serif">About Galerie Varinchi</h1>
          </div>
          
          <div className={styles.aboutContent}>
            <div className={styles.aboutImageWrapWide}>
              <img 
                src="/images/vincentas-liskauskas-TPhZnl2NEws-unsplash.jpg" 
                alt="Galerie Varinchi Artwork" 
                className={styles.aboutImgWide} 
              />
            </div>
            <div className={styles.aboutTextBelow}>
              <p className={styles.para}>
                Galerie Varinchi is an online platform dedicated to bringing high-quality, curated contemporary art to collectors and patrons across the country. The platform focuses on presenting thoughtfully selected works by artists and photographers, ensuring a refined and cohesive collection that resonates with modern sensibilities. Premium print quality, elegant premium framing solutions, and limited edition releases are emphasised and uncompromised.
              </p>
              <p className={styles.para}>
                With the desideratum of elevating the experience of owning Art, Galerie Varinchi showcases a diverse range of works, including fine art prints, photography, handmade art, and mixed media creations, reflecting a deep appreciation for materiality, craftsmanship, and artistic expression.
              </p>
              <p className={styles.para}>
                At its core, Galerie Varinchi is built to create a sustainable ecosystem where artists can monetize their work while preserving their artistic integrity, and where collectors can access meaningful, high-quality art with credence.
              </p>
            </div>
          </div>
        </section>

        {/* Founding Story Section */}
        <section className={styles.storySection}>
          <div className={styles.storyCard}>
            <div className={styles.storyHeader}>
              <span className={styles.overline}>Our Journey</span>
              <h2 className="heading-serif">The Founding Story</h2>
            </div>
            
            <div className={styles.storySplit}>
              <div className={styles.storyImageWrap}>
                <img 
                  src="/images/IMG_6992.JPG.jpeg" 
                  alt="Nikhil George - Founder" 
                  className={styles.storyImg} 
                />
              </div>
              <div className={styles.storyText}>
                <p className={styles.quotePara}>
                  “Hello!
                </p>
                <p className={styles.storyPara}>
                  I am Nikhil George, an architect and artist based in Kochi, Kerala, with over nine years of professional experience in architecture and design. I have always been deeply passionate about art, mixed media exploration, and thoughtful design, with my interests lying at the intersection of material experimentation and contemporary aesthetics.
                </p>
                <p className={styles.storyPara}>
                  The idea for Galerie Varinchi took shape after I hosted an independent art exhibition at the historic Venkatappa Art Gallery in Bengaluru. Over four days, I exhibited nearly thirty works alongside a fellow artist. The exhibition attracted close to a thousand visitors and received encouraging feedback from art enthusiasts, including several international visitors. That experience was a turning point; it reinforced my belief in the power of thoughtful curation and the genuine appreciation people have for meaningful art when it is presented with intent.
                </p>
                <p className={styles.storyPara}>
                  Through Galerie Varinchi, I aim to create a platform that connects contemporary artists with collectors who are seeking carefully curated, high-quality art outside the framework of traditional galleries or auctions.”
                </p>
                
                <div className={styles.signature}>
                  <span className={styles.signatureName}>Nikhil George</span>
                  <span className={styles.signatureTitle}>Founder | Galerie Varinchi</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Exhibition Section */}
        <section className={styles.exhibitionSection}>
          <div className={styles.sectionHeader} style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
            <span className={styles.overline}>Past Exhibition</span>
            <h2 className="heading-serif" style={{ fontSize: '32px' }}>“Pensive Musings”</h2>
            <p className={styles.subtext}>Exhibition at Venkatappa Art Gallery, Bangalore | 2018</p>
          </div>
          
          <div className={styles.exhibitionGrid}>
            <div className={styles.exhibitionImgCard}>
              <img 
                src="/images/Picture1.png" 
                alt="Pensive Musings Exhibition at Venkatappa Art Gallery - View 1" 
                className={styles.exhibitionImg} 
              />
            </div>
            <div className={styles.exhibitionImgCard}>
              <img 
                src="/images/pensive_2.jpeg" 
                alt="Pensive Musings Exhibition at Venkatappa Art Gallery - View 2" 
                className={styles.exhibitionImg} 
              />
            </div>
            <div className={styles.exhibitionImgCard}>
              <img 
                src="/images/pensive_3.jpeg" 
                alt="Pensive Musings Exhibition at Venkatappa Art Gallery - View 3" 
                className={styles.exhibitionImg} 
              />
            </div>
            <div className={styles.exhibitionImgCard}>
              <img 
                src="/images/pensive_4.jpeg" 
                alt="Pensive Musings Exhibition at Venkatappa Art Gallery - View 4" 
                className={styles.exhibitionImg} 
              />
            </div>
          </div>
          <div className={styles.exhibitionCaption}>
            Images from the &ldquo;Pensive Musings&rdquo; Exhibition, 2018
          </div>
        </section>

        {/* Call to Action */}
        <section className={styles.cta}>
          <div className={styles.ctaInner}>
            <h2 className="heading-serif" style={{ fontSize: '32px', marginBottom: 'var(--space-md)' }}>Explore the Collection</h2>
            <p className={styles.ctaText}>Browse curated artworks from our collaborating contemporary artists.</p>
            <div className={styles.ctaButtons}>
              <Link href="/" className="btn btn-primary">Browse Artworks</Link>
              <Link href="/artist/signup" className="btn btn-secondary">Join as an Artist</Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
