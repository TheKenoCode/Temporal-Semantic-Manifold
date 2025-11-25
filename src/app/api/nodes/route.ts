/**
 * GET /api/nodes
 *
 * Returns cultural traits filtered by time range and/or ancestral population.
 * Each node represents a cultural trait with its semantic embedding and ancestry contributions.
 *
 * Query Parameters:
 *   - from: Start date (ISO string) — default: 7 days ago
 *   - to: End date (ISO string) — default: now
 *   - communityId: Filter by ancestral population ID (optional)
 *
 * Response shape:
 *   [{
 *     id, timestamp, label,
 *     embedding: number[],
 *     metadata: { type, description, derivedFrom?, ... },
 *     communities: [{ id, name, color, strength }, ...]  // ancestry contributions
 *   }, ...]
 *
 * The "communities" array shows how much each ancestral population contributed
 * to this cultural trait (analogous to genetic admixture percentages).
 */

import { Prisma } from '@prisma/client';
import { subDays } from 'date-fns';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEFAULT_WINDOW_DAYS = 7;

const parseDateParam = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'number') return entry;
      const parsed = Number(entry);
      return Number.isNaN(parsed) ? 0 : parsed;
    })
    .slice(0);
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = parseDateParam(searchParams.get('from'));
    const toParam = parseDateParam(searchParams.get('to'));
    const communityParam = searchParams.get('communityId');
    const topicParam = searchParams.get('topic');

    const now = new Date();
    const defaultFrom = subDays(now, DEFAULT_WINDOW_DAYS);

    const fromDate = fromParam ?? defaultFrom;
    const toDate = toParam ?? now;

    const where: Prisma.NodeWhereInput = {
      timestamp: {
        gte: fromDate,
        lte: toDate,
      },
    };

    // Filter by AI-generated topic if specified
    if (topicParam) {
      where.generatedFrom = topicParam;
    }

    // communityId filters to traits with contributions from that ancestral population
    if (communityParam) {
      const communityId = Number.parseInt(communityParam, 10);
      if (!Number.isNaN(communityId)) {
        where.communities = {
          some: { communityId },
        };
      }
    }

    const nodes = await prisma.node.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      include: {
        communities: {
          include: {
            community: true,
          },
        },
      },
    });

    return NextResponse.json(
      nodes.map((node) => ({
        id: node.id,
        timestamp: node.timestamp,
        label: node.label,
        embedding: toNumberArray(node.embedding),
        metadata: node.metadata,
        // Ancestry contributions: which populations contributed to this trait
        communities: node.communities.map(({ community, strength }) => ({
          id: community.id,
          name: community.name,
          color: community.color,
          strength, // 0.0-1.0; higher = stronger ancestry link
        })),
      })),
    );
  } catch (error) {
    console.error('[api/nodes] Failed to load cultural traits', error);
    return NextResponse.json({ error: 'Unable to load cultural traits' }, { status: 500 });
  }
}
