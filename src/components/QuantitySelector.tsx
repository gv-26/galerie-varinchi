'use client';

interface QuantitySelectorProps {
  quantity: number;
  onChange: (quantity: number) => void;
  max?: number;
}

export default function QuantitySelector({ quantity, onChange, max }: QuantitySelectorProps) {
  return (
    <div className="quantity-selector">
      <button
        onClick={() => onChange(Math.max(1, quantity - 1))}
        disabled={quantity <= 1}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span>{quantity}</span>
      <button
        onClick={() => onChange(max ? Math.min(max, quantity + 1) : quantity + 1)}
        disabled={max !== undefined && quantity >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
