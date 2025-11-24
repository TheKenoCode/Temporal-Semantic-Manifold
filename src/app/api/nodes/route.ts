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
        communities: node.communities.map(({ community, strength }) => ({
          id: community.id,
          name: community.name,
          color: community.color,
          strength,
        })),
      })),
    );
  } catch (error) {
    console.error('[api/nodes] Failed to load nodes', error);
    return NextResponse.json({ error: 'Unable to load nodes' }, { status: 500 });
  }
}

