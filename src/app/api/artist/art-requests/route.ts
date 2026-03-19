export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const artist = await prisma.artistProfile.findUnique({
      where: { userId: user.id },
    });

    if (!artist) {
      return NextResponse.json({ error: 'Artist profile not found' }, { status: 404 });
    }

    const requests = await prisma.artRequest.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Art requests GET error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const artist = await prisma.artistProfile.findUnique({
      where: { userId: user.id },
    });

    if (!artist || artist.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Only approved artists can submit artwork' }, { status: 403 });
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const categoryId = formData.get('categoryId') as string;
    const subCategoryId = formData.get('subCategoryId') as string;
    const yearCreated = formData.get('yearCreated') as string;
    const specifications = formData.get('specifications') as string; // JSON String
    const price = parseFloat(formData.get('price') as string);
    const quantity = parseInt(formData.get('quantity') as string, 10);
    const additionalInfo = formData.get('additionalInfo') as string;

    const files = formData.getAll('images') as File[];

    if (!title || !description || !categoryId || !subCategoryId || !yearCreated || isNaN(price)) {
      return NextResponse.json({ error: 'Missing required artwork fields' }, { status: 400 });
    }

    // Process Image Uploads (Mock placeholders supporting Edge Runtimes)
    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'Each image must be less than 10MB' }, { status: 400 });
      }
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      uploadedUrls.push(`/uploads/artworks/${filename}`);
    }

    // Create ArtRequest
    const artRequest = await prisma.artRequest.create({
      data: {
        artistId: artist.id,
        title,
        description,
        categoryId,
        subCategoryId,
        yearCreated,
        specifications: specifications || '[]',
        images: JSON.stringify(uploadedUrls),
        price,
        quantity: isNaN(quantity) ? 1 : quantity,
        additionalInfo: additionalInfo || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ message: 'Request submitted for review', request: artRequest }, { status: 201 });
  } catch (error) {
    console.error('Art request POST error:', error);
    return NextResponse.json({ error: 'Failed to submit artwork request' }, { status: 500 });
  }
}
