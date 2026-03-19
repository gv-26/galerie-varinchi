import { User, Heart, ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { label: "Art Prints", href: "/prints" },
  { label: "Mixed Media", href: "/mixed-media" },
  { label: "Photography", href: "/photography" },
  { label: "Handmade", href: "/handmade" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full h-16 px-8 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md z-50">
      <a href="/" className="font-serif text-xl tracking-tight">
        Galerie Varinchie
      </a>

      {/* Desktop nav */}
      <div className="hidden md:flex gap-8 text-[10px] uppercase tracking-[0.2em] font-medium">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-foreground hover:text-muted-foreground transition-colors duration-300"
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Icons */}
      <div className="flex gap-6 items-center">
        <button className="w-5 h-5 text-foreground hover:text-muted-foreground transition-colors" aria-label="Account">
          <User className="w-5 h-5 stroke-1" />
        </button>
        <button className="w-5 h-5 text-foreground hover:text-muted-foreground transition-colors hidden sm:block" aria-label="Wishlist">
          <Heart className="w-5 h-5 stroke-1" />
        </button>
        <button className="relative w-5 h-5 text-foreground hover:text-muted-foreground transition-colors" aria-label="Cart">
          <ShoppingBag className="w-5 h-5 stroke-1" />
          <span className="absolute -top-1 -right-1 text-[8px] bg-foreground text-background w-3.5 h-3.5 rounded-full flex items-center justify-center">
            0
          </span>
        </button>
        <button
          className="md:hidden w-5 h-5 text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="w-5 h-5 stroke-1" /> : <Menu className="w-5 h-5 stroke-1" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="absolute top-16 left-0 w-full bg-background border-b border-border px-8 py-8 flex flex-col gap-6 md:hidden">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[11px] uppercase tracking-[0.2em] font-medium text-foreground hover:text-muted-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Header;
