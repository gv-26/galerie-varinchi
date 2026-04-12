export default function ShippingPolicyPage() {
  return (
    <div className="static-page fade-in">
      <h1 className="heading-serif">Shipping Policy</h1>
      <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>Effective Date: April 3, 2026</p>

      <p>
        At Galerie Varinchi, we are committed to delivering your artworks safely and efficiently. 
        This Shipping Policy outlines how we process, ship, and deliver your orders.
      </p>

      <h2>1. Order Processing Time</h2>
      <ul>
        <li>All orders are processed within 2&ndash;5 business days.</li>
        <li>
          Custom or made-to-order artworks may require additional processing time, which will be 
          communicated to you.
        </li>
        <li>Orders are not processed on Sundays or public holidays.</li>
        <li>
          <strong>Note:</strong> All Orders are custom made. It takes up to 14 days for the product 
          to reach you from the order placement date.
        </li>
      </ul>

      <h2>2. Shipping Time</h2>
      <ul>
        <li>Delivery within India typically takes 3&ndash;10 business days after dispatch.</li>
        <li>Delivery times may vary depending on your location and courier service availability.</li>
      </ul>

      <h2>3. Shipping Charges</h2>
      <p>Shipping is free in all locations in India.</p>

      <h2>4. Order Tracking</h2>
      <ul>
        <li>Once your order is shipped, you will receive a tracking ID via email or SMS.</li>
        <li>You can use this tracking ID to monitor your shipment status.</li>
      </ul>

      <h2>5. Packaging</h2>
      <ul>
        <li>All artworks are carefully packaged to ensure safe delivery.</li>
        <li>We use protective materials to prevent damage during transit.</li>
      </ul>

      <h2>6. Delivery Issues</h2>
      <h3>a. Incorrect Address</h3>
      <ul>
        <li>Please ensure your shipping details are accurate.</li>
        <li>We are not responsible for delays or losses due to incorrect address provided.</li>
      </ul>
      <h3>b. Failed Delivery Attempts</h3>
      <ul>
        <li>If delivery fails due to unavailability, the courier may attempt re-delivery.</li>
        <li>Additional charges may apply for re-shipping if the order is returned to us.</li>
      </ul>

      <h2>7. Damaged Shipments</h2>
      <ul>
        <li>If your order arrives damaged, please refer to our Refund and Return Policy.</li>
        <li>Report the issue within 48 hours of delivery with proper evidence.</li>
      </ul>

      <h2>8. Delays</h2>
      <p>While we strive to deliver on time, delays may occur due to:</p>
      <ul>
        <li>Courier issues</li>
        <li>Weather conditions</li>
        <li>Unforeseen circumstances</li>
      </ul>
      <p>We appreciate your patience in such situations.</p>

      <h2>9. Contact Us</h2>
      <p>For any shipping-related queries, please contact:</p>
      <p style={{ marginTop: 'var(--space-md)', fontWeight: 500 }}>
        Galerie Varinchi<br />
        Park Road, Kavilkadavu<br />
        Kodungallur P.O, Thrissur<br />
        Kerala, India<br /><br />
        Email: <a href="mailto:galerievarinchi@gmail.com" style={{ color: 'var(--color-accent)' }}>galerievarinchi@gmail.com</a><br />
        Phone: 7259644702
      </p>

      <h2>10. Policy Acceptance</h2>
      <p>By placing an order on our website, you agree to this Shipping Policy.</p>
    </div>
  );
}
