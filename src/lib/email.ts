import { getSecret } from './secrets';

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = getSecret('RESEND_API_KEY');

  if (!apiKey) {
    // Dev mode: log to console instead of sending
    console.log(`\n========================================`);
    console.log(`  [DEV EMAIL] To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`========================================\n`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Galerie Varinchie <noreply@galerievarinchi.com>',
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Resend HTTP Error]', response.status, errorBody);
    throw new Error(`Resend error: ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();
  console.log('[Resend] Email sent successfully, id:', data?.id);
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const apiKey = getSecret('RESEND_API_KEY');
  if (!apiKey) {
    console.log(`\n========================================`);
    console.log(`  OTP for ${email}: ${otp}`);
    console.log(`========================================\n`);
    return;
  }

  await sendEmail(
    email,
    'Your verification code - Galerie Varinchie',
    `
      <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px; text-align: center;">
        <h2 style="font-weight: 300; letter-spacing: 2px; color: #1a1a1a;">GALERIE VARINCHIE</h2>
        <p style="color: #666; font-size: 14px;">Your verification code is:</p>
        <p style="font-size: 32px; font-weight: 600; letter-spacing: 8px; color: #1a1a1a; margin: 24px 0;">${otp}</p>
        <p style="color: #999; font-size: 12px;">This code expires in 10 minutes.</p>
      </div>
    `
  );
}

export async function sendOrderConfirmationEmail(
  email: string,
  orderId: string,
  totalAmount: number
): Promise<void> {
  const apiKey = getSecret('RESEND_API_KEY');
  if (!apiKey) {
    console.log(`\n========================================`);
    console.log(`  Order confirmation for ${email}`);
    console.log(`  Order ID: ${orderId}`);
    console.log(`  Total: ₹${totalAmount}`);
    console.log(`========================================\n`);
    return;
  }

  await sendEmail(
    email,
    `Order Confirmed - ${orderId}`,
    `
      <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="font-weight: 300; letter-spacing: 2px; color: #1a1a1a; text-align: center;">GALERIE VARINCHIE</h2>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #333;">Thank you for your order!</p>
        <p style="color: #666; font-size: 14px;">Order ID: <strong>${orderId}</strong></p>
        <p style="color: #666; font-size: 14px;">Total Amount: <strong>₹${totalAmount.toLocaleString()}</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">We'll notify you when your order ships.</p>
      </div>
    `
  );
}
