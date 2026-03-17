export default function FAQPage() {
  const faqs = [
    {
      question: 'What types of art do you sell?',
      answer: 'We offer four categories of art: Art Prints (museum-quality reproductions on canvas or paper), Mixed Media (unique multi-material artworks), Photograph Prints (fine art photography), and Handmade Art (one-of-a-kind handcrafted pieces).',
    },
    {
      question: 'What framing options are available?',
      answer: 'For Art Prints and Photograph Prints, we offer Teakwood frames, Metal frames, and Colored frames (available in six curated colors). Mixed Media and Handmade Art pieces come as-is from the artist.',
    },
    {
      question: 'How do I choose the right medium?',
      answer: 'Canvas gives a textured, gallery-quality feel and is ideal for larger pieces. Paper prints are lighter, perfect for smaller sizes, and work well with traditional framing. Both are archival-quality.',
    },
    {
      question: 'What is your shipping policy?',
      answer: 'We ship across India. Standard delivery takes 7-10 business days. All artwork is carefully packaged to ensure it arrives in perfect condition. Shipping costs are calculated at checkout based on your location.',
    },
    {
      question: 'Can I return or exchange artwork?',
      answer: 'Yes, we accept returns within 14 days of delivery if the artwork arrives damaged or is significantly different from the listing. Custom-framed pieces are non-returnable unless defective. Please contact us for return authorization.',
    },
    {
      question: 'How do I create an account?',
      answer: 'Simply click the user icon in the navigation bar and select Sign Up. Enter your email address, and we\'ll send you a verification code. No password needed — we use a simple, secure OTP-based login.',
    },
    {
      question: 'How do I track my order?',
      answer: 'Once logged in, go to your Profile page to see all your orders and their current status. You\'ll also receive email updates when your order status changes.',
    },
    {
      question: 'Do you offer international shipping?',
      answer: 'Currently, we ship only within India. International shipping options are being explored and will be announced soon.',
    },
  ];

  return (
    <div className="static-page fade-in">
      <h1 className="heading-serif">Frequently Asked Questions</h1>

      {faqs.map((faq, i) => (
        <div key={i} style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>{faq.question}</h2>
          <p>{faq.answer}</p>
        </div>
      ))}
    </div>
  );
}
