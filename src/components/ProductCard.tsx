import Link from 'next/link';

interface ProductCardProps {
  id: string;
  title: string;
  image: string;
}

export default function ProductCard({ id, title, image }: ProductCardProps) {
  return (
    <Link href={`/product/${id}`} className="product-card">
      <div className="product-card-image">
        <img src={image} alt={title} loading="lazy" />
      </div>
      <h3 className="product-card-title">{title}</h3>
    </Link>
  );
}
