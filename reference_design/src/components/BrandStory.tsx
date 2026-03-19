import aboutCraft from "@/assets/about-craft.jpg";

const BrandStory = () => {
  return (
    <section className="px-8 py-32 md:py-40">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 items-center">
        <div className="md:col-span-5 md:col-start-2">
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-6 block">
            Our Philosophy
          </span>
          <h2 className="font-serif text-4xl md:text-5xl tracking-tighter text-foreground leading-[1.1] mb-6">
            Every piece tells a story.
          </h2>
          <p className="text-sm text-muted-foreground leading-[1.8] mb-4">
            Galerie Varinchie is a curated space where emerging and established
            artists share their vision with collectors who appreciate the
            extraordinary. We believe art should be accessible, personal, and
            transformative.
          </p>
          <p className="text-sm text-muted-foreground leading-[1.8] mb-8">
            From limited-edition prints to one-of-a-kind handmade pieces, every
            work is selected for its ability to evoke emotion and elevate the
            spaces we inhabit.
          </p>
          <a
            href="/about"
            className="text-[11px] uppercase tracking-[0.2em] text-foreground border-b border-foreground pb-1 hover:text-muted-foreground hover:border-muted-foreground transition-colors duration-300"
          >
            Learn More
          </a>
        </div>
        <div className="md:col-span-4 md:col-start-8">
          <div className="overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
            <img
              src={aboutCraft}
              alt="Artist carefully stretching canvas in a sunlit studio"
              className="w-full aspect-[3/4] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandStory;
