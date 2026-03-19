import catPrints from "@/assets/cat-prints.jpg";
import catMixed from "@/assets/cat-mixed.jpg";
import catPhoto from "@/assets/cat-photo.jpg";

const categories = [
  { image: catPrints, title: "Art Prints", href: "/prints" },
  { image: catMixed, title: "Mixed Media", href: "/mixed-media" },
  { image: catPhoto, title: "Photography", href: "/photography" },
];

const Categories = () => {
  return (
    <section className="px-8 py-[20vh]">
      <div className="mb-16">
        <h2 className="font-serif text-4xl md:text-5xl tracking-tighter text-foreground">
          Explore by Medium
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <a
            key={cat.title}
            href={cat.href}
            className="group relative overflow-hidden aspect-[4/3]"
            style={{ border: "1px solid hsl(var(--border))" }}
          >
            <img
              src={cat.image}
              alt={`${cat.title} texture detail`}
              className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-end p-6">
              <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-background bg-foreground/80 px-4 py-2 backdrop-blur-sm">
                {cat.title}
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

export default Categories;
