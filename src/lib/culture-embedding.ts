/**
 * Cultural Trait Embedding Helper
 *
 * This module provides embedding functions for cultural traits.
 * The embeddings position traits in a semantic space where:
 *   - Similar traits cluster together
 *   - The x/y projection shows conceptual relationships
 *   - Distance reflects semantic similarity
 *
 * Uses OpenAI's text-embedding-3-small model for semantic embeddings.
 * Falls back to deterministic embeddings in development if API key is missing.
 */

import OpenAI from 'openai';

const EMBEDDING_DIMENSIONS = 1536; // text-embedding-3-small dimension
const USE_OPENAI = typeof process !== 'undefined' && !!process.env.OPENAI_API_KEY;

// Initialize OpenAI client only if API key is available
const openai = USE_OPENAI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Simple deterministic hash for consistent pseudo-random generation
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Seeded pseudo-random number generator (Mulberry32)
 */
function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a deterministic Gaussian sample using Box-Muller transform
 */
function gaussianFromRng(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Normalize a vector to unit length
 */
function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vector;
  return vector.map((v) => v / magnitude);
}

/**
 * Embed a text string into a semantic vector space.
 *
 * Uses OpenAI's text-embedding-3-small model for real semantic embeddings.
 * Falls back to deterministic hash-based embeddings if OpenAI API key is not configured.
 *
 * @param text - The text to embed
 * @returns A normalized embedding vector
 */
export async function embedText(text: string): Promise<number[]> {
  if (USE_OPENAI && openai) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.warn('OpenAI embedding failed, falling back to deterministic:', error);
      // Fall through to deterministic
    }
  }

  // Fallback: Deterministic embedding based on text hash
  const seed = hashCode(text);
  const rng = mulberry32(seed);

  const vector = Array.from({ length: 32 }, () => gaussianFromRng(rng));

  return normalize(vector);
}

/**
 * Embed multiple texts in batch (for efficiency with real APIs)
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (USE_OPENAI && openai) {
    try {
      // OpenAI supports batching up to 2048 inputs
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });
      return response.data.map((item) => item.embedding);
    } catch (error) {
      console.warn('OpenAI batch embedding failed, falling back:', error);
      // Fall through to individual embeddings
    }
  }

  // Fallback: Process individually
  return Promise.all(texts.map(embedText));
}

/**
 * Compute cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Blend multiple embeddings with weights (for admixture-style combinations)
 *
 * @example
 * // Trait with 60% Yamnaya influence, 40% Anatolian Farmer
 * const blended = blendEmbeddings([
 *   { embedding: yamnayCentroid, weight: 0.6 },
 *   { embedding: anatolianCentroid, weight: 0.4 },
 * ]);
 */
export function blendEmbeddings(
  inputs: Array<{ embedding: number[]; weight: number }>
): number[] {
  if (inputs.length === 0) return [];

  const dimensions = inputs[0].embedding.length;
  const result = Array(dimensions).fill(0);
  let totalWeight = 0;

  for (const { embedding, weight } of inputs) {
    for (let i = 0; i < dimensions; i++) {
      result[i] += embedding[i] * weight;
    }
    totalWeight += weight;
  }

  // Normalize by total weight and then to unit length
  const scaled = result.map((v) => v / (totalWeight || 1));
  return normalize(scaled);
}

/**
 * Add noise to an embedding (for generating variation within a cluster)
 */
export function addNoise(
  embedding: number[],
  scale: number = 0.1,
  seed?: number
): number[] {
  const rng = mulberry32(seed ?? Math.random() * 1000000);
  const noisy = embedding.map((v) => v + gaussianFromRng(rng) * scale);
  return normalize(noisy);
}

// Export dimensions for use in other modules
export { EMBEDDING_DIMENSIONS, USE_OPENAI };

