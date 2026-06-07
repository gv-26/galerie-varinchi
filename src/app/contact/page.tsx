'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send message');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="page-content">
        <div className="container empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="var(--color-success)">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2>Message Sent!</h2>
          <p>Thank you for reaching out. We&apos;ll get back to you soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <h1 className="heading-serif" style={{ fontSize: '36px', marginBottom: 'var(--space-sm)' }}>Contact Us</h1>
          <p className="text-secondary">We&apos;d love to hear from you</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-2xl)' }}>
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="contact-name">Name</label>
              <input id="contact-name" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Your name" />
            </div>
            <div className="form-group">
              <label htmlFor="contact-email">Email</label>
              <input id="contact-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" />
            </div>
            <div className="form-group">
              <label htmlFor="contact-phone">Phone Number</label>
              <input id="contact-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="form-group">
              <label htmlFor="contact-message">Message</label>
              <textarea id="contact-message" value={message} onChange={e => setMessage(e.target.value)} required placeholder="Tell us how we can help..." rows={5} />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Send Message'}
            </button>
          </form>

          <div>
            <div className="profile-card">
              <h3>Visit Us</h3>
              <p className="text-sm text-secondary" style={{ lineHeight: 1.8 }}>
                Galerie Varinchi<br />
                123 Art District, Gallery Lane<br />
                Mumbai, Maharashtra 400001<br />
                India
              </p>
            </div>
            <div className="profile-card">
              <h3>Contact Info</h3>
              <p className="text-sm">
                <a href="tel:+917259644702" style={{ color: 'var(--color-accent)' }}>+91 72596 44702</a>
              </p>
              <p className="text-sm">
                <a href="mailto:galerievarinchi@gmail.com" style={{ color: 'var(--color-accent)' }}>galerievarinchi@gmail.com</a>
              </p>
            </div>
            <div className="profile-card">
              <h3>Hours</h3>
              <p className="text-sm text-secondary">
                Monday – Saturday: 10:00 AM – 7:00 PM<br />
                Sunday: By appointment only
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
