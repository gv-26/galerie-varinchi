export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email and message are required' }, { status: 400 });
    }

    // Log the contact form submission (in production, send email)
    console.log(`\n========================================`);
    console.log(`  New Contact Form Submission`);
    console.log(`  Name: ${name}`);
    console.log(`  Email: ${email}`);
    console.log(`  Phone: ${phone || 'N/A'}`);
    console.log(`  Message: ${message}`);
    console.log(`========================================\n`);

    return NextResponse.json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
