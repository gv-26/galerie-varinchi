import { prisma } from '@/lib/prisma';
import Navbar from './NavbarClient';

export default async function NavbarWrapper() {
  let allCategories: any[] = [];
  
  try {
    allCategories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      select: {
        name: true,
        slug: true,
        subCategories: {
          select: {
            _count: { select: { products: { where: { status: 'active' } } } },
          },
        },
      },
    });
  } catch (error) {
    console.log("Database not accessible during build-time prerender, skipping Navbar categories fetch.");
  }

  // Only show categories that have at least one active product
  const categories = allCategories
    .filter(c => c.subCategories && c.subCategories.some((s: any) => s._count.products > 0))
    .map(c => ({ name: c.name, slug: c.slug }));

  return <Navbar categories={categories} />;
}
