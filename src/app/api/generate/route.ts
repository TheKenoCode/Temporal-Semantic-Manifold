/**
 * AI Topic Visualization Generation API
 *
 * POST /api/generate
 * - Accepts a topic and generates a complete visualization network
 * - Saves to database and returns the generated data
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  generateTopicVisualization,
  prepareForDatabase,
} from '@/lib/ai-generator';

// ============================================================================
// Request Schema
// ============================================================================

const GenerateRequestSchema = z.object({
  topic: z.string().min(3).max(200),
  mode: z.enum(['hybrid', 'ancestry', 'custom']).optional().default('hybrid'),
});

type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData: GenerateRequest = GenerateRequestSchema.parse(body);

    const { topic, mode } = validatedData;

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          message: 'Please set OPENAI_API_KEY in your environment variables',
        },
        { status: 500 }
      );
    }

    // Check if this topic has already been generated
    const existingCommunity = await prisma.community.findFirst({
      where: {
        generatedFrom: topic,
        isGenerated: true,
      },
    });

    if (existingCommunity) {
      // Topic already exists - return existing data stats
      const [nodeCount, edgeCount, communityCount] = await Promise.all([
        prisma.node.count({ where: { generatedFrom: topic } }),
        prisma.edge.count({
          where: {
            source: { generatedFrom: topic },
          },
        }),
        prisma.community.count({ where: { generatedFrom: topic, isGenerated: true } }),
      ]);

      return NextResponse.json({
        success: true,
        topic,
        alreadyExists: true,
        message: `Visualization for "${topic}" already exists. Loading existing data.`,
        stats: {
          communities: communityCount,
          nodes: nodeCount,
          edges: edgeCount,
        },
      });
    }

    // Generate the network using AI
    console.log(`Generating visualization for topic: "${topic}" (mode: ${mode})`);
    const network = await generateTopicVisualization(topic, mode);

    // Prepare data for database insertion
    const prepared = await prepareForDatabase(network);

    // Save to database in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create communities
      const communityRecords = await Promise.all(
        prepared.communities.map((comm) =>
          tx.community.create({
            data: comm,
          })
        )
      );

      // Create a map of community names to IDs
      const communityMap = new Map(
        communityRecords.map((comm) => [comm.name, comm.id])
      );

      // 2. Create nodes with their community relationships
      const nodeRecords = await Promise.all(
        prepared.nodes.map(async (node) => {
          const nodeRecord = await tx.node.create({
            data: {
              label: node.label,
              embedding: node.embedding,
              timestamp: node.timestamp,
              metadata: node.metadata,
              generatedFrom: node.generatedFrom,
            },
          });

          // Create NodeCommunity relationships
          await Promise.all(
            Object.entries(node.communityWeights).map(([commName, weight]) => {
              const communityId = communityMap.get(commName);
              if (!communityId) {
                console.warn(`Community not found: ${commName}`);
                return Promise.resolve();
              }
              return tx.nodeCommunity.create({
                data: {
                  nodeId: nodeRecord.id,
                  communityId,
                  strength: weight,
                },
              });
            })
          );

          return nodeRecord;
        })
      );

      // Create a map of node labels to IDs
      const nodeMap = new Map(nodeRecords.map((node) => [node.label, node.id]));

      // 3. Create edges
      const edgeRecords = await Promise.all(
        prepared.edges
          .map((edge) => {
            const sourceId = nodeMap.get(edge.sourceLabel);
            const targetId = nodeMap.get(edge.targetLabel);

            if (!sourceId || !targetId) {
              console.warn(
                `Skipping edge: ${edge.sourceLabel} -> ${edge.targetLabel} (node not found)`
              );
              return null;
            }

            return tx.edge.create({
              data: {
                sourceId,
                targetId,
                weight: edge.weight,
                type: edge.type,
              },
            });
          })
          .filter(Boolean) as Promise<any>[]
      );

      return {
        communities: communityRecords,
        nodes: nodeRecords,
        edges: edgeRecords,
      };
    });

    console.log(
      `Successfully generated visualization: ${result.nodes.length} nodes, ${result.edges.length} edges`
    );

    // Return the generated data
    return NextResponse.json({
      success: true,
      topic,
      generatedFrom: topic,
      stats: {
        communities: result.communities.length,
        nodes: result.nodes.length,
        edges: result.edges.length,
      },
      data: {
        communities: result.communities,
        nodes: result.nodes.map((node) => ({
          id: node.id,
          label: node.label,
          timestamp: node.timestamp,
        })),
      },
    });
  } catch (error) {
    console.error('Generation error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: 'Failed to generate visualization',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET Handler - List generated visualizations
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const generatedOnly = searchParams.get('generated') === 'true';

    const where = generatedOnly ? { isGenerated: true } : {};

    const communities = await prisma.community.findMany({
      where,
      select: {
        id: true,
        name: true,
        generatedFrom: true,
        isGenerated: true,
        _count: {
          select: {
            nodes: true,
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    // Group by generatedFrom topic
    const topicMap = new Map<string, any>();

    for (const comm of communities) {
      if (!comm.generatedFrom) continue;

      if (!topicMap.has(comm.generatedFrom)) {
        topicMap.set(comm.generatedFrom, {
          topic: comm.generatedFrom,
          communities: [],
          totalNodes: 0,
        });
      }

      const topic = topicMap.get(comm.generatedFrom);
      topic.communities.push(comm.name);
      topic.totalNodes += comm._count.nodes;
    }

    const visualizations = Array.from(topicMap.values());

    return NextResponse.json({
      success: true,
      count: visualizations.length,
      visualizations,
    });
  } catch (error) {
    console.error('Failed to fetch visualizations:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch visualizations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

