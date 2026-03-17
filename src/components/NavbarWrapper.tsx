import { prisma } from '@/lib/prisma';
import Navbar from './NavbarClient';

export default async function NavbarWrapper() {
  const allCategories = await prisma.category.findMany({
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

  // Only show categories that have at least one active product
  const categories = allCategories
    .filter(c => c.subCategories.some(s => s._count.products > 0))
    .map(c => ({ name: c.name, slug: c.slug }));

  return <Navbar categories={categories} />;
}
