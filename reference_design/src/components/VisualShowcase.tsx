import lifestyle1 from "@/assets/lifestyle-1.jpg";
import lifestyle2 from "@/assets/lifestyle-2.jpg";
import lifestyle3 from "@/assets/lifestyle-3.jpg";

const showcaseItems = [
  {
    image: lifestyle1,
    alt: "Minimalist interior with framed art print on wall",
    label: "Art Prints",
    description: "Museum-quality prints on fine art paper and canvas.",
  },
  {
    image: lifestyle2,
    alt: "Framed black and white photograph in gallery lighting",
    label: "Photography",
    description: "Limited-edition photographic prints by contemporary artists.",
  },
  {
    image: lifestyle3,
    alt: "Close-up of mixed media artwork with gold leaf and ink",
    label: "Mixed Media",
    description: "Textured, layered works that blur the line between craft and fine art.",
  },
];

const VisualShowcase = () => {
  return (
    <section className="px-8 py-32 md:py-40">
      <div className="mb-16 max-w-lg">
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-6 block">
          What We Offer
        </span>
        <h2 className="font-serif text-4xl md:text-5xl tracking-tighter text-foreground leading-[1.1]">
          Art for every sensibility.
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {showcaseItems.map((item) => (
          <div key={item.label} className="group">
            <div
              className="overflow-hidden mb-5 aspect-square"
              style={{ border: "1px solid hsl(var(--border))" }}
            >
              <img
                src={item.image}
                alt={item.alt}
                className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
              />
            </div>
            <h3 className="font-serif text-xl text-foreground mb-2">{item.label}</h3>
            <p className="text-[13px] text-muted-foreground leading-[1.6]">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default VisualShowcase;
