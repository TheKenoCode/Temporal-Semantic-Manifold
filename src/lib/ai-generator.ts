/**
 * AI-Powered Topic Visualization Generator
 *
 * This service uses OpenAI GPT-4 to generate semantic relationship networks
 * from natural language topics. It intelligently determines whether to:
 * - Map to existing ancestry model (WHG, EEF, Steppe, CHG, EHG) for historical topics
 * - Create custom communities for modern/abstract topics
 * - Use a hybrid approach when appropriate
 *
 * The generated data includes:
 * - Communities (ancestral populations or custom categories)
 * - Nodes (cultural traits or concepts)
 * - Edges (relationships between nodes)
 * - Embeddings (semantic positioning)
 */

import OpenAI from 'openai';
import { embedTexts } from './culture-embedding';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Type Definitions
// ============================================================================

export type GeneratedCommunity = {
  name: string;
  color: string;
  description: string;
  region?: string;
  shortCode?: string;
};

export type GeneratedNode = {
  label: string;
  description: string;
  era: string;
  category: string;
  communityWeights: Record<string, number>; // community name -> weight (0-1)
};

export type GeneratedEdge = {
  sourceLabel: string;
  targetLabel: string;
  weight: number;
  type: 'semantic' | 'derived_from' | 'diffusion';
};

export type GeneratedNetwork = {
  communities: GeneratedCommunity[];
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
  topic: string;
  usesAncestryModel: boolean;
};

// ============================================================================
// Ancestry Model Reference
// ============================================================================

const ANCESTRY_MODEL = {
  WHG: {
    name: 'Western Hunter-Gatherers (WHG)',
    color: '#0ea5e9',
    description: 'Mesolithic foragers of Western Europe',
    region: 'Western & Central Europe',
  },
  EEF: {
    name: 'Early European Farmers (EEF)',
    color: '#22c55e',
    description: 'Neolithic farmers from Anatolia',
    region: 'Anatolia → Europe',
  },
  Steppe: {
    name: 'Steppe Pastoralists (Yamnaya)',
    color: '#ef4444',
    description: 'Bronze Age pastoralists from the Pontic-Caspian steppe',
    region: 'Pontic-Caspian Steppe',
  },
  CHG: {
    name: 'Caucasus Hunter-Gatherers (CHG)',
    color: '#a855f7',
    description: 'Ancient populations of the Caucasus and Iranian plateau',
    region: 'Caucasus & Iranian Plateau',
  },
  EHG: {
    name: 'Eastern Hunter-Gatherers (EHG)',
    color: '#f97316',
    description: 'Mesolithic foragers of Eastern Europe and Russia',
    region: 'Eastern Europe & Russia',
  },
};

// ============================================================================
// Color Palette Generator
// ============================================================================

const CUSTOM_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#f97316', // orange
];

function generateColor(index: number): string {
  return CUSTOM_COLORS[index % CUSTOM_COLORS.length];
}

// ============================================================================
// System Prompt for GPT-4
// ============================================================================

const SYSTEM_PROMPT = `You are an expert at analyzing topics and generating semantic relationship networks for visualization.

Your task is to create a comprehensive network of related concepts, their groupings, and relationships.

For HISTORICAL/CULTURAL topics (Ancient civilizations, ethnic groups, historical periods):
- Use the ancestry model when relevant: WHG, EEF, Steppe, CHG, EHG
- Map cultural traits to these ancestral populations based on historical/archaeological evidence
- Consider migration patterns, cultural diffusion, and population genetics

For MODERN/ABSTRACT topics (Technology, Art, Science, Social movements):
- Create custom categories that make logical sense for the domain
- Think about different aspects, time periods, schools of thought, or geographical regions

ALWAYS generate:
1. Communities (3-5 groups/categories)
2. Nodes (15-30 concepts with rich descriptions)
3. Edges (relationships showing how concepts relate)
4. Time periods (even if approximate or metaphorical for abstract topics)

Return ONLY valid JSON with this exact structure:
{
  "usesAncestryModel": boolean,
  "communities": [
    {
      "name": "string",
      "shortCode": "string (optional, for ancestry model)",
      "description": "string",
      "region": "string (optional)"
    }
  ],
  "nodes": [
    {
      "label": "string (concise name)",
      "description": "string (1-2 sentences)",
      "era": "string (time period or phase)",
      "category": "string (subsistence/kinship/religion/material/artistic/etc)",
      "communityWeights": {
        "CommunityName": 0.6,
        "AnotherCommunity": 0.3,
        "ThirdCommunity": 0.1
      }
    }
  ],
  "edges": [
    {
      "sourceLabel": "string (exact match to node label)",
      "targetLabel": "string (exact match to node label)",
      "weight": 0.7,
      "type": "semantic" | "derived_from" | "diffusion"
    }
  ]
}

Edge types:
- "semantic": Concepts are similar or related in meaning
- "derived_from": Target evolved from source
- "diffusion": Concept spread from one group/context to another

Community weights should sum to approximately 1.0 for each node.`;

// ============================================================================
// Main Generation Function
// ============================================================================

export async function generateTopicVisualization(
  topic: string,
  mode: 'hybrid' | 'ancestry' | 'custom' = 'hybrid'
): Promise<GeneratedNetwork> {
  // Create user prompt with mode guidance
  const modeGuidance =
    mode === 'ancestry'
      ? '\n\nIMPORTANT: Use the ancestry model (WHG, EEF, Steppe, CHG, EHG) for this topic.'
      : mode === 'custom'
        ? '\n\nIMPORTANT: Create custom communities for this topic. Do NOT use the ancestry model.'
        : '\n\nIMPORTANT: Determine whether this topic relates to historical/cultural ancestry or requires custom communities.';

  const userPrompt = `Topic: "${topic}"${modeGuidance}

Generate a comprehensive semantic network with:
1. Communities: 3-5 groups/categories
2. Nodes: 20-30 related concepts with detailed descriptions
3. Edges: Relationships between nodes (aim for 2-3 edges per node on average)

Ensure all node labels are unique and all edge sourceLabel/targetLabel exactly match node labels.

Return only the JSON structure specified in the system prompt.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 4000,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    const generatedData = JSON.parse(content) as GeneratedNetwork;

    // Validate and enhance the generated data
    const validated = validateAndEnhance(generatedData, topic);

    return validated;
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error(
      `Failed to generate visualization: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// Validation and Enhancement
// ============================================================================

function validateAndEnhance(data: GeneratedNetwork, topic: string): GeneratedNetwork {
  // Ensure we have communities
  if (!data.communities || data.communities.length === 0) {
    throw new Error('No communities generated');
  }

  // If using ancestry model, map to predefined communities
  let communities = data.communities;
  if (data.usesAncestryModel) {
    communities = data.communities.map((comm) => {
      const shortCode = comm.shortCode?.toUpperCase() as keyof typeof ANCESTRY_MODEL;
      if (shortCode && ANCESTRY_MODEL[shortCode]) {
        return {
          ...ANCESTRY_MODEL[shortCode],
          shortCode,
        };
      }
      return comm;
    });
  } else {
    // Assign colors to custom communities
    communities = data.communities.map((comm, idx) => ({
      ...comm,
      color: comm.color || generateColor(idx),
    }));
  }

  // Validate nodes
  if (!data.nodes || data.nodes.length < 10) {
    throw new Error('Insufficient nodes generated (minimum 10 required)');
  }

  // Create a map of community names for validation
  const communityNames = new Set(communities.map((c) => c.name));

  // Validate and normalize community weights
  const nodes = data.nodes.map((node) => {
    const weights: Record<string, number> = {};
    let totalWeight = 0;

    // Normalize weights
    for (const [commName, weight] of Object.entries(node.communityWeights)) {
      if (communityNames.has(commName)) {
        weights[commName] = Math.max(0, Math.min(1, weight));
        totalWeight += weights[commName];
      }
    }

    // Renormalize to sum to 1.0
    if (totalWeight > 0) {
      for (const commName in weights) {
        weights[commName] /= totalWeight;
      }
    } else {
      // If no valid weights, assign equal weight to all communities
      const equalWeight = 1.0 / communities.length;
      communities.forEach((comm) => {
        weights[comm.name] = equalWeight;
      });
    }

    return {
      ...node,
      communityWeights: weights,
    };
  });

  // Validate edges
  const nodeLabels = new Set(nodes.map((n) => n.label));
  const edges = (data.edges || []).filter((edge) => {
    return (
      nodeLabels.has(edge.sourceLabel) &&
      nodeLabels.has(edge.targetLabel) &&
      edge.sourceLabel !== edge.targetLabel
    );
  });

  return {
    communities,
    nodes,
    edges,
    topic,
    usesAncestryModel: data.usesAncestryModel,
  };
}

// ============================================================================
// Database Preparation
// ============================================================================

export type PreparedData = {
  communities: Array<{
    name: string;
    color: string;
    description: string;
    region: string | null;
    generatedFrom: string;
    isGenerated: boolean;
  }>;
  nodes: Array<{
    label: string;
    embedding: number[];
    timestamp: Date;
    metadata: {
      description: string;
      era: string;
      category: string;
      topic: string;
    };
    generatedFrom: string;
    communityWeights: Record<string, number>;
  }>;
  edges: Array<{
    sourceLabel: string;
    targetLabel: string;
    weight: number;
    type: string;
  }>;
};

/**
 * Prepare generated data for database insertion
 * Includes embedding generation for semantic positioning
 */
export async function prepareForDatabase(network: GeneratedNetwork): Promise<PreparedData> {
  // Generate embeddings for all nodes in batch
  const nodeTexts = network.nodes.map(
    (node) => `${node.label}. ${node.description}. ${node.category}`
  );

  const embeddings = await embedTexts(nodeTexts);

  // Create timestamps spanning a range based on era
  const baseTime = new Date('2000-01-01');
  const timeRange = 1000 * 60 * 60 * 24 * 365 * 50; // 50 years

  const communities = network.communities.map((comm) => ({
    name: comm.name,
    color: comm.color,
    description: comm.description || '',
    region: comm.region || null,
    generatedFrom: network.topic,
    isGenerated: true,
  }));

  const nodes = network.nodes.map((node, idx) => ({
    label: node.label,
    embedding: embeddings[idx],
    timestamp: new Date(baseTime.getTime() + (idx / network.nodes.length) * timeRange),
    metadata: {
      description: node.description,
      era: node.era,
      category: node.category,
      topic: network.topic,
    },
    generatedFrom: network.topic,
    communityWeights: node.communityWeights,
  }));

  const edges = network.edges.map((edge) => ({
    sourceLabel: edge.sourceLabel,
    targetLabel: edge.targetLabel,
    weight: edge.weight,
    type: edge.type,
  }));

  return { communities, nodes, edges };
}

