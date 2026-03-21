'use client';

import { useState, useEffect } from 'react';

type Testimonial = {
  id: string;
  text: string;
  user: { name: string | null };
  product: { title: string };
};

export default function TestimonialsClient() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTestimonials() {
      try {
        const res = await fetch('/api/testimonials');
        if (res.ok) {
          const data = await res.json();
          setTestimonials(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to fetch testimonials:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTestimonials();
  }, []);

  if (loading || !Array.isArray(testimonials) || testimonials.length === 0) return null;

  return (
    <section style={{ padding: 'var(--space-2xl) 0 var(--space-4xl)', background: 'var(--color-bg)' }}>
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--color-primary)' }}>What Collectors Say</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-xl)' }}>
          {testimonials.map((test) => (
            <div key={test.id} style={{ 
              background: 'var(--color-bg)', 
              padding: 'var(--space-lg)', 
              border: '1px solid var(--color-border)', 
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
            }}>
              <p style={{ fontStyle: 'italic', marginBottom: 'var(--space-md)', color: 'var(--color-text)', fontSize: '14px' }}>
                &quot;{test.text}&quot;
              </p>
              <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{test.user?.name || 'Anonymous'}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Bought {test.product?.title}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
