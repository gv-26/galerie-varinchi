import art1 from "@/assets/art-1.jpg";
import art2 from "@/assets/art-2.jpg";
import art3 from "@/assets/art-3.jpg";
import art4 from "@/assets/art-4.jpg";
import art5 from "@/assets/art-5.jpg";

const products = [
  { image: art1, title: "Horizon Line No. 7", medium: "Ink on Paper", price: "€1,200" },
  { image: art2, title: "Fragments of Memory", medium: "Mixed Media on Canvas", price: "€3,400" },
  { image: art3, title: "Dissolving Peaks", medium: "Silver Gelatin Print", price: "€2,800" },
  { image: art4, title: "Vessel Study III", medium: "Handmade Ceramic", price: "€950" },
  { image: art5, title: "Cadmium Descent", medium: "Oil on Canvas", price: "€4,600" },
];

const offsets = ["mt-0", "mt-32", "mt-16", "mt-8", "mt-24"];

const ProductGrid = () => {
  return (
    <section className="px-8 py-[20vh]">
      <div className="mb-16">
        <h2 className="font-serif text-4xl md:text-5xl tracking-tighter text-foreground">
          Recent Arrivals
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
        {products.map((product, i) => (
          <a
            key={product.title}
            href="#"
            className={`group block ${offsets[i] || "mt-0"} ${i >= 3 ? "hidden lg:block" : ""}`}
          >
            <div className="overflow-hidden mb-4" style={{ border: "1px solid hsl(var(--border))" }}>
              <img
                src={product.image}
                alt={product.title}
                className="w-full aspect-[3/4] object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
              />
            </div>
            <h3 className="font-serif text-base text-foreground">{product.title}</h3>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">
              {product.medium}
            </p>
            <p className="text-[12px] text-foreground tabular-nums mt-1">{product.price}</p>
          </a>
        ))}
      </div>
    </section>
  );
};

export default ProductGrid;
