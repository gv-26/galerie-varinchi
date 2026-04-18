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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
    body: JSON.stringify({
      from: 'Galerie Varinchi <noreply@galerievarinchi.com>',
      to,
      subject,
      html,
    }),
  }).finally(() => clearTimeout(timeoutId));

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
    'Your verification code - Galerie Varinchi',
    `
      <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px; text-align: center;">
        <h2 style="font-weight: 300; letter-spacing: 2px; color: #1a1a1a;">GALERIE VARINCHI</h2>
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
        <h2 style="font-weight: 300; letter-spacing: 2px; color: #1a1a1a; text-align: center;">GALERIE VARINCHI</h2>
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

const ADMIN_EMAIL = 'galerievarinchi@gmail.com';

export async function sendArtistApplicationEmail(artistName: string, artistEmail: string): Promise<void> {
  const apiKey = getSecret('RESEND_API_KEY');
  if (!apiKey) {
    console.log(`\n========================================`);
    console.log(`  [ADMIN NOTIFY] New artist application from ${artistName} (${artistEmail})`);
    console.log(`========================================\n`);
    return;
  }

  await sendEmail(
    ADMIN_EMAIL,
    `New Artist Application — ${artistName}`,
    `
      <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="font-weight: 300; letter-spacing: 2px; color: #1a1a1a; text-align: center;">GALERIE VARINCHI</h2>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #333;">A new artist has applied to join the platform.</p>
        <p style="color: #666; font-size: 14px;">Name: <strong>${artistName}</strong></p>
        <p style="color: #666; font-size: 14px;">Email: <strong>${artistEmail}</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">Review this application in the Admin Dashboard.</p>
      </div>
    `
  );
}

export async function sendArtworkSubmissionEmail(artistName: string, artworkTitle: string): Promise<void> {
  const apiKey = getSecret('RESEND_API_KEY');
  if (!apiKey) {
    console.log(`\n========================================`);
    console.log(`  [ADMIN NOTIFY] New artwork submission "${artworkTitle}" by ${artistName}`);
    console.log(`========================================\n`);
    return;
  }

  await sendEmail(
    ADMIN_EMAIL,
    `New Artwork Submission — ${artworkTitle}`,
    `
      <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="font-weight: 300; letter-spacing: 2px; color: #1a1a1a; text-align: center;">GALERIE VARINCHI</h2>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #333;">A new artwork has been submitted for review.</p>
        <p style="color: #666; font-size: 14px;">Artwork: <strong>${artworkTitle}</strong></p>
        <p style="color: #666; font-size: 14px;">Artist: <strong>${artistName}</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">Review this submission in the Admin Dashboard.</p>
      </div>
    `
  );
}

export async function sendProductQuestionEmail(productTitle: string, userEmail: string, userName: string | null, questionText: string): Promise<void> {
  const apiKey = getSecret('RESEND_API_KEY');
  if (!apiKey) {
    console.log(`\n========================================`);
    console.log(`  [ADMIN NOTIFY] Product Question for "${productTitle}" by ${userEmail}`);
    console.log(`  Question: ${questionText}`);
    console.log(`========================================\n`);
    return;
  }

  await sendEmail(
    ADMIN_EMAIL,
    `Product Question: ${productTitle}`,
    `
      <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="font-weight: 300; letter-spacing: 2px; color: #1a1a1a; text-align: center;">GALERIE VARINCHI</h2>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #333;">A customer has asked a question about a product.</p>
        <p style="color: #666; font-size: 14px;">Product: <strong>${productTitle}</strong></p>
        <p style="color: #666; font-size: 14px;">Customer: <strong>${userName || 'User'} (${userEmail})</strong></p>
        <p style="color: #666; font-size: 14px; margin-top: 16px;"><strong>Question:</strong></p>
        <p style="color: #333; font-size: 14px; white-space: pre-wrap;">${questionText}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      </div>
    `
  );
}

export async function sendProductCallbackEmail(productTitle: string, userEmail: string, userName: string | null, userPhone: string | null): Promise<void> {
  const apiKey = getSecret('RESEND_API_KEY');
  if (!apiKey) {
    console.log(`\n========================================`);
    console.log(`  [ADMIN NOTIFY] Callback Request for "${productTitle}" by ${userEmail}`);
    console.log(`  Phone: ${userPhone}`);
    console.log(`========================================\n`);
    return;
  }

  await sendEmail(
    ADMIN_EMAIL,
    `Callback Request: ${productTitle}`,
    `
      <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="font-weight: 300; letter-spacing: 2px; color: #1a1a1a; text-align: center;">GALERIE VARINCHI</h2>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #333;">A customer has requested a callback for a product.</p>
        <p style="color: #666; font-size: 14px;">Product: <strong>${productTitle}</strong></p>
        <p style="color: #666; font-size: 14px;">Customer: <strong>${userName || 'User'} (${userEmail})</strong></p>
        <p style="color: #666; font-size: 14px;">Phone Number: <strong>${userPhone || 'Not provided'}</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">Please reach out to the customer as soon as possible.</p>
      </div>
    `
  );
}

export async function sendContactEmail({
  name,
  email,
  subject,
  message,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  await sendEmail(
    ADMIN_EMAIL,
    `Contact Form: ${subject || 'New Message'} — from ${name}`,
    `
      <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="font-weight: 300; letter-spacing: 2px; color: #1a1a1a; text-align: center;">GALERIE VARINCHI</h2>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #333;">A visitor submitted the contact form.</p>
        <p style="color: #666; font-size: 14px;"><strong>Name:</strong> ${name}</p>
        <p style="color: #666; font-size: 14px;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        ${subject ? `<p style="color: #666; font-size: 14px;"><strong>Subject:</strong> ${subject}</p>` : ''}
        <div style="margin-top: 16px; padding: 16px; background: #f9f9f9; border-radius: 4px;">
          <p style="color: #333; font-size: 14px; white-space: pre-wrap;">${message}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">Reply directly to this sender at ${email}.</p>
      </div>
    `
  );
}

