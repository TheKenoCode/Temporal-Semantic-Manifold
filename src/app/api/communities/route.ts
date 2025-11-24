import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const communities = await prisma.community.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      communities.map((community) => ({
        id: community.id,
        name: community.name,
        color: community.color,
        description: community.description,
      })),
    );
  } catch (error) {
    console.error('[api/communities] Failed to load communities', error);
    return NextResponse.json({ error: 'Unable to load communities' }, { status: 500 });
  }
}

