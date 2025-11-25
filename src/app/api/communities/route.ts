/**
 * GET /api/communities
 *
 * Returns all ancestral populations (communities) with their metadata.
 * Each community represents an ancestral lineage that contributes to cultural traits.
 *
 * Response shape:
 *   [{ id, name, color, description, timeOrigin?, region? }, ...]
 *
 * Examples:
 *   - "Yamnaya / Steppe IE" — Proto-Indo-European pastoralists
 *   - "Anatolian Farmer" — Neolithic agricultural expansion
 *   - "Slavic MLBA" — Middle-Late Bronze Age Slavic ancestors
 */

import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topicParam = searchParams.get('topic');

    const where: { generatedFrom?: string } = {};
    
    // Filter by AI-generated topic if specified
    if (topicParam) {
      where.generatedFrom = topicParam;
    }

    const communities = await prisma.community.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      communities.map((community) => ({
        id: community.id,
        name: community.name,
        color: community.color,
        description: community.description,
        region: community.region, // Includes era info, e.g., "Pontic-Caspian Steppe (~3300 BCE)"
        generatedFrom: community.generatedFrom,
        isGenerated: community.isGenerated,
      })),
    );
  } catch (error) {
    console.error('[api/communities] Failed to load ancestral populations', error);
    return NextResponse.json({ error: 'Unable to load ancestral populations' }, { status: 500 });
  }
}
