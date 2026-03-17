import Link from 'next/link';

export default function ReturnPolicyPage() {
  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '800px' }}>
        <h1 className="heading-serif" style={{ fontSize: '40px', marginBottom: 'var(--space-2xl)', textAlign: 'center' }}>
          Return Policy
        </h1>
        
        <div style={{ lineHeight: 1.8, fontSize: '16px', color: 'var(--color-text)' }}>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            At Galerie Varinchie, we take pride in the quality of our artwork. Hand-crafted pieces, personalized frames, and individually sourced items mean that each order is unique. Therefore, please carefully read our Return Policy below before making your purchase.
          </p>

          <h2 style={{ fontSize: '24px', margin: 'var(--space-xl) 0 var(--space-md)' }}>1. General Returns</h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Due to the fragile and hand-crafted nature of our products, all sales are considered final. We do not accept returns or exchanges for a change of mind after the order has been successfully shipped or delivered.
          </p>

          <h2 style={{ fontSize: '24px', margin: 'var(--space-xl) 0 var(--space-md)' }}>2. Damaged or Defective Items</h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            If your artwork arrives damaged or defective, please contact us immediately upon receipt. We ask that you provide clear photographs of both the damaged product and its original packaging. Once we evaluate the photos and confirm the issue occurred prior to your receipt, we will arrange for a replacement or a suitable resolution.
          </p>
          <ul style={{ paddingLeft: '20px', marginBottom: 'var(--space-md)' }}>
            <li>Claims must be made within 48 hours of delivery.</li>
            <li>Maintain all original packaging materials.</li>
          </ul>

          <h2 style={{ fontSize: '24px', margin: 'var(--space-xl) 0 var(--space-md)' }}>3. Cancellations</h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Orders can only be canceled within 12 hours of placement. Since many of our products are prepared to order (such as specifically sized frame cuts or specialized mediums), cancellation requests made after this window may not be honored if production has already commenced.
          </p>

          <h2 style={{ fontSize: '24px', margin: 'var(--space-xl) 0 var(--space-md)' }}>4. Custom & Commissioned Art</h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Any commissioned or heavily customized items are strictly non-refundable and non-returnable once the design/creation process has been approved and started.
          </p>

          <h2 style={{ fontSize: '24px', margin: 'var(--space-xl) 0 var(--space-md)' }}>5. How to Initiate a Claim</h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            To initiate a damage claim or to request a cancellation, please reach out to us via our <Link href="/contact" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Contact Page</Link>. Our team will review your request and get back to you within 1-2 business days.
          </p>
        </div>
      </div>
    </div>
  );
}
