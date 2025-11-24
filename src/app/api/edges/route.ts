import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const parseDateParam = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseNodeIds = (value: string | null) => {
  if (!value) return null;
  const ids = value
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((id) => !Number.isNaN(id));
  return ids.length ? ids : null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = parseDateParam(searchParams.get('from'));
    const toParam = parseDateParam(searchParams.get('to'));
    const nodeIds = parseNodeIds(searchParams.get('nodeIds'));

    const where: Prisma.EdgeWhereInput = {};
    if (fromParam || toParam) {
      where.createdAt = {
        gte: fromParam ?? undefined,
        lte: toParam ?? undefined,
      };
    }

    if (nodeIds) {
      where.OR = [
        { sourceId: { in: nodeIds } },
        { targetId: { in: nodeIds } },
      ];
    }

    const edges = await prisma.edge.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(
      edges.map((edge) => ({
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        weight: edge.weight,
        type: edge.type,
        createdAt: edge.createdAt,
      })),
    );
  } catch (error) {
    console.error('[api/edges] Failed to load edges', error);
    return NextResponse.json({ error: 'Unable to load edges' }, { status: 500 });
  }
}

