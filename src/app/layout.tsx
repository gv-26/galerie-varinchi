import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import NavbarWrapper from "@/components/NavbarWrapper";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Galerie Varinchie — Curated Art Collection",
  description: "Discover curated art prints, mixed media, photographs, and handmade art pieces. Each work is carefully selected to bring beauty and meaning to your space.",
};

// Removed global force-dynamic to enable static page rendering and reduce function bundle bloat
// Removed global runtime = 'edge' to enable static optimization for frontend pages

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <NavbarWrapper />
              <main>{children}</main>
              <Footer />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
