import Link from 'next/link';

interface ProductCardProps {
  id: string;
  title: string;
  image: string;
  unitsAvailable?: number | null;
}

export default function ProductCard({ id, title, image, unitsAvailable }: ProductCardProps) {
  return (
    <Link href={`/product/${id}`} className="product-card">
      <div className="product-card-image" style={{ position: 'relative' }}>
        <img src={image} alt={title} loading="lazy" />
        {unitsAvailable !== null && unitsAvailable !== undefined && (
          <span style={{
            position: 'absolute', bottom: '8px', right: '8px',
            background: unitsAvailable > 0 ? 'rgba(0,0,0,0.75)' : 'var(--color-error)',
            color: 'white', fontSize: '10px', fontWeight: 600,
            padding: '3px 8px', borderRadius: '12px',
            letterSpacing: '0.03em',
          }}>
            {unitsAvailable > 0 ? `${unitsAvailable} left` : 'Sold out'}
          </span>
        )}
      </div>
      <h3 className="product-card-title">{title}</h3>
    </Link>
  );
}
