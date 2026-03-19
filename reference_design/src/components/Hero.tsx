import heroGallery from "@/assets/hero-gallery.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-end pt-16">
      <div className="absolute inset-0">
        <img
          src={heroGallery}
          alt="Contemporary art gallery interior with abstract painting and natural light"
          className="w-full h-full object-cover animate-image-reveal"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>
      <div className="relative z-10 px-8 pb-24 md:pb-32 max-w-2xl">
        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl tracking-tighter leading-[0.95] text-foreground mb-6">
          Where art
          <br />
          finds home.
        </h1>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-md mb-10">
          A curated marketplace connecting collectors with contemporary artists.
          Art prints, mixed media, photography &amp; handmade originals.
        </p>
        <a
          href="/prints"
          className="inline-block border border-foreground bg-foreground text-background px-10 py-3.5 text-[11px] uppercase tracking-[0.2em] hover:bg-transparent hover:text-foreground transition-colors duration-300 rounded-sm"
        >
          Explore Collection
        </a>
      </div>
    </section>
  );
};

export default Hero;
