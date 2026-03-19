export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if artist profile already exists
    const existingProfile = await prisma.artistProfile.findUnique({
      where: { userId: user.id },
    });
    if (existingProfile) {
      return NextResponse.json({ error: 'Artist application already submitted' }, { status: 400 });
    }

    const formData = await request.formData();
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const country = formData.get('country') as string;
    const state = formData.get('state') as string;
    const area = formData.get('area') as string;
    const portfolioLink = formData.get('portfolioLink') as string;
    const bio = formData.get('bio') as string;
    const specialization = formData.get('specialization') as string;

    const files = formData.getAll('examples') as File[];

    if (!fullName || !email || !phone || !country || !state || !area || !portfolioLink || !bio || !specialization) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Process File Uploads (Mock placeholders supporting Edge Runtimes)
    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json({ error: 'One or more files exceed size limits' }, { status: 400 });
      }
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      uploadedUrls.push(`/uploads/artists/${filename}`);
    }

    // Create ArtistProfile in DB
    const artistProfile = await prisma.artistProfile.create({
      data: {
        userId: user.id,
        fullName,
        email,
        phone,
        country,
        state,
        area,
        portfolioLink,
        bio,
        specialization,
        examples: JSON.stringify(uploadedUrls),
        status: 'PENDING',
      },
    });

    return NextResponse.json({ message: 'Profile submitted for review', profile: artistProfile }, { status: 201 });
  } catch (error) {
    console.error('Artist apply error:', error);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}
