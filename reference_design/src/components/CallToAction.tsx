const CallToAction = () => {
  return (
    <section className="px-8 py-32 md:py-40 text-center">
      <div className="max-w-xl mx-auto">
        <h2 className="font-serif text-4xl md:text-5xl tracking-tighter text-foreground leading-[1.1] mb-6">
          Begin your collection.
        </h2>
        <p className="text-sm text-muted-foreground leading-[1.8] mb-10">
          Discover works from talented artists around the world. Each piece is
          carefully curated and available with custom framing options.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/prints"
            className="inline-block border border-foreground bg-foreground text-background px-10 py-3.5 text-[11px] uppercase tracking-[0.2em] hover:bg-transparent hover:text-foreground transition-colors duration-300 rounded-sm"
          >
            Browse Art
          </a>
          <a
            href="/contact"
            className="inline-block border border-border bg-transparent text-foreground px-10 py-3.5 text-[11px] uppercase tracking-[0.2em] hover:border-foreground transition-colors duration-300 rounded-sm"
          >
            Contact Us
          </a>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
