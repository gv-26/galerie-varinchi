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
  totalAmount: number,
  isGuest?: boolean
): Promise<void> {
  const apiKey = getSecret('RESEND_API_KEY');
  const cdnBase = (process.env.NEXT_PUBLIC_CLOUDFRONT_URL || "https://www.galerievarinchi.com")
    .replace(/\/$/, '')
    .replace(/\/assets$/, '');
  const createPasswordUrl = `${cdnBase}/auth/set-password?email=${encodeURIComponent(email)}`;

  if (!apiKey) {
    console.log(`\n========================================`);
    console.log(`  Order confirmation for ${email}`);
    console.log(`  Order ID: ${orderId}`);
    console.log(`  Total: ₹${totalAmount}`);
    if (isGuest) {
      console.log(`  Guest Account: Create Password link: ${createPasswordUrl}`);
    }
    console.log(`========================================\n`);
    return;
  }

  const guestSection = isGuest ? `
    <div style="background-color: #fcfbf9; border: 1px solid #e5e2dc; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="color: #333; font-size: 14px; margin: 0 0 12px 0; line-height: 1.5;">
        Your order has been placed successfully. Set a password for your account using the link below to track this and any future orders.
      </p>
      <div style="margin: 16px 0;">
        <a href="${createPasswordUrl}" style="background-color: #8b7355; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: 500; display: inline-block; letter-spacing: 0.5px; text-transform: uppercase;">
          Create Password
        </a>
      </div>
      <p style="color: #666; font-size: 12px; margin: 0; line-height: 1.4;">
        This will allow you to log in at any time to track your orders.
      </p>
    </div>
  ` : '';

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
        
        ${guestSection}
        
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

export async function sendOrderNotificationToAdmin(orderId: string, totalAmount: number, customerEmail: string): Promise<void> {
  const apiKey = getSecret('RESEND_API_KEY');
  if (!apiKey) {
    console.log(`\n========================================`);
    console.log(`  [ADMIN NOTIFY] New Order ${orderId}`);
    console.log(`========================================\n`);
    return;
  }

  await sendEmail(
    ADMIN_EMAIL,
    `New Order Received — ${orderId}`,
    `
      <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="font-weight: 300; letter-spacing: 2px; color: #1a1a1a; text-align: center;">GALERIE VARINCHI</h2>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #333;">A new order has been placed on the platform.</p>
        <p style="color: #666; font-size: 14px;">Order ID: <strong>${orderId}</strong></p>
        <p style="color: #666; font-size: 14px;">Customer Email: <strong>${customerEmail}</strong></p>
        <p style="color: #666; font-size: 14px;">Total Amount: <strong>₹${totalAmount.toLocaleString()}</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">Review this order in the Admin Dashboard.</p>
      </div>
    `
  );
}

export async function sendArtistApprovalEmail(artistEmail: string, artistName: string, agreementPdfUrl: string): Promise<void> {
  const apiKey = getSecret('RESEND_API_KEY');
  if (!apiKey) {
    console.log(`\n========================================`);
    console.log(`  [ARTIST APPROVAL] Sent to ${artistEmail}`);
    console.log(`========================================\n`);
    return;
  }

  await sendEmail(
    artistEmail,
    `Welcome to Galerie Varinchi - Profile Approved`,
    `
      <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="font-weight: 300; letter-spacing: 2px; color: #1a1a1a; text-align: center;">GALERIE VARINCHI</h2>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #333;">Dear ${artistName},</p>
        <p style="color: #333;">We are thrilled to inform you that your artist profile has been approved!</p>
        <p style="color: #666; font-size: 14px;">You can now log in to your Artist Dashboard to start submitting your artworks.</p>
        <p style="color: #666; font-size: 14px;">Your signed collaboration agreement is attached and available here: <a href="${agreementPdfUrl}">Download Agreement</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">Welcome to the Galerie Varinchi family.</p>
      </div>
    `
  );
}

export async function sendNewAgreementNotificationEmail(
  artistEmail: string,
  artistName: string,
  versionNumber: string,
  dashboardUrl: string
): Promise<void> {
  const apiKey = getSecret('RESEND_API_KEY');
  if (!apiKey) {
    console.log(`\n========================================`);
    console.log(`  [NEW AGREEMENT] Notify ${artistEmail} of version ${versionNumber}`);
    console.log(`========================================\n`);
    return;
  }

  await sendEmail(
    artistEmail,
    `Action Required: Updated Artist Agreement — Galerie Varinchi`,
    `
      <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="font-weight: 300; letter-spacing: 2px; color: #1a1a1a; text-align: center;">GALERIE VARINCHI</h2>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #333;">Dear ${artistName},</p>
        <p style="color: #333;">We have published a new version of the <strong>Artist Collaboration Agreement</strong> (Version ${versionNumber}).</p>
        <p style="color: #666; font-size: 14px;">
          As a valued artist on our platform, you are required to read and sign the updated agreement before submitting new artworks.
        </p>
        <p style="color: #666; font-size: 14px;">
          Please log in to your Artist Dashboard where you will be prompted to review and sign the agreement.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${dashboardUrl}" style="background: #1a1a1a; color: white; padding: 12px 28px; border-radius: 4px; text-decoration: none; font-size: 14px; letter-spacing: 1px;">
            Review &amp; Sign Agreement
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">Galerie Varinchi · Artist Platform</p>
      </div>
    `
  );
}

export async function sendSignedAgreementEmail(
  artistEmail: string,
  artistName: string,
  versionNumber: string,
  agreementPdfUrl: string
): Promise<void> {
  const apiKey = getSecret('RESEND_API_KEY');
  if (!apiKey) {
    console.log(`\n========================================`);
    console.log(`  [SIGNED AGREEMENT] Sent to ${artistEmail} for v${versionNumber}`);
    console.log(`========================================\n`);
    return;
  }

  await sendEmail(
    artistEmail,
    `Confirmation: Signed Artist Agreement v${versionNumber} - Galerie Varinchi`,
    `
      <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="font-weight: 300; letter-spacing: 2px; color: #1a1a1a; text-align: center;">GALERIE VARINCHI</h2>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #333;">Dear ${artistName},</p>
        <p style="color: #333;">Thank you for signing the updated <strong>Artist Collaboration Agreement (Version ${versionNumber})</strong>.</p>
        <p style="color: #666; font-size: 14px;">Your signed collaboration agreement is available for your records here: <a href="${agreementPdfUrl}">Download Agreement</a></p>
        <p style="color: #666; font-size: 14px;">You can also access this at any time from your Artist Profile page.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      </div>
    `
  );
}
