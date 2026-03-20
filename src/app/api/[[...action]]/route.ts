export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { createToken, getCurrentUser } from '@/lib/auth';
import { sendOtpEmail, sendOrderConfirmationEmail } from '@/lib/email';
import { getSecret } from '@/lib/secrets';
import crypto from 'crypto';

let s3Client: any = null;
async function getS3Client() {
  if (!s3Client) {
    const { S3Client } = await import('@aws-sdk/client-s3');
    s3Client = new S3Client({
      region: getSecret('AWS_REGION') || 'ap-south-1',
      credentials: {
        accessKeyId: getSecret('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: getSecret('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }
  return s3Client;
}

// Helper for safe JSON parsing of product images
const getImages = (jsonStr: string | null) => {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
  const key = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

  try {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = await getS3Client();
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
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
          with: { subCategory: { with: { category: true } } } 
        });
        return p ? NextResponse.json({ product: p }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      const list = await db.query.product.findMany({ 
        orderBy: [desc(schema.product.createdAt)], 
        with: { subCategory: { with: { category: true } } } 
      });
      return NextResponse.json({ products: list });
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

    // Public: Testimonials
    if (action[0] === 'testimonials') {
      const list = await db.query.testimonial.findMany({
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
          const req = await db.query.artRequest.findFirst({ where: eq(schema.artRequest.id, reqId), with: { artistProfile: true } });
          return req ? NextResponse.json({ request: req }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        const list = await db.query.artRequest.findMany({ with: { artistProfile: true } });
        return NextResponse.json({ requests: list });
      }
    }

    // Artist: Dashboard & Profile
    if (action[0] === 'artist' && user) {
       const profile = await db.query.artistProfile.findFirst({ where: eq(schema.artistProfile.userId, user.id) });
       if (action[1] === 'profile') return NextResponse.json({ profile });
       if (action[1] === 'art-requests' && profile) {
         const requests = await db.query.artRequest.findMany({ where: eq(schema.artRequest.artistId, profile.id) });
         return NextResponse.json({ requests });
       }
    }

    // Health Check
    if (action[0] === 'health') {
      try {
        await db.select({ count: sql`count(*)` }).from(schema.user).limit(1);
        
        // Test S3 SDK loadability
        let s3Status = 'not_tested';
        try {
          await getS3Client();
          s3Status = 'loadable';
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
    
    // Handle Multipart for Profile Application and Artwork Submission
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      // Artist apply
      if (action[0] === 'artist' && action[1] === 'apply' && user) {
        const fullName = formData.get('fullName') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;
        const country = formData.get('country') as string;
        const state = formData.get('state') as string;
        const area = formData.get('area') as string;
        const bio = formData.get('bio') as string;
        const specialization = formData.get('specialization') as string;
        const portfolioLink = formData.get('portfolioLink') as string;
        const examples = formData.getAll('examples') as File[];
        
        const urls = await Promise.all(examples.map(f => uploadToS3(f)));
        
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
          examples: JSON.stringify(urls),
          status: 'PENDING',
          updatedAt: new Date().toISOString()
        }).returning();
        
        return NextResponse.json({ profile });
      }
      
      // Art request (Artwork Submission)
      if (action[0] === 'artist' && action[1] === 'art-requests' && user) {
        const profile = await db.query.artistProfile.findFirst({ where: eq(schema.artistProfile.userId, user.id) });
        if (!profile) return NextResponse.json({ error: 'Artist profile not found' }, { status: 404 });
        
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const yearCreated = formData.get('yearCreated') as string;
        const price = parseFloat(formData.get('price') as string);
        const images = formData.getAll('images') as File[];
        
        const urls = await Promise.all(images.map(f => uploadToS3(f)));
        
        const [artReq] = await db.insert(schema.artRequest).values({
          id: crypto.randomUUID(),
          artistId: profile.id,
          title,
          description,
          yearCreated,
          price,
          images: JSON.stringify(urls),
          status: 'PENDING',
          categoryId: formData.get('categoryId') as string,
          subCategoryId: formData.get('subCategoryId') as string,
        }).returning();
        
        return NextResponse.json({ artReq });
      }

      // Generic Upload
      if (action[0] === 'upload' && user?.isAdmin) {
        const file = formData.get('file') as File;
        if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
        const url = await uploadToS3(file);
        return NextResponse.json({ url });
      }
    }

    // JSON Handlers
    const body = await request.json().catch(() => ({}));

    if (action[0] === 'auth') {
      const email = body.email?.trim().toLowerCase();
      const otp = body.otp?.trim();
      
      if (action[1] === 'signin' || action[1] === 'signup' || action[1] === 'otp' || action[1] === 'verify-otp') {
         if (!otp) {
           console.log('[Auth] Generating OTP for:', email);
           const code = Math.floor(100000 + Math.random() * 900000).toString();
           const newExpiresAt = new Date(Date.now() + 600000).toISOString();
           try {
             await db.insert(schema.otpToken).values({ id: crypto.randomUUID(), email, otp: code, expiresAt: newExpiresAt })
               .onConflictDoUpdate({ target: schema.otpToken.email, set: { otp: code, used: false, expiresAt: newExpiresAt } });
             console.log('[Auth] OTP stored in DB');
             await sendOtpEmail(email, code);
             console.log('[Auth] OTP email sent');
             return NextResponse.json({ message: 'Sent' });
           } catch (dbErr: any) {
             console.error('[Auth] DB/Email Error:', dbErr);
             throw dbErr;
           }
         }
        
        const record = await db.query.otpToken.findFirst({ 
          where: eq(schema.otpToken.email, email), 
          orderBy: [desc(schema.otpToken.createdAt)] 
        });
        
        if (!record || record.otp !== otp || record.used || new Date(record.expiresAt).getTime() < Date.now()) {
          return NextResponse.json({ error: 'Invalid or Expired OTP' }, { status: 400 });
        }
        
        let u = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
        const isAdminEmail = email === 'admin@galerievarinchi.com';
        
        if (!u && (action[1] === 'signup' || body.isSignup)) {
          [u] = await db.insert(schema.user).values({ id: crypto.randomUUID(), email, isAdmin: isAdminEmail }).returning();
        } else if (u && isAdminEmail && !u.isAdmin) {
          [u] = await db.update(schema.user).set({ isAdmin: true }).where(eq(schema.user.id, u.id)).returning();
        }
        
        if (!u) return NextResponse.json({ error: 'User not found. Please sign up.' }, { status: 404 });
        
        await db.update(schema.otpToken).set({ used: true }).where(eq(schema.otpToken.id, record.id));
        const sId = crypto.randomUUID();
        const token = await createToken(u.id, sId);
        
        await db.insert(schema.session).values({ 
          id: sId, 
          userId: u.id, 
          token, 
          expiresAt: new Date(Date.now() + 604800 * 1000).toISOString() 
        });
        
        const res = NextResponse.json({ user: u });
        res.cookies.set('auth-token', token, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production', 
          maxAge: 604800,
          path: '/'
        });
        return res;
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
      // Placing Order
      const [order] = await db.insert(schema.order).values({
        id: crypto.randomUUID(),
        userId: user.id,
        status: 'NEW',
        totalAmount: body.items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0),
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone,
        customerAddress: user.address,
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
        
        // If approved, create a product automatically
        if (body.action === 'APPROVE') {
           const imageUrls = getImages(artReq.images);
           await db.insert(schema.product).values({
             id: crypto.randomUUID(),
             title: artReq.title,
             description: artReq.description,
             basePrice: artReq.price,
             image: imageUrls[0] || '',
             images: artReq.images,
             status: 'active',
             subCategoryId: artReq.subCategoryId,
           });
        }
        return NextResponse.json({ artReq });
      }
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
        image: body.image || (getImages(body.images)[0] || '')
      }).returning();
      return NextResponse.json({ product: p }, { status: 201 });
    }

    if (action[0] === 'categories' && user?.isAdmin) {
      const [cat] = await db.insert(schema.category).values({ id: crypto.randomUUID(), ...body }).returning();
      return NextResponse.json(cat);
    }

    if (action[0] === 'subcategories' && user?.isAdmin) {
      const [sub] = await db.insert(schema.subCategory).values({ id: crypto.randomUUID(), ...body }).returning();
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
    if (action[0] === 'cart' && user) {
      const [item] = await db.update(schema.cartItem).set({ quantity: body.quantity }).where(and(eq(schema.cartItem.id, body.id), eq(schema.cartItem.userId, user.id))).returning();
      return NextResponse.json(item);
    }
    if (action[0] === 'products' && user?.isAdmin) {
      const id = new URL(request.url).searchParams.get('id') || action[1];
      const [p] = await db.update(schema.product).set(body).where(eq(schema.product.id, id)).returning();
      return NextResponse.json({ product: p });
    }
    if (action[0] === 'subcategories' && user?.isAdmin) {
      const id = action[1];
      const [sub] = await db.update(schema.subCategory).set(body).where(eq(schema.subCategory.id, id)).returning();
      return NextResponse.json(sub);
    }
    if (action[0] === 'categories' && user?.isAdmin) {
      const id = action[1];
      const [cat] = await db.update(schema.category).set(body).where(eq(schema.category.id, id)).returning();
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
        return NextResponse.json({ product: p });
      }
      // Update Order status
      if (action[0] === 'orders' && action[1]) {
        const [o] = await db.update(schema.order).set({ status: body.status }).where(eq(schema.order.id, action[1])).returning();
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
      return NextResponse.json({ message: 'Removed' });
    }
    if (action[0] === 'subcategories' && user?.isAdmin) {
      const id = action[1];
      await db.delete(schema.subCategory).where(eq(schema.subCategory.id, id));
      return NextResponse.json({ message: 'Removed' });
    }
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error: any) { return NextResponse.json({ error: error.message || 'Error' }, { status: 500 }); }
}
