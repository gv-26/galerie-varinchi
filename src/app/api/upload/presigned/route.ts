export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getS3Client } from '@/lib/s3';
import { getSecret } from '@/lib/secrets';
import { getCurrentUser } from '@/lib/auth';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'filename and contentType are required' },
        { status: 400 }
      );
    }

    const bucketName = getSecret('S3_BUCKET_NAME');
    if (!bucketName) {
      return NextResponse.json({ error: 'S3 bucket not configured' }, { status: 500 });
    }

    const sanitizedFilename = filename.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const key = `assets/${Date.now()}-${sanitizedFilename}`;

    const s3 = getS3Client();
    const command = new PutObjectCommand({ Bucket: bucketName, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    const cdnBase = (process.env.NEXT_PUBLIC_CLOUDFRONT_URL ?? 'https://www.galerievarinchi.com')
      .replace(/\/$/, '')
      .replace(/\/assets$/, '');

    return NextResponse.json({ uploadUrl, finalUrl: `${cdnBase}/${key}` });
  } catch (error: unknown) {
    console.error('[upload/presigned] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
