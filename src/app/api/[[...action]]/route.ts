export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, desc, sql, inArray, lt, gte } from 'drizzle-orm';
import { createToken, getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth';
import { sendOtpEmail, sendOrderConfirmationEmail, sendArtistApplicationEmail, sendArtworkSubmissionEmail } from '@/lib/email';
import { getSecret } from '@/lib/secrets';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { processCommissionForOrder } from '@/lib/commission';
import crypto from 'crypto';


let s3Client: any = null;
async function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: getSecret('AWS_REGION') || 'ap-south-1',
      // No explicit credentials; use Lambda's IAM role
    });
  }
  return s3Client;
}

// Helper for safe JSON parsing of product images
// Helper to recursively parse JSON if it's multi-stringified
const deepParse = (val: any): any => {
  if (!val || typeof val !== 'string') return val;
  try {
    let current = val;
    for (let i = 0; i < 5; i++) {
       const parsed = JSON.parse(current);
       if (typeof parsed === 'string') {
         current = parsed;
         continue;
       }
       // Special case: Single key containing JSON (product data corruption fix)
       if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
         const keys = Object.keys(parsed);
         if (keys.length === 1 && keys[0].trim().startsWith('{') && keys[0].trim().endsWith('}')) {
           current = keys[0];
           continue;
         }
       }
       return parsed;
    }
    return current;
  } catch {
    return val;
  }
};

const getImages = (jsonStr: string | null): any[] => {
  if (!jsonStr) return [];
  const parsed = deepParse(jsonStr);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') return [parsed]; // Wrap single objects (e.g. specs)
  return [];
};

const parseProduct = (p: any) => {
  if (!p) return null;
  const parsed = {
    ...p,
    mediums: getImages(p.mediums),
    frameTypes: getImages(p.frameTypes),
    frameColors: getImages(p.frameColors),
    specifications: getImages(p.specifications),
    priceModifiers: deepParse(p.priceModifiers) || {},
    images: getImages(p.images),
  };
  // Ensure image is the first one from images
  parsed.image = (Array.isArray(parsed.images) && parsed.images.length > 0) ? parsed.images[0] : (p.image || '');
  return parsed;
};

// Real S3 Upload implementation
async function uploadToS3(file: File): Promise<string> {
  const bucketName = getSecret('S3_BUCKET_NAME');
  const region = getSecret('AWS_REGION') || 'ap-south-1';
  
  if (!bucketName) {
    console.warn('S3_BUCKET_NAME not set, falling back to placeholder');
    return `https://galerievarinchi-placeholder.s3.amazonaws.com/${Date.now()}-${file.name}`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const key = `assets/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

  try {
    console.log("AWS UPLOAD: Starting upload to bucket", bucketName);

    const s3 = await getS3Client();
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));
    // Use the environment variable we set in sst.config.ts
    const cdnBase = (process.env.NEXT_PUBLIC_CLOUDFRONT_URL || "https://www.galerievarinchi.com").replace(/\/$/, '').replace(/\/assets$/, '');
    
    // Ensure there is only one slash between the base domain and the key (which already starts with assets/)
    return `${cdnBase}/${key}`;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Failed to upload file to S3');
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ action?: string[] }> }) {
  try {
    const { action = [] } = await params;
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (action[0] === 'auth' && action[1] === 'me') return NextResponse.json({ user: user || null });
    
    // Public: Products
    if (action[0] === 'products') {
      const pId = id || action[1];
      if (pId) {
        const p = await db.query.product.findFirst({ 
          where: eq(schema.product.id, pId), 
          with: { subCategory: { with: { category: true } }, artistProfile: true } 
        });
        return p ? NextResponse.json({ product: parseProduct(p) }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      const list = await db.query.product.findMany({ 
        orderBy: [desc(schema.product.createdAt)], 
        with: { subCategory: { with: { category: true } }, artistProfile: true } 
      });
      return NextResponse.json({ products: list.map(parseProduct) });
    }

    // Public: Categories
    if (action[0] === 'categories') {
      const list = await db.query.category.findMany({ with: { subCategories: true } });
      return NextResponse.json(list);
    }

    // User: Cart
    if (action[0] === 'cart' && user) {
      const list = await db.query.cartItem.findMany({
        where: eq(schema.cartItem.userId, user.id),
        with: { product: true }
      });
      const items = list.map(item => ({
        ...item,
        title: item.product.title,
        image: getImages(item.product.images)[0] || ''
      }));
      return NextResponse.json({ items });
    }

    // User: Wishlist
    if (action[0] === 'wishlist' && user) {
      const list = await db.query.wishlistItem.findMany({
        where: eq(schema.wishlistItem.userId, user.id),
        with: { product: true }
      });
      const items = list.map(item => ({
        id: item.id,
        productId: item.productId,
        title: item.product.title,
        image: getImages(item.product.images)[0] || ''
      }));
      return NextResponse.json({ items });
    }

    // Public: Testimonials (only active ones)
    if (action[0] === 'testimonials') {
      const list = await db.query.testimonial.findMany({
        where: eq(schema.testimonial.isActive, true),
        with: { user: { columns: { name: true } }, product: { columns: { title: true } } },
        orderBy: [desc(schema.testimonial.createdAt)]
      });
      return NextResponse.json(list);
    }

    // User: Orders
    if (action[0] === 'orders' && user) {
      const status = searchParams.get('status');
      const limit = parseInt(searchParams.get('limit') || '50');
      
      // Admin View
      if (user.isAdmin && action[1] === 'export') {
        const list = await db.query.order.findMany({
          where: status ? eq(schema.order.status, status) : undefined,
          with: { orderItems: { with: { product: true } } },
          orderBy: [desc(schema.order.createdAt)]
        });
        
        let csv = 'Order ID,Date,Customer,Email,Phone,Amount,Status,Items\n';
        list.forEach(o => {
          const itemsStr = o.orderItems.map(i => `${i.product?.title || 'Unknown'} (${i.quantity})`).join('; ');
          csv += `${o.id},${o.createdAt},${o.customerName},${o.customerEmail},${o.customerPhone},${o.totalAmount},${o.status},"${itemsStr}"\n`;
        });
        
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="orders-${status || 'all'}.csv"`
          }
        });
      }

      const whereClause = user.isAdmin && status 
        ? eq(schema.order.status, status)
        : eq(schema.order.userId, user.id);

      const list = await db.query.order.findMany({
        where: whereClause,
        orderBy: [desc(schema.order.createdAt)],
        limit: limit,
        with: { orderItems: { with: { product: true } } }
      });
      
      return NextResponse.json({ orders: list });
    }

    // Admin: Requests & Management
    if (action[0] === 'admin' && user?.isAdmin) {
      if (action[1] === 'artists') {
        if (action[2] === 'stats') {
          const [pA, aA, pW] = await Promise.all([
            db.select({ count: sql<number>`count(*)` }).from(schema.artistProfile).where(eq(schema.artistProfile.status, 'PENDING')),
            db.select({ count: sql<number>`count(*)` }).from(schema.artistProfile).where(eq(schema.artistProfile.status, 'APPROVED')),
            db.select({ count: sql<number>`count(*)` }).from(schema.artRequest).where(eq(schema.artRequest.status, 'PENDING'))
          ]);
          return NextResponse.json({ pendingArtists: Number(pA[0].count), approvedArtists: Number(aA[0].count), pendingArtworks: Number(pW[0].count) });
        }
        
        if (action[2] === 'list') {
          const approved = await db.query.artistProfile.findMany({ where: eq(schema.artistProfile.status, 'APPROVED') });
          return NextResponse.json({ artists: approved });
        }

        if (action[2] === 'requests') {
          const reqId = action[3];
          if (reqId) {
            const req = await db.query.artistProfile.findFirst({ where: eq(schema.artistProfile.id, reqId) });
            return req ? NextResponse.json({ request: req }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
          }
          const requests = await db.query.artistProfile.findMany({ where: eq(schema.artistProfile.status, 'PENDING') });
          return NextResponse.json({ requests });
        }
      }

      if (action[1] === 'artwork-requests') {
        const reqId = action[2];
        if (reqId) {
          const req = await db.query.artRequest.findFirst({ 
            where: eq(schema.artRequest.id, reqId), 
            with: { artistProfile: true, category: true, subCategory: true } 
          });
          return req ? NextResponse.json({ request: req }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        const list = await db.query.artRequest.findMany({ 
          with: { artistProfile: true, category: true, subCategory: true } 
        });
        return NextResponse.json({ requests: list });
      }
      
      // Admin: Coupons
      if (action[1] === 'coupons') {
        const list = await db.query.coupon.findMany({ orderBy: [desc(schema.coupon.createdAt)] });
        return NextResponse.json({ coupons: list });
      }
      
      // Admin: Commission audit
      if (action[1] === 'commissions') {
        if (action[2] === 'stats') {
          // Platform-wide financial totals
          const [revenueRes] = await db.select({ total: sql<number>`COALESCE(SUM("totalAmount"), 0)` })
            .from(schema.order)
            .where(inArray(schema.order.status, ['NEW', 'PROCESSING', 'COMPLETED']));
          const [commissionsRes] = await db.select({ total: sql<number>`COALESCE(SUM("artistShare"), 0)` })
            .from(schema.commissionLedger)
            .where(inArray(schema.commissionLedger.status, ['PENDING', 'COMPLETED']));
          const [salesRes] = await db.select({ count: sql<number>`count(*)` })
            .from(schema.commissionLedger)
            .where(inArray(schema.commissionLedger.status, ['PENDING', 'COMPLETED']));
          return NextResponse.json({
            totalRevenue: Number(revenueRes.total),
            totalCommissions: Number(commissionsRes.total),
            totalSales: Number(salesRes.count)
          });
        }

        // Filtered ledger list — ?artist=name&product=name
        const artistFilter = searchParams.get('artist')?.toLowerCase() || '';
        const productFilter = searchParams.get('product')?.toLowerCase() || '';

        const allLedgers = await db.query.commissionLedger.findMany({
          orderBy: [desc(schema.commissionLedger.createdAt)],
          with: {
            artistProfile: { columns: { fullName: true, email: true } },
            product: { columns: { title: true, basePrice: true } }
          }
        });

        const filtered = allLedgers.filter(l => {
          const artistMatch = !artistFilter || l.artistProfile?.fullName?.toLowerCase().includes(artistFilter);
          const productMatch = !productFilter || l.product?.title?.toLowerCase().includes(productFilter);
          return artistMatch && productMatch;
        });

        return NextResponse.json({ ledgers: filtered });
      }

      // Admin: All Testimonials (including hidden)
      if (action[1] === 'testimonials') {
        const list = await db.query.testimonial.findMany({
          with: { user: { columns: { name: true } }, product: { columns: { title: true } } },
          orderBy: [desc(schema.testimonial.createdAt)]
        });
        return NextResponse.json(list);
      }
    }

    // Public/Admin: Artist Profile by ID
    if (action[0] === 'artist' && action[1] && action[1] !== 'profile' && action[1] !== 'art-requests' && action[1] !== 'apply') {
      const condition = user?.isAdmin 
        ? eq(schema.artistProfile.id, action[1])
        : and(eq(schema.artistProfile.id, action[1]), eq(schema.artistProfile.status, 'APPROVED'));
      const profile = await db.query.artistProfile.findFirst({ where: condition });
      return profile 
        ? NextResponse.json({ profile }) 
        : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Artist: Dashboard & Profile (authenticated)
    if (action[0] === 'artist' && user) {
       const profile = await db.query.artistProfile.findFirst({ where: eq(schema.artistProfile.userId, user.id) });
       if (action[1] === 'profile') return NextResponse.json({ profile });
       if (action[1] === 'art-requests' && profile) {
         const requests = await db.query.artRequest.findMany({ where: eq(schema.artRequest.artistId, profile.id) });
         return NextResponse.json({ requests });
       }

       // Artist Wallet — overview
       if (action[1] === 'wallet' && profile) {
         if (action[2] === 'product' && action[3]) {
           // Per-product commission drill-down
           const ledgers = await db.query.commissionLedger.findMany({
             where: and(
               eq(schema.commissionLedger.artistId, profile.id),
               eq(schema.commissionLedger.productId, action[3])
             ),
             orderBy: [desc(schema.commissionLedger.createdAt)]
           });
           const product = await db.query.product.findFirst({ where: eq(schema.product.id, action[3]) });
           const totalEarned = ledgers.reduce((s, l) => s + l.artistShare, 0);
           const totalSales = ledgers.length;
           return NextResponse.json({ product, ledgers, totalEarned, totalSales });
         }

         // Main wallet overview
         const wallet = await db.query.artistWallet.findFirst({
           where: eq(schema.artistWallet.artistId, profile.id)
         });
         const ledgers = await db.query.commissionLedger.findMany({
           where: eq(schema.commissionLedger.artistId, profile.id),
           orderBy: [desc(schema.commissionLedger.createdAt)],
           with: { product: { columns: { id: true, title: true, basePrice: true, totalCommissionPaid: true } } }
         });
         const totalEarned = (wallet?.availableBalance ?? 0) + (wallet?.pendingBalance ?? 0);
         const totalSales = ledgers.length;
         return NextResponse.json({ wallet: wallet ?? { availableBalance: 0, pendingBalance: 0 }, ledgers, totalEarned, totalSales });
       }
    }

    // Health Check
    if (action[0] === 'health') {
      try {
        await db.select({ count: sql`count(*)` }).from(schema.user).limit(1);
        
        let s3Status = 'not_tested';
        try {
          await getS3Client();
          s3Status = 'initialized';
        } catch (s3Err: any) {
          s3Status = `error: ${s3Err.message}`;
        }

        return NextResponse.json({ 
          status: 'ok', 
          db: 'connected', 
          s3: s3Status,
          time: new Date().toISOString() 
        });
      } catch (e: any) {
        console.error('Health Check Failure:', e);
        return NextResponse.json({ status: 'error', message: e.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error: any) { 
    console.error('GET Error:', error);
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 }); 
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ action?: string[] }> }) {
  try {
    const { action = [] } = await params;
    const user = await getCurrentUser();
    
    // --- Handle Multipart (Fallback for small legacy uploads, though we now prefer Presigned URLs) ---
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      // Generic Upload
      if (action[0] === 'upload' && user?.isAdmin) {
        const file = formData.get('file');
        if (!file || !(file instanceof File)) {
          return NextResponse.json({ error: 'No valid file provided' }, { status: 400 });
        }
        const url = await uploadToS3(file);
        return NextResponse.json({ url });
      }
    }

    // --- JSON Handlers ---
    const body = await request.json().catch(() => ({}));

    // 1. Generate Presigned URL for Direct S3 Uploads (solves OpenNext multipart crash)
    if (action[0] === 'upload' && action[1] === 'presigned') {
      const { filename, contentType } = body;
      if (!filename || !contentType) return NextResponse.json({ error: 'filename and contentType required' }, { status: 400 });
      
      const s3 = await getS3Client();
      const bucketName = getSecret('S3_BUCKET_NAME');
      const key = `assets/${Date.now()}-${filename.replace(/\s+/g, '_')}`;
      
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      const command = new PutObjectCommand({ Bucket: bucketName, Key: key, ContentType: contentType });
      
      // Presigned URL expires in 5 minutes
      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
      const cdnBase = (process.env.NEXT_PUBLIC_CLOUDFRONT_URL || "https://www.galerievarinchi.com").replace(/\/$/, '').replace(/\/assets$/, '');
      const finalUrl = `${cdnBase}/${key}`;
      
      return NextResponse.json({ uploadUrl, finalUrl });
    }

    // 2. Artist apply (Now JSON-based)
    if (action[0] === 'artist' && action[1] === 'apply' && user) {
      const {
        fullName, email, phone, country, state, area, bio, specialization, portfolioLink,
        examples, profilePhotoUrl, agreementIp, agreementVersion, agreementTimestamp, agreementPdfUrl
      } = body;
      
      try {
        const [profile] = await db.insert(schema.artistProfile).values({
          id: crypto.randomUUID(),
          userId: user.id,
          fullName,
          email,
          phone,
          country,
          state,
          area,
          bio,
          specialization,
          portfolioLink,
          examples: JSON.stringify(examples || []), // array of strings
          profilePhoto: profilePhotoUrl || null,
          ipAddress: agreementIp || request.headers.get('x-forwarded-for') || 'unknown',
          agreementPdfUrl: agreementPdfUrl || null,
          agreementVersion: agreementVersion || '1.0',
          agreementTimestamp: agreementTimestamp || new Date().toISOString(),
          status: 'PENDING',
          updatedAt: new Date().toISOString()
        })
        .onConflictDoUpdate({
          target: schema.artistProfile.userId,
          set: {
            fullName, phone, country, state, area, bio, specialization, portfolioLink,
            examples: JSON.stringify(examples || []),
            profilePhoto: profilePhotoUrl || null,
            ipAddress: agreementIp || request.headers.get('x-forwarded-for') || 'unknown',
            agreementPdfUrl,
            agreementVersion,
            agreementTimestamp,
            updatedAt: new Date().toISOString()
          }
        })
        .returning();
        
        // Notify admin
        sendArtistApplicationEmail(fullName, email).catch(err => console.error('Admin email error:', err));
        
        return NextResponse.json({ profile });
      } catch (dbError: any) {
        console.error('DATABASE ERROR during artist apply:', dbError);
        return NextResponse.json({ 
          error: dbError.message || 'Database error',
          detail: 'Failed to insert ArtistProfile. Make sure you don\'t already have a pending application.'
        }, { status: 500 });
      }
    }
    // Bank details (artist saves after approval)
    if (action[0] === 'artist' && action[1] === 'wallet' && action[2] === 'bank' && user) {
      const profile = await db.query.artistProfile.findFirst({ where: eq(schema.artistProfile.userId, user.id) });
      if (!profile) return NextResponse.json({ error: 'Artist profile not found' }, { status: 404 });
      const { bankName, accountNumber, ifscCode, bankBranch } = body;
      const [updated] = await db.update(schema.artistProfile)
        .set({ bankName, accountNumber, ifscCode, bankBranch, updatedAt: new Date().toISOString() })
        .where(eq(schema.artistProfile.id, profile.id))
        .returning();
      return NextResponse.json({ profile: updated });
    }

    // 3. Art request (Artwork Submission - Now JSON-based)
    if (action[0] === 'artist' && action[1] === 'art-requests' && user) {
      const profile = await db.query.artistProfile.findFirst({ where: eq(schema.artistProfile.userId, user.id) });
      if (!profile) return NextResponse.json({ error: 'Artist profile not found' }, { status: 404 });
      
      const {
        title, description, yearCreated, price, quantity, specifications, images, categoryId, subCategoryId
      } = body;
      
      const [artReq] = await db.insert(schema.artRequest).values({
        id: crypto.randomUUID(),
        artistId: profile.id,
        title,
        description,
        yearCreated,
        price: parseFloat(price),
        quantity: parseInt(quantity) || 1,
        specifications: specifications || '[]',
        images: JSON.stringify(images || []), // array of strings
        status: 'PENDING',
        categoryId,
        subCategoryId,
      }).returning();
      
      // Notify admin
      sendArtworkSubmissionEmail(profile.fullName, title).catch(err => console.error('Admin email error:', err));
      
      return NextResponse.json({ artReq });
    }

    // 4. Artist profile edit
    if (action[0] === 'artist' && action[1] === 'profile' && action[2] === 'edit' && user) {
       const profile = await db.query.artistProfile.findFirst({ where: eq(schema.artistProfile.userId, user.id) });
       if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
       
       const { bio, portfolioLink, phone, specialization } = body;
       const [updated] = await db.update(schema.artistProfile)
         .set({ bio, portfolioLink, phone, specialization, updatedAt: new Date().toISOString() })
         .where(eq(schema.artistProfile.id, profile.id))
         .returning();
         
       return NextResponse.json({ profile: updated });
    }

    if (action[0] === 'auth') {
      const email = body.email?.trim().toLowerCase();
      
      // Password-based Sign In
      if (action[1] === 'signin') {
        const password = body.password;
        if (!email || !password) {
          return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }
        
        const u = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
        if (!u) {
          return NextResponse.json({ error: 'Account not found. Please sign up instead.' }, { status: 404 });
        }
        if (!u.passwordHash) {
          return NextResponse.json({ error: 'Password not set. Please use "Forgot Password" to set one.' }, { status: 400 });
        }
        
        const valid = await verifyPassword(password, u.passwordHash);
        if (!valid) {
          return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }
        
        // Create session
        const sId = crypto.randomUUID();
        const token = await createToken(u.id, sId);
        await db.insert(schema.session).values({ 
          id: sId, userId: u.id, token, 
          expiresAt: new Date(Date.now() + 604800 * 1000).toISOString() 
        });
        
        const res = NextResponse.json({ user: u });
        res.cookies.set('auth-token', token, { 
          httpOnly: true, secure: process.env.NODE_ENV === 'production', 
          maxAge: 604800, path: '/' 
        });
        return res;
      }
      
      // Sign Up — Step 1: send OTP (with password stored temporarily)
      if (action[1] === 'signup') {
        const password = body.password;
        const otp = body.otp?.trim();
        
        if (!otp) {
          // Step 1: Validate and send OTP
          if (!email || !password || password.length < 6) {
            return NextResponse.json({ error: 'Email and password (min 6 chars) are required' }, { status: 400 });
          }
          
          const u = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
          if (u) {
            return NextResponse.json({ error: 'Account already exists. Please sign in instead.' }, { status: 400 });
          }
          
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          const newExpiresAt = new Date(Date.now() + 600000).toISOString();
          await db.insert(schema.otpToken).values({ id: crypto.randomUUID(), email, otp: code, expiresAt: newExpiresAt })
            .onConflictDoUpdate({ target: schema.otpToken.email, set: { otp: code, used: false, expiresAt: newExpiresAt } });
          await sendOtpEmail(email, code);
          return NextResponse.json({ message: 'Sent' });
        }
        
        // Step 2: Verify OTP and create user with password
        const record = await db.query.otpToken.findFirst({ 
          where: eq(schema.otpToken.email, email), 
          orderBy: [desc(schema.otpToken.createdAt)] 
        });
        
        if (!record || record.otp !== otp || record.used || new Date(record.expiresAt).getTime() < Date.now()) {
          return NextResponse.json({ error: 'Invalid or Expired OTP' }, { status: 400 });
        }
        
        const isAdminEmail = email === 'admin@galerievarinchi.com';
        const hashedPw = password ? await hashPassword(password) : null;
        
        const [u] = await db.insert(schema.user).values({ 
          id: crypto.randomUUID(), email, passwordHash: hashedPw, isAdmin: isAdminEmail 
        }).returning();
        
        await db.update(schema.otpToken).set({ used: true }).where(eq(schema.otpToken.id, record.id));
        
        const sId = crypto.randomUUID();
        const token = await createToken(u.id, sId);
        await db.insert(schema.session).values({ 
          id: sId, userId: u.id, token, 
          expiresAt: new Date(Date.now() + 604800 * 1000).toISOString() 
        });
        
        const res = NextResponse.json({ user: u });
        res.cookies.set('auth-token', token, { 
          httpOnly: true, secure: process.env.NODE_ENV === 'production', 
          maxAge: 604800, path: '/' 
        });
        return res;
      }
      
      // Verify OTP (for artist signup flow — OTP only, no password in this step)
      if (action[1] === 'verify-otp' || action[1] === 'otp') {
        const otp = body.otp?.trim();
        
        if (!otp) {
          // Just send OTP
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          const newExpiresAt = new Date(Date.now() + 600000).toISOString();
          await db.insert(schema.otpToken).values({ id: crypto.randomUUID(), email, otp: code, expiresAt: newExpiresAt })
            .onConflictDoUpdate({ target: schema.otpToken.email, set: { otp: code, used: false, expiresAt: newExpiresAt } });
          await sendOtpEmail(email, code);
          return NextResponse.json({ message: 'Sent' });
        }
        
        // Verify OTP
        const record = await db.query.otpToken.findFirst({ 
          where: eq(schema.otpToken.email, email), 
          orderBy: [desc(schema.otpToken.createdAt)] 
        });
        
        if (!record || record.otp !== otp || record.used || new Date(record.expiresAt).getTime() < Date.now()) {
          return NextResponse.json({ error: 'Invalid or Expired OTP' }, { status: 400 });
        }
        
        let u = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
        const isAdminEmail = email === 'admin@galerievarinchi.com';
        const password = body.password;
        
        if (!u && body.isSignup) {
          const hashedPw = password ? await hashPassword(password) : null;
          [u] = await db.insert(schema.user).values({ 
            id: crypto.randomUUID(), email, passwordHash: hashedPw, isAdmin: isAdminEmail 
          }).returning();
        } else if (u && isAdminEmail && !u.isAdmin) {
          [u] = await db.update(schema.user).set({ isAdmin: true }).where(eq(schema.user.id, u.id)).returning();
        }
        
        if (!u) return NextResponse.json({ error: 'User not found. Please sign up.' }, { status: 404 });
        
        await db.update(schema.otpToken).set({ used: true }).where(eq(schema.otpToken.id, record.id));
        const sId = crypto.randomUUID();
        const token = await createToken(u.id, sId);
        
        await db.insert(schema.session).values({ 
          id: sId, userId: u.id, token, 
          expiresAt: new Date(Date.now() + 604800 * 1000).toISOString() 
        });
        
        const res = NextResponse.json({ user: u });
        res.cookies.set('auth-token', token, { 
          httpOnly: true, secure: process.env.NODE_ENV === 'production', 
          maxAge: 604800, path: '/' 
        });
        return res;
      }
      
      // Forgot Password — send OTP to registered email
      if (action[1] === 'forgot-password') {
        if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        
        const u = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
        if (!u) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const newExpiresAt = new Date(Date.now() + 600000).toISOString();
        await db.insert(schema.otpToken).values({ id: crypto.randomUUID(), email, otp: code, expiresAt: newExpiresAt })
          .onConflictDoUpdate({ target: schema.otpToken.email, set: { otp: code, used: false, expiresAt: newExpiresAt } });
        await sendOtpEmail(email, code);
        return NextResponse.json({ message: 'OTP sent to your email' });
      }
      
      // Reset Password — verify OTP and set new password
      if (action[1] === 'reset-password') {
        const otp = body.otp?.trim();
        const newPassword = body.newPassword;
        
        if (!email || !otp || !newPassword || newPassword.length < 6) {
          return NextResponse.json({ error: 'Email, OTP, and new password (min 6 chars) required' }, { status: 400 });
        }
        
        const record = await db.query.otpToken.findFirst({ 
          where: eq(schema.otpToken.email, email), 
          orderBy: [desc(schema.otpToken.createdAt)] 
        });
        
        if (!record || record.otp !== otp || record.used || new Date(record.expiresAt).getTime() < Date.now()) {
          return NextResponse.json({ error: 'Invalid or Expired OTP' }, { status: 400 });
        }
        
        const u = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
        if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        
        const hashedPw = await hashPassword(newPassword);
        await db.update(schema.user).set({ passwordHash: hashedPw }).where(eq(schema.user.id, u.id));
        await db.update(schema.otpToken).set({ used: true }).where(eq(schema.otpToken.id, record.id));
        
        return NextResponse.json({ message: 'Password updated successfully' });
      }
      
      if (action[1] === 'logout' || action[1] === 'signout') {
        const res = NextResponse.json({ message: 'Out' });
        res.cookies.set('auth-token', '', { maxAge: 0, path: '/' });
        return res;
      }
    }


    if (action[0] === 'cart' && user) {
      const [item] = await db.insert(schema.cartItem).values({ id: crypto.randomUUID(), userId: user.id, ...body }).returning();
      return NextResponse.json(item);
    }

    if (action[0] === 'wishlist' && user) {
      const [item] = await db.insert(schema.wishlistItem).values({ id: crypto.randomUUID(), userId: user.id, productId: body.productId }).returning();
      return NextResponse.json(item);
    }

    if (action[0] === 'orders' && user) {
      // Calculate discount from coupon if provided
      let couponId: string | null = null;
      let discountAmount: number | null = null;
      let subtotal = body.items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
      
      if (body.couponCode) {
        const c = await db.query.coupon.findFirst({ where: eq(schema.coupon.code, body.couponCode.toUpperCase().trim()) });
        if (c && c.isActive && (!c.expiresAt || new Date(c.expiresAt).getTime() > Date.now())) {
          couponId = c.id;
          discountAmount = Math.round((subtotal * c.discountPercent / 100) * 100) / 100;
          subtotal = subtotal - discountAmount;
        }
      }
      
      const [order] = await db.insert(schema.order).values({
        id: crypto.randomUUID(),
        userId: user.id,
        status: 'NEW',
        totalAmount: subtotal,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone,
        customerAddress: user.address,
        couponId,
        discountAmount,
      }).returning();
      
      const items = body.items.map((i: any) => ({
        id: crypto.randomUUID(),
        orderId: order.id,
        productId: i.productId,
        quantity: i.quantity,
        price: i.price,
        medium: i.medium,
        frameType: i.frameType,
        frameColor: i.frameColor,
      }));
      
      await db.insert(schema.orderItem).values(items);
      await sendOrderConfirmationEmail(user.email, order.id, order.totalAmount);
      
      // Every new order is already paid (payment confirmed at checkout).
      // Fire commission engine immediately — fire-and-forget so it doesn't block the response.
      processCommissionForOrder(order.id).catch(err =>
        console.error('Commission processing error for order', order.id, err)
      );
      
      return NextResponse.json({ order });
    }

    if (action[0] === 'admin' && user?.isAdmin) {
      // Review Artist
      if (action[1] === 'artists' && action[2] === 'requests' && action[3]) {
        const [profile] = await db.update(schema.artistProfile)
          .set({ status: body.action === 'APPROVE' ? 'APPROVED' : 'DECLINED' })
          .where(eq(schema.artistProfile.id, action[3]))
          .returning();
        return NextResponse.json({ profile });
      }
      // Review Artwork
      if (action[1] === 'artwork-requests' && action[2]) {
        const [artReq] = await db.update(schema.artRequest)
          .set({ status: body.action === 'APPROVE' ? 'APPROVED' : 'DECLINED' })
          .where(eq(schema.artRequest.id, action[2]))
          .returning();
        
        if (body.action === 'APPROVE') {
           const imageUrls = getImages(artReq.images);
           await db.insert(schema.product).values({
             id: crypto.randomUUID(),
             title: artReq.title,
             description: artReq.description,
             basePrice: artReq.price,
             image: imageUrls[0] || '/images/placeholder.jpg',
             images: artReq.images,
             specifications: artReq.specifications,
             unitsAvailable: artReq.quantity,
             status: 'active',
             subCategoryId: artReq.subCategoryId,
           });
        }
        
        revalidatePath('/admin/content/products');
        revalidatePath('/category', 'layout');
        revalidatePath('/');
        
        return NextResponse.json({ artReq });
      }
      
      // Testimonial management
      if (action[1] === 'testimonials' && action[2]) {
        // Toggle active or delete handled in PUT/DELETE
        return NextResponse.json({ error: 'Use PUT or DELETE' }, { status: 405 });
      }
      
      // Coupon management
      if (action[1] === 'coupons') {
        const couponCode = body.code?.toUpperCase().trim();
        if (!couponCode || !body.discountPercent || body.discountPercent <= 0 || body.discountPercent > 100) {
          return NextResponse.json({ error: 'Valid code and discount percent (1-100) required' }, { status: 400 });
        }
        const existing = await db.query.coupon.findFirst({ where: eq(schema.coupon.code, couponCode) });
        if (existing) return NextResponse.json({ error: 'Coupon code already exists' }, { status: 400 });
        
        const [c] = await db.insert(schema.coupon).values({
          id: crypto.randomUUID(),
          code: couponCode,
          discountPercent: body.discountPercent,
          expiresAt: body.expiresAt ? new Date(body.expiresAt).toISOString() : null,
        }).returning();
        return NextResponse.json({ coupon: c }, { status: 201 });
      }
    }
    
    // Public: Validate coupon
    if (action[0] === 'coupons' && action[1] === 'validate') {
      const couponCode = body.code?.toUpperCase().trim();
      if (!couponCode) return NextResponse.json({ error: 'Coupon code required' }, { status: 400 });
      const c = await db.query.coupon.findFirst({ where: eq(schema.coupon.code, couponCode) });
      if (!c || !c.isActive) return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 });
      if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) {
        return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 });
      }
      return NextResponse.json({ coupon: { id: c.id, code: c.code, discountPercent: c.discountPercent } });
    }

    if (action[0] === 'testimonials' && user) {
      const [test] = await db.insert(schema.testimonial).values({ id: crypto.randomUUID(), userId: user.id, ...body }).returning();
      return NextResponse.json(test);
    }

    if (action[0] === 'products' && user?.isAdmin) {
      const [p] = await db.insert(schema.product).values({ 
        ...body, 
        id: crypto.randomUUID(), 
        status: 'active',
        basePrice: body.price || body.basePrice || 0,
        image: body.image || (getImages(body.images)[0] || '/images/placeholder.jpg')
      }).returning();
      
      revalidatePath('/admin/content/products');
      revalidatePath('/category', 'layout');
      revalidatePath('/');
      
      return NextResponse.json({ product: parseProduct(p) }, { status: 201 });
    }

    if (action[0] === 'categories' && user?.isAdmin) {
      const existing = await db.query.category.findFirst({ where: eq(schema.category.slug, body.slug) });
      if (existing) {
        return NextResponse.json({ error: `Category with slug "${body.slug}" already exists.` }, { status: 400 });
      }
      const [cat] = await db.insert(schema.category).values({ id: crypto.randomUUID(), ...body }).returning();
      
      revalidatePath('/admin/content/categories');
      revalidatePath('/category', 'layout');
      revalidatePath('/');
      
      return NextResponse.json(cat);
    }

    if (action[0] === 'subcategories' && user?.isAdmin) {
      const existing = await db.query.subCategory.findFirst({ 
        where: and(eq(schema.subCategory.slug, body.slug), eq(schema.subCategory.categoryId, body.categoryId)) 
      });
      if (existing) {
        return NextResponse.json({ error: `Sub-category slug "${body.slug}" exists in this category.` }, { status: 400 });
      }
      const [sub] = await db.insert(schema.subCategory).values({ id: crypto.randomUUID(), ...body }).returning();
      
      revalidatePath('/admin/content/subcategories');
      revalidatePath('/admin/content/products');
      revalidatePath('/category', 'layout');
      revalidatePath('/');
      
      return NextResponse.json(sub);
    }

    if (action[0] === 'contact') {
      // Mock sending contact email
      console.log('Contact Message Received:', body);
      return NextResponse.json({ message: 'Sent' });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error: any) { 
    console.error('POST Error:', error);
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 }); 
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ action?: string[] }> }) {
  try {
    const { action = [] } = await params;
    const user = await getCurrentUser();
    const body = await request.json();
    if (action[0] === 'profile' && user) {
      const [updatedUser] = await db.update(schema.user).set({ name: body.name, phone: body.phone, address: body.address }).where(eq(schema.user.id, user.id)).returning();
      return NextResponse.json({ user: updatedUser });
    }
    if (action[0] === 'artist' && action[1] === 'profile' && user) {
       const [p] = await db.update(schema.artistProfile).set(body).where(eq(schema.artistProfile.userId, user.id)).returning();
       return NextResponse.json({ profile: p });
    }
    // Admin: Toggle testimonial active
    if (action[0] === 'admin' && action[1] === 'testimonials' && action[2] && user?.isAdmin) {
      const [t] = await db.update(schema.testimonial)
        .set({ isActive: body.isActive })
        .where(eq(schema.testimonial.id, action[2]))
        .returning();
      return NextResponse.json({ testimonial: t });
    }
    // Admin: Toggle coupon active
    if (action[0] === 'admin' && action[1] === 'coupons' && action[2] && user?.isAdmin) {
      const [c] = await db.update(schema.coupon)
        .set({ isActive: body.isActive })
        .where(eq(schema.coupon.id, action[2]))
        .returning();
      return NextResponse.json({ coupon: c });
    }
    if (action[0] === 'cart' && user) {
      const [item] = await db.update(schema.cartItem).set({ quantity: body.quantity }).where(and(eq(schema.cartItem.id, body.id), eq(schema.cartItem.userId, user.id))).returning();
      return NextResponse.json(item);
    }
    if (action[0] === 'products' && user?.isAdmin) {
      const id = new URL(request.url).searchParams.get('id') || action[1];
      const [p] = await db.update(schema.product).set(body).where(eq(schema.product.id, id)).returning();
      
      revalidatePath('/admin/content/products');
      revalidatePath('/category', 'layout');
      revalidatePath('/');
      
      return NextResponse.json({ product: parseProduct(p) });
    }
    if (action[0] === 'subcategories' && user?.isAdmin) {
      const id = action[1];
      const [sub] = await db.update(schema.subCategory).set(body).where(eq(schema.subCategory.id, id)).returning();
      
      revalidatePath('/admin/content/subcategories');
      revalidatePath('/admin/content/products');
      revalidatePath('/category', 'layout');
      revalidatePath('/');
      
      return NextResponse.json(sub);
    }
    if (action[0] === 'categories' && user?.isAdmin) {
      const id = action[1];
      const [cat] = await db.update(schema.category).set(body).where(eq(schema.category.id, id)).returning();
      
      revalidatePath('/admin/content/categories');
      revalidatePath('/category', 'layout');
      revalidatePath('/');
      
      return NextResponse.json(cat);
    }
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error: any) { return NextResponse.json({ error: error.message || 'Error' }, { status: 500 }); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ action?: string[] }> }) {
  try {
    const { action = [] } = await params;
    const user = await getCurrentUser();
    const body = await request.json();
    
    if (user?.isAdmin) {
      // Update Product status
      if (action[0] === 'products' && action[1]) {
        const [p] = await db.update(schema.product).set(body).where(eq(schema.product.id, action[1])).returning();
        
        revalidatePath('/admin/content/products');
        revalidatePath('/category', 'layout');
        revalidatePath('/');
        
        return NextResponse.json({ product: parseProduct(p) });
      }
      // Update Order status
      if (action[0] === 'orders' && action[1]) {
        const [o] = await db.update(schema.order).set({ status: body.status }).where(eq(schema.order.id, action[1])).returning();

        // Handle refund — cancel pending ledger entries and restore wallet
        if (body.status === 'REFUNDED' || body.status === 'CANCELLED') {
          const pendingLedgers = await db.query.commissionLedger.findMany({
            where: and(
              eq(schema.commissionLedger.status, 'PENDING'),
              // find ledgers for items in this order
              inArray(
                schema.commissionLedger.orderItemId,
                (await db.query.orderItem.findMany({ where: eq(schema.orderItem.orderId, action[1]) })).map(i => i.id)
              )
            )
          });
          for (const ledger of pendingLedgers) {
            await db.update(schema.commissionLedger).set({ status: 'CANCELLED' }).where(eq(schema.commissionLedger.id, ledger.id));
            await db.update(schema.artistWallet)
              .set({ pendingBalance: sql`GREATEST(0, "ArtistWallet"."pendingBalance" - ${ledger.artistShare})`, updatedAt: new Date().toISOString() })
              .where(eq(schema.artistWallet.artistId, ledger.artistId));
            // Reverse the product totalCommissionPaid
            await db.update(schema.product)
              .set({ totalCommissionPaid: sql`GREATEST(0, "Product"."totalCommissionPaid" - ${ledger.artistShare})` })
              .where(eq(schema.product.id, ledger.productId));
          }
        }

        return NextResponse.json({ order: o });
      }
    }
    
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error: any) { return NextResponse.json({ error: error.message || 'Error' }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ action?: string[] }> }) {
  try {
    const { action = [] } = await params;
    const user = await getCurrentUser();
    const body = await request.json().catch(() => ({}));
    if (action[0] === 'cart' && user) {
      if (body.clearAll) {
        await db.delete(schema.cartItem).where(eq(schema.cartItem.userId, user.id));
      } else {
        await db.delete(schema.cartItem).where(and(eq(schema.cartItem.id, body.id), eq(schema.cartItem.userId, user.id)));
      }
      return NextResponse.json({ message: 'Removed' });
    }
    if (action[0] === 'wishlist' && user) {
      const pId = body.productId || new URL(request.url).searchParams.get('productId');
      if (!pId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
      await db.delete(schema.wishlistItem).where(and(eq(schema.wishlistItem.userId, user.id), eq(schema.wishlistItem.productId, pId)));
      return NextResponse.json({ message: 'Removed' });
    }
    if (action[0] === 'categories' && user?.isAdmin) {
      const id = action[1];
      await db.delete(schema.category).where(eq(schema.category.id, id));
      
      revalidatePath('/admin/content/categories');
      revalidatePath('/category', 'layout');
      revalidatePath('/');
      
      return NextResponse.json({ message: 'Removed' });
    }
    if (action[0] === 'subcategories' && user?.isAdmin) {
      const id = action[1];
      await db.delete(schema.subCategory).where(eq(schema.subCategory.id, id));
      
      revalidatePath('/admin/content/subcategories');
      revalidatePath('/admin/content/products');
      revalidatePath('/category', 'layout');
      revalidatePath('/');
      
      return NextResponse.json({ message: 'Removed' });
    }
    // Admin: Delete testimonial
    if (action[0] === 'admin' && action[1] === 'testimonials' && action[2] && user?.isAdmin) {
      await db.delete(schema.testimonial).where(eq(schema.testimonial.id, action[2]));
      return NextResponse.json({ message: 'Removed' });
    }
    // Admin: Delete coupon
    if (action[0] === 'admin' && action[1] === 'coupons' && action[2] && user?.isAdmin) {
      await db.delete(schema.coupon).where(eq(schema.coupon.id, action[2]));
      return NextResponse.json({ message: 'Removed' });
    }
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error: any) { return NextResponse.json({ error: error.message || 'Error' }, { status: 500 }); }
}
