import { Instagram, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-background px-8 pt-24 pb-12 border-t border-border">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-24">
        <div className="col-span-2">
          <h3 className="font-serif text-2xl mb-4 text-foreground">Galerie Varinchie</h3>
          <p className="text-muted-foreground text-sm max-w-xs leading-[1.6]">
            Curating contemporary perspectives for the modern collector.
          </p>
        </div>

        <div className="flex flex-col gap-3 text-[11px] uppercase tracking-wider">
          <span className="font-bold mb-2 text-foreground">Service</span>
          <a href="/faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          <a href="/returns" className="text-muted-foreground hover:text-foreground transition-colors">Return Policy</a>
          <a href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact Us</a>
        </div>

        <div className="flex flex-col gap-3 text-[11px] uppercase tracking-wider">
          <span className="font-bold mb-2 text-foreground">Legal</span>
          <a href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
          <a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms &amp; Conditions</a>
        </div>

        <div className="flex flex-col gap-3 text-[11px] uppercase tracking-wider">
          <span className="font-bold mb-2 text-foreground">Connect</span>
          <a href="mailto:hello@varinchie.com" className="text-muted-foreground hover:text-foreground transition-colors">
            hello@varinchie.com
          </a>
          <a href="tel:+1234567890" className="text-muted-foreground hover:text-foreground transition-colors">
            +1 (234) 567-890
          </a>
          <div className="flex gap-4 mt-2">
            <a href="https://instagram.com" aria-label="Instagram" className="text-muted-foreground hover:text-foreground transition-colors">
              <Instagram className="w-4 h-4 stroke-1" />
            </a>
            <a href="https://twitter.com" aria-label="Twitter" className="text-muted-foreground hover:text-foreground transition-colors">
              <Twitter className="w-4 h-4 stroke-1" />
            </a>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground border-t border-border pt-8">
        © 2025 Galerie Varinchie. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
