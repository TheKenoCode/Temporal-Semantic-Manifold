/**
 * GET /api/edges
 *
 * Returns relationships between cultural traits, filtered by time and/or specific nodes.
 *
 * Query Parameters:
 *   - from: Start date (ISO string)
 *   - to: End date (ISO string)
 *   - nodeIds: Comma-separated node IDs to filter edges connected to
 *
 * Response shape:
 *   [{
 *     id, sourceId, targetId, weight, type, createdAt
 *   }, ...]
 *
 * Edge Types:
 *   - "semantic"     : Traits are similar in embedding space
 *   - "derived_from" : Target trait evolved from source trait
 *   - "diffusion"    : Trait spread from one cultural group to another
 *
 * Edges flow from older (source) to newer (target) traits, representing
 * cultural influence and trait transformation over time.
 */

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
    const topicParam = searchParams.get('topic');

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

    // Filter edges by topic through the nodes they connect
    if (topicParam) {
      where.source = {
        generatedFrom: topicParam,
      };
      where.target = {
        generatedFrom: topicParam,
      };
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
        type: edge.type, // "semantic" | "derived_from" | "diffusion"
        createdAt: edge.createdAt,
      })),
    );
  } catch (error) {
    console.error('[api/edges] Failed to load trait relationships', error);
    return NextResponse.json({ error: 'Unable to load trait relationships' }, { status: 500 });
  }
}
