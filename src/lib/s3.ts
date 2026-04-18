/**
 * S3 client factory and upload utility.
 *
 * Uses the Lambda execution role's IAM credentials automatically —
 * no explicit key/secret configuration required in production.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSecret } from './secrets';

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: getSecret('AWS_REGION') ?? 'ap-south-1',
    });
  }
  return s3Client;
}

export async function uploadToS3(file: File): Promise<string> {
  const bucketName = getSecret('S3_BUCKET_NAME');

  if (!bucketName) {
    console.warn('[S3] S3_BUCKET_NAME not set — returning placeholder URL');
    return `https://galerievarinchi-placeholder.s3.amazonaws.com/${Date.now()}-${file.name}`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const key = `assets/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  );

  const cdnBase = (
    process.env.NEXT_PUBLIC_CLOUDFRONT_URL ?? 'https://www.galerievarinchi.com'
  )
    .replace(/\/$/, '')
    .replace(/\/assets$/, '');

  return `${cdnBase}/${key}`;
}
