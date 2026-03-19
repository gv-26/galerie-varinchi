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

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

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
