import { PrismaClient, Community } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
  log: ['error', 'warn'],
});

type CommunityAssignment = {
  community: Community;
  strength: number;
};

type GeneratedNode = {
  id: number;
  timestamp: Date;
  embedding: number[];
  communityAssignments: CommunityAssignment[];
};

const COMMUNITY_BLUEPRINTS = [
  {
    name: 'Physics',
    color: '#ff6b6b',
    description: 'Experiments, cosmology, and systems thinking.',
  },
  {
    name: 'Entrepreneurship',
    color: '#f7b801',
    description: 'Startups, business design, and market signals.',
  },
  {
    name: 'Personal Life',
    color: '#6ee7b7',
    description: 'Journals, wellbeing, and interpersonal reflections.',
  },
  {
    name: 'History',
    color: '#60a5fa',
    description: 'Timelines, cause/effect narratives, archival studies.',
  },
  {
    name: 'Meta / AI',
    color: '#c084fc',
    description: 'Tool building, alignment notes, and meta-reasoning.',
  },
] as const;

const EDGE_TYPES = ['semantic', 'causal', 'refers_to'] as const;
const NODE_COUNT = 320;
const DIMENSIONS = 32;
const WINDOW_DAYS = 30;
const MAX_EDGE_DAYS = 5;

const gaussian = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

const randomVector = (dimensions: number, scale = 1) =>
  Array.from({ length: dimensions }, () => gaussian() * scale);

const normalizeVector = (vector: number[]) => {
  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (length === 0) return vector;
  return vector.map((value) => value / length);
};

const cosineSimilarity = (a: number[], b: number[]) => {
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const magA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const magB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
};

const pickCommunities = (communities: Community[]): CommunityAssignment[] => {
  const primary = communities[Math.floor(Math.random() * communities.length)];
  const assignments: CommunityAssignment[] = [
    { community: primary, strength: 0.75 + Math.random() * 0.2 },
  ];

  // Roughly 40% of nodes have a secondary community, 10% have a tertiary one.
  if (Math.random() < 0.4) {
    const secondary = communities.filter((c) => c.id !== primary.id);
    const second = secondary[Math.floor(Math.random() * secondary.length)];
    assignments.push({ community: second, strength: 0.35 + Math.random() * 0.25 });

    if (Math.random() < 0.25) {
      const tertiary = secondary.filter((c) => c.id !== second.id);
      if (tertiary.length > 0) {
        const third = tertiary[Math.floor(Math.random() * tertiary.length)];
        assignments.push({ community: third, strength: 0.2 + Math.random() * 0.2 });
      }
    }
  }

  return assignments;
};

const randomTimestamp = (start: Date, rangeMs: number) => {
  const hotspots = [0.1, 0.35, 0.55, 0.75, 0.9];
  const anchor = hotspots[Math.floor(Math.random() * hotspots.length)];
  const jitter = anchor + gaussian() * 0.07;
  const clamped = Math.min(Math.max(jitter, 0), 1);
  return new Date(start.getTime() + clamped * rangeMs);
};

const blendCentroids = (
  assignments: CommunityAssignment[],
  centroids: Record<number, number[]>,
) => {
  const vector = Array(DIMENSIONS).fill(0);
  let total = 0;
  assignments.forEach(({ community, strength }) => {
    const centroid = centroids[community.id];
    centroid.forEach((value, index) => {
      vector[index] += value * strength;
    });
    total += strength;
  });
  return vector.map((value) => value / (total || 1));
};

async function main() {
  console.log('Resetting previous data…');
  await prisma.edge.deleteMany();
  await prisma.nodeCommunity.deleteMany();
  await prisma.node.deleteMany();
  await prisma.community.deleteMany();

  console.log('Creating communities…');
  const communities = await Promise.all(
    COMMUNITY_BLUEPRINTS.map((community) =>
      prisma.community.create({
        data: community,
      }),
    ),
  );

  const centroids: Record<number, number[]> = {};
  communities.forEach((community) => {
    centroids[community.id] = normalizeVector(randomVector(DIMENSIONS, 1));
  });

  console.log('Generating nodes + memberships…');
  const startDate = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rangeMs = WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const generatedNodes: GeneratedNode[] = [];

  for (let i = 0; i < NODE_COUNT; i += 1) {
    const assignments = pickCommunities(communities);
    const baseVector = blendCentroids(assignments, centroids);
    const noise = randomVector(DIMENSIONS, 0.25);
    const microJitter = randomVector(DIMENSIONS, 0.02);
    const embedding = normalizeVector(
      baseVector.map((value, idx) => value + noise[idx] + microJitter[idx]),
    );
    const timestamp = randomTimestamp(startDate, rangeMs);
    const labelCommunities = assignments.map((a) => a.community.name).join(' × ');
    const node = await prisma.node.create({
      data: {
        timestamp,
        label: `Node #${i + 1} – ${labelCommunities}`,
        embedding,
        metadata: {
          importance: Number((0.3 + Math.random() * 0.7).toFixed(2)),
          notes: 'Synthetic temporal-semantic example',
        },
        communities: {
          create: assignments.map(({ community, strength }) => ({
            communityId: community.id,
            strength: Number(strength.toFixed(2)),
          })),
        },
      },
    });

    generatedNodes.push({
      id: node.id,
      timestamp,
      embedding,
      communityAssignments: assignments,
    });
  }

  console.log('Linking nodes with edges…');
  const edges: {
    sourceId: number;
    targetId: number;
    weight: number;
    type: (typeof EDGE_TYPES)[number];
    createdAt: Date;
  }[] = [];

  const sortedNodes = [...generatedNodes].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const maxWindowMs = MAX_EDGE_DAYS * 24 * 60 * 60 * 1000;

  for (let index = 0; index < sortedNodes.length; index += 1) {
    const node = sortedNodes[index];
    const candidates: { node: GeneratedNode; similarity: number }[] = [];
    for (let j = index - 1; j >= 0; j -= 1) {
      const previous = sortedNodes[j];
      const delta = node.timestamp.getTime() - previous.timestamp.getTime();
      if (delta > maxWindowMs) {
        break;
      }
      const similarity = cosineSimilarity(node.embedding, previous.embedding);
      if (similarity > 0.4) {
        candidates.push({ node: previous, similarity });
      }
    }

    candidates.sort((a, b) => b.similarity - a.similarity);
    const sampleCount = Math.min(
      candidates.length,
      Math.floor(Math.random() * 4), // 0-3 edges
    );

    for (let k = 0; k < sampleCount; k += 1) {
      const candidate = candidates[k];
      edges.push({
        sourceId: candidate.node.id,
        targetId: node.id,
        weight: Number(candidate.similarity.toFixed(3)),
        type: EDGE_TYPES[Math.floor(Math.random() * EDGE_TYPES.length)],
        createdAt: node.timestamp,
      });
    }
  }

  if (edges.length > 0) {
    await prisma.edge.createMany({
      data: edges,
    });
  }

  console.log(
    `Seed complete: ${communities.length} communities, ${generatedNodes.length} nodes, ${edges.length} edges`,
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

